import { Hono } from 'hono';
import User from '../models/User.js';
import UserStatus from '../models/UserStatus.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const app = new Hono();

let io;

export const setBanIO = (socketIO) => {
  io = socketIO;
};

const verifyAdmin = async (token) => {
  if (!token) {
    return { success: false, message: 'Token required' };
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return { success: false, message: 'Invalid token' };
  }

  const user = await User.findOne({ email: decoded.email });
  if (!user || !user.isAdmin) {
    return { success: false, message: 'Unauthorized' };
  }

  return { success: true, user };
};

// Search users (for ban/admin management)
app.post('/search', async (c) => {
  try {
    const { token, query } = await c.req.json();

    const verification = await verifyAdmin(token);
    if (!verification.success) {
      return c.json({ success: false, message: verification.message }, verification.message === 'Token required' ? 401 : 403);
    }

    if (!query || query.length < 3) {
      return c.json({ success: true, users: [] });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ],
      isDummy: false
    })
    .select('_id username email avatar avatarColor isAdmin isBanned')
    .limit(10)
    .lean();

    return c.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('[USER SEARCH] Error:', error);
    return c.json({ success: false, message: 'Failed to search users' }, 500);
  }
});

app.post('/ban', async (c) => {
  try {
    const { token, userId } = await c.req.json();

    const verification = await verifyAdmin(token);
    if (!verification.success) {
      return c.json({ success: false, message: verification.message }, verification.message === 'Token required' ? 401 : 403);
    }

    if (!userId) {
      return c.json({ success: false, message: 'User ID required' }, 400);
    }

    if (verification.user._id.toString() === userId) {
      return c.json({ success: false, message: 'Cannot ban yourself' }, 400);
    }

    const userToBan = await User.findById(userId);
    if (!userToBan) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    if (userToBan.isAdmin) {
      return c.json({ success: false, message: 'Cannot ban admin users' }, 400);
    }

    userToBan.isBanned = true;
    await userToBan.save();

    console.log(`🚫 Admin ${verification.user.username} banned ${userToBan.username}`);

    // Disconnect all sockets for the banned user and clear their status
    if (io) {
      // Get user's socket IDs
      const userStatus = await UserStatus.findOne({ user: userToBan._id });
      
      // First, emit ban event to the banned user's sockets so they receive the notification
      if (userStatus && userStatus.socketIds && userStatus.socketIds.length > 0) {
        userStatus.socketIds.forEach(socketId => {
          const socket = io.sockets.sockets.get(socketId);
          if (socket) {
            // Send ban notification directly to this user before disconnecting
            socket.emit('user:banned', {
              userId: userToBan._id.toString()
            });
            console.log(`📢 Sent ban notification to socket ${socketId}`);
          }
        });
      }

      // Wait a bit to let the client process the ban event
      await new Promise(resolve => setTimeout(resolve, 500));

      // Now disconnect all user's sockets
      if (userStatus && userStatus.socketIds && userStatus.socketIds.length > 0) {
        userStatus.socketIds.forEach(socketId => {
          const socket = io.sockets.sockets.get(socketId);
          if (socket) {
            console.log(`🔌 Disconnecting socket ${socketId} for banned user ${userToBan.username}`);
            socket.disconnect(true);
          }
        });
      }

      // Clear user status and set to offline
      await UserStatus.findOneAndUpdate(
        { user: userToBan._id },
        { 
          status: 'offline',
          socketIds: [],
          lastSeen: new Date()
        },
        { upsert: true }
      );

      // Broadcast user offline status to everyone else
      io.emit('user:status', {
        userId: userToBan._id.toString(),
        status: 'offline',
        username: userToBan.username,
        lastSeen: new Date()
      });
    }

    return c.json({
      success: true,
      message: 'User banned successfully',
      user: {
        _id: userToBan._id,
        username: userToBan.username,
        email: userToBan.email,
        avatar: userToBan.avatar,
        avatarColor: userToBan.avatarColor,
        isBanned: userToBan.isBanned
      }
    });

  } catch (error) {
    console.error('[BAN USER] Error:', error);
    return c.json({ success: false, message: 'Failed to ban user' }, 500);
  }
});

