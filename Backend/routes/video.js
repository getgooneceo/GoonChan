import { Hono } from 'hono'
import Video from '../models/Video.js'
import User from '../models/User.js'
import { rateLimiter } from 'hono-rate-limiter'

const router = new Hono()

const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 250,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (c) => c.req.header('x-forwarded-for') || c.req.ip,
})

router.get('/:slug', limiter, async (c) => {
  try {
    const { slug } = c.req.param()

    if (!slug) {
      return c.json({ 
        success: false, 
        message: 'Video slug is required' 
      }, 400)
    }

    const video = await Video.findOne({ slug }).populate('uploader', 'username avatar avatarColor subscriberCount')
    
    if (!video) {
      return c.json({ 
        success: false, 
        message: 'Video not found' 
      }, 404)
    }

    await Video.findByIdAndUpdate(video._id, { $inc: { views: 1 } })

    const videoResponse = {
      _id: video._id,
      title: video.title,
      description: video.description,
      slug: video.slug,
      videoUrl: video.videoUrl,
      thumbnail: video.thumbnail,
      duration: video.duration,
      views: video.views + 1,
      likeCount: video.likeCount || 0,
      dislikeCount: video.dislikeCount || 0,
      tags: video.tags || [],
      cloudflareStreamId: video.cloudflareStreamId,
      createdAt: video.createdAt,
      uploader: {
        _id: video.uploader._id,
        username: video.uploader.username,
        avatar: video.uploader.avatar,
        avatarColor: video.uploader.avatarColor,
        subscriberCount: video.uploader.subscriberCount || 0
      }
    }
    
    return c.json({
      success: true,
      video: videoResponse
    }, 200)
    
  } catch (error) {
    console.error('Video retrieval error:', error)
    return c.json({ success: false, message: 'Server error', error: error.message }, 500)
  }
})

export default router