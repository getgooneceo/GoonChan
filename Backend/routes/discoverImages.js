import { Hono } from 'hono'
import Image from '../models/Image.js'
import { rateLimiter } from 'hono-rate-limiter'

const router = new Hono()

const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 250,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (c) => c.req.header('x-forwarded-for') || c.req.ip,
})

router.get('/', limiter, async (c) => {
  try {
    const { limit = 12, page = 1 } = c.req.query()
    
    const limitNum = parseInt(limit) || 12;
    const pageNum = parseInt(page) || 1;
    const skip = (pageNum - 1) * limitNum;

    // Fetch images sorted by hotness (descending) with pagination
    const images = await Image.find({})
      .populate('uploader', 'username avatar avatarColor subscriberCount')
      .sort({ hotness: -1 })
      .limit(limitNum)
      .skip(skip)
      .lean();

    if (!images || images.length === 0) {
      return c.json({
        success: true,
        images: [],
        message: 'No images found'
      }, 200);
    }

    // Format images for response - only essential feed data
    const formattedImages = images.map(image => ({
      _id: image._id,
      title: image.title,
      description: image.description,
      slug: image.slug,
      imageUrls: image.imageUrls,
      thumbnailIndex: image.thumbnailIndex,
      views: image.views,
      likeCount: image.likedBy?.length || 0,
      dislikeCount: image.dislikedBy?.length || 0,
      tags: image.tags || [],
      createdAt: image.createdAt,
      hotness: image.hotness,
      uploader: {
        _id: image.uploader._id,
        username: image.uploader.username,
        avatar: image.uploader.avatar,
        avatarColor: image.uploader.avatarColor,
        subscriberCount: image.uploader.subscriberCount || 0
      }
    }));

    // Get total count for pagination info
    const totalImages = await Image.countDocuments({});
    const totalPages = Math.ceil(totalImages / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    return c.json({
      success: true,
      images: formattedImages,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalImages,
        hasNextPage,
        hasPrevPage,
        limit: limitNum
      }
    }, 200);

  } catch (error) {
    console.error('Discover images error:', error);
    return c.json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    }, 500);
  }
});

export default router