import { Hono } from 'hono';
import axios from 'axios';
import FormDataNode from 'form-data';
import { config } from "dotenv";
import jwt from 'jsonwebtoken';
import settingsManager from '../services/settingsManager.js';
import User from '../models/User.js';

config();

const router = new Hono();

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
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

/**
 * POST /api/requestVideoUploadUrl
 * Client requests a direct upload URL from Cloudflare (API key stays on server)
 * Now includes early validation of content for blocked keywords
 * 
 * Expected body: { token, fileName, fileSize, title, description, tags }
 * Returns: { success, uploadUrl, uid }
 */
router.post('/', async (c) => {
  try {
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN || !JWT_SECRET) {
      console.error("[CONFIG] Missing Cloudflare or JWT credentials");
      return c.json({ success: false, message: 'Server configuration error.' }, 500);
    }

    const body = await c.req.json();
    const { token, fileName, fileSize, title, description, tags } = body;

    const userEmail = verifyTokenAndGetUserId(token);
    if (!userEmail) {
      return c.json({ success: false, message: 'Invalid or missing token. Authentication required.' }, 401);
    }

    const MAX_TITLE_LENGTH = 100;
    const MAX_DESCRIPTION_LENGTH = 500;
    const MAX_TAGS_LENGTH = 250;
    const MAX_FILE_SIZE = 1024 * 1024 * 1024 * 5; // 5GB
    const MIN_FILE_SIZE = 1024; // 1KB

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return c.json({ success: false, message: 'Title is required.' }, 400);
    }
    if (title.length > MAX_TITLE_LENGTH) {
      return c.json({ success: false, message: `Title must be ${MAX_TITLE_LENGTH} characters or less.` }, 400);
    }

    if (!description || typeof description !== 'string' || description.trim() === '') {
      return c.json({ success: false, message: 'Description is required.' }, 400);
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return c.json({ success: false, message: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less.` }, 400);
    }

    if (tags && typeof tags === 'string' && tags.length > MAX_TAGS_LENGTH) {
      return c.json({ success: false, message: 'Tags are too long.' }, 400);
    }

    if (!fileName || typeof fileName !== 'string') {
      return c.json({ success: false, message: 'Valid file name is required.' }, 400);
    }
    if (!fileSize || typeof fileSize !== 'number') {
      return c.json({ success: false, message: 'Valid file size is required.' }, 400);
    }
    if (fileSize > MAX_FILE_SIZE) {
      return c.json({ 
        success: false, 
        message: `File size must be less than ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB.` 
      }, 400);
    }
    if (fileSize < MIN_FILE_SIZE) {
      return c.json({ success: false, message: 'File is too small or invalid.' }, 400);
    }

    const blockedKeywords = settingsManager.getBlockedKeywords();
    const contentToCheck = `${title} ${description} ${tags || ''}`.toLowerCase();

    for (const keyword of blockedKeywords) {
      if (contentToCheck.includes(keyword.toLowerCase())) {
        console.log(`[UPLOAD-URL] ❌ Blocked keyword detected: "${keyword}" in content from ${userEmail}`);
        return c.json({
          success: false,
          message: `Content contains blocked keyword: "${keyword}". Upload rejected.`,
        }, 400);
      }
    }

    const tusEndpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`;
    
    const formData = new FormDataNode();
    formData.append('maxDurationSeconds', '3600'); // 1 hour max
    
    const response = await axios.post(
      `${tusEndpoint}?direct_user=true`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Tus-Resumable': '1.0.0',
          'Upload-Length': fileSize.toString(),
          'Upload-Metadata': `name ${Buffer.from(fileName).toString('base64')},requiresignedurls ${Buffer.from('false').toString('base64')}`,
        },
        maxRedirects: 0,
        validateStatus: (status) => status === 201 || status < 500,
      }
    );

    if (response.status !== 201) {
      console.error('[UPLOAD-URL] Failed to get upload URL:', response.data);
      return c.json({ 
        success: false, 
        message: 'Failed to generate upload URL from Cloudflare.' 
      }, 500);
    }

    const uploadUrl = response.headers.location;
    const streamMediaId = response.headers['stream-media-id'];

    if (!uploadUrl || !streamMediaId) {
      console.error('[UPLOAD-URL] Missing upload URL or stream media ID');
      return c.json({ 
        success: false, 
        message: 'Invalid response from Cloudflare.' 
      }, 500);
    }

    try {
      const user = await User.findOne({ email: userEmail });
      if (!user) {
        console.error('[UPLOAD-URL] User not found:', userEmail);
        return c.json({ success: false, message: 'User not found.' }, 404);
      }

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      await User.updateOne(
        { _id: user._id },
        { 
          $pull: { pendingUploads: { timestamp: { $lt: twoHoursAgo } } }
        }
      );

      await User.updateOne(
        { _id: user._id },
        { 
          $push: { pendingUploads: { streamId: streamMediaId, timestamp: new Date() } }
        }
      );

    } catch (dbError) {
      console.error('[UPLOAD-URL] Database error storing pending upload:', dbError);
    }

    return c.json({
      success: true,
      uploadUrl,
      uid: streamMediaId,
    });

  } catch (error) {
    console.error('[UPLOAD-URL] Error generating upload URL:', error);
    return c.json({ 
      success: false, 
      message: 'An unexpected error occurred while generating upload URL.' 
    }, 500);
  }
});

export default router;

