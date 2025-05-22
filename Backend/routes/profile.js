import { Hono } from 'hono'
import User from '../models/User.js'
import Video from '../models/Video.js'
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
    const { token, username } = await c.req.json()
    let usernameToFetch = username
    let isOwnProfile = false
    let authenticatedUsername = null

    // Verify token if provided
    if (token) {
      try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET)
        
        // Find authenticated user by email from token
        const currentUser = await User.findOne({ email: decodedToken.email })
        if (currentUser) {
          authenticatedUsername = currentUser.username
          
          // If no username specified, use the authenticated user's username
          if (!usernameToFetch) {
            usernameToFetch = authenticatedUsername
            isOwnProfile = true
          } else {
            // Check if the requested profile is the user's own profile
            isOwnProfile = authenticatedUsername === usernameToFetch
          }
        }
      } catch (error) {
        // Invalid token, but continue to fetch public profile if username is provided
        console.error('Token verification error:', error)
      }
    }

    // If no username provided and no authenticated user, return error
    if (!usernameToFetch) {
      return c.json({ 
        success: false, 
        message: 'Username is required if no valid token is provided' 
      }, 400)
    }

    // Find the user by username
    const user = await User.findOne({ username: usernameToFetch })
    
    if (!user) {
      return c.json({ 
        success: false, 
        message: 'User not found' 
      }, 404)
    }

    // Find videos uploaded by the user
    const videos = await Video.find({ uploaderId: user._id })
      .sort({ createdAt: -1 })
      .limit(20)
    
    // Find users this user has subscribed to
    const subscriptions = await User.find(
      { _id: { $in: user.subscriptions || [] } },
      { username: 1, avatar: 1, avatarColor: 1, subscriberCount: 1 }
    ).limit(10)
    
    // Calculate statistics
    const totalViews = videos.reduce((sum, video) => sum + (video.views || 0), 0)
    const totalLikes = videos.reduce((sum, video) => sum + (video.likeCount || 0), 0)
    
    // Format the response based on whether it's the user's own profile
    const userResponse = {
      _id: user._id,
      username: user.username,
      bio: user.bio || "",
      avatar: user.avatar,
      avatarColor: user.avatarColor,
      createdAt: user.createdAt,
      subscriberCount: user.subscriberCount || 0,
      totalUploads: videos.length,
      totalViews,
      totalLikes,
      videos: videos.map(video => ({
        id: video._id,
        title: video.title,
        thumbnail: video.thumbnail,
        duration: video.duration,
        views: video.views || 0,
        likeCount: video.likeCount || 0,
        dislikeCount: video.dislikeCount || 0,
        createdAt: video.createdAt,
        uploader: user.username
      })),
      subscriptions: subscriptions.map(sub => ({
        id: sub._id,
        username: sub.username,
        avatar: sub.avatar,
        avatarColor: sub.avatarColor,
        subscriberCount: sub.subscriberCount || 0
      }))
    }
    
    // Only include email if viewing own profile
    if (isOwnProfile) {
      userResponse.email = user.email
    }
    
    return c.json({
      success: true,
      user: userResponse,
      isOwnProfile
    }, 200)
    
  } catch (error) {
    console.error('Profile retrieval error:', error)
    return c.json({ success: false, message: 'Server error', error: error.message }, 500)
  }
})

export default router