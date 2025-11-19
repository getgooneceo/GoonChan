import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import User from '../../models/User.js';
import UserStatus from '../../models/UserStatus.js';

const JWT_SECRET = process.env.JWT_SECRET;
const app = new Hono();

let io;

export const setStatusIO = (socketIO) => {
  io = socketIO;
};

// Middleware to verify JWT
const verifyToken = async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, message: 'No token provided' }, 401);
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email }).select('_id isBanned username');
    
    if (!user) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    c.set('user', user);
    await next();
  } catch (error) {
    return c.json({ success: false, message: 'Invalid token' }, 401);
  }
};

// Update user status (online/idle/dnd)
app.post('/', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    const { status } = await c.req.json();

    // Check if user is banned
    if (user.isBanned) {
      return c.json({ 
        success: false, 
        message: 'You are banned and cannot update your status',
        isBanned: true
      }, 403);
    }

    console.log(`📡 [Status API] ${user.username} updating status to: ${status}`);

    // Validate status
    const validStatuses = ['online', 'idle', 'dnd'];
    if (!validStatuses.includes(status)) {
      return c.json({ 
        success: false, 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      }, 400);
    }

    // Map 'idle' to 'away' for database
    const dbStatus = status === 'idle' ? 'away' : status;

    // Update user status in database
    const userStatus = await UserStatus.findOneAndUpdate(
      { user: user._id },
      { 
        status: dbStatus,
        lastSeen: Date.now()
      },
      { upsert: true, new: true }
    );

    console.log(`✅ [Status API] Updated ${user.username} to ${dbStatus} in DB`);

    // Broadcast status update to all connected clients
    if (io) {
      console.log(`📢 [Status API] Broadcasting status update: ${user.username} -> ${status}`);
      io.emit('user:status', {
        userId: user._id.toString(),
        username: user.username,
        status: status, // Send original status (idle not away)
        lastSeen: userStatus.lastSeen
      });
    } else {
      console.error('❌ [Status API] io is not defined, cannot broadcast!');
    }

    return c.json({ success: true, status: status });
  } catch (error) {
    console.error('Error updating status:', error);
    return c.json({ success: false, message: 'Failed to update status' }, 500);
  }
});

export default app;
