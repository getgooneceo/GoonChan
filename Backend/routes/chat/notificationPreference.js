import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import Conversation from '../../models/Conversation.js';
import User from '../../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET;

const router = new Hono();

// Update notification preference for a conversation
router.post('/', async (c) => {
  try {
    const { token, conversationId, preference } = await c.req.json();

    if (!token) {
      return c.json({ success: false, message: 'Token required' }, 401);
    }

    if (!conversationId) {
      return c.json({ success: false, message: 'Conversation ID required' }, 400);
    }

    if (!['all', 'mentions', 'nothing'].includes(preference)) {
      return c.json({ success: false, message: 'Invalid preference' }, 400);
    }

    // Verify token and get user
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.error('JWT verification error:', error);
      return c.json({ success: false, message: 'Invalid token' }, 401);
    }

    // Find user by email from token
    const user = await User.findOne({ email: decoded.email }).select('_id');
    if (!user) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    // Verify user is a participant
    const isParticipant = await Conversation.exists({ 
      _id: conversationId, 
      participants: user._id 
    });

    if (!isParticipant) {
      // Check if conversation exists at all to give correct error
      const convoExists = await Conversation.exists({ _id: conversationId });
      if (!convoExists) {
        return c.json({ success: false, message: 'Conversation not found' }, 404);
      }
      return c.json({ success: false, message: 'Unauthorized' }, 403);
    }

    // Try to update existing preference
    const updateResult = await Conversation.updateOne(
      { _id: conversationId, 'notificationPreferences.user': user._id },
      { $set: { 'notificationPreferences.$.preference': preference } }
    );

    // If not updated (because it didn't exist), push new preference
    if (updateResult.matchedCount === 0) {
      await Conversation.updateOne(
        { _id: conversationId },
        { $push: { notificationPreferences: { user: user._id, preference } } }
      );
    }

    return c.json({
      success: true,
      message: 'Notification preference updated',
      preference
    });
  } catch (error) {
    console.error('Error updating notification preference:', error);
    return c.json({ success: false, message: 'Server error', error: error.message }, 500);
  }
});

// Get notification preference for a conversation
router.get('/:conversationId', async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    const { conversationId } = c.req.param();

    if (!token) {
      return c.json({ success: false, message: 'Token required' }, 401);
    }

    // Verify token and get user
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.error('JWT verification error:', error);
      return c.json({ success: false, message: 'Invalid token' }, 401);
    }

    // Find user by email from token
    const user = await User.findOne({ email: decoded.email }).select('_id');
    if (!user) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    // Find conversation and get preference using projection
    const conversation = await Conversation.findOne(
      { _id: conversationId, participants: user._id },
      { notificationPreferences: { $elemMatch: { user: user._id } } }
    ).lean();

    if (!conversation) {
      // Check if conversation exists at all to give correct error
      const convoExists = await Conversation.exists({ _id: conversationId });
      if (!convoExists) {
        return c.json({ success: false, message: 'Conversation not found' }, 404);
      }
      return c.json({ success: false, message: 'Unauthorized' }, 403);
    }

    const preference = conversation.notificationPreferences?.[0]?.preference || 'all';

    return c.json({
      success: true,
      preference
    });
  } catch (error) {
    console.error('Error getting notification preference:', error);
    return c.json({ success: false, message: 'Server error', error: error.message }, 500);
  }
});

export default router;
