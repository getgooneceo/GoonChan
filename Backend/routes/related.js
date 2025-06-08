import { Hono } from 'hono'
import Video from '../models/Video.js'
import { rateLimiter } from 'hono-rate-limiter'

const router = new Hono()

const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 150,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (c) => c.req.header('x-forwarded-for') || c.req.ip,
})

router.get('/:contentId', limiter, async (c) => {
  try {
    const { contentId } = c.req.param()
    const { limit = 12, excludeIds } = c.req.query()
    
    const limitNum = Math.min(parseInt(limit) || 12, 20);

    const excludedIds = excludeIds 
      ? excludeIds.split(',').filter(id => id.trim())
      : [];

    let matchCriteria = { 
      isProcessing: false,
      _id: { $ne: contentId }
    };
    
    if (excludedIds.length > 0) {
      matchCriteria._id = { $nin: [...excludedIds, contentId] };
    }

    const currentVideo = await Video.findById(contentId)
      .populate('uploader', '_id username')
      .lean();

    if (!currentVideo) {
      return c.json({
        success: false,
        message: 'Video not found'
      }, 404);
    }   
    let relatedVideos = [];

    const sameUploaderCount = Math.ceil(limitNum * 0.5);
    const sameUploaderVideos = await Video.find({
      ...matchCriteria,
      uploader: currentVideo.uploader._id
    })
      .populate('uploader', 'username avatar avatarColor subscriberCount')
      .sort({ createdAt: -1 })
      .limit(sameUploaderCount)
      .lean();

    relatedVideos = [...sameUploaderVideos];

    const remainingSlots = limitNum - relatedVideos.length;
    if (remainingSlots > 0 && currentVideo.tags && currentVideo.tags.length > 0) {
      const usedVideoIds = relatedVideos.map(v => v._id.toString());
      
      const tagBasedVideos = await Video.find({
        ...matchCriteria,
        tags: { $in: currentVideo.tags },
        _id: { $nin: [...excludedIds, contentId, ...usedVideoIds] }
      })
        .populate('uploader', 'username avatar avatarColor subscriberCount')
        .sort({ hotness: -1 })
        .limit(remainingSlots)
        .lean();

      relatedVideos = [...relatedVideos, ...tagBasedVideos];
    }

    const stillRemainingSlots = limitNum - relatedVideos.length;
    if (stillRemainingSlots > 0) {
      const usedVideoIds = relatedVideos.map(v => v._id.toString());
      
      const popularVideos = await Video.find({
        ...matchCriteria,
        _id: { $nin: [...excludedIds, contentId, ...usedVideoIds] }
      })
        .populate('uploader', 'username avatar avatarColor subscriberCount')
        .sort({ views: -1 })
        .limit(stillRemainingSlots)
        .lean();

      relatedVideos = [...relatedVideos, ...popularVideos];
    }

    // Format the videos
    const formattedVideos = relatedVideos.map(video => ({
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

    return c.json({
      success: true,
      videos: formattedVideos,
      total: formattedVideos.length,
      currentVideo: {
        id: currentVideo._id,
        title: currentVideo.title,
        uploader: currentVideo.uploader.username
      }
    }, 200);

  } catch (error) {
    console.error('Related videos error:', error);
    return c.json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    }, 500);
  }
});

export default router