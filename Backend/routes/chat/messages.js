import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import Message from '../../models/Message.js';
import Conversation from '../../models/Conversation.js';
import User from '../../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET;
const app = new Hono();

// Middleware to verify JWT
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

// Get messages for a conversation
app.get('/:conversationId', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    const urlIdOrId = c.req.param('conversationId');
    const limit = parseInt(c.req.query('limit')) || 50;
    const before = c.req.query('before');

    // Find conversation (try urlId first, then _id)
    const conversation = await Conversation.findOne({
      $or: [{ urlId: urlIdOrId }, { _id: urlIdOrId }],
      participants: user._id
    }).select('_id unreadCount').lean();

    if (!conversation) {
      return c.json({ success: false, message: 'Conversation not found' }, 404);
    }

    // Build query
    const query = { conversationId: conversation._id };
    if (before) {
      const beforeMsg = await Message.findById(before).select('createdAt').lean();
      if (beforeMsg) query.createdAt = { $lt: beforeMsg.createdAt };
    }

    // Fetch messages with minimal population
    const messages = await Message.find(query)
      .select('content sender conversationId replyTo createdAt updatedAt editedAt readBy previews')
      .populate('sender', '_id username avatar avatarColor isAdmin')
      .populate({
        path: 'replyTo',
        select: 'content sender createdAt',
        populate: { path: 'sender', select: '_id username avatar avatarColor isAdmin' }
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Mark unread messages as read (in background, non-blocking)
    const unreadIds = messages
      .filter(m => 
        m.sender._id.toString() !== user._id.toString() &&
        !m.readBy.some(r => r.user.toString() === user._id.toString())
      )
      .map(m => m._id);

    if (unreadIds.length > 0) {
      // Non-blocking background update
      setImmediate(async () => {
        try {
          await Message.updateMany(
            { _id: { $in: unreadIds } },
            { $addToSet: { readBy: { user: user._id, readAt: new Date() } } }
          );
          
          // Update conversation unread count
          await Conversation.updateOne(
            { 
              _id: conversation._id,
              'unreadCount.user': user._id
            },
            { 
              $set: { 
                'unreadCount.$.count': 0,
                'unreadCount.$.mentionsCount': 0
              }
            }
          );
        } catch (err) {
          console.error('Background mark-as-read error:', err);
        }
      });
    }

    // Check if there are more messages (for infinite scroll)
    const hasMore = messages.length >= limit;

    return c.json({ success: true, messages: messages.reverse(), hasMore });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return c.json({ success: false, message: 'Failed to fetch messages' }, 500);
  }
});

// Mark messages as read
app.post('/:conversationId/read', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    const conversationId = c.req.param('conversationId');

    // Verify user is in conversation (optimized)
    const exists = await Conversation.exists({
      _id: conversationId,
      participants: user._id
    });

    if (!exists) {
      return c.json({ success: false, message: 'Conversation not found' }, 404);
    }

    // Mark all unread messages as read
    await Message.updateMany(
      { 
        conversationId,
        'readBy.user': { $ne: user._id },
        sender: { $ne: user._id }
      },
      { $addToSet: { readBy: { user: user._id, readAt: new Date() } } }
    );

    // Reset unread count (optimized atomic update)
    await Conversation.updateOne(
      { 
        _id: conversationId,
        'unreadCount.user': user._id
      },
      { 
        $set: { 
          'unreadCount.$.count': 0,
          'unreadCount.$.mentionsCount': 0
        }
      }
    );

    return c.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return c.json({ success: false, message: 'Failed to mark messages as read' }, 500);
  }
});

export default app;
