import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import User from '../../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET;
const app = new Hono();

let io;

export const setMuteIO = (socketIO) => {
  io = socketIO;
};

// Middleware to verify JWT and check admin status
const verifyAdminToken = async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, message: 'No token provided' }, 401);
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email }).select('_id isAdmin username');
    
    if (!user) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    if (!user.isAdmin) {
      return c.json({ success: false, message: 'Unauthorized: Admin access required' }, 403);
    }

    c.set('user', user);
    await next();
  } catch (error) {
    return c.json({ success: false, message: 'Invalid token' }, 401);
  }
};

// Middleware to verify JWT (for checking own mute status)
const verifyToken = async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, message: 'No token provided' }, 401);
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email }).select('_id');
    
    if (!user) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    c.set('user', user);
    await next();
  } catch (error) {
    return c.json({ success: false, message: 'Invalid token' }, 401);
  }
};

// Mute a user
app.post('/:userId', verifyAdminToken, async (c) => {
  try {
    const admin = c.get('user');
    const userId = c.req.param('userId');
    const { duration } = await c.req.json(); // duration in seconds

    if (!duration || duration <= 0) {
      return c.json({ success: false, message: 'Invalid duration' }, 400);
    }

    const targetUser = await User.findById(userId).select('_id username');
    if (!targetUser) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    // Calculate mute expiry
    const mutedUntil = new Date(Date.now() + duration * 1000);

    await User.updateOne({ _id: userId }, { $set: { mutedUntil: mutedUntil } });

    console.log(`🔇 Admin ${admin.username} muted ${targetUser.username} until ${mutedUntil}`);

    // Broadcast mute status to the muted user
    if (io) {
      io.emit('user:muted', {
        userId: targetUser._id.toString(),
        mutedUntil: mutedUntil.toISOString()
      });
    }

    return c.json({ 
      success: true, 
      mutedUntil: mutedUntil.toISOString()
    });
  } catch (error) {
    console.error('Error muting user:', error);
    return c.json({ success: false, message: 'Failed to mute user' }, 500);
  }
});

// Unmute a user
app.delete('/:userId', verifyAdminToken, async (c) => {
  try {
    const admin = c.get('user');
    const userId = c.req.param('userId');

    const targetUser = await User.findById(userId).select('_id username');
    if (!targetUser) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    await User.updateOne({ _id: userId }, { $unset: { mutedUntil: 1 } });

    console.log(`🔊 Admin ${admin.username} unmuted ${targetUser.username}`);

    // Broadcast unmute status to the user
    if (io) {
      io.emit('user:unmuted', {
        userId: targetUser._id.toString()
      });
    }

    return c.json({ 
      success: true
    });
  } catch (error) {
    console.error('Error unmuting user:', error);
    return c.json({ success: false, message: 'Failed to unmute user' }, 500);
  }
});

// Check if current user is muted
app.get('/status', verifyToken, async (c) => {
  try {
    const user = c.get('user');

    // Refresh user data from DB to get latest mute status
    const currentUser = await User.findById(user._id).select('mutedUntil');

    if (!currentUser.mutedUntil || new Date(currentUser.mutedUntil) <= new Date()) {
      // Not muted or mute expired
      if (currentUser.mutedUntil) {
        // Clear expired mute
        await User.updateOne({ _id: user._id }, { $unset: { mutedUntil: 1 } });
      }
      return c.json({ success: true, isMuted: false });
    }

    return c.json({ 
      success: true, 
      isMuted: true,
      mutedUntil: currentUser.mutedUntil.toISOString()
    });
  } catch (error) {
    console.error('Error checking mute status:', error);
    return c.json({ success: false, message: 'Failed to check mute status' }, 500);
  }
});

// List all currently muted users (admin only)
app.get('/list', verifyAdminToken, async (c) => {
  try {
    const now = new Date();
    const mutedUsers = await User.find({
      mutedUntil: { $ne: null, $gt: now }
    }).select('_id mutedUntil username');

    const result = mutedUsers.map(u => ({
      userId: u._id.toString(),
      mutedUntil: u.mutedUntil.toISOString(),
      username: u.username
    }));

    return c.json({ success: true, muted: result });
  } catch (err) {
    console.error('Error fetching muted users:', err);
    return c.json({ success: false, message: 'Failed to fetch muted users' }, 500);
  }
});

export default app;
