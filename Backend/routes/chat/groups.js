import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import Conversation from '../../models/Conversation.js';
import User from '../../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET;
const app = new Hono();

// Generate random hex color
const generateRandomHex = () => {
  return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
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
    const user = await User.findOne({ email: decoded.email }).select('_id isAdmin');
    
    if (!user) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    c.set('user', user);
    await next();
  } catch (error) {
    return c.json({ success: false, message: 'Invalid token' }, 401);
  }
};

// Create a group (admin only)
app.post('/group', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    
    // Check if user is admin
    if (!user.isAdmin) {
      return c.json({ success: false, message: 'Only admins can create groups' }, 403);
    }

    const { groupName, groupAvatar } = await c.req.json();

    if (!groupName || !groupName.trim()) {
      return c.json({ success: false, message: 'Group name is required' }, 400);
    }

    // Get all users to add them as participants
    const allUsers = await User.find({}).select('_id');
    const participantIds = allUsers.map(u => u._id);

    // Create group conversation
    const group = await Conversation.create({
      isGroup: true,
      groupName: groupName.trim(),
      groupAvatar: groupAvatar || null,
      groupAvatarColor: generateRandomHex(),
      participants: participantIds,
      createdBy: user._id,
      unreadCount: participantIds.map(id => ({ user: id, count: 0 }))
    });

    // Populate and return the group
    const populatedGroup = await Conversation.findById(group._id)
      .populate('participants', 'username avatar avatarColor bio isAdmin')
      .populate('createdBy', 'username isAdmin')
      .lean();

    return c.json({ success: true, group: populatedGroup });
  } catch (error) {
    console.error('Error creating group:', error);
    return c.json({ success: false, message: 'Failed to create group' }, 500);
  }
});

// Get all groups
app.get('/groups', verifyToken, async (c) => {
  try {
    const user = c.get('user');

    const groups = await Conversation.find({
      isGroup: true,
      participants: user._id
    })
    .populate('participants', 'username avatar avatarColor bio isAdmin')
    .populate('createdBy', 'username isAdmin')
    .populate({
      path: 'lastMessage',
      select: 'content sender createdAt type',
      populate: { path: 'sender', select: 'username isAdmin' }
    })
    .sort({ lastMessageAt: -1 })
    .lean();

    return c.json({ success: true, groups });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return c.json({ success: false, message: 'Failed to fetch groups' }, 500);
  }
});

export default app;
