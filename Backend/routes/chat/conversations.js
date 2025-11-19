import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import Conversation from '../../models/Conversation.js';
import Message from '../../models/Message.js';
import User from '../../models/User.js';
import axios from 'axios';
import FormDataNode from 'form-data';
import sharp from 'sharp';

const JWT_SECRET = process.env.JWT_SECRET;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_HASH = process.env.CLOUDFLARE_ACCOUNT_HASH || CLOUDFLARE_ACCOUNT_ID;
const app = new Hono();

// Generate random hex color
const generateRandomHex = () => {
  return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
};

// Upload image to Cloudflare
const uploadImageToCloudflare = async (imageFile) => {
  try {
    const imageBuffer = await imageFile.arrayBuffer();

    const webpBuffer = await sharp(Buffer.from(imageBuffer))
      .resize(300, 300, { 
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 85 })
      .toBuffer();

    const directUploadForm = new FormDataNode();
    directUploadForm.append('requireSignedURLs', 'false');

    const directUploadResponse = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v2/direct_upload`,
      directUploadForm,
      {
        headers: {
          ...directUploadForm.getHeaders(),
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        },
      }
    );

    const { uploadURL, id: imageId } = directUploadResponse.data.result;
    if (!uploadURL || !imageId) {
      throw new Error('Failed to get Cloudflare image direct upload URL.');
    }

    const imageFormData = new FormDataNode();
    const originalFileName = imageFile.name;
    const webpFileName = originalFileName.substring(0, originalFileName.lastIndexOf('.')) + '.webp';
    imageFormData.append('file', webpBuffer, webpFileName);

    await axios.post(uploadURL, imageFormData, {
      headers: imageFormData.getHeaders(),
    });

    return `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_HASH}/${imageId}/public`;
  } catch (error) {
    console.error('Error uploading image to Cloudflare:', error.response ? JSON.stringify(error.response.data) : error.message);
    throw error;
  }
};

// Will be set from server.js
let io = null;
export const setIO = (socketIO) => {
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

// Get all conversations for current user
app.get('/', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    const limit = Math.min(parseInt(c.req.query('limit') || '30', 10), 100);
    const cursor = c.req.query('cursor'); // ISO date string
    
    // Build query with cursor pagination on lastMessageAt desc
    const findQuery = { participants: user._id };
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) {
        findQuery.lastMessageAt = { $lt: cursorDate };
      }
    }

    // Fetch conversations and statuses in parallel for speed
    const [conversations, UserStatus] = await Promise.all([
      Conversation.find(findQuery)
        .select('participants isGroup groupName groupAvatar groupAvatarColor lastMessage lastMessageAt unreadCount urlId notificationPreferences')
  .populate('participants', '_id username avatar avatarColor isAdmin isBanned mutedUntil')
        .populate('lastMessage', 'content sender createdAt')
        .sort({ lastMessageAt: -1 })
        .limit(limit)
        .lean(),
      import('../../models/UserStatus.js').then(m => m.default)
    ]);

    // Collect unique participant IDs
    const participantIds = new Set();
    conversations.forEach(conv => {
      conv.participants.forEach(p => participantIds.add(p._id.toString()));
    });

    // Fetch all statuses in one query
    const statuses = await UserStatus.find(
      { user: { $in: Array.from(participantIds) } },
      'user status customStatus lastSeen'
    ).lean();

    // Build status map
    const statusMap = {};
    statuses.forEach(s => {
      statusMap[s.user.toString()] = {
        status: s.status === 'away' ? 'idle' : s.status,
        customStatus: s.customStatus || '',
        lastSeen: s.lastSeen
      };
    });

    // Add unread counts based on notification preference
    const optimizedConvs = conversations.map(conv => {
      const unreadEntry = conv.unreadCount?.find(u => u.user.toString() === user._id.toString());
      
      // Get user's notification preference for this conversation
      const prefEntry = conv.notificationPreferences?.find(p => p.user.toString() === user._id.toString());
      const preference = prefEntry?.preference || 'all';
      
      // Calculate display unread count based on preference
      let displayUnread = 0;
      if (preference === 'all') {
        displayUnread = unreadEntry?.count || 0;
      } else if (preference === 'mentions') {
        displayUnread = unreadEntry?.mentionsCount || 0;
      }
      // If preference is 'nothing', displayUnread stays 0
      
      return {
        _id: conv._id,
        urlId: conv.urlId,
        participants: conv.participants,
        isGroup: conv.isGroup,
        groupName: conv.groupName,
        groupAvatar: conv.groupAvatar,
        groupAvatarColor: conv.groupAvatarColor,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unread: displayUnread
      };
    });

    // Pagination cursors
    const hasMore = conversations.length === limit;
    const nextCursor = hasMore ? (optimizedConvs[optimizedConvs.length - 1]?.lastMessageAt || null) : null;

    return c.json({ 
      success: true, 
      conversations: optimizedConvs,
      userStatuses: statusMap,
      hasMore,
      nextCursor
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return c.json({ success: false, message: 'Failed to fetch conversations' }, 500);
  }
});

// Get or create a direct conversation
app.post('/direct', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    const { userId } = await c.req.json();

    if (!userId) {
      return c.json({ success: false, message: 'User ID required' }, 400);
    }

    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [user._id, userId], $size: 2 }
    })
  .populate('participants', 'username avatar avatarColor bio isAdmin')
    .lean();

    if (!conversation) {
      // Create new conversation
      conversation = await Conversation.create({
        participants: [user._id, userId],
        isGroup: false,
        createdBy: user._id
      });

      conversation = await Conversation.findById(conversation._id)
  .populate('participants', 'username avatar avatarColor bio isAdmin')
        .lean();
    }

    return c.json({ success: true, conversation });
  } catch (error) {
    console.error('Error creating/fetching conversation:', error);
    return c.json({ success: false, message: 'Failed to get conversation' }, 500);
  }
});

// Create a group (admin only)
app.post('/group', verifyToken, async (c) => {
  try {
    const user = c.get('user');

    if (!user.isAdmin) {
      return c.json({ success: false, message: 'Only admins can create groups' }, 403);
    }

    // Check if it's form data (file upload) or JSON
    const contentType = c.req.header('content-type') || '';
    let groupName, groupAvatar = null;

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await c.req.formData();
      groupName = formData.get('groupName');
      const avatarFile = formData.get('groupAvatar');

      if (!groupName || !groupName.trim()) {
        return c.json({ success: false, message: 'Group name is required' }, 400);
      }

      // If avatar file is provided, upload it
      if (avatarFile && avatarFile instanceof File && avatarFile.size > 0) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(avatarFile.type)) {
          return c.json({ 
            success: false, 
            message: 'Invalid file type. Please upload JPG, PNG, WebP, or GIF images only.' 
          }, 400);
        }

        const maxSize = 10 * 1024 * 1024;
        if (avatarFile.size > maxSize) {
          return c.json({ 
            success: false, 
            message: 'File size too large. Maximum size is 10MB.' 
          }, 400);
        }

        try {
          groupAvatar = await uploadImageToCloudflare(avatarFile);
        } catch (error) {
          console.error('Group avatar upload error:', error);
          return c.json({ 
            success: false, 
            message: 'Failed to upload group avatar. Please try again.' 
          }, 500);
        }
      }
    } else {
      // Handle JSON (backward compatibility)
      const body = await c.req.json();
      groupName = body.groupName;
      groupAvatar = body.groupAvatar || null;

      if (!groupName || !groupName.trim()) {
        return c.json({ success: false, message: 'Group name is required' }, 400);
      }
    }

    // Get all users to add as participants
    const allUsers = await User.find({}).select('_id');
    const participantIds = allUsers.map(u => u._id);

    // Create group conversation
    const conversation = await Conversation.create({
      participants: participantIds,
      isGroup: true,
      groupName: groupName.trim(),
      groupAvatar: groupAvatar || null,
      groupAvatarColor: generateRandomHex(),
      createdBy: user._id
    });

    const populatedConversation = await Conversation.findById(conversation._id)
  .populate('participants', 'username avatar avatarColor bio isAdmin')
      .lean();

    // Broadcast new group to all users
    if (io) {
      io.emit('conversation:created', populatedConversation);
    }

    return c.json({ success: true, conversation: populatedConversation });
  } catch (error) {
    console.error('Error creating group:', error);
    return c.json({ success: false, message: 'Failed to create group' }, 500);
  }
});

// Get conversation by urlId
app.get('/:id', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    const urlId = c.req.param('id');

    const conversation = await Conversation.findOne({
      urlId: urlId,
      participants: user._id
    })
  .populate('participants', 'username avatar avatarColor bio isAdmin')
    .lean();

    if (!conversation) {
      return c.json({ success: false, message: 'Conversation not found' }, 404);
    }

    return c.json({ success: true, conversation });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return c.json({ success: false, message: 'Failed to fetch conversation' }, 500);
  }
});

// Update group (admin only)
app.put('/:id/update', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    const urlId = c.req.param('id');

    if (!user.isAdmin) {
      return c.json({ success: false, message: 'Only admins can update groups' }, 403);
    }

    // Find the conversation
    const conversation = await Conversation.findOne({ urlId });
    if (!conversation) {
      return c.json({ success: false, message: 'Conversation not found' }, 404);
    }

    if (!conversation.isGroup) {
      return c.json({ success: false, message: 'Cannot update non-group conversations' }, 400);
    }

    // Check if it's form data (file upload) or JSON
    const contentType = c.req.header('content-type') || '';
    let groupName, groupAvatar = null;

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await c.req.formData();
      groupName = formData.get('groupName');
      const avatarFile = formData.get('groupAvatar');

      if (!groupName || !groupName.trim()) {
        return c.json({ success: false, message: 'Group name is required' }, 400);
      }

      // If avatar file is provided, upload it
      if (avatarFile && avatarFile instanceof File && avatarFile.size > 0) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(avatarFile.type)) {
          return c.json({ 
            success: false, 
            message: 'Invalid file type. Please upload JPG, PNG, WebP, or GIF images only.' 
          }, 400);
        }

        const maxSize = 10 * 1024 * 1024;
        if (avatarFile.size > maxSize) {
          return c.json({ 
            success: false, 
            message: 'File size too large. Maximum size is 10MB.' 
          }, 400);
        }

        try {
          groupAvatar = await uploadImageToCloudflare(avatarFile);
        } catch (error) {
          console.error('Group avatar upload error:', error);
          return c.json({ 
            success: false, 
            message: 'Failed to upload group avatar. Please try again.' 
          }, 500);
        }
      }
    } else {
      // Handle JSON (backward compatibility)
      const body = await c.req.json();
      groupName = body.groupName;
      groupAvatar = body.groupAvatar || null;

      if (!groupName || !groupName.trim()) {
        return c.json({ success: false, message: 'Group name is required' }, 400);
      }
    }

    // Update the conversation
    conversation.groupName = groupName.trim();
    if (groupAvatar !== null) {
      conversation.groupAvatar = groupAvatar;
    }
    conversation.updatedAt = new Date();
    await conversation.save();

    const populatedConversation = await Conversation.findById(conversation._id)
  .populate('participants', 'username avatar avatarColor bio isAdmin')
      .lean();

    // Broadcast update to all participants
    if (io) {
      conversation.participants.forEach(participantId => {
        io.to(participantId.toString()).emit('conversation:updated', populatedConversation);
      });
    }

    return c.json({ success: true, conversation: populatedConversation });
  } catch (error) {
    console.error('Error updating group:', error);
    return c.json({ success: false, message: 'Failed to update group' }, 500);
  }
});

// Delete conversation (DMs: any participant, Groups: admin only)
app.delete('/:id', verifyToken, async (c) => {
  try {
    const user = c.get('user');
    const urlId = c.req.param('id');

    const conversation = await Conversation.findOne({ urlId });
    if (!conversation) {
      return c.json({ success: false, message: 'Conversation not found' }, 404);
    }

    // Check permissions based on conversation type
    if (conversation.isGroup) {
      // Groups can only be deleted by admins
      if (!user.isAdmin) {
        return c.json({ success: false, message: 'Only admins can delete group conversations' }, 403);
      }
    } else {
      // DMs can be deleted by any participant
      const isParticipant = conversation.participants.some(
        p => p.toString() === user._id.toString()
      );
      if (!isParticipant) {
        return c.json({ success: false, message: 'You are not a participant in this conversation' }, 403);
      }
    }

    // Delete all messages in the conversation
    await Message.deleteMany({ conversationId: conversation._id });

    // Delete the conversation
    await Conversation.findByIdAndDelete(conversation._id);

    // Broadcast deletion to all participants
    if (io) {
      conversation.participants.forEach(participantId => {
        io.to(participantId.toString()).emit('conversation:deleted', { 
          conversationId: conversation._id.toString(),
          urlId: conversation.urlId 
        });
      });
    }

    return c.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return c.json({ success: false, message: 'Failed to delete conversation' }, 500);
  }
});

export default app;
