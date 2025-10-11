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

// Verify JWT token
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

// Generate unique slug
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

/**
 * POST /api/completeVideoUpload
 * Client notifies server that upload is complete
 * Server verifies with Cloudflare and updates database
 * 
 * Expected formData: { token, cloudflareStreamId, title, description, tags, duration, thumbnailFile (optional) }
 */
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

    const cloudflareStreamId = formData.get('cloudflareStreamId');
    const title = formData.get('title');
    const description = formData.get('description');
    const tagsString = formData.get('tags');
    const clientDuration = formData.get('duration');
    const customThumbnailFile = formData.get('thumbnailFile');

    if (!cloudflareStreamId) {
      return c.json({ success: false, message: 'Cloudflare Stream ID is required.' }, 400);
    }
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return c.json({ success: false, message: 'Title is required.' }, 400);
    }
    if (!description || typeof description !== 'string' || description.trim() === '') {
      return c.json({ success: false, message: 'Description is required.' }, 400);
    }

    console.log(`[COMPLETE] Processing upload completion for stream ID: ${cloudflareStreamId}`);
    console.log(`[COMPLETE] Title: "${title}" by ${user.username}`);

    const hasPendingUpload = user.pendingUploads?.some(
      upload => upload.streamId === cloudflareStreamId
    );

    if (!hasPendingUpload) {
      console.error(`[COMPLETE] ❌ Unauthorized: streamId ${cloudflareStreamId} does not belong to ${user.username}`);
      return c.json({ 
        success: false, 
        message: 'Unauthorized: This upload does not belong to you.' 
      }, 403);
    }

    console.log(`[COMPLETE] ✅ Ownership verified`);

    const blockedKeywords = settingsManager.getBlockedKeywords();
    const contentToCheck = `${title} ${description} ${tagsString || ''}`.toLowerCase();

    for (const keyword of blockedKeywords) {
      if (contentToCheck.includes(keyword.toLowerCase())) {
        console.log(`[COMPLETE] ❌ Blocked keyword detected: "${keyword}"`);
        try {
          await axios.delete(
            `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${cloudflareStreamId}`,
            {
              headers: { 'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}` },
            }
          );
          console.log(`[COMPLETE] Deleted video ${cloudflareStreamId} due to blocked keyword`);
        } catch (deleteError) {
          console.error('[COMPLETE] Error deleting video from Cloudflare:', deleteError.message);
        }

        return c.json({
          success: false,
          message: `Content contains blocked keyword: "${keyword}". Video has been removed.`,
        }, 400);
      }
    }

    const existingVideo = await Video.findOne({ cloudflareStreamId });
    if (existingVideo) {
      console.log(`[COMPLETE] ❌ Video ${cloudflareStreamId} already processed`);
      return c.json({
        success: false,
        message: 'This video has already been processed.',
      }, 409);
    }

    let defaultStreamThumbnail = null;
    try {
      const response = await axios.get(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${cloudflareStreamId}`,
        {
          headers: { 'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}` },
        }
      );
      defaultStreamThumbnail = response.data?.result?.thumbnail || null;
    } catch (error) {
      console.error(`[COMPLETE] Could not verify video on Cloudflare:`, error.message);
      return c.json({ 
        success: false, 
        message: 'Failed to verify video with Cloudflare.' 
      }, 500);
    }

    // Explicitly set requireSignedURLs to false to make video publicly accessible
    // Using POST method as PATCH doesn't work for this setting on Cloudflare Stream
    let publicAccessSet = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const updateResponse = await axios.post(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${cloudflareStreamId}`,
          { requireSignedURLs: false },
          {
            headers: {
              'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (updateResponse.data?.success) {
          publicAccessSet = true;
          break;
        } else {
          console.error(`[COMPLETE] Attempt ${attempt}/3 - Update returned success: false`, updateResponse.data);
        }
      } catch (error) {
        console.error(`[COMPLETE] Attempt ${attempt}/3 - Error setting requireSignedURLs:`, error.response?.data || error.message);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds before retry
        }
      }
    }
    
    if (!publicAccessSet) {
      console.error('[COMPLETE] ⚠️ Failed to set requireSignedURLs to false after 3 attempts');
      console.error('[COMPLETE] ⚠️ This video may not play without signed URLs');
    }

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
    } catch (error) {
      console.error('[COMPLETE] Error setting thumbnail timestamp:', error.message);
    }

    let finalThumbnailUrl = defaultStreamThumbnail;
    let hasCustomThumbnail = false;
    
    const MAX_THUMBNAIL_SIZE = 10 * 1024 * 1024; // 10MB
    
    if (customThumbnailFile instanceof File && customThumbnailFile.size > 0) {
      // const thumbnailSizeKB = (customThumbnailFile.size / 1024).toFixed(2);
      // console.log(`[COMPLETE] Custom thumbnail detected`);
      
      if (customThumbnailFile.size > MAX_THUMBNAIL_SIZE) {
        console.log(`[COMPLETE] ⚠️ Thumbnail too large (max 10MB), using default Cloudflare thumbnail`);
      } else {
        hasCustomThumbnail = true;
      
      const imageFormData = new FormDataNode();
      const imageBuffer = await customThumbnailFile.arrayBuffer();

      try {
        // console.log(`[COMPLETE] Converting thumbnail to WebP format...`);
        const webpBuffer = await sharp(Buffer.from(imageBuffer))
          .webp()
          .toBuffer();
        
        // const webpSizeKB = (webpBuffer.length / 1024).toFixed(2);

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
          throw new Error('Failed to get Cloudflare image direct upload URL.');
        }

        // console.log(`[COMPLETE] Uploading thumbnail to Cloudflare Images...`);
        const thumbHeadersForAxios = imageFormData.getHeaders();
        await axios.post(uploadURL, imageFormData, {
          headers: thumbHeadersForAxios,
        });

        finalThumbnailUrl = `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_HASH}/${imageId}/public`;
        // console.log(`[COMPLETE] ✅ Custom thumbnail uploaded successfully`);
        } catch (error) {
          console.error('[COMPLETE] Error uploading custom thumbnail:', error.message);
          // console.log(`[COMPLETE] Falling back to default Cloudflare thumbnail`);
          finalThumbnailUrl = defaultStreamThumbnail;
          hasCustomThumbnail = false;
        }
      }
    } else {
      console.log('[COMPLETE] No custom thumbnail provided, using default Cloudflare thumbnail');
    }

    const slug = await generateUniqueSlug(title.trim());

    const videoData = {
      title: title.trim(),
      description: description.trim(),
      slug,
      videoUrl: `https://customer-${CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${cloudflareStreamId}/iframe`,
      thumbnail: finalThumbnailUrl,
      duration: clientDuration ? Math.round(Number(clientDuration)) : -1,
      uploader: user._id,
      tags: tagsString && typeof tagsString === 'string'
        ? tagsString.split(' ').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [],
      cloudflareStreamId,
      isProcessing: true,
    };

    const newVideo = new Video(videoData);
    await newVideo.save();

    try {
      await User.updateOne(
        { _id: user._id },
        { $pull: { pendingUploads: { streamId: cloudflareStreamId } } }
      );
    } catch (cleanupError) {
      console.error('[COMPLETE] Error cleaning up pending upload:', cleanupError.message);
    }
    checkVideoProcessingStatus(cloudflareStreamId, newVideo._id, hasCustomThumbnail).catch(error => {
      console.error('[COMPLETE] Error in background processing check:', error);
    });

    return c.json({
      success: true,
      message: 'Video upload completed successfully! Processing video...',
      video: {
        ...newVideo.toObject(),
        isProcessing: true,
      },
    }, 201);

  } catch (error) {
    console.error('[COMPLETE] Error completing video upload:', error);
    if (error.code === 11000) {
      return c.json({ 
        success: false, 
        message: 'This video content already exists.' 
      }, 409);
    }
    return c.json({ 
      success: false, 
      message: 'An unexpected server error occurred.' 
    }, 500);
  }
});

export default router;

