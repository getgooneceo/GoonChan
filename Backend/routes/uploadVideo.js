import { Hono } from 'hono';
import axios from 'axios';
import FormDataNode from 'form-data';
import Video, { generateSlug, generateRandomSuffix } from '../models/Video.js';
import User from '../models/User.js';
import { config } from "dotenv";
import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import os from 'os';
import path from 'path';
import fs from 'fs';
import tus from 'tus-js-client';
import https from 'https';
import settingsManager from '../services/settingsManager.js';

config();

const router = new Hono();

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_HASH = process.env.CLOUDFLARE_ACCOUNT_HASH || CLOUDFLARE_ACCOUNT_ID;
const JWT_SECRET = process.env.JWT_SECRET;

const httpsAgent = new https.Agent({ keepAlive: true, timeout: 0 });

// ---------------------------- Utility Functions ---------------------------- //

const verifyTokenAndGetUserId = (token) => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.email;
  } catch (error) {
    console.error("[AUTH] Token verification failed:", error.message);
    return null;
  }
};

const generateUniqueSlug = async (title) => {
  const baseSlug = generateSlug(title);
  const randomSuffix = generateRandomSuffix();
  let slug = `${baseSlug}-${randomSuffix}`;

  let counter = 1;
  while (await Video.findOne({ slug })) {
    slug = `${baseSlug}-${randomSuffix}${counter}`;
    counter++;
  }

  return slug;
};

// Function to check video processing status
const checkVideoProcessingStatus = async (cloudflareStreamId, videoDbId, hasCustomThumbnail) => {
  const maxAttempts = 30; // Check for up to 5 minutes (30 * 10 seconds)
  let attempts = 0;

  const checkStatus = async () => {
    try {
      const response = await axios.get(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${cloudflareStreamId}`,
        {
          headers: { 'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}` },
        }
      );

      const videoData = response.data?.result;
      const status = videoData?.status?.state;

      if (status === 'ready') {
        const updateData = {
          isProcessing: false,
          duration: videoData.duration || -1,
        };

        if (!hasCustomThumbnail && videoData.thumbnail) {
          updateData.thumbnail = videoData.thumbnail;
        }

        await Video.findByIdAndUpdate(videoDbId, updateData);
        console.log(`[PROCESS] Video ${cloudflareStreamId} processed successfully`);
        
        return true;
      } else if (status === 'error' || status === 'downloading-error' || status === 'processing-error') {
        console.error(`[PROCESS] Video processing failed: ${status}`);
        
        await Video.findByIdAndUpdate(videoDbId, {
          isProcessing: false,
          processingError: true,
        });
        
        return false;
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000);
        } else {
          console.warn(`[PROCESS] Processing timeout for ${cloudflareStreamId}`);
          await Video.findByIdAndUpdate(videoDbId, {
            isProcessing: false,
          });
        }
      }
    } catch (error) {
      console.error(`[PROCESS] Error checking status:`, error.message);
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkStatus, 10000);
      }
    }
  };

  // Start the first check after 5 seconds
  setTimeout(checkStatus, 5000);
};

