import { Hono } from 'hono'
import User from '../models/User.js'
import { rateLimiter } from 'hono-rate-limiter'
import jwt from 'jsonwebtoken'
import { config } from "dotenv"

config()

const router = new Hono()

const JWT_SECRET = process.env.JWT_SECRET

const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (c) => c.req.header('x-forwarded-for') || c.req.ip,
})

router.post('/', limiter, async (c) => {
  try {
    if (!JWT_SECRET) {
      console.error('Server configuration error: Missing JWT_SECRET')
      return c.json({ 
        success: false, 
        message: 'Server configuration error' 
      }, 500)
    }

    const { token, avatarColor } = await c.req.json()

    if (!token) {
      return c.json({ 
        success: false, 
        message: 'Authentication token is required' 
      }, 401)
    }

    if (!avatarColor || typeof avatarColor !== 'string') {
      return c.json({ 
        success: false, 
        message: 'Avatar color is required' 
      }, 400)
    }

    // Validate hex color format
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    if (!hexColorRegex.test(avatarColor)) {
      return c.json({ 
        success: false, 
        message: 'Invalid color format. Please provide a valid hex color.' 
      }, 400)
    }

    let decodedToken
    try {
      decodedToken = jwt.verify(token, JWT_SECRET)
    } catch (error) {
      return c.json({ 
        success: false, 
        message: 'Invalid or expired token' 
      }, 401)
    }

    const user = await User.findOne({ email: decodedToken.email })
    if (!user) {
      return c.json({ 
        success: false, 
        message: 'User not found' 
      }, 404)
    }

    user.avatarColor = avatarColor
    user.updatedAt = new Date()
    await user.save()

    return c.json({
      success: true,
      message: 'Avatar color updated successfully',
      avatarColor: avatarColor
    }, 200)
    
  } catch (error) {
    console.error('Avatar color update error:', error)
    return c.json({ 
      success: false, 
      message: 'Server error while updating avatar color' 
    }, 500)
  }
})

export default router
