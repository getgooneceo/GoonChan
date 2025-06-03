import { Hono } from 'hono'
import Video from '../models/Video.js'
import User from '../models/User.js'
import jwt from 'jsonwebtoken'
import { rateLimiter } from 'hono-rate-limiter'

const router = new Hono()

const JWT_SECRET = process.env.JWT_SECRET

const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 250,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (c) => c.req.header('x-forwarded-for') || c.req.ip,
})

const verifyTokenAndGetUser = async (token) => {
  if (!token) {
    return { user: null, userId: null };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });
    
    if (!user) {
      return { user: null, userId: null };
    }

    return { user, userId: user._id };
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return { user: null, userId: null };
  }
};

router.get('/', limiter, async (c) => {
  try {
    const { limit = 12, page = 1, sort = 'hot', token } = c.req.query()
    
    const limitNum = parseInt(limit) || 12;
    const pageNum = parseInt(page) || 1;
    const skip = (pageNum - 1) * limitNum;

    // Handle random case - redirect to a random video
    if (sort === 'random') {
      try {
        const totalVideos = await Video.countDocuments({});
        if (totalVideos === 0) {
          return c.json({
            success: false,
            message: 'No videos available for random selection'
          }, 404);
        }

        const randomSkip = Math.floor(Math.random() * totalVideos);
        const randomVideo = await Video.findOne({}).skip(randomSkip).lean();
        
        if (!randomVideo) {
          return c.json({
            success: false,
            message: 'Failed to find random video'
          }, 404);
        }

        return c.json({
          success: true,
          redirect: true,
          videoSlug: randomVideo.slug,
          message: 'Random video selected'
        }, 200);
      } catch (error) {
        console.error('Random video selection error:', error);
        return c.json({
          success: false,
          message: 'Failed to select random video'
        }, 500);
      }
    }

    let sortCriteria = {};
    let matchCriteria = { isProcessing: false };

    switch (sort) {
      case 'top':
        sortCriteria = { views: -1 };
        break;
      case 'recent':
        sortCriteria = { createdAt: -1 };
        break;
      case 'hot':
      default:
        const randomRecentCount = Math.round(limitNum * 0.15);
        const hotVideosCount = limitNum - randomRecentCount;

        try {
          const hotVideos = await Video.find(matchCriteria)
            .populate('uploader', 'username avatar avatarColor subscriberCount')
            .sort({ hotness: -1 })
            .limit(hotVideosCount)
            .skip(skip)
            .lean();

          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const hotVideoIds = hotVideos.map(video => video._id.toString());
          
          const recentMatchCriteria = {
            ...matchCriteria,
            createdAt: { $gte: sevenDaysAgo },
            _id: { $nin: hotVideoIds } 
          };

          const recentVideoCount = await Video.countDocuments(recentMatchCriteria);
          
          let randomRecentVideos = [];
          if (recentVideoCount > 0 && randomRecentCount > 0) {
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

            randomRecentVideos = (await Promise.all(randomVideoPromises)).filter(video => video !== null);
          }

          const combinedVideos = [...hotVideos, ...randomRecentVideos];

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

          const totalVideos = await Video.countDocuments(matchCriteria);
          const totalPages = Math.ceil(totalVideos / limitNum);
          const hasNextPage = pageNum < totalPages;
          const hasPrevPage = pageNum > 1;

          return c.json({
            success: true,
            videos: formattedVideos,
            sort: sort,
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
          console.error('Hot videos with random recent error:', error);
          sortCriteria = { hotness: -1 };
        }
        break;
      case 'subscriptions':
        const { user, userId } = await verifyTokenAndGetUser(token);
        
        if (!user) {
          return c.json({
            success: false,
            message: 'Authentication required to view subscriptions',
            requiresAuth: true
          }, 401);
        }

        if (!user.subscriptions || user.subscriptions.length === 0) {
          return c.json({
            success: true,
            videos: [],
            message: "You haven't subscribed to anyone yet. Subscribe to creators to see their content here!",
            isEmpty: true,
            pagination: {
              currentPage: pageNum,
              totalPages: 0,
              totalVideos: 0,
              hasNextPage: false,
              hasPrevPage: false,
              limit: limitNum
            }
          }, 200);
        }

        matchCriteria = { 
          uploader: { $in: user.subscriptions },
          isProcessing: false
        };
        sortCriteria = { createdAt: -1 };
        break;
    }

    const videos = await Video.find(matchCriteria)
      .populate('uploader', 'username avatar avatarColor subscriberCount')
      .sort(sortCriteria)
      .limit(limitNum)
      .skip(skip)
      .lean();

    if (!videos || videos.length === 0) {
      let message = 'No videos found';
      if (sort === 'subscriptions') {
        message = "No recent videos from your subscriptions. Your subscribed creators haven't posted anything yet.";
      }

      return c.json({
        success: true,
        videos: [],
        message: message,
        isEmpty: true
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

    const totalVideos = await Video.countDocuments(matchCriteria);
    const totalPages = Math.ceil(totalVideos / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    return c.json({
      success: true,
      videos: formattedVideos,
      sort: sort,
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