// Background function to handle Cloudflare upload
const handleCloudflareUpload = async (videoDbId, videoFile, customThumbnailFile, clientDuration) => {
  let tempPath = null;
  let lastLoggedPercent = 0;
  
  try {
    console.log(`[BACKGROUND] Starting Cloudflare upload for video ${videoDbId}`);
    console.log(`[BACKGROUND] Video file: ${videoFile.name}`);
    
    // Save video to temp file
    tempPath = path.join(os.tmpdir(), `${Date.now()}-${videoFile.name}`);
    const buffer = Buffer.from(await videoFile.arrayBuffer());
    const bufferSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    console.log(`[BACKGROUND] Video buffer size: ${bufferSizeMB} MB`);
    
    console.log(`[BACKGROUND] Writing video to temp file: ${tempPath}`);
    fs.writeFileSync(tempPath, buffer);

    const fileSize = fs.statSync(tempPath).size;
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    console.log(`[BACKGROUND] Video file size: ${fileSizeMB} MB (${fileSize} bytes)`);
    
    const readStream = fs.createReadStream(tempPath);

    let uploadedVideoId = null;

    // TUS Upload
    const uploadPromise = new Promise((resolve, reject) => {
      const upload = new tus.Upload(readStream, {
        endpoint: `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`,
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        },
        chunkSize: 50 * 1024 * 1024, // 50 MB chunks
        uploadSize: fileSize,
        metadata: {
          name: videoFile.name,
          filetype: "video/mp4",
        },
        onError(error) {
          console.error(`[BACKGROUND] TUS upload failed for video ${videoDbId}:`, error);
          reject(error);
        },
        onProgress(bytesUploaded, bytesTotal) {
          const percent = Math.round((bytesUploaded / bytesTotal) * 100);
          const uploadedMB = (bytesUploaded / (1024 * 1024)).toFixed(2);
          const totalMB = (bytesTotal / (1024 * 1024)).toFixed(2);
          
          // Log every 10% or when upload completes
          if (percent >= lastLoggedPercent + 10 || percent === 100) {
            console.log(`[UPLOAD-PROGRESS] Video ${videoDbId}: ${percent}% (${uploadedMB}MB / ${totalMB}MB)`);
            lastLoggedPercent = percent;
          }
        },
        onAfterResponse(req, res) {
          const mediaIdHeader = res.getHeader("stream-media-id");
          if (mediaIdHeader) {
            uploadedVideoId = mediaIdHeader;
            console.log(`[BACKGROUND] Received Cloudflare Stream ID: ${mediaIdHeader}`);
          }
          return Promise.resolve();
        },
        onSuccess() {
          console.log(`[BACKGROUND] TUS upload completed successfully for video ${videoDbId}`);
          resolve(uploadedVideoId);
        },
      });

      console.log(`[BACKGROUND] Starting TUS upload for video ${videoDbId}...`);
      upload.start();
    });

    uploadedVideoId = await uploadPromise;
    
    console.log(`[BACKGROUND] Cleaning up temp file for video ${videoDbId}...`);
    // Clean up temp file
    if (tempPath && fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
      console.log(`[BACKGROUND] Temp file deleted: ${tempPath}`);
      tempPath = null;
    }

    const cloudflareStreamId = uploadedVideoId;
    let defaultStreamThumbnail = null;

    // Fetch default thumbnail
    console.log(`[BACKGROUND] Fetching default thumbnail for video ${videoDbId}...`);
    try {
      const response = await axios.get(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${cloudflareStreamId}`,
        {
          headers: { 'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}` },
        }
      );
      defaultStreamThumbnail = response.data?.result?.thumbnail || null;
      console.log(`[BACKGROUND] Default thumbnail URL: ${defaultStreamThumbnail}`);
    } catch (error) {
      console.error(`[BACKGROUND] Could not fetch default thumbnail:`, error.message);
    }

    // Set random thumbnail timestamp
    const randomThumbnailTimestamp = 0.1 + (Math.random() * 0.8);
    console.log(`[BACKGROUND] Setting random thumbnail timestamp (${(randomThumbnailTimestamp * 100).toFixed(1)}%) for video ${videoDbId}...`);
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
      console.log(`[BACKGROUND] Thumbnail timestamp set successfully`);
    } catch (error) {
      console.error('[BACKGROUND] Error setting thumbnail timestamp:',
        error.response ? JSON.stringify(error.response.data) : error.message);
    }

    // Upload custom thumbnail if provided
    let finalThumbnailUrl = defaultStreamThumbnail;
    if (customThumbnailFile instanceof File && customThumbnailFile.size > 0) {
      const thumbnailSizeKB = (customThumbnailFile.size / 1024).toFixed(2);
      console.log(`[BACKGROUND] Custom thumbnail detected for video ${videoDbId}`);
      console.log(`[BACKGROUND] Thumbnail size: ${thumbnailSizeKB} KB`);
      console.log(`[BACKGROUND] Thumbnail filename: ${customThumbnailFile.name}`);
      
      const imageFormData = new FormDataNode();
      const imageBuffer = await customThumbnailFile.arrayBuffer();

      try {
        console.log(`[BACKGROUND] Converting thumbnail to WebP format...`);
        const webpBuffer = await sharp(Buffer.from(imageBuffer))
          .webp()
          .toBuffer();
        
        const webpSizeKB = (webpBuffer.length / 1024).toFixed(2);
        console.log(`[BACKGROUND] WebP conversion complete, size: ${webpSizeKB} KB`);

        const originalFileName = customThumbnailFile.name;
        const webpFileName = originalFileName.substring(0, originalFileName.lastIndexOf('.')) + '.webp';
        imageFormData.append('file', webpBuffer, webpFileName);

        console.log(`[BACKGROUND] Requesting Cloudflare Images direct upload URL...`);
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
          console.error('[BACKGROUND] Missing uploadURL or imageId:', directUploadResponse.data);
          throw new Error('Failed to get Cloudflare image direct upload URL.');
        }
        console.log(`[BACKGROUND] Upload URL obtained, image ID: ${imageId}`);

        console.log(`[BACKGROUND] Uploading thumbnail to Cloudflare Images...`);
        const thumbHeadersForAxios = imageFormData.getHeaders();
        await axios.post(uploadURL, imageFormData, {
          headers: thumbHeadersForAxios,
        });

        finalThumbnailUrl = `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_HASH}/${imageId}/public`;
        console.log(`[BACKGROUND] ✅ Custom thumbnail uploaded successfully`);
        console.log(`[BACKGROUND] Thumbnail URL: ${finalThumbnailUrl}`);
      } catch (error) {
        console.error('[BACKGROUND] Error uploading custom thumbnail:',
          error.response ? JSON.stringify(error.response.data) : error.message);
        console.log(`[BACKGROUND] Falling back to default Cloudflare thumbnail`);
        finalThumbnailUrl = defaultStreamThumbnail;
      }
    } else {
      console.log('[BACKGROUND] No custom thumbnail provided, using default Cloudflare thumbnail');
    }

    // Update video with Cloudflare data
    console.log(`[BACKGROUND] Updating database for video ${videoDbId}...`);
    const updateData = {
      videoUrl: `https://customer-${CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${cloudflareStreamId}/iframe`,
      cloudflareStreamId,
      thumbnail: finalThumbnailUrl,
      duration: clientDuration ? Math.round(Number(clientDuration)) : -1,
      isProcessing: true,
    };

    await Video.findByIdAndUpdate(videoDbId, updateData);
    
    console.log(`[BACKGROUND] ✅ Upload complete for video ${videoDbId}`);
    console.log(`[BACKGROUND] Stream ID: ${cloudflareStreamId}`);
    console.log(`[BACKGROUND] Video URL: ${updateData.videoUrl}`);
    console.log(`[BACKGROUND] Duration: ${updateData.duration}s`);

    // Start processing status check
    const hasCustomThumbnail = customThumbnailFile instanceof File && customThumbnailFile.size > 0;
    checkVideoProcessingStatus(cloudflareStreamId, videoDbId, hasCustomThumbnail).catch(error => {
      console.error('[BACKGROUND] Error in background processing check:', error);
    });

  } catch (error) {
    console.error(`[BACKGROUND] ❌ Upload failed for video ${videoDbId}`);
    console.error(`[BACKGROUND] Error details:`, error.message);
    console.error(`[BACKGROUND] Stack trace:`, error.stack);
    
    // Clean up temp file if it exists
    if (tempPath && fs.existsSync(tempPath)) {
      try {
        console.log(`[BACKGROUND] Cleaning up temp file after error...`);
        fs.unlinkSync(tempPath);
        console.log(`[BACKGROUND] Temp file deleted: ${tempPath}`);
      } catch (cleanupError) {
        console.error('[BACKGROUND] Error cleaning up temp file:', cleanupError);
      }
    }
    
    // Delete the video from database on upload failure
    try {
      console.log(`[BACKGROUND] Removing failed video ${videoDbId} from database...`);
      await Video.findByIdAndDelete(videoDbId);
      console.log(`[BACKGROUND] Video ${videoDbId} removed from database due to upload failure`);
    } catch (deleteError) {
      console.error(`[BACKGROUND] Error deleting video ${videoDbId}:`, deleteError);
    }
  }
};

