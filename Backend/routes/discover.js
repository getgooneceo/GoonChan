import { Hono } from 'hono'
import Video from '../models/Video.js'
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

    const videos = await Video.find({})
      .populate('uploader', 'username avatar avatarColor subscriberCount')
      .sort({ hotness: -1 })
      .limit(limitNum)
      .skip(skip)
      .lean();

    if (!videos || videos.length === 0) {
      return c.json({
        success: true,
        videos: [],
        message: 'No videos found'
      }, 200);
    }

    const formattedVideos = videos.map(video => ({
      _id: video._id,
      title: video.title,
      description: video.description,
      slug: video.slug,
      thumbnail: video.thumbnail,
      duration: video.duration,
      views: video.views,
      likeCount: video.likedBy?.length || 0,
      dislikeCount: video.dislikedBy?.length || 0,
      tags: video.tags || [],
      createdAt: video.createdAt,
      hotness: video.hotness,
      uploader: {
        _id: video.uploader._id,
        username: video.uploader.username,
        avatar: video.uploader.avatar,
        avatarColor: video.uploader.avatarColor,
        subscriberCount: video.uploader.subscriberCount || 0
      }
    }));

    const totalVideos = await Video.countDocuments({});
    const totalPages = Math.ceil(totalVideos / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    return c.json({
      success: true,
      videos: formattedVideos,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalVideos,
        hasNextPage,
        hasPrevPage,
        limit: limitNum
      }
    }, 200);

  } catch (error) {
    console.error('Discover videos error:', error);
    return c.json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    }, 500);
  }
});

export default router