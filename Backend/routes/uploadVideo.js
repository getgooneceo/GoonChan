import { Hono } from 'hono';
import axios from 'axios';
import FormDataNode from 'form-data';
import Video, { generateSlug, generateRandomSuffix } from '../models/Video.js';
import User from '../models/User.js';
import { config } from "dotenv";
import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import settingsManager from '../services/settingsManager.js';
config();

const router = new Hono();

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_HASH = process.env.CLOUDFLARE_ACCOUNT_HASH || CLOUDFLARE_ACCOUNT_ID;
const JWT_SECRET = process.env.JWT_SECRET;

const verifyTokenAndGetUserId = (token) => {
  if (!token) {
    return null;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.email;
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return null;
  }
};

const generateUniqueSlug = async (title) => {
  const baseSlug = generateSlug(title);
  const randomSuffix = generateRandomSuffix();
  let slug = `${baseSlug}-${randomSuffix}`;

  let counter = 1;
  while (await Video.findOne({ slug: slug })) {
    slug = `${baseSlug}-${randomSuffix}${counter}`;
    counter++;
  }

  return slug;
};

const checkVideoProcessingStatus = async (cloudflareStreamId, videoId, hasCustomThumbnail) => {
  const maxAttempts = 600;
  let attempts = 0;
  
  const checkStatus = async () => {
    try {
      attempts++;
      console.log(`Checking processing status for video ${videoId}, attempt ${attempts}/${maxAttempts}`);
      
      const response = await axios.get(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${cloudflareStreamId}`,
        {
          headers: {
            'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          },
        }
      );
      
      const resultData = response.data.result;
      const videoStatus = resultData?.status;
      console.log(`Video ${videoId} status: ${videoStatus?.state || videoStatus}`);
      
      if (videoStatus?.state === 'ready') {
        const durationSec = Math.round(Number(resultData?.duration || 0));
        const updateFields = { isProcessing: false };
        if (durationSec > 0) updateFields.duration = durationSec;
        if (resultData?.thumbnail && !hasCustomThumbnail) {
          updateFields.thumbnail = resultData.thumbnail;
        }
        await Video.findByIdAndUpdate(videoId, updateFields);
        return;
      } else if (videoStatus?.state === 'error') {
        console.error(`Video ${videoId} processing failed`);
        await Video.findByIdAndUpdate(videoId, { isProcessing: false });
        return;
      }

      if (attempts < maxAttempts) {
        setTimeout(checkStatus, 10000);
      } else {
        console.error(`Video ${videoId} processing check timed out after ${maxAttempts} attempts`);
        await Video.findByIdAndUpdate(videoId, {
          isProcessing: false
        });
      }
    } catch (error) {
      console.error(`Error checking video ${videoId} status:`, error.message);

      if (attempts >= maxAttempts) {
        await Video.findByIdAndUpdate(videoId, {
          isProcessing: false
        });
      } else {
        setTimeout(checkStatus, 30000);
      }
    }
  };

  setTimeout(checkStatus, 30000);
};

router.post('/', async (c) => {
  try {
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN || !JWT_SECRET) {
      console.error('Server configuration error: Cloudflare credentials or JWT_SECRET missing.');
      return c.json({ success: false, message: 'Server configuration error.' }, 500);
    }

    const formData = await c.req.formData();
    const token = formData.get('token');
    const userEmail = verifyTokenAndGetUserId(token);

    if (!userEmail) {
      return c.json({ success: false, message: 'Invalid or missing token. Authentication required.' }, 401);
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return c.json({ success: false, message: 'User not found.' }, 404);
    }

    const title = formData.get('title');
    const description = formData.get('description');
    const tagsString = formData.get('tags');
    const videoFile = formData.get('videoFile');
    const customThumbnailFile = formData.get('thumbnailFile');
    const clientDuration = formData.get('duration');

    if (!(videoFile instanceof File) || videoFile.size === 0) {
      return c.json({ success: false, message: 'Video file is required and must be a valid file.' }, 400);
    }
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return c.json({ success: false, message: 'Title is required.' }, 400);
    }
    if (!description || typeof description !== 'string' || description.trim() === '') {
      return c.json({ success: false, message: 'Description is required.' }, 400);
    }

    // Check for blocked keywords in title and description
    const blockedKeywords = settingsManager.getBlockedKeywords();
    const contentToCheck = `${title} ${description} ${tagsString || ''}`.toLowerCase();
    
    for (const keyword of blockedKeywords) {
      if (contentToCheck.includes(keyword.toLowerCase())) {
        return c.json({ 
          success: false, 
          message: `Content contains blocked keyword: "${keyword}". Please remove it and try again.` 
        }, 400);
      }
    }

    let videoUploadResult;
    let finalThumbnailUrl;

    const videoFormData = new FormDataNode();
    const videoBuffer = await videoFile.arrayBuffer();
    videoFormData.append('file', Buffer.from(videoBuffer), videoFile.name);

    try {
      const response = await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`,
        videoFormData,
        {
          headers: {
            ...videoFormData.getHeaders(),
            'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );
      videoUploadResult = response.data.result;
      if (!videoUploadResult || !videoUploadResult.uid) {
        console.error('Cloudflare video upload response missing UID:', response.data);
        throw new Error('Cloudflare video upload failed to return essential data.');
      }
    } catch (error) {
      console.error('Error uploading video to Cloudflare:', error.response ? JSON.stringify(error.response.data) : error.message);
      return c.json({ success: false, message: 'Failed to upload video file to Cloudflare.' }, 500);
    }

    const cloudflareStreamId = videoUploadResult.uid;
    let defaultStreamThumbnail = videoUploadResult.thumbnail;

    const randomThumbnailTimestamp = 0.1 + (Math.random() * 0.8);
    
    try {
      await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${cloudflareStreamId}`,
        { thumbnailTimestampPct: randomThumbnailTimestamp },
        {
          headers: {
            'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      // console.log(`Set random thumbnail timestamp to ${(randomThumbnailTimestamp * 100).toFixed(1)}% for video ${cloudflareStreamId}`);
    } catch (error) {
      console.error('Error setting random thumbnail timestamp:', error.response ? JSON.stringify(error.response.data) : error.message);
    }

    const thumbnailUploadPromise = (async () => {
      if (customThumbnailFile instanceof File && customThumbnailFile.size > 0) {
        const imageFormData = new FormDataNode();
        const imageBuffer = await customThumbnailFile.arrayBuffer();

        try {
          const webpBuffer = await sharp(Buffer.from(imageBuffer))
            .webp()
            .toBuffer();

          const originalFileName = customThumbnailFile.name;
          const webpFileName = originalFileName.substring(0, originalFileName.lastIndexOf('.')) + '.webp';
          imageFormData.append('file', webpBuffer, webpFileName);

          const directUploadForm = new FormDataNode();
          directUploadForm.append('requireSignedURLs', 'false');

          const directUploadResponse = await axios.post(
            `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v2/direct_upload`,
            directUploadForm,
            {
              headers: {
                ...directUploadForm.getHeaders(),
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
              },
            }
          );

          const { uploadURL, id: imageId } = directUploadResponse.data.result;
          if (!uploadURL || !imageId) {
            console.error('Cloudflare image direct upload response missing data:', directUploadResponse.data);
            throw new Error('Failed to get Cloudflare image direct upload URL.');
          }

          const thumbHeadersForAxios = imageFormData.getHeaders();
          await axios.post(uploadURL, imageFormData, {
            headers: thumbHeadersForAxios,
          });

          return `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_HASH}/${imageId}/public`;
        } catch (error) {
          console.error('Error uploading custom thumbnail to Cloudflare:', error.response ? JSON.stringify(error.response.data) : error.message);
          return defaultStreamThumbnail;
        }
      } else {
        return defaultStreamThumbnail;
      }
    })();

    finalThumbnailUrl = await thumbnailUploadPromise;

    const slug = await generateUniqueSlug(title.trim());

    const videoData = {
      title: title.trim(),
      description: description.trim(),
      slug: slug,
      videoUrl: `https://customer-${CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${cloudflareStreamId}/iframe`,
      thumbnail: finalThumbnailUrl,
      duration: clientDuration ? Math.round(Number(clientDuration)) : -1,
      uploader: user._id,
      tags: tagsString && typeof tagsString === 'string' ? tagsString.split(' ').map(tag => tag.trim()).filter(tag => tag.length > 0) : [],
      cloudflareStreamId: cloudflareStreamId,
      isProcessing: true
    };

    const newVideo = new Video(videoData);
    await newVideo.save();

    const hasCustomThumbnail = customThumbnailFile instanceof File && customThumbnailFile.size > 0;
    checkVideoProcessingStatus(cloudflareStreamId, newVideo._id, hasCustomThumbnail).catch(error => {
      console.error('Error in background processing check:', error);
    });

    return c.json({
      success: true,
      message: 'Video uploaded successfully and is being processed!',
      video: {
        ...newVideo.toObject(),
        isProcessing: true
      },
    }, 201);

  } catch (error) {
    console.error('Error in POST /uploadVideo route:', error);
    if (error.code === 11000) {
      return c.json({ success: false, message: 'This video content (or its Cloudflare ID) seems to have already been uploaded.' }, 409);
    }
    return c.json({ success: false, message: 'An unexpected server error occurred.' }, 500);
  }
});

export default router;