// ---------------------------- Main Upload Route ---------------------------- //

router.post('/', async (c) => {
  try {
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN || !JWT_SECRET) {
      console.error("[CONFIG] Missing Cloudflare or JWT credentials");
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
      console.error(`[AUTH] User not found: ${userEmail}`);
      return c.json({ success: false, message: 'User not found.' }, 404);
    }

    const title = formData.get('title');
    const description = formData.get('description');
    const tagsString = formData.get('tags');
    const videoFile = formData.get('videoFile');
    const customThumbnailFile = formData.get('thumbnailFile');
    const clientDuration = formData.get('duration');

    // console.log(`[UPLOAD] Received upload request - Video: ${videoFile?.name}, Thumbnail: ${customThumbnailFile?.name || 'None'}`);

    if (!(videoFile instanceof File) || videoFile.size === 0) {
      return c.json({ success: false, message: 'Video file is required and must be valid.' }, 400);
    }
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return c.json({ success: false, message: 'Title is required.' }, 400);
    }
    if (!description || typeof description !== 'string' || description.trim() === '') {
      return c.json({ success: false, message: 'Description is required.' }, 400);
    }

    // Check blocked keywords
    const blockedKeywords = settingsManager.getBlockedKeywords();
    const contentToCheck = `${title} ${description} ${tagsString || ''}`.toLowerCase();

    for (const keyword of blockedKeywords) {
      if (contentToCheck.includes(keyword.toLowerCase())) {
        return c.json({
          success: false,
          message: `Content contains blocked keyword: "${keyword}". Remove it and try again.`,
        }, 400);
      }
    }

    // Generate slug
    const slug = await generateUniqueSlug(title.trim());

    // Create video entry in database with placeholder data
    const videoData = {
      title: title.trim(),
      description: description.trim(),
      slug,
      videoUrl: 'processing', // Placeholder until upload completes
      thumbnail: '/placeholder-thumbnail.jpg', // Placeholder thumbnail
      duration: clientDuration ? Math.round(Number(clientDuration)) : -1,
      uploader: user._id,
      tags: tagsString && typeof tagsString === 'string'
        ? tagsString.split(' ').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [],
      cloudflareStreamId: 'processing', // Placeholder until upload completes
      isProcessing: true, // Mark as processing
    };

    const newVideo = new Video(videoData);
    await newVideo.save();

    const videoSizeMB = (videoFile.size / (1024 * 1024)).toFixed(2);
    console.log(`[UPLOAD] ✅ Video metadata saved successfully`);
    console.log(`[UPLOAD] Video ID: ${newVideo._id}`);
    console.log(`[UPLOAD] Title: "${title}"`);
    console.log(`[UPLOAD] Video size: ${videoSizeMB} MB`);
    console.log(`[UPLOAD] Uploader: ${user.username} (${user.email})`);
    console.log(`[UPLOAD] Starting background upload process...`);

    // Trigger background upload (fire and forget)
    handleCloudflareUpload(newVideo._id, videoFile, customThumbnailFile, clientDuration).catch(error => {
      console.error('[UPLOAD] Error in background upload handler:', error);
    });

    console.log(`[UPLOAD] Request completed, client can navigate away`);

    // Return immediately to user
    return c.json({
      success: true,
      message: 'Video received and is being uploaded! You can navigate away.',
      video: {
        ...newVideo.toObject(),
        isProcessing: true,
      },
    }, 201);

  } catch (error) {
    console.error('[UPLOAD] Error in video upload route:', error);
    if (error.code === 11000) {
      return c.json({ success: false, message: 'This video content (or its Cloudflare ID) seems to have already been uploaded.' }, 409);
    }
    return c.json({ success: false, message: 'An unexpected server error occurred.' }, 500);
  }
});

export default router;