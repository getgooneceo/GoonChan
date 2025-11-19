import { Hono } from 'hono'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { rateLimiter } from 'hono-rate-limiter'

const router = new Hono()

const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (c) => c.req.header('x-forwarded-for') || c.req.ip,
})

router.post('/', limiter, async (c) => {
  try {
    const { token } = await c.req.json()

    if (!token) {
      return c.json({ success: false, message: 'Token is required' }, 401)
    }

    // Verify token
    let decodedToken
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET)
    } catch (error) {
      return c.json({ success: false, message: 'Invalid token' }, 401)
    }

    // Find user and update acceptedRules
    const user = await User.findOneAndUpdate(
      { email: decodedToken.email },
      { acceptedRules: true },
      { new: true }
    )

    if (!user) {
      return c.json({ success: false, message: 'User not found' }, 404)
    }

    return c.json({ 
      success: true, 
      message: 'Rules accepted successfully',
      acceptedRules: true
    })
  } catch (error) {
    console.error('Error accepting rules:', error)
    return c.json({ success: false, message: 'Failed to accept rules' }, 500)
  }
})

export default router