// Unban user
app.post('/unban', async (c) => {
  try {
    const { token, userId } = await c.req.json();

    const verification = await verifyAdmin(token);
    if (!verification.success) {
      return c.json({ success: false, message: verification.message }, verification.message === 'Token required' ? 401 : 403);
    }

    if (!userId) {
      return c.json({ success: false, message: 'User ID required' }, 400);
    }

    const userToUnban = await User.findById(userId);
    if (!userToUnban) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    userToUnban.isBanned = false;
    await userToUnban.save();

    console.log(`✅ Admin ${verification.user.username} unbanned ${userToUnban.username}`);

    // Broadcast unban status via socket
    if (io) {
      io.emit('user:unbanned', {
        userId: userToUnban._id.toString()
      });
    }

    return c.json({
      success: true,
      message: 'User unbanned successfully',
      user: {
        _id: userToUnban._id,
        username: userToUnban.username,
        email: userToUnban.email,
        avatar: userToUnban.avatar,
        avatarColor: userToUnban.avatarColor,
        isBanned: userToUnban.isBanned
      }
    });

  } catch (error) {
    console.error('[UNBAN USER] Error:', error);
    return c.json({ success: false, message: 'Failed to unban user' }, 500);
  }
});

app.post('/add-admin', async (c) => {
  try {
    const { token, userId } = await c.req.json();

    const verification = await verifyAdmin(token);
    if (!verification.success) {
      return c.json({ success: false, message: verification.message }, verification.message === 'Token required' ? 401 : 403);
    }

    if (!userId) {
      return c.json({ success: false, message: 'User ID required' }, 400);
    }

    const userToPromote = await User.findById(userId);
    if (!userToPromote) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    if (userToPromote.isAdmin) {
      return c.json({ success: false, message: 'User is already an admin' }, 400);
    }

    userToPromote.isAdmin = true;
    await userToPromote.save();

    return c.json({
      success: true,
      message: 'Admin privileges granted successfully',
      user: {
        _id: userToPromote._id,
        username: userToPromote.username,
        email: userToPromote.email,
        avatar: userToPromote.avatar,
        avatarColor: userToPromote.avatarColor,
        isAdmin: userToPromote.isAdmin
      }
    });

  } catch (error) {
    console.error('[ADD ADMIN] Error:', error);
    return c.json({ success: false, message: 'Failed to add admin' }, 500);
  }
});

// Remove admin
app.post('/remove-admin', async (c) => {
  try {
    const { token, userId } = await c.req.json();

    const verification = await verifyAdmin(token);
    if (!verification.success) {
      return c.json({ success: false, message: verification.message }, verification.message === 'Token required' ? 401 : 403);
    }

    if (!userId) {
      return c.json({ success: false, message: 'User ID required' }, 400);
    }

    // Prevent removing self
    if (verification.user._id.toString() === userId) {
      return c.json({ success: false, message: 'Cannot remove your own admin privileges' }, 400);
    }

    const userToDemote = await User.findById(userId);
    if (!userToDemote) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    if (!userToDemote.isAdmin) {
      return c.json({ success: false, message: 'User is not an admin' }, 400);
    }

    userToDemote.isAdmin = false;
    await userToDemote.save();

    return c.json({
      success: true,
      message: 'Admin privileges removed successfully',
      user: {
        _id: userToDemote._id,
        username: userToDemote.username,
        email: userToDemote.email,
        avatar: userToDemote.avatar,
        avatarColor: userToDemote.avatarColor,
        isAdmin: userToDemote.isAdmin
      }
    });

  } catch (error) {
    console.error('[REMOVE ADMIN] Error:', error);
    return c.json({ success: false, message: 'Failed to remove admin' }, 500);
  }
});

export default app; 