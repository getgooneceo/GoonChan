import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import User from '../../models/User.js';
import Video from '../../models/Video.js';
import Image from '../../models/Image.js';
import UserStatus from '../../models/UserStatus.js';

const JWT_SECRET = process.env.JWT_SECRET;
const app = new Hono();

let io;

export const setUserProfileIO = (socketIO) => {
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
    const user = await User.findOne({ email: decoded.email }).select('_id username');
    
    if (!user) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    c.set('user', user);
    await next();
  } catch (error) {
    return c.json({ success: false, message: 'Invalid token' }, 401);
  }
};

// Get user profile preview (for chat)
app.get('/:userId', verifyToken, async (c) => {
  try {
    const userId = c.req.param('userId');

    const user = await User.findById(userId)
      .select('username avatar avatarColor bio subscriberCount createdAt isAdmin')
      .lean();

    if (!user) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    // Get user status
    const status = await UserStatus.findOne({ user: userId })
      .select('status customStatus lastSeen')
      .lean();

    // Count videos and images (models use `uploader` field)
    const [videoCount, imageCount] = await Promise.all([
      Video.countDocuments({ uploader: userId }),
      Image.countDocuments({ uploader: userId })
    ]);

    return c.json({
      success: true,
      profile: {
        ...user,
        banner: user.avatarColor, // Use avatarColor as banner
        status: status?.status || 'offline',
        customStatus: status?.customStatus || '',
        lastSeen: status?.lastSeen,
        videosUploaded: videoCount,
        imagesUploaded: imageCount
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return c.json({ success: false, message: 'Failed to fetch profile' }, 500);
  }
});

// Update custom status
app.post('/status', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    const { customStatus } = await c.req.json();

    console.log(`💬 [Custom Status API] ${user.username} updating custom status to: "${customStatus}"`);

    await UserStatus.findOneAndUpdate(
      { user: user._id },
      { customStatus: customStatus || '' },
      { upsert: true }
    );

    console.log(`✅ [Custom Status API] Updated ${user.username}'s custom status in DB`);

    // Broadcast custom status update to all connected clients
    if (io) {
      console.log(`📢 [Custom Status API] Broadcasting custom status update for ${user.username}`);
      io.emit('user:customStatus', {
        userId: user._id.toString(),
        username: user.username,
        customStatus: customStatus || ''
      });
    } else {
      console.error('❌ [Custom Status API] io is not defined, cannot broadcast!');
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating status:', error);
    return c.json({ success: false, message: 'Failed to update status' }, 500);
  }
});

export default app;
