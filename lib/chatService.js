import { io } from 'socket.io-client';
import config from '../config.json';

const BACKEND_URL = config.url;

class ChatService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token) {
    // Reuse existing socket if it exists (connected or not)
    if (this.socket) {
      console.log('♻️ Reusing existing socket connection');
      if (!this.socket.connected) {
        console.log('🔄 Socket exists but disconnected, reconnecting...');
        this.socket.connect();
      }
      return this.socket;
    }

    console.log('🆕 Creating NEW socket connection');
    this.socket = io(config.socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to chat server');
      
      // Start heartbeat
      this.startHeartbeat();
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from chat server');
      
      // Stop heartbeat
      this.stopHeartbeat();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    // Handle pong responses
    this.socket.on('pong', () => {
      // Server acknowledged our ping
      this.lastPong = Date.now();
    });

    return this.socket;
  }

  startHeartbeat() {
    // Stop existing heartbeat if any
    this.stopHeartbeat();
    
    // Send ping every 25 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('ping');
      }
    }, 25000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      console.log('🔌 Disconnecting socket but keeping instance');
      this.socket.disconnect();
      // DON'T set to null - keep the instance for reuse
      // this.socket = null;
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  // Event listeners
  on(event, callback) {
    if (!this.socket) return;
    
    this.socket.on(event, callback);
    
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.socket) return;
    
    this.socket.off(event, callback);
    
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  removeAllListeners() {
    if (this.socket) {
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.socket.off(event, callback);
        });
      });
      this.listeners.clear();
    }
  }

  // Message events
  sendMessage(conversationId, content, replyTo = null) {
    if (!this.socket) return;
    
    this.socket.emit('message:send', {
      conversationId,
      content,
      replyTo
    });
  }

  editMessage(messageId, content) {
    if (!this.socket) return;
    
    this.socket.emit('message:edit', {
      messageId,
      content
    });
  }

  deleteMessage(messageId) {
    if (!this.socket) return;
    
    this.socket.emit('message:delete', {
      messageId
    });
  }

  // Typing indicators
  startTyping(conversationId) {
    if (!this.socket) return;
    
    this.socket.emit('typing:start', {
      conversationId
    });
  }

  stopTyping(conversationId) {
    if (!this.socket) return;
    
    this.socket.emit('typing:stop', {
      conversationId
    });
  }

  // REST API calls
  async fetchConversations(token, opts = {}) {
    try {
      const url = new URL(`${BACKEND_URL}/api/chat/conversations`);
      if (opts.limit) url.searchParams.append('limit', String(opts.limit));
      if (opts.cursor) url.searchParams.append('cursor', opts.cursor);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return { success: false, message: error.message };
    }
  }

  async createOrGetDirectConversation(token, userId) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/conversations/direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return { success: false, message: error.message };
    }
  }

  async fetchMessages(token, conversationId, limit = 50, before = null, options = {}) {
    try {
      const url = new URL(`${BACKEND_URL}/api/chat/messages/${conversationId}`);
      if (limit) url.searchParams.append('limit', limit);
      if (before) url.searchParams.append('before', before);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: options.signal
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return { success: false, message: error.message };
    }
  }

  async markMessagesAsRead(token, conversationId) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/messages/${conversationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return { success: false, message: error.message };
    }
  }

  async fetchUserProfile(token, userId) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/profile/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      // Map 'away' to 'idle' for frontend display
      if (data.success && data.profile && data.profile.status === 'away') {
        data.profile.status = 'idle';
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return { success: false, message: error.message };
    }
  }

  async updateCustomStatus(token, customStatus) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/profile/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ customStatus })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating status:', error);
      return { success: false, message: error.message };
    }
  }

  async deleteConversation(token, conversationId) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return { success: false, message: error.message };
    }
  }

  async muteUser(token, userId, duration) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/mute/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ duration })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error muting user:', error);
      return { success: false, message: error.message };
    }
  }

  async checkMuteStatus(token) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/mute/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking mute status:', error);
      return { success: false, message: error.message };
    }
  }

  async unmuteUser(token, userId) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/mute/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error unmuting user:', error);
      return { success: false, message: error.message };
    }
  }

  async fetchMutedUsers(token) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/mute/list`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching muted users:', error);
      return { success: false, message: error.message };
    }
  }

  async banUser(token, userId) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/users/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token, userId })
      });
      const data = await response.json();
      // Ensure success is properly set (use response.ok if data.success is not provided)
      const success = (typeof data.success === 'boolean') ? data.success : response.ok;
      return { ...data, success };
    } catch (error) {
      console.error('Error banning user:', error);
      return { success: false, message: error.message };
    }
  }

  async unbanUser(token, userId) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/users/unban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token, userId })
      });
      const data = await response.json();
      // Ensure success is properly set (use response.ok if data.success is not provided)
      const success = (typeof data.success === 'boolean') ? data.success : response.ok;
      return { ...data, success };
    } catch (error) {
      console.error('Error unbanning user:', error);
      return { success: false, message: error.message };
    }
  }
}

// Singleton instance
const chatService = new ChatService();

export default chatService;
