import { useState, useEffect, useCallback, useRef } from 'react';
import chatService from '../lib/chatService';

export function useChat(token, options = {}) {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userStatuses, setUserStatuses] = useState(new Map());
  const [typingUsers, setTypingUsers] = useState(new Map()); // Map<conversationId, Map<userId, {username, timestamp}>>
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isLoadingMoreConversations, setIsLoadingMoreConversations] = useState(false);
  const [hasMoreConversations, setHasMoreConversations] = useState(true);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const conversationsCursorRef = useRef(null);
  
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false); // Track if we're currently in "typing" state
  const lastTypingEmitRef = useRef(0); // Track last time we emitted typing event
  const typingBufferTimeouts = useRef(new Map()); // Map<conversationId:userId, timeoutId> for buffer management
  const messageCache = useRef(new Map()); // Cache messages per conversation
  const hasMoreMessagesCache = useRef(new Map()); // Track hasMore per conversation
  const currentLoadingConvRef = useRef(null); // Track which conversation is currently loading
  const currentConversationRef = useRef(null); // Track current conversation synchronously for event handlers
  const currentFetchAbortRef = useRef(null); // AbortController for in-flight message fetch

  // Helper: sort conversations by recency
  const sortConversationsByRecency = useCallback((list) => {
    const getTs = (c) => new Date(c.lastMessageAt || c.updatedAt || c.createdAt || 0).getTime();
    return [...list].sort((a, b) => getTs(b) - getTs(a));
  }, []);

  // Load conversations
  const loadConversations = useCallback(async (opts = {}) => {
    if (!token) return;
    
    setIsLoading(true);
    const result = await chatService.fetchConversations(token, { limit: opts.limit || 30, cursor: null });
    if (result.success) {
      setConversations(result.conversations || []);
      setHasMoreConversations(!!result.hasMore);
      conversationsCursorRef.current = result.nextCursor || null;
      
      // If userStatuses are provided, populate them
      if (result.userStatuses) {
        console.log('📊 Loading initial user statuses:', Object.keys(result.userStatuses).length, 'users');
        setUserStatuses(prev => {
          const newMap = new Map(prev);
          Object.entries(result.userStatuses).forEach(([userId, statusData]) => {
            console.log(`  👤 ${userId}: ${statusData.status}${statusData.customStatus ? ` - "${statusData.customStatus}"` : ''}`);
            newMap.set(userId, statusData);
          });
          return newMap;
        });
      }
    }
    setIsLoading(false);
  }, [token, options.disabled]);

  const loadMoreConversations = useCallback(async () => {
    if (!token || !hasMoreConversations || isLoadingMoreConversations) return;
    setIsLoadingMoreConversations(true);
    const cursor = conversationsCursorRef.current;
    const result = await chatService.fetchConversations(token, { limit: 30, cursor });
    if (result.success) {
      setConversations(prev => {
        const existingIds = new Set(prev.map(c => c._id));
        const appended = (result.conversations || []).filter(c => !existingIds.has(c._id));
        return [...prev, ...appended];
      });
      setHasMoreConversations(!!result.hasMore);
      conversationsCursorRef.current = result.nextCursor || null;

      // Merge/extend statuses with any newly received ones
      if (result.userStatuses) {
        setUserStatuses(prev => {
          const newMap = new Map(prev);
          Object.entries(result.userStatuses).forEach(([userId, statusData]) => {
            newMap.set(userId, { ...(newMap.get(userId) || {}), ...statusData });
          });
          return newMap;
        });
      }
    }
    setIsLoadingMoreConversations(false);
  }, [token, hasMoreConversations, isLoadingMoreConversations]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId, limit = 90, before = null) => {
    if (!token) return { success: false, hasMore: false };
    
    // Setup abort controller for this fetch
    const controller = new AbortController();
    currentFetchAbortRef.current = controller;
    const result = await chatService.fetchMessages(token, conversationId, limit, before, { signal: controller.signal });
    
    // Check if this conversation is still the one we want to load
    const isStillCurrent = currentLoadingConvRef.current === conversationId;
    
    if (result.success && isStillCurrent) {
      // Backend should return hasOlderMessages/hasMore; fallback to batch size heuristic
      const hasMore =
        result.hasOlderMessages !== undefined
          ? result.hasOlderMessages
          : result.hasMore !== undefined
            ? result.hasMore
            : (result.messages?.length >= limit);
      
      if (before) {
        // Prepend older messages
        setMessages(prev => {
          const updated = [...result.messages, ...prev];
          messageCache.current.set(conversationId, updated);
          return updated;
        });
        setHasMoreMessages(hasMore);
        hasMoreMessagesCache.current.set(conversationId, hasMore);
      } else {
        // Replace with new messages and cache them
        const newMessages = result.messages || [];
        setMessages(newMessages);
        messageCache.current.set(conversationId, newMessages);
        setHasMoreMessages(hasMore);
        hasMoreMessagesCache.current.set(conversationId, hasMore);
      }
      
      // Mark as read (fire-and-forget)
      chatService.markMessagesAsRead(token, conversationId);
      
      return { success: true, hasMore };
    } else if (!isStillCurrent) {
      // User switched to a different conversation, cache the result but don't show it
      if (result.success && !before) {
        messageCache.current.set(conversationId, result.messages || []);
        const hasMore =
          result.hasOlderMessages !== undefined
            ? result.hasOlderMessages
            : result.hasMore !== undefined
              ? result.hasMore
              : (result.messages?.length >= limit);
        hasMoreMessagesCache.current.set(conversationId, hasMore);
      }
    }
    
    return { success: false, hasMore: false };
    // Do not toggle global isLoading here; selectConversation drives UI state
  }, [token, options.disabled]);

  // Select conversation
  const selectConversation = useCallback(async (conversation) => {
    if (!conversation) {
      currentConversationRef.current = null;
      setCurrentConversation(null);
      setMessages([]);
      setIsLoadingConversation(false);
      
      // Clear typing indicators when no conversation selected
      setTypingUsers(new Map());
      isTypingRef.current = false; // Reset typing state
      lastTypingEmitRef.current = 0;
      return;
    }

    // Abort any in-flight fetch when switching rapidly
    if (currentFetchAbortRef.current) {
      try { currentFetchAbortRef.current.abort(); } catch {}
      currentFetchAbortRef.current = null;
    }

    const loadingId = conversation._id;
    currentLoadingConvRef.current = loadingId;
    currentConversationRef.current = conversation;
    setCurrentConversation(conversation);
    
    // Reset typing state when switching conversations
    isTypingRef.current = false;
    lastTypingEmitRef.current = 0;
    
    // Clear typing indicators for old conversation
    setTypingUsers(prev => {
      const newMap = new Map(prev);
      // Keep only typing data for the new conversation (if any exists)
      const conversationTyping = newMap.get(loadingId);
      if (conversationTyping && conversationTyping.size > 0) {
        return new Map([[loadingId, conversationTyping]]);
      }
      return new Map();
    });
    
    // Optimistic unread reset
    setConversations(prev => prev.map(conv => 
      conv._id === loadingId ? { ...conv, unread: 0 } : conv
    ));
    
    // Use cache if available
    if (messageCache.current.has(loadingId)) {
      setMessages(messageCache.current.get(loadingId));
      // Restore hasMore state from cache
      const cachedHasMore = hasMoreMessagesCache.current.get(loadingId);
      setHasMoreMessages(cachedHasMore !== undefined ? cachedHasMore : true);
      chatService.markMessagesAsRead(token, loadingId);
    } else {
      setIsLoadingConversation(true);
      setMessages([]);
      setHasMoreMessages(true); // Assume there's more until we know otherwise
      // Fetch initial batch
      await loadMessages(loadingId, 90);
      if (currentLoadingConvRef.current === loadingId) {
        setIsLoadingConversation(false);
      }
    }

    // Prefetch the next most recent conversation to make the next switch instant
    try {
      const idx = conversations.findIndex(c => c._id === loadingId);
      const next = idx >= 0 ? conversations[idx + 1] : null;
      if (next && !messageCache.current.has(next._id)) {
        const res = await chatService.fetchMessages(token, next._id, 90, null);
        if (res.success && Array.isArray(res.messages)) {
          messageCache.current.set(next._id, res.messages);
        }
      }
    } catch {}
  }, [loadMessages, token, conversations]);

  // Event handlers (defined before useEffect to avoid initialization errors)
  const handleNewMessage = useCallback((data) => {
    const { message, conversationId, unread } = data;
    const isCurrent = currentConversationRef.current?._id === conversationId;
    
    // Update messages if current conversation
    if (isCurrent) {
      setMessages(prev => {
        // Remove pending messages with matching temp IDs OR content (for faster deduplication)
        const filtered = prev.filter(msg => {
          if (!msg.isPending) return true;
          // Remove if same content from same user (handles race conditions)
          if (msg.sender?._id === message.sender?._id && msg.content === message.content) {
            return false;
          }
          return true;
        });
        
        // Check if message already exists (prevent duplicates)
        if (filtered.some(m => m._id === message._id)) {
          return prev;
        }
        
        const updated = [...filtered, message];
        messageCache.current.set(conversationId, updated);
        
        // If this is the first message in a new conversation (prev was empty),
        // ensure hasMoreMessages is false since there's no history before it
        if (filtered.length === 0) {
          setHasMoreMessages(false);
          hasMoreMessagesCache.current.set(conversationId, false);
        }
        
        return updated;
      });
      
      // Mark as read (non-blocking, don't await)
      chatService.markMessagesAsRead(token, conversationId);
    } else if (messageCache.current.has(conversationId)) {
      // Update cache for non-current conversations
      const cached = messageCache.current.get(conversationId);
      // Prevent duplicates in cache
      if (!cached.some(m => m._id === message._id)) {
        messageCache.current.set(conversationId, [...cached, message]);
      }
    }
    
    setConversations(prev => 
      prev.map(conv => 
        conv._id === conversationId 
          ? {
              ...conv,
              lastMessage: message,
              lastMessageAt: message.createdAt,
              unread: isCurrent ? 0 : (typeof unread === 'number' ? unread : conv.unread)
            }
          : conv
      ).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
    );
  }, [token]);

  // Late preview enrichment (arrives after initial message:new)
  const handleMessagePreview = useCallback((data) => {
    const { messageId, conversationId, previews } = data;
    const updateList = (list) => list.map(m => m._id === messageId ? { ...m, previews } : m);
    if (currentConversationRef.current?._id === conversationId) {
      setMessages(prev => {
        const updated = updateList(prev);
        messageCache.current.set(conversationId, updated);
        return updated;
      });
    } else if (messageCache.current.has(conversationId)) {
      const cached = messageCache.current.get(conversationId);
      messageCache.current.set(conversationId, updateList(cached));
    }
  }, []);

  const handleMessageEdited = useCallback((data) => {
    const { message } = data;
    
    setMessages(prev => {
      // Check if message exists before updating
      if (!prev.some(m => m._id === message._id)) return prev;
      
      const updated = prev.map(msg => 
        msg._id === message._id 
          ? { ...msg, ...message, isPending: false, isEditPending: false, previews: message.previews || [] } 
          : msg
      );
      // Update cache if this is the current conversation
      if (currentConversationRef.current?._id === message.conversationId) {
        messageCache.current.set(currentConversationRef.current._id, updated);
      }
      return updated;
    });
  }, []);

  const handleMessageDeleted = useCallback((data) => {
    const { messageId, conversationId } = data;
    
    setMessages(prev => {
      // If message is already gone (e.g. optimistic delete), don't trigger re-render
      if (!prev.some(msg => msg._id === messageId)) return prev;

      const updated = prev.filter(msg => msg._id !== messageId);
      // Update cache if this is the current conversation
      if (currentConversationRef.current?._id === conversationId) {
        messageCache.current.set(conversationId, updated);
      }
      return updated;
    });
    
    // Also update cache for non-current conversations
    if (currentConversationRef.current?._id !== conversationId) {
      const cached = messageCache.current.get(conversationId) || [];
      messageCache.current.set(conversationId, cached.filter(msg => msg._id !== messageId));
    }

    // After caches are updated, recompute lastMessage for that conversation
    try {
      const remaining = messageCache.current.get(conversationId) || [];
      const latest = remaining.length > 0 
        ? remaining.reduce((acc, m) => !acc || new Date(m.createdAt) > new Date(acc.createdAt) ? m : acc, null)
        : null;
      setConversations(prev => prev.map(conv => {
        if (conv._id !== conversationId) return conv;
        // Preserve unread logic: if current conversation, force unread 0
        const isCurrent = currentConversationRef.current?._id === conversationId;
        return {
          ...conv,
            lastMessage: latest,
            lastMessageAt: latest?.createdAt || conv.createdAt || conv.lastMessageAt,
            unread: isCurrent ? 0 : conv.unread // don't mutate unread counts on delete
        };
      }).sort((a,b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)));
    } catch (err) {
      console.warn('Failed to recompute lastMessage after deletion:', err);
    }
  }, []);

  const handleConversationUpdated = useCallback((conversation) => {
    setConversations(prev => {
      const exists = prev.find(c => c._id === conversation._id);
      if (exists) {
        return prev.map(c => {
          if (c._id === conversation._id) {
            const isCurrent = currentConversationRef.current?._id === conversation._id;
            const backendUnread = typeof conversation.unread === 'number' ? conversation.unread : undefined;

            // Merge incoming payload over existing state
            let merged = { ...c, ...conversation };

            // Determine a safe lastMessage/lastMessageAt
            const cached = messageCache.current.get(conversation._id) || [];
            const pickLatest = (arr) => arr.reduce((acc, m) => {
              if (!acc) return m;
              return new Date(m?.createdAt || 0) > new Date(acc?.createdAt || 0) ? m : acc;
            }, null);

            const hasIncomingLast = !!merged.lastMessage && !!merged.lastMessage?.content;
            if (!hasIncomingLast && cached.length > 0) {
              const latest = pickLatest(cached);
              merged.lastMessage = latest || null;
              merged.lastMessageAt = latest?.createdAt || merged.lastMessageAt || merged.updatedAt || merged.createdAt;
            } else {
              // Ensure lastMessageAt is coherent if backend sent lastMessage but omitted lastMessageAt
              if (merged.lastMessage && !merged.lastMessageAt) {
                merged.lastMessageAt = merged.lastMessage.createdAt || merged.updatedAt || merged.createdAt;
              }
            }

            // Enforce unread rule for current conversation
            merged.unread = isCurrent ? 0 : (backendUnread ?? merged.unread ?? 0);

            return merged;
          }
          return c;
        }).sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
      }
      return [{ ...conversation, unread: conversation.unread || 0 }, ...prev];
    });
  }, []);

  const handleConversationCreated = useCallback((conversation) => {
    // Add new conversation to the list
    setConversations(prev => {
      const exists = prev.find(c => c._id === conversation._id);
      if (exists) return prev; // Already have it
      return [conversation, ...prev];
    });
  }, []);

  const handleConversationDeleted = useCallback(async (data) => {
    const { conversationId, urlId } = data;

    // Determine if the deleted conversation is the current one
    const wasCurrent = (
      currentConversationRef.current?._id === conversationId ||
      (urlId && currentConversationRef.current?.urlId === urlId)
    );

    // Clear message cache for this conversation by _id
    if (conversationId) {
      messageCache.current.delete(conversationId);
    }

    // Reload conversations from API to get fresh, accurate state
    await loadConversations({ limit: 60 });

    // If user was viewing the deleted convo, switch to the most recent remaining convo
    if (wasCurrent) {
      // Wait a tick for conversations to update
      setTimeout(() => {
        setConversations(prev => {
          const fallback = prev[0] || null;
          if (fallback) {
            selectConversation(fallback);
          } else {
            currentConversationRef.current = null;
            setCurrentConversation(null);
            setMessages([]);
          }
          return prev;
        });
      }, 100);
    }
  }, [loadConversations, selectConversation]);

  const handleUserStatus = useCallback((data) => {
    const { userId, status, lastSeen } = data;
    console.log('👤 User status update:', userId, status);
    
    setUserStatuses(prev => {
      const newMap = new Map(prev);
      const existingData = newMap.get(userId) || {};
      newMap.set(userId, { ...existingData, status, lastSeen });
      return newMap;
    });
  }, []);

  const handleUserCustomStatus = useCallback((data) => {
    const { userId, customStatus } = data;
    console.log('💬 User custom status update:', userId, customStatus);
    
    setUserStatuses(prev => {
      const newMap = new Map(prev);
      const existingData = newMap.get(userId) || {};
      newMap.set(userId, { ...existingData, customStatus });
      return newMap;
    });
  }, []);

  const handleTyping = useCallback((data) => {
    const { conversationId, userId, username, isTyping } = data;
    
    // Only process for current conversation to avoid memory leaks
    if (currentConversationRef.current?._id !== conversationId) return;
    
    const key = `${conversationId}:${userId}`;
    
    setTypingUsers(prev => {
      const newMap = new Map(prev);
      let conversationTyping = newMap.get(conversationId) || new Map();
      
      if (isTyping) {
        // User started typing - add them with timestamp
        conversationTyping = new Map(conversationTyping);
        conversationTyping.set(userId, {
          username: username || 'User',
          timestamp: Date.now()
        });
        newMap.set(conversationId, conversationTyping);
        
        // Clear existing buffer timeout
        if (typingBufferTimeouts.current.has(key)) {
          clearTimeout(typingBufferTimeouts.current.get(key));
        }
        
        // Set buffer timeout - keep indicator for 5 seconds after last typing event
        const timeout = setTimeout(() => {
          setTypingUsers(prev => {
            const updated = new Map(prev);
            const convTyping = updated.get(conversationId);
            if (convTyping) {
              const newConvTyping = new Map(convTyping);
              newConvTyping.delete(userId);
              if (newConvTyping.size === 0) {
                updated.delete(conversationId);
              } else {
                updated.set(conversationId, newConvTyping);
              }
            }
            return updated;
          });
          typingBufferTimeouts.current.delete(key);
        }, 5000);
        
        typingBufferTimeouts.current.set(key, timeout);
      } else {
        // User stopped typing - but respect the buffer
        // Only remove if buffer timeout hasn't been set (explicit stop)
        if (!typingBufferTimeouts.current.has(key)) {
          conversationTyping = new Map(conversationTyping);
          conversationTyping.delete(userId);
          if (conversationTyping.size === 0) {
            newMap.delete(conversationId);
          } else {
            newMap.set(conversationId, conversationTyping);
          }
        }
        // If buffer exists, let it handle the removal
      }
      
      return newMap;
    });
  }, []);

  

  // Connect to socket - only run once when token changes
  useEffect(() => {
    if (!token || options.disabled) return;

    console.log('🔌 [useChat] Connecting to socket... Token:', token?.substring(0, 20));
    console.trace('Connection triggered by:');
    chatService.connect(token);
    setIsConnected(true);

    // Load first page of conversations
    loadConversations({ limit: 60 });

    // Set up event listeners
    chatService.on('message:new', handleNewMessage);
    // If the consumer provided an onNewMessage hook, register it too
    if (typeof options.onNewMessage === 'function') {
      try {
        chatService.on('message:new', options.onNewMessage);
      } catch (err) {
        console.warn('Failed to attach options.onNewMessage listener', err);
      }
    }
    chatService.on('message:preview', handleMessagePreview);
    chatService.on('message:edited', handleMessageEdited);
    chatService.on('message:deleted', handleMessageDeleted);
    chatService.on('conversation:updated', handleConversationUpdated);
    chatService.on('conversation:created', handleConversationCreated);
    chatService.on('conversation:deleted', handleConversationDeleted);
  chatService.on('user:status', handleUserStatus);
    chatService.on('user:customStatus', handleUserCustomStatus);
    chatService.on('typing:user', handleTyping);
    // Optional: handle ban notifications. This gets fired only for the banned user.
    if (options.onBanned) {
      chatService.on('user:banned', options.onBanned);
    }
    // Optional: handle unban notifications. This gets fired only for the unbanned user.
    if (options.onUnbanned) {
      chatService.on('user:unbanned', options.onUnbanned);
    }

    return () => {
      console.log('🔌 [useChat] CLEANUP: Disconnecting from socket...');
      console.trace('Disconnect triggered by:');
      
      // Clear all typing buffer timeouts
      typingBufferTimeouts.current.forEach(timeout => {
        clearTimeout(timeout);
      });
      typingBufferTimeouts.current.clear();
      
      // Clear typing timeout for user's own typing
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
      // If an external onNewMessage listener was provided, remove it explicitly
      if (typeof options.onNewMessage === 'function') {
        try {
          chatService.off('message:new', options.onNewMessage);
        } catch (e) {
          // ignore
        }
      }
      chatService.removeAllListeners();
      chatService.disconnect();
      setIsConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, options.disabled]);

  // Warm cache for top recent conversations as soon as list is available
  useEffect(() => {
    if (conversations.length > 0) {
      prefetchMessages(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations.length]);

  // Prefetch messages for recent conversations
  const prefetchMessages = useCallback(async (count = 2) => {
    if (!token || conversations.length === 0) return;
    const toPrefetch = conversations.slice(0, count).map(c => c._id);
    await Promise.all(toPrefetch.map(async (id) => {
      if (!messageCache.current.has(id)) {
        const res = await chatService.fetchMessages(token, id, 90, null);
        if (res.success && Array.isArray(res.messages)) {
          messageCache.current.set(id, res.messages);
        }
      }
    }));
  }, [token, conversations]);

  // Send message
  const sendMessage = useCallback((content, replyTo = null, type = 'text', attachments = []) => {
    if (!currentConversation || !content.trim()) return;
    
    chatService.sendMessage(currentConversation._id, content, replyTo, type, attachments);
  }, [currentConversation]);

  // Load more messages (for infinite scroll)
  const loadMoreMessages = useCallback(async () => {
    if (!currentConversation || !token || isLoadingMoreMessages || !hasMoreMessages) {
      return { success: false, hasMore: false };
    }
    
    setIsLoadingMoreMessages(true);
    
    // Get the oldest message's ID to use as 'before' cursor
    const oldestMessage = messages.length > 0 ? messages[0] : null;
    const beforeMessageId = oldestMessage ? oldestMessage._id : null;
    
    if (!beforeMessageId) {
      setIsLoadingMoreMessages(false);
      return { success: false, hasMore: false };
    }
    
    const result = await loadMessages(currentConversation._id, 90, beforeMessageId);
    setIsLoadingMoreMessages(false);
    
    return result;
  }, [currentConversation, token, isLoadingMoreMessages, hasMoreMessages, messages, loadMessages]);

  // Edit message
  const editMessage = useCallback((messageId, content) => {
    chatService.editMessage(messageId, content);
  }, []);

  // Delete message
  const deleteMessage = useCallback((messageId) => {
    // Optimistic local removal: remove from active messages and all cached conversations
    let affectedConvId = null;
    let newLastMessage = null;
    
    try {
      setMessages(prev => {
        const updated = prev.filter(m => m._id !== messageId);
        // Update cache for current conversation if present
        const currentConvId = currentConversationRef.current?._id;
        if (currentConvId) {
          messageCache.current.set(currentConvId, updated);
          affectedConvId = currentConvId;
          // Compute most recent by createdAt to be order-agnostic
          newLastMessage = updated.length > 0 
            ? updated.reduce((latest, m) => !latest || new Date(m.createdAt) > new Date(latest.createdAt) ? m : latest, null)
            : null;
        }
        return updated;
      });

      // Also remove from any cached conversation lists
      for (const [convId, msgs] of messageCache.current.entries()) {
        if (Array.isArray(msgs) && msgs.some(m => m._id === messageId)) {
          const filteredMsgs = msgs.filter(m => m._id !== messageId);
          messageCache.current.set(convId, filteredMsgs);
          // Track which conversation was affected if not already set
          if (!affectedConvId) {
            affectedConvId = convId;
            newLastMessage = filteredMsgs.length > 0 
              ? filteredMsgs.reduce((latest, m) => !latest || new Date(m.createdAt) > new Date(latest.createdAt) ? m : latest, null)
              : null;
          }
        }
      }
      
      // Update the conversation list to reflect the new last message
      if (affectedConvId) {
        setConversations(prev => prev.map(conv => {
          if (conv._id === affectedConvId) {
            return {
              ...conv,
              lastMessage: newLastMessage,
              lastMessageAt: newLastMessage?.createdAt || conv.createdAt
            };
          }
          return conv;
        }).sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)));
      }
    } catch (err) {
      console.warn('Optimistic delete failed:', err);
    }

    // Send delete request to server (socket)
    chatService.deleteMessage(messageId);
  }, []);

  // Start typing with debouncing - only emits after 10 characters typed
  const startTyping = useCallback((currentLength = 0) => {
    if (!currentConversation) return;
    
    // Only emit typing event if user has typed at least 10 characters
    if (currentLength < 10) {
      // Still clear any existing typing state if below threshold
      if (isTypingRef.current) {
        stopTyping();
      }
      return;
    }
    
    // Clear existing timeout to reset the debounce
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    const now = Date.now();
    const timeSinceLastEmit = now - lastTypingEmitRef.current;
    
    // Emit typing event if:
    // 1. Not currently typing (first time), OR
    // 2. It's been more than 2 seconds since last emit (refresh the typing state)
    if (!isTypingRef.current || timeSinceLastEmit > 2000) {
      chatService.startTyping(currentConversation._id);
      isTypingRef.current = true;
      lastTypingEmitRef.current = now;
    }
    
    // Auto-stop typing after 4 seconds of no activity (slightly less than server's 5s buffer)
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 4000);
  }, [currentConversation]);

  // Stop typing
  const stopTyping = useCallback(() => {
    if (!currentConversation) return;
    
    // Clear auto-stop timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    // Only emit stop if we were typing
    if (isTypingRef.current) {
      chatService.stopTyping(currentConversation._id);
      isTypingRef.current = false;
      lastTypingEmitRef.current = 0;
    }
  }, [currentConversation]);

  // Fetch user profile
  const fetchUserProfile = useCallback(async (userId) => {
    if (!token) return null;
    
    const result = await chatService.fetchUserProfile(token, userId);
    if (result.success) {
      return result.profile;
    }
    return null;
  }, [token]);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationKey) => {
    if (!token) return null;

    // conversationKey may be either mongo _id or urlId (page.jsx passes urlId || _id)
    const result = await chatService.deleteConversation(token, conversationKey);
    if (result.success) {
      // Find the full conversation being deleted (by either key) from current state
      const deletingConv = (conversations || []).find(c => c._id === conversationKey || c.urlId === conversationKey) || currentConversation || null;

      // Build updated list without the deleted conversation (match on both keys for safety)
      const filtered = (conversations || []).filter(c => c._id !== conversationKey && c.urlId !== conversationKey && c._id !== deletingConv?._id && c.urlId !== deletingConv?.urlId);
      const sorted = sortConversationsByRecency(filtered);
      setConversations(sorted);

      if (deletingConv?._id) {
        messageCache.current.delete(deletingConv._id);
      }

      const wasCurrent = !!(deletingConv && currentConversation?._id === deletingConv._id);
      if (wasCurrent) {
        const fallback = sorted[0] || null;
        if (fallback) {
          selectConversation(fallback);
        } else {
          currentConversationRef.current = null;
          setCurrentConversation(null);
          setMessages([]);
        }
      }

    }
    return result;
  }, [token, conversations, currentConversation, sortConversationsByRecency, selectConversation]);

  // Create or get direct conversation
  const createDirectConversation = useCallback(async (userId) => {
    if (!token) return null;
    
    const result = await chatService.createOrGetDirectConversation(token, userId);
    if (result.success) {
      // Add to conversations if new
      setConversations(prev => {
        const exists = prev.some(c => c._id === result.conversation._id);
        if (exists) return prev;
        return [result.conversation, ...prev];
      });
      return result.conversation;
    }
    return null;
  }, [token]);

  return {
    // State
    conversations,
    currentConversation,
    messages,
    userStatuses,
    typingUsers,
    isConnected,
    isLoading,
    isLoadingConversation,
    isLoadingMoreConversations,
    hasMoreConversations,
    isLoadingMoreMessages,
    hasMoreMessages,
    
    // Actions
    selectConversation,
    sendMessage,
    editMessage,
    deleteMessage,
    deleteConversation,
    startTyping,
    stopTyping,
    loadMessages,
    loadMoreMessages,
    loadConversations,
    loadMoreConversations,
    fetchUserProfile,
    createDirectConversation,
    
    // State setters (for optimistic updates)
    setMessages,
    setConversations,
    
    // Cache access
    messageCache
  };
}
