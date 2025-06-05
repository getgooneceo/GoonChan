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
    const { limit = 12, page = 1, excludeIds } = c.req.query()
    
    const limitNum = parseInt(limit) || 12;
    const pageNum = parseInt(page) || 1;
    const skip = (pageNum - 1) * limitNum;
    
    // Filter out modified IDs and keep only original MongoDB ObjectIds
    const excludedIds = excludeIds 
      ? excludeIds.split(',')
          .filter(id => id.trim())
          .filter(id => !id.includes('_copy_')) // Remove modified IDs
          .map(id => id.split('_copy_')[0]) // Extract original ID if somehow it got through
      : [];
      
    let matchCriteria = {};
    if (excludedIds.length > 0) {
      matchCriteria._id = { $nin: excludedIds };
    }

    const randomRecentCount = Math.round(limitNum * 0.15);
    const hotImagesCount = limitNum - randomRecentCount;

    try {
      const hotImages = await Image.find(matchCriteria)
        .populate('uploader', 'username avatar avatarColor subscriberCount')
        .sort({ hotness: -1 })
        .limit(hotImagesCount)
        .skip(skip)
        .lean();

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const hotImageIds = hotImages.map(image => image._id.toString());

      const recentMatchCriteria = {
        ...matchCriteria,
        createdAt: { $gte: sevenDaysAgo },
        _id: { $nin: [...excludedIds, ...hotImageIds] } 
      };

      const recentImageCount = await Image.countDocuments(recentMatchCriteria);
      
      let randomRecentImages = [];
      if (recentImageCount > 0 && randomRecentCount > 0) {
        const randomSkips = new Set();
        const maxSkip = Math.max(0, recentImageCount - randomRecentCount);
        
        while (randomSkips.size < Math.min(randomRecentCount, recentImageCount)) {
          randomSkips.add(Math.floor(Math.random() * (maxSkip + 1)));
        }

        const randomSkipArray = Array.from(randomSkips);
        const randomImagePromises = randomSkipArray.map(skipValue =>
          Image.findOne(recentMatchCriteria)
            .populate('uploader', 'username avatar avatarColor subscriberCount')
            .skip(skipValue)
            .lean()
        );

        randomRecentImages = (await Promise.all(randomImagePromises)).filter(image => image !== null);
      }

      const combinedImages = [...hotImages, ...randomRecentImages];

      for (let i = combinedImages.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combinedImages[i], combinedImages[j]] = [combinedImages[j], combinedImages[i]];
      }

      const formattedImages = combinedImages.map(image => ({
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
      console.error('Hot images with random recent error:', error);
      const images = await Image.find(matchCriteria)
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

      const totalImages = await Image.countDocuments(matchCriteria);
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
    }

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