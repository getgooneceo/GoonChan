import { Hono } from 'hono';
import axios from 'axios';
import FormDataNode from 'form-data';
import Image, { generateSlug, generateRandomSuffix } from '../models/Image.js';
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
  while (await Image.findOne({ slug: slug })) {
    slug = `${baseSlug}-${randomSuffix}${counter}`;
    counter++;
  }

  return slug;
};

const uploadImageToCloudflare = async (imageFile) => {
  try {
    const imageBuffer = await imageFile.arrayBuffer();

    let webpBuffer;
    webpBuffer = await sharp(Buffer.from(imageBuffer))
      .webp({ quality: 85 })
      .toBuffer();

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

    const imageFormData = new FormDataNode();
    const originalFileName = imageFile.name;
    const webpFileName = originalFileName.substring(0, originalFileName.lastIndexOf('.')) + '.webp';
    imageFormData.append('file', webpBuffer, webpFileName);

    await axios.post(uploadURL, imageFormData, {
      headers: imageFormData.getHeaders(),
    });

    return `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_HASH}/${imageId}/public`;
  } catch (error) {
    console.error('Error uploading image to Cloudflare:', error.response ? JSON.stringify(error.response.data) : error.message);
    throw error;
  }
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
    const thumbnailIndex = parseInt(formData.get('thumbnailIndex')) || 0;

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

    const imageFiles = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('imageFile') && value instanceof File && value.size > 0) {
        imageFiles.push(value);
      }
    }

    if (imageFiles.length === 0) {
      return c.json({ success: false, message: 'At least one image file is required.' }, 400);
    }

    if (imageFiles.length > 12) {
      return c.json({ success: false, message: 'Maximum 12 images allowed per upload.' }, 400);
    }

    if (thumbnailIndex < 0 || thumbnailIndex >= imageFiles.length) {
      return c.json({ success: false, message: 'Invalid thumbnail index.' }, 400);
    }

    const uploadPromises = imageFiles.map((file, index) => 
      uploadImageToCloudflare(file).catch(error => {
        error.fileName = file.name;
        error.fileIndex = index;
        throw error;
      })
    );
    
    let imageUrls;
    try {
      imageUrls = await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading images to Cloudflare:', error.message);
      
      const fileInfo = error.fileName ? ` (File: "${error.fileName}", Position: ${(error.fileIndex || 0) + 1})` : '';
      
      if (error.message.includes('HEIF') || error.message.includes('heif')) {
        return c.json({ 
          success: false, 
          message: `HEIF/HEIC format is not supported${fileInfo}. Please convert your images to JPG, PNG, or WebP format before uploading.`,
        }, 400);
      }
      
      if (error.message.includes('format') || error.message.includes('unsupported')) {
        return c.json({ 
          success: false, 
          message: `${error.message}${fileInfo}`,
        }, 400);
      }
      
      return c.json({ 
        success: false, 
        message: `Failed to upload images${fileInfo}. Please check your image formats and try again.`,
      }, 500);
    }
    const slug = await generateUniqueSlug(title.trim());

    const imageData = {
      title: title.trim(),
      description: description.trim(),
      slug: slug,
      imageUrls: imageUrls,
      thumbnailIndex: thumbnailIndex,
      uploader: user._id,
      tags: tagsString && typeof tagsString === 'string' 
        ? tagsString.split(' ').map(tag => tag.trim()).filter(tag => tag.length > 0) 
        : [],
    };

    const newImage = new Image(imageData);
    await newImage.save();

    return c.json({
      success: true,
      message: 'Images uploaded successfully!',
      image: newImage,
    }, 201);

  } catch (error) {
    console.error('Error in POST /uploadImage route:', error);
    if (error.code === 11000) {
      return c.json({ success: false, message: 'This image content seems to have already been uploaded.' }, 409);
    }
    return c.json({ success: false, message: 'An unexpected server error occurred.' }, 500);
  }
});

export default router;