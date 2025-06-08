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

router.get('/', limiter, async (c) => {
  try {
    const { limit = 12, excludeId, excludeIds } = c.req.query()
    
    const limitNum = Math.min(parseInt(limit) || 12, 20);

    let excludedIds = [];
    if (excludeIds) {
      excludedIds = excludeIds.split(',').filter(id => id.trim());
    }
    if (excludeId) {
      excludedIds.push(excludeId);
    }

    let matchCriteria = { isProcessing: false };
    if (excludedIds.length > 0) {
      matchCriteria._id = { $nin: excludedIds };
    }

    const hotVideosCount = Math.round(limitNum * 0.7);
    const randomRecentCount = limitNum - hotVideosCount; 

    const hotVideos = await Video.find(matchCriteria)
      .populate('uploader', 'username avatar avatarColor subscriberCount')
      .sort({ hotness: -1 })
      .limit(hotVideosCount)
      .lean();

    let combinedVideos = [...hotVideos];

    if (combinedVideos.length < limitNum && randomRecentCount > 0) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const hotVideoIds = hotVideos.map(video => video._id.toString());
      
      const recentMatchCriteria = {
        ...matchCriteria,
        createdAt: { $gte: sevenDaysAgo },
        _id: { $nin: [...excludedIds, ...hotVideoIds] }
      };

      const recentVideoCount = await Video.countDocuments(recentMatchCriteria);
      
      if (recentVideoCount > 0) {
        const randomSkips = new Set();
        const maxSkip = Math.max(0, recentVideoCount - randomRecentCount);
        
        while (randomSkips.size < Math.min(randomRecentCount, recentVideoCount)) {
          randomSkips.add(Math.floor(Math.random() * (maxSkip + 1)));
        }

        const randomSkipArray = Array.from(randomSkips);
        const randomVideoPromises = randomSkipArray.map(skipValue =>
          Video.findOne(recentMatchCriteria)
            .populate('uploader', 'username avatar avatarColor subscriberCount')
            .skip(skipValue)
            .lean()
        );

        const randomRecentVideos = (await Promise.all(randomVideoPromises)).filter(video => video !== null);
        combinedVideos = [...combinedVideos, ...randomRecentVideos];
      }
    }

    for (let i = combinedVideos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combinedVideos[i], combinedVideos[j]] = [combinedVideos[j], combinedVideos[i]];
    }

    const formattedVideos = combinedVideos.map(video => ({
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
      algorithm: 'hotness-based'
    }, 200);

  } catch (error) {
    console.error('Recommended videos error:', error);
    return c.json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    }, 500);
  }
});

export default router