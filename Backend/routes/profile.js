import { Hono } from 'hono'
import User from '../models/User.js'
import Video from '../models/Video.js'
import Image from '../models/Image.js'
import { rateLimiter } from 'hono-rate-limiter'
import jwt from 'jsonwebtoken'

const router = new Hono()

const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (c) => c.req.header('x-forwarded-for') || c.req.ip,
})

router.post('/', limiter, async (c) => {
  try {
    const { token, username, videoOffset = 0, imageOffset = 0, limit = 51 } = await c.req.json()
    let usernameToFetch = username
    let isOwnProfile = false
    let authenticatedUsername = null

    if (token) {
      try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET)

        const currentUser = await User.findOne({ email: decodedToken.email })
        if (currentUser) {
          authenticatedUsername = currentUser.username

          if (!usernameToFetch) {
            usernameToFetch = authenticatedUsername
            isOwnProfile = true
          } else {
            isOwnProfile = authenticatedUsername === usernameToFetch
          }
        }
      } catch (error) {
        console.error('Token verification error:', error)
      }
    }

    if (!usernameToFetch) {
      return c.json({ 
        success: false, 
        message: 'Username is required if no valid token is provided' 
      }, 400)
    }

    const user = await User.findOne({ username: usernameToFetch })
    
    if (!user) {
      return c.json({ 
        success: false, 
        message: 'User not found' 
      }, 404)
    }

    // Get total counts for pagination
    const totalVideos = await Video.countDocuments({ uploader: user._id })
    const totalImages = await Image.countDocuments({ uploader: user._id })

    const videos = await Video.find({ uploader: user._id })
      .sort({ createdAt: -1 })
      .skip(videoOffset)
      .limit(limit)

    const images = await Image.find({ uploader: user._id })
      .sort({ createdAt: -1 })
      .skip(imageOffset)
      .limit(limit)

    const subscriptions = await User.find(
      { _id: { $in: user.subscriptions || [] } },
      { username: 1, avatar: 1, avatarColor: 1, subscriberCount: 1 }
    )

    // Calculate totals from ALL videos and images, not just paginated ones
    const allVideos = await Video.find({ uploader: user._id }, { views: 1, likedBy: 1 })
    const allImages = await Image.find({ uploader: user._id }, { views: 1, likedBy: 1 })
    
    const totalViews = allVideos.reduce((sum, video) => sum + (video.views || 0), 0) + 
                     allImages.reduce((sum, image) => sum + (image.views || 0), 0)
    const totalLikes = allVideos.reduce((sum, video) => sum + (video.likedBy?.length || 0), 0) +
                      allImages.reduce((sum, image) => sum + (image.likedBy?.length || 0), 0)

    const userResponse = {
      _id: user._id,
      username: user.username,
      bio: user.bio || "",
      avatar: user.avatar,
      avatarColor: user.avatarColor,
      createdAt: user.createdAt,
      isAdmin: user.isAdmin || false,
      subscriberCount: user.subscriberCount || 0,
      totalUploads: totalVideos + totalImages,
      totalViews,
      totalLikes,
      videos: videos.map(video => ({
        id: video._id,
        slug: video.slug,
        title: video.title,
        thumbnail: video.thumbnail,
        cloudflareStreamId: video.cloudflareStreamId,
        duration: video.duration,
        views: video.views || 0,
        likeCount: video.likedBy?.length || 0,
        dislikeCount: video.dislikedBy?.length || 0,
        createdAt: video.createdAt,
        uploader: user.username,
        type: 'video',
        isProcessing: video.isProcessing || false
      })),
      images: images.map(image => ({
        id: image._id,
        slug: image.slug,
        title: image.title,
        thumbnail: image.imageUrls[image.thumbnailIndex || 0],
        imageUrls: image.imageUrls,
        thumbnailIndex: image.thumbnailIndex || 0,
        views: image.views || 0,
        likeCount: image.likedBy?.length || 0,
        dislikeCount: image.dislikedBy?.length || 0,
        createdAt: image.createdAt,
        uploader: user.username,
        type: 'image'
      })),
      subscriptions: subscriptions.map(sub => ({
        id: sub._id,
        username: sub.username,
        avatar: sub.avatar,
        avatarColor: sub.avatarColor,
        subscriberCount: sub.subscriberCount || 0
      }))
    }

    if (isOwnProfile) {
      userResponse.email = user.email
    }
    
    return c.json({
      success: true,
      user: userResponse,
      isOwnProfile,
      pagination: {
        videos: {
          total: totalVideos,
          offset: videoOffset,
          limit: limit,
          hasMore: videoOffset + videos.length < totalVideos
        },
        images: {
          total: totalImages,
          offset: imageOffset,
          limit: limit,
          hasMore: imageOffset + images.length < totalImages
        }
      }
    }, 200)
    
  } catch (error) {
    console.error('Profile retrieval error:', error)
    return c.json({ success: false, message: 'Server error', error: error.message }, 500)
  }
})

export default router