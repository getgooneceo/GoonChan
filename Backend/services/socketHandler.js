import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import UserStatus from '../models/UserStatus.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import { extractPreviewCandidateUrls, fetchLinkPreview } from '../utils/linkPreview.js';

const JWT_SECRET = process.env.JWT_SECRET;
const MAX_MESSAGE_LENGTH = 2000;

// Store user socket mappings
const userSockets = new Map(); // userId -> Set of socketIds

export function initializeChatSocket(io) {
  // Socket.IO middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findOne({ email: decoded.email }).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      // Check if user is banned
      if (user.isBanned) {
        console.log(`🚫 Banned user attempted to connect: ${user.username}`);
        return next(new Error('User is banned'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`💬 User connected to chat: ${user.username} (${socket.id})`);

    // Add socket to user mappings
    if (!userSockets.has(user._id.toString())) {
      userSockets.set(user._id.toString(), new Set());
    }
    userSockets.get(user._id.toString()).add(socket.id);

    // Update user status to online with cleanup of stale socket IDs
    try {
      // Active sockets currently known to the server
      const activeSocketIds = new Set(Array.from(io.sockets.sockets.keys()));

      // Get existing status doc
      const existingStatus = await UserStatus.findOne({ user: user._id }).lean();
      const existingIds = existingStatus?.socketIds || [];

      // Keep only IDs that are still active on this server
      const prunedIds = existingIds.filter(id => activeSocketIds.has(id));

      // Ensure current socket.id is present and deduped
      const nextIds = Array.from(new Set([...prunedIds, socket.id]));

      await UserStatus.findOneAndUpdate(
        { user: user._id },
        {
          status: 'online',
          lastSeen: new Date(),
          socketIds: nextIds
        },
        { upsert: true, new: true }
      );
      if (existingIds.length !== nextIds.length) {
        console.log(`🧹 Cleaned up ${existingIds.length - prunedIds.length} stale socketIds for ${user.username}. Now: ${nextIds.length}`);
      }
    } catch (cleanupErr) {
      console.error('❌ Error cleaning up socketIds on connect:', cleanupErr);
      // Fallback to add current socket when cleanup fails
      await UserStatus.findOneAndUpdate(
        { user: user._id },
        { 
          status: 'online',
          lastSeen: new Date(),
          $addToSet: { socketIds: socket.id }
        },
        { upsert: true }
      );
    }

    // Broadcast user online status to everyone
    io.emit('user:status', {
      userId: user._id.toString(),
      status: 'online',
      username: user.username
    });

    // Send all currently online users to this new connection
    const onlineStatuses = await UserStatus.find(
      { status: { $in: ['online', 'away', 'dnd'] } },
      'user status customStatus lastSeen'
    ).lean();
    
    onlineStatuses.forEach(status => {
      if (status.user.toString() !== user._id.toString()) {
        socket.emit('user:status', {
          userId: status.user.toString(),
          status: status.status === 'away' ? 'idle' : status.status,
          lastSeen: status.lastSeen
        });
        
        if (status.customStatus) {
          socket.emit('user:customStatus', {
            userId: status.user.toString(),
            customStatus: status.customStatus
          });
        }
      }
    });

    // Join user to their personal room (for user-specific events like conversation deletion)
    socket.join(user._id.toString());

    // Join user to their conversation rooms (fetch only IDs)
    const conversations = await Conversation.find(
      { participants: user._id },
      '_id'
    ).lean();
    conversations.forEach(conv => {
      socket.join(`conversation:${conv._id}`);
    });

    // Heartbeat mechanism - track last activity
    socket.lastActivity = Date.now();
    
    // Handle heartbeat/ping from client
    socket.on('ping', () => {
      socket.lastActivity = Date.now();
      socket.emit('pong');
    });

    // Handle typing indicator with per-user, per-conversation buffer management
    const typingTimeouts = new Map(); // Map<conversationId:userId, timeoutId>
    
    socket.on('typing:start', async ({ conversationId }) => {
      socket.lastActivity = Date.now();
      
      // Verify user is in conversation
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: user._id
      }).select('_id').lean();
      
      if (!conversation) return;
      
      const key = `${conversationId}:${user._id.toString()}`;
      
      // Clear any existing timeout for this user in this conversation
      if (typingTimeouts.has(key)) {
        clearTimeout(typingTimeouts.get(key));
      }
      
      // Emit typing start to other participants in the conversation
      socket.to(`conversation:${conversationId}`).emit('typing:user', {
        conversationId,
        userId: user._id.toString(),
        username: user.username,
        isTyping: true
      });
      
      // Set buffer timeout - auto-stop after 5 seconds of inactivity
      const timeout = setTimeout(() => {
        socket.to(`conversation:${conversationId}`).emit('typing:user', {
          conversationId,
          userId: user._id.toString(),
          username: user.username,
          isTyping: false
        });
        typingTimeouts.delete(key);
      }, 5000);
      
      typingTimeouts.set(key, timeout);
    });

    socket.on('typing:stop', async ({ conversationId }) => {
      socket.lastActivity = Date.now();
      
      const key = `${conversationId}:${user._id.toString()}`;
      
      // Clear timeout if exists
      if (typingTimeouts.has(key)) {
        clearTimeout(typingTimeouts.get(key));
        typingTimeouts.delete(key);
      }
      
      // Emit typing stop to other participants
      socket.to(`conversation:${conversationId}`).emit('typing:user', {
        conversationId,
        userId: user._id.toString(),
        username: user.username,
        isTyping: false
      });
    });

    // Handle sending messages
    socket.on('message:send', async (data) => {
      try {
        // Update activity timestamp
        socket.lastActivity = Date.now();
        
        const { conversationId, content, replyTo } = data;

        // 1. Input Validation & Security
        if (!content || typeof content !== 'string' || !content.trim()) {
          return socket.emit('message:error', { message: 'Message content cannot be empty' });
        }
        if (content.length > MAX_MESSAGE_LENGTH) {
          return socket.emit('message:error', { message: `Message too long (max ${MAX_MESSAGE_LENGTH} chars)` });
        }

        // Parallel fetch: user validation and conversation lookup
        const [currentUser, conversation] = await Promise.all([
          User.findById(user._id).select('mutedUntil isBanned').lean(),
          Conversation.findOne({
            _id: conversationId,
            participants: user._id
          }).select('participants isGroup unreadCount notificationPreferences').lean()
        ]);

        if (currentUser.isBanned) {
          return socket.emit('message:error', { 
            message: 'You are banned and cannot send messages',
            isBanned: true
          });
        }

        if (!conversation) {
          return socket.emit('message:error', { message: 'Conversation not found' });
        }

        // Check if user is muted (only for group conversations)
        if (conversation.isGroup) {
          if (currentUser.mutedUntil && new Date(currentUser.mutedUntil) > new Date()) {
            return socket.emit('message:error', { 
              message: 'You are muted and cannot send messages in groups',
              isMuted: true,
              mutedUntil: currentUser.mutedUntil.toISOString()
            });
          }
        }

        // Create message immediately (don't wait for reply data)
        const messagePromise = Message.create({
          conversationId,
          sender: user._id,
          content,
          replyTo: replyTo || null,
          readBy: [{ user: user._id, readAt: new Date() }]
        });

        // Fetch reply data in parallel if needed
        const replyToPromise = replyTo 
          ? Message.findById(replyTo)
              .populate('sender', 'username avatar avatarColor isAdmin')
              .select('content sender createdAt')
              .lean()
          : Promise.resolve(null);

        // Wait for both to complete
        const [message, replyToData] = await Promise.all([messagePromise, replyToPromise]);

        // Build message object with sender data pre-populated (avoid extra DB query)
        const messageToEmit = {
          _id: message._id,
          conversationId: message.conversationId,
          sender: {
            _id: user._id,
            username: user.username,
            avatar: user.avatar,
            avatarColor: user.avatarColor,
            isAdmin: user.isAdmin
          },
          content: message.content,
          replyTo: replyToData,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
          readBy: message.readBy,
          isEdited: false
        };

        // Immediately emit to sender (instant feedback)
        socket.emit('message:new', {
          message: messageToEmit,
          conversationId,
          unread: 0,
          shouldNotify: false
        });

        // Check for @mentions in the message to support mention-only notification preferences
        const mentionPattern = /@(\w+)/g;
        const mentionedUsernames = [];
        let match;
        while ((match = mentionPattern.exec(content)) !== null) {
          mentionedUsernames.push(match[1].toLowerCase());
        }

        const participantUserMap = new Map();
        if (mentionedUsernames.length > 0) {
          // Optimization: Only fetch participants if there are mentions
          // We fetch all participants to map usernames correctly, but select only needed fields
          const participants = await User.find({
            _id: { $in: conversation.participants }
          }).select('_id username');

          participants.forEach(p => {
            if (p.username) {
              participantUserMap.set(p._id.toString(), p.username.toLowerCase());
            }
          });
        }

        const mentionFlags = new Map();

        // Increment unread counters for everyone except the sender
        conversation.participants.forEach(participantId => {
          const participantIdStr = participantId.toString();
          if (participantIdStr === user._id.toString()) {
            mentionFlags.set(participantIdStr, false);
            return;
          }

          const participantUsername = participantUserMap.get(participantIdStr);
          const wasMentioned = participantUsername && mentionedUsernames.includes(participantUsername);
          mentionFlags.set(participantIdStr, !!wasMentioned);

          let unreadEntry = conversation.unreadCount.find(u => 
            u.user.toString() === participantIdStr
          );

          if (!unreadEntry) {
            unreadEntry = {
              user: participantId,
              count: 0,
              mentionsCount: 0
            };
            conversation.unreadCount.push(unreadEntry);
          }

          unreadEntry.count += 1;
          if (wasMentioned) {
            unreadEntry.mentionsCount = (unreadEntry.mentionsCount || 0) + 1;
          }
        });

        conversation.lastMessage = message._id;
        conversation.lastMessageAt = new Date();
        
        // Save conversation asynchronously (don't block emission)
        conversation.save().catch(err => console.error('Error saving conversation:', err));

        // Emit personalized message payloads that include unread counts + notification hints
        conversation.participants.forEach(participantId => {
          const participantIdStr = participantId.toString();
          
          // Skip sender (already notified above)
          if (participantIdStr === user._id.toString()) return;
          
          const participantSockets = userSockets.get(participantIdStr);
          if (!participantSockets) return;

          const unreadEntry = conversation.unreadCount.find(u => 
            u.user.toString() === participantIdStr
          );

          const prefEntry = (conversation.notificationPreferences || []).find(
            p => p.user.toString() === participantIdStr
          );
          const preference = prefEntry ? prefEntry.preference : 'all';

          let displayUnread = 0;
          let shouldNotify = false;

          if (preference === 'all') {
            displayUnread = unreadEntry?.count || 0;
            shouldNotify = true;
          } else if (preference === 'mentions') {
            displayUnread = unreadEntry?.mentionsCount || 0;
            shouldNotify = !!mentionFlags.get(participantIdStr) && displayUnread > 0;
          }
          // preference === 'nothing' keeps defaults (0 / false)

          participantSockets.forEach(socketId => {
            io.to(socketId).emit('message:new', {
              message: messageToEmit,
              conversationId,
              unread: displayUnread,
              shouldNotify
            });
          });
        });

        // Link preview unfurling (first two non-markdown URLs) - run in background
        setImmediate(async () => {
          try {
            const urls = extractPreviewCandidateUrls(content, 2);
            if (urls.length > 0) {
              const previews = (await Promise.all(urls.map(u => fetchLinkPreview(u)))).filter(Boolean);
              if (previews.length > 0) {
                await Message.findByIdAndUpdate(message._id, { previews });
                io.in(`conversation:${conversationId}`).emit('message:preview', {
                  messageId: message._id.toString(),
                  conversationId,
                  previews
                });
              }
            }
          } catch (e) {
            console.error('Preview generation error:', e?.message || e);
          }
        });

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message:error', { message: 'Failed to send message' });
      }
    });

    // Handle message editing
    socket.on('message:edit', async (data) => {
      try {
        const { messageId, content } = data;

        const message = await Message.findOne({
          _id: messageId,
          sender: user._id
        });

        if (!message) {
          return socket.emit('message:error', { message: 'Message not found or unauthorized' });
        }

        message.content = content;
        message.editedAt = new Date();
        await message.save();

        // Fetch minimal populated data (include previews initially empty)
        const populatedMessage = await Message.findById(message._id)
          .select('content sender conversationId replyTo createdAt updatedAt editedAt previews')
          .populate('sender', '_id username avatar avatarColor isAdmin')
          .populate({
            path: 'replyTo',
            select: 'content sender createdAt',
            populate: { path: 'sender', select: '_id username avatar avatarColor isAdmin' }
          })
          .lean();

        populatedMessage.isEdited = true;

        io.in(`conversation:${message.conversationId}`).emit('message:edited', {
          message: populatedMessage
        });

        // Regenerate previews in background (non-blocking)
        setImmediate(async () => {
          try {
            const urls = extractPreviewCandidateUrls(content, 2);
            if (urls.length > 0) {
              const previews = (await Promise.all(urls.map(u => fetchLinkPreview(u)))).filter(Boolean);
              if (previews.length > 0) {
                await Message.findByIdAndUpdate(message._id, { previews });
                // Notify clients to update message with new previews
                io.in(`conversation:${message.conversationId}`).emit('message:preview', {
                  messageId: message._id.toString(),
                  conversationId: message.conversationId.toString(),
                  previews
                });
              }
            }
          } catch (e) {
            console.error('Preview regeneration error on edit:', e?.message || e);
          }
        });

      } catch (error) {
        console.error('Error editing message:', error);
        socket.emit('message:error', { message: 'Failed to edit message' });
      }
    });

    // Handle message deletion
    socket.on('message:delete', async (data) => {
      try {
        const { messageId } = data;

        // Find the message
        const message = await Message.findById(messageId);

        if (!message) {
          return socket.emit('message:error', { message: 'Message not found' });
        }

        // Check if user is authorized to delete (owner or admin)
        const isOwner = message.sender.toString() === user._id.toString();
        const isAdmin = user.isAdmin === true;

        if (!isOwner && !isAdmin) {
          return socket.emit('message:error', { message: 'Unauthorized to delete this message' });
        }

        const conversationId = message.conversationId;
        
        // Check if this is the last message in the conversation
        const conversation = await Conversation.findById(conversationId);
        const isLastMessage = conversation?.lastMessage?.toString() === messageId.toString();
        
        // Permanently delete the message
        await Message.findByIdAndDelete(messageId);

        // Emit deletion to all users in conversation
        io.in(`conversation:${conversationId}`).emit('message:deleted', {
          messageId
        });

        // If deleted message was the last message, update conversation with previous message
        if (isLastMessage) {
          const newLastMessage = await Message.findOne({ conversationId })
            .sort({ createdAt: -1 })
            .select('_id');

          conversation.lastMessage = newLastMessage?._id || null;
          conversation.lastMessageAt = newLastMessage ? new Date() : conversation.lastMessageAt;
          await conversation.save();

          // Broadcast minimal conversation update (no heavy population)
          const minimalUpdate = {
            _id: conversationId,
            lastMessage: newLastMessage?._id || null,
            lastMessageAt: newLastMessage ? new Date() : conversation.lastMessageAt
          };

          conversation.participants.forEach(participantId => {
            const participantSockets = userSockets.get(participantId.toString());
            if (participantSockets) {
              participantSockets.forEach(socketId => {
                io.to(socketId).emit('conversation:updated', minimalUpdate);
              });
            }
          });
        }

      } catch (error) {
        console.error('Error deleting message:', error);
        socket.emit('message:error', { message: 'Failed to delete message' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      try {
        console.log(`💬 User disconnected from chat: ${user.username} (${socket.id})`);

        // Clear any typing timeouts for this user across all conversations
        for (const [key, timeout] of typingTimeouts.entries()) {
          if (key.endsWith(`:${user._id.toString()}`)) {
            clearTimeout(timeout);
            typingTimeouts.delete(key);
            
            // Extract conversationId and emit typing stop
            const conversationId = key.split(':')[0];
            socket.to(`conversation:${conversationId}`).emit('typing:user', {
              conversationId,
              userId: user._id.toString(),
              username: user.username,
              isTyping: false
            });
          }
        }

        // Remove socket from user mappings
        const userSocketSet = userSockets.get(user._id.toString());
        if (userSocketSet) {
          userSocketSet.delete(socket.id);
          if (userSocketSet.size === 0) {
            userSockets.delete(user._id.toString());
          }
        }

        // Remove this socket from the user's socketIds array
        const pullResult = await UserStatus.findOneAndUpdate(
          { user: user._id },
          { $pull: { socketIds: socket.id } },
          { new: true }
        );

        // Additional pruning: remove any IDs that are no longer active on the server
        const activeSocketIds = new Set(Array.from(io.sockets.sockets.keys()));
        const currentIds = pullResult?.socketIds || [];
        const prunedIds = currentIds.filter(id => activeSocketIds.has(id));

        if (prunedIds.length !== currentIds.length) {
          await UserStatus.findOneAndUpdate(
            { user: user._id },
            { socketIds: prunedIds },
            { new: true }
          );
          console.log(`🧹 Pruned ${currentIds.length - prunedIds.length} stale socketIds for ${user.username} on disconnect. Now: ${prunedIds.length}`);
        }

        console.log(`📊 User ${user.username} after removing socket:`, prunedIds.length || 0, 'sockets remaining');

        // Check if user has any remaining connections
        if (prunedIds.length === 0) {
          console.log(`✅ Setting ${user.username} to offline - broadcasting to all clients`);
          
          const updateResult = await UserStatus.findOneAndUpdate(
            { user: user._id },
            { 
              status: 'offline',
              lastSeen: new Date()
            },
            { new: true }
          );
          
          console.log(`✅ Updated status in DB:`, updateResult?.status);

          io.emit('user:status', {
            userId: user._id.toString(),
            status: 'offline',
            username: user.username,
            lastSeen: new Date()
          });
          
          console.log(`✅ Broadcast sent for ${user.username} offline status`);
        } else {
          console.log(`ℹ️ User ${user.username} still has ${prunedIds.length} connections, keeping online`);
        }
      } catch (error) {
        console.error(`❌ Error in disconnect handler for ${user.username}:`, error);
      }
    });
  });

  // Periodic cleanup of stale connections (every 30 seconds)
  const STALE_TIMEOUT = 60000; // 60 seconds without activity
  const cleanupInterval = setInterval(async () => {
    try {
      const now = Date.now();
      const activeSocketIds = new Set(Array.from(io.sockets.sockets.keys()));
      
      // Find all user statuses with socketIds
      const allStatuses = await UserStatus.find({ 
        socketIds: { $exists: true, $ne: [] } 
      }).lean();

      for (const status of allStatuses) {
        const validSocketIds = [];
        let hasStaleSocket = false;

        for (const socketId of status.socketIds) {
          const socket = io.sockets.sockets.get(socketId);
          
          // Check if socket exists and is not stale
          if (socket && activeSocketIds.has(socketId)) {
            const timeSinceActivity = now - (socket.lastActivity || now);
            
            if (timeSinceActivity < STALE_TIMEOUT) {
              validSocketIds.push(socketId);
            } else {
              hasStaleSocket = true;
              console.log(`🧹 Disconnecting stale socket ${socketId} for user ${socket.user?.username} (${timeSinceActivity}ms idle)`);
              socket.disconnect(true);
            }
          } else {
            hasStaleSocket = true;
          }
        }

        // Update status if we found stale sockets
        if (hasStaleSocket) {
          if (validSocketIds.length === 0) {
            // No valid sockets left, set user offline
            await UserStatus.findOneAndUpdate(
              { user: status.user },
              { 
                status: 'offline',
                lastSeen: new Date(),
                socketIds: []
              }
            );

            // Broadcast offline status
            io.emit('user:status', {
              userId: status.user.toString(),
              status: 'offline',
              lastSeen: new Date()
            });
            
            console.log(`🔴 Set user ${status.user} offline (no valid connections)`);
          } else {
            // Update with only valid socket IDs
            await UserStatus.findOneAndUpdate(
              { user: status.user },
              { socketIds: validSocketIds }
            );
            
            console.log(`🧹 Cleaned up stale sockets for user ${status.user}. Valid sockets: ${validSocketIds.length}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in cleanup interval:', error);
    }
  }, 30000); // Run every 30 seconds

  // Clean up interval on server shutdown
  io.on('close', () => {
    clearInterval(cleanupInterval);
  });

  return io;
}

export { userSockets };

