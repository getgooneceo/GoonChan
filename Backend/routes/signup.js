import { Hono } from 'hono'
import User from '../models/User.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { rateLimiter } from 'hono-rate-limiter'

const router = new Hono()

const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 2, 
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (c) => c.req.header('x-forwarded-for') || c.req.ip,
})

router.post('/', limiter, async (c) => {
  try {
    const { username, email, password } = await c.req.json()

    if (!username || !email || !password) {
      return c.json({ 
        success: false, 
        message: 'Username, email and password are required' 
      }, 400)
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })
    
    if (existingUser) {
      return c.json({ 
        success: false, 
        message: existingUser.email === email ? 'Email already in use' : 'Username already taken' 
      }, 409)
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const token = jwt.sign(
      { email },
      process.env.JWT_SECRET || 'fallback_secret',
    )
    
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      token
    })
    
    await newUser.save()

    const userResponse = newUser.toObject()
    // delete userResponse.password
    
    return c.json({
      success: true,
      message: 'User registered successfully! Please verify your email.',
      user: userResponse
    }, 201)
    
  } catch (error) {
    console.error('Signup error:', error)
    return c.json({ success: false, message: 'Server error', error: error.message }, 500)
  }
})

export default router