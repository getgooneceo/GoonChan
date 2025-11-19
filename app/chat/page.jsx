"use client";
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { FiSearch, FiX, FiMoreHorizontal, FiSettings, FiBell, FiTrash2 } from 'react-icons/fi';
import { HiStatusOnline, HiStatusOffline } from 'react-icons/hi';
import { HiUserGroup } from 'react-icons/hi';
import { BsEmojiSmile } from 'react-icons/bs';
import { IoSettingsOutline, IoSend } from 'react-icons/io5';
import { HiGif } from 'react-icons/hi2';
import { RiArrowGoBackLine } from 'react-icons/ri';
import 'remixicon/fonts/remixicon.css'
import { HexColorPicker } from 'react-colorful';
import EmojiPicker from 'emoji-picker-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useChat } from '../../hooks/useChat';
import useUserAvatar from '../../hooks/useUserAvatar';
import chatService from '../../lib/chatService';
import config from '../../config.json';
import { toast } from 'sonner';
import './markdown-styles.css';
import { 
  StatusBadge, 
  UserAvatar, 
  ConversationItem, 
  MemberItem,
  LoadingScreen,
  ConversationSkeleton,
  MessageSkeleton,
  MemberSkeleton,
  ReportModal,
  MuteModal,
  BanModal,
  NotificationModal,
  GroupModal,
  UpdateGroupModal,
  DeleteGroupModal,
  DeleteDMModal,
  DeleteMessageModal,
  MessageMoreMenu,
  ConversationMenu,
  ConversationListMenu,
  MemberMenu,
  SettingsPanel,
  ProfilePreview,
  TenorPicker,
  TwemojiTextarea,
  TypingIndicator
} from './components';
import { TwemojiText } from './components/TwemojiContent';
import { MessageContent } from './components/MessageContent';
import { parseEmoji, extractNativeEmojis } from '../../lib/twemoji';

const normalizeId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (value._id) return normalizeId(value._id);
    if (typeof value.toString === 'function') {
      const str = value.toString();
      if (str && str !== '[object Object]') return str;
    }
  }
  return String(value);
};

const THEMES = {
  dark: {
    name: 'Super Dark',
    bg: {
      primary: '#080808',
      secondary: '#0a0a0a',
      tertiary: '#0f0f0f',
      hover: '#1a1a1a',
      input: '#0f0f0f',
    },
    border: {
      primary: '#1a1a1a',
      secondary: '#2a2a2a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b5b5b5',
      tertiary: '#666666',
      muted: '#555555',
    },
    accent: '#ea4197',
  },
  gray: {
    name: 'Dark Gray',
    bg: {
      primary: '#1a1a1d',
      secondary: '#16161a',
      tertiary: '#1f1f23',
      hover: '#252529',
      input: '#16161a',
    },
    border: {
      primary: '#252529',
      secondary: '#2e2e35',
    },
    text: {
      primary: '#e4e4e7',
      secondary: '#b4b4bb',
      tertiary: '#72727a',
      muted: '#5a5a62',
    },
    accent: '#d946a6',
  },
  light: {
    name: 'Light',
    bg: {
      primary: '#ffffff',
      secondary: '#f9fafb',
      tertiary: '#f3f4f6',
      hover: '#e5e7eb',
      input: '#ffffff',
    },
    border: {
      primary: '#e5e7eb',
      secondary: '#d1d5db',
    },
    text: {
      primary: '#111827',
      secondary: '#4b5563',
      tertiary: '#6b7280',
      muted: '#9ca3af',
    },
    accent: '#ea4197',
  },
};

const MENTION_MIN_CHARS = 2;
const MENTION_SUGGESTION_LIMIT = 12;
const createMentionState = () => ({
  isOpen: false,
  triggerIndex: null,
  query: '',
  selectedIndex: 0,
});

const MuteCountdown = ({ mutedUntil, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const remaining = mutedUntil - now;
      
      if (remaining <= 0) {
        setTimeLeft(0);
        onExpire();
        return;
      }
      
      setTimeLeft(remaining);
    };

    updateCountdown();
    
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [mutedUntil, onExpire]);
  
  if (timeLeft <= 0) return 'now';
  
  const hours = Math.floor(timeLeft / 3600000);
  const minutes = Math.floor((timeLeft % 3600000) / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const ChatPage = () => {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authError, setAuthError] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState('');
  
  
  const {
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
    selectConversation,
    sendMessage: sendChatMessage,
    editMessage: editChatMessage,
    deleteMessage: deleteChatMessage,
    deleteConversation: deleteConversationChat,
    startTyping,
    stopTyping,
    fetchUserProfile,
    createDirectConversation,
    setMessages,
    setConversations,
    messageCache,
    loadMoreConversations,
    loadMoreMessages
  } = useChat(token);
  
  const [theme, setTheme] = useState('dark');
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [isClient, setIsClient] = useState(false);
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  
  const [showSettings, setShowSettings] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [mentionState, setMentionState] = useState(() => createMentionState());
  const resetMentionState = useCallback(() => {
    setMentionState(createMentionState());
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setShowMembers(true);
      }
    };
    
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [isClosingStatusCard, setIsClosingStatusCard] = useState(false);
  const [userStatus, setUserStatus] = useState("online");
  const [userBio, setUserBio] = useState("");
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [avatarFile, setAvatarFile] = useState(null); // Track the actual file for upload
  const [bannerColor, setBannerColor] = useState("#ea4197");
  const [customStatus, setCustomStatus] = useState("");
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState(userName);
  const [tempCustomStatus, setTempCustomStatus] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const usernameInputRef = useRef(null);
  const colorPickerRef = useRef(null);
  const hasAutoSelected = useRef(false);
  const isDeletingMessageRef = useRef(false);

  const [originalSettings, setOriginalSettings] = useState({
    userName: "",
    userAvatar: "",
    userBio: "",
    theme: "dark",
    bannerColor: "#ea4197",
    customStatus: ""
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [isClosingGroupModal, setIsClosingGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupAvatar, setGroupAvatar] = useState('');
  const [groupAvatarFile, setGroupAvatarFile] = useState(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  
  const [showUpdateGroupModal, setShowUpdateGroupModal] = useState(false);
  const [isClosingUpdateGroupModal, setIsClosingUpdateGroupModal] = useState(false);
  const [updateGroupName, setUpdateGroupName] = useState('');
  const [updateGroupAvatar, setUpdateGroupAvatar] = useState('');
  const [updateGroupAvatarFile, setUpdateGroupAvatarFile] = useState(null);
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);
  
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isClosingNotificationModal, setIsClosingNotificationModal] = useState(false);
  const [notificationPreference, setNotificationPreference] = useState('all');
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(true);
  
  const [editingMessage, setEditingMessage] = useState(null);

  const [mutedUsers, setMutedUsers] = useState({});
  const [bannedUsers, setBannedUsers] = useState({}); // Track banned users similar to mutedUsers
  const [currentUserIsBanned, setCurrentUserIsBanned] = useState(false); // Track if current user is banned
  const [editValue, setEditValue] = useState("");
  const [showMoreMenu, setShowMoreMenu] = useState(null);
  const [isClosingMoreMenu, setIsClosingMoreMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0, openUpward: false });
  const [showConversationMenu, setShowConversationMenu] = useState(false);
  const [isClosingConversationMenu, setIsClosingConversationMenu] = useState(false);
  const [conversationMenuPosition, setConversationMenuPosition] = useState({ top: 0, right: 0 });

  const [showConvoListMenu, setShowConvoListMenu] = useState(null);
  const [isClosingConvoListMenu, setIsClosingConvoListMenu] = useState(false);
  const [convoListMenuPosition, setConvoListMenuPosition] = useState({ top: 0, left: 0 });
  
  const [showMemberMenu, setShowMemberMenu] = useState(null);
  const [isClosingMemberMenu, setIsClosingMemberMenu] = useState(false);
  const [memberMenuPosition, setMemberMenuPosition] = useState({ top: 0, left: 0 });
  const [memberMenuRef, setMemberMenuRef] = useState(null);
  
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportingMessage, setReportingMessage] = useState(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const [previewUser, setPreviewUser] = useState(null);
  const [profilePreviewPosition, setProfilePreviewPosition] = useState({ top: 0, left: 0 });
  const [profilePreviewAnimating, setProfilePreviewAnimating] = useState(false);
  const [profilePreviewSourceId, setProfilePreviewSourceId] = useState(null);
  const [profilePreviewLoading, setProfilePreviewLoading] = useState(false);
  const [profilePreviewFromCache, setProfilePreviewFromCache] = useState(false);

  const [showMuteModal, setShowMuteModal] = useState(false);
  const [isClosingMuteModal, setIsClosingMuteModal] = useState(false);
  const [muteTargetUser, setMuteTargetUser] = useState(null);
  const [muteDuration, setMuteDuration] = useState('60s');
  const [isMuting, setIsMuting] = useState(false);

  const [showBanModal, setShowBanModal] = useState(false);
  const [isClosingBanModal, setIsClosingBanModal] = useState(false);
  const [isBanning, setIsBanning] = useState(false);
  const [banTargetUser, setBanTargetUser] = useState(null);

  const [showMarkdownGuide, setShowMarkdownGuide] = useState(false);

  const [isClosingReportModal, setIsClosingReportModal] = useState(false);

  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [isClosingDeleteGroupModal, setIsClosingDeleteGroupModal] = useState(false);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);

  const [showDeleteDMModal, setShowDeleteDMModal] = useState(false);
  const [isClosingDeleteDMModal, setIsClosingDeleteDMModal] = useState(false);

  const [showDeleteMessageModal, setShowDeleteMessageModal] = useState(false);
  const [isClosingDeleteMessageModal, setIsClosingDeleteMessageModal] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [mutedUntil, setMutedUntil] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const messagesLoadMoreSentinelRef = useRef(null);
  const previousConversationIdRef = useRef(null);
  const previousMessageCountRef = useRef(0);
  const isLoadingOlderMessagesRef = useRef(false); // Track when we're loading older messages to prevent scroll
  const scrollRestorationRef = useRef(null); // Track scroll position for restoration
  const inputRef = useRef(null);
  const editInputRef = useRef(null);
  const moreMenuRef = useRef(null);
  const moreButtonRef = useRef(null);
  const conversationMenuRef = useRef(null);
  const conversationMenuButtonRef = useRef(null);
  const convoListMenuRef = useRef(null);
  const convoLoadSentinelRef = useRef(null);
  const profileCache = useRef(new Map());

  const [initialScrollComplete, setInitialScrollComplete] = useState(false);
  const initialScrollCompleteRef = useRef(false);
  const initialScrollFallbackTimerRef = useRef(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);

  const [showGifPicker, setShowGifPicker] = useState(false);
  const gifPickerRef = useRef(null);

  const [hoveredConvIndex, setHoveredConvIndex] = useState(null);
  const [hoverStyle, setHoverStyle] = useState({});
  const conversationsContainerRef = useRef(null);

  const { avatarUrl: currentUserAvatarUrl } = useUserAvatar(currentUser);

  const currentUserId = useMemo(() => normalizeId(currentUser?._id), [currentUser?._id]);
  const findOtherParticipant = useCallback((participants = []) => {
    return participants.find(p => normalizeId(p?._id) !== currentUserId);
  }, [currentUserId]);

  const currentConversationId = currentConversation?._id ?? null;

  const notificationAudioRef = useRef(null);
  const currentConvRef = useRef(currentConversationId);
  const conversationsRef = useRef(conversations);
  const notificationSoundEnabledRef = useRef(notificationSoundEnabled);

  useEffect(() => { currentConvRef.current = currentConversationId; }, [currentConversationId]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
  useEffect(() => { notificationSoundEnabledRef.current = notificationSoundEnabled; }, [notificationSoundEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const audio = new Audio('/new-notification-014-363678.mp3');
      audio.preload = 'auto';
      audio.volume = 0.4;
      notificationAudioRef.current = audio;
    } catch (err) {
      notificationAudioRef.current = null;
    }
  }, []);

  const handleIncomingMessageNotification = useCallback((data) => {
    try {
      const audio = notificationAudioRef.current;
      if (!audio) return;

      if (!notificationSoundEnabledRef.current) return;

      try {
        const globalPlay = localStorage.getItem('goonChat_playSounds');
        if (globalPlay === 'false' || globalPlay === 'off') return;
      } catch (e) {
      }

      const { message, conversationId, shouldNotify } = data || {};
      if (!conversationId || !message) return;
      if (!shouldNotify) return;

      // Don't play for groups (only DMs)
      const conv = conversationsRef.current?.find(c => c._id === conversationId);
      if (conv?.isGroup) return;

      // Don't play if we're currently viewing the conversation
      if (currentConvRef.current && String(currentConvRef.current) === String(conversationId)) return;

      // Attempt to play (silently ignore play rejections from browser autoplay policy)
      try {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } catch (err) {
        // ignore
      }
    } catch (err) {
      // swallow errors to avoid crashing event loop
    }
  }, []);

  // Register the socket-level listener to decide when to play the sound
  useEffect(() => {
    if (!token) return; // only register when authenticated/connected
    chatService.on('message:new', handleIncomingMessageNotification);
    return () => {
      try { chatService.off('message:new', handleIncomingMessageNotification); } catch (e) {}
    };
  }, [token, handleIncomingMessageNotification]);

  useEffect(() => {
    resetMentionState();
  }, [currentConversationId, resetMentionState]);

  useEffect(() => {
    const initializeApp = async () => {
      setIsClient(true);
      
      try {
        const savedToken = localStorage.getItem('token');
        
        if (!savedToken) {
          setAuthError(true);
          setAuthErrorMessage('Please login to access chat');
          return;
        }

        setToken(savedToken);
        
        const [authResponse] = await Promise.all([
          fetch(`${config.url}/api/check`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: savedToken }),
          }),
        ]);

        const authData = await authResponse.json();

        if (authData.success && authData.user) {
          setCurrentUser(authData.user);
          const username = authData.user.username || 'User';
          const avatar = authData.user.avatar || '';
          const bio = authData.user.bio || '';
          const avatarColor = authData.user.avatarColor || '#ea4197';
          
          setUserName(username);
          setUserAvatar(avatar);
          setUserBio(bio);
          setBannerColor(avatarColor);

          const savedTheme = localStorage.getItem('goonChat_theme');
          const savedBannerColor = localStorage.getItem('goonChat_bannerColor');
          const savedCustomStatus = localStorage.getItem('goonChat_customStatus');
          
          setOriginalSettings({
            userName: username,
            userAvatar: avatar,
            userBio: bio,
            theme: savedTheme || 'dark',
            bannerColor: savedBannerColor || avatarColor,
            customStatus: savedCustomStatus || ''
          });
          
          const muteResult = await chatService.checkMuteStatus(savedToken);
          if (muteResult.success && muteResult.isMuted) {
            setIsMuted(true);
            setMutedUntil(new Date(muteResult.mutedUntil));
          } else {
            setIsMuted(false);
            setMutedUntil(null);
          }

          if (authData.user.isAdmin) {
            try {
              const list = await chatService.fetchMutedUsers(savedToken);
              if (list.success && Array.isArray(list.muted)) {

                const map = {};
                for (const entry of list.muted) {
                  if (entry?.userId && entry?.mutedUntil) {
                    map[entry.userId] = entry.mutedUntil;
                  }
                }
                setMutedUsers(map);
              }
            } catch (e) {
            }
          }
        } else {
          localStorage.removeItem('token');
          setAuthError(true);
          setAuthErrorMessage('Invalid or expired session');
        }
      } catch (error) {
        localStorage.removeItem('token');
        setAuthError(true);
        setAuthErrorMessage('Authentication failed. Please try again');
      }
    };
    
    initializeApp();
    
    const savedTheme = localStorage.getItem('goonChat_theme');
    const savedBannerColor = localStorage.getItem('goonChat_bannerColor');
    const savedCustomStatus = localStorage.getItem('goonChat_customStatus');
    const savedNotificationSound = localStorage.getItem('goonChat_notificationSound');
    if (savedTheme && THEMES[savedTheme]) {
      setTheme(savedTheme);
    }
    if (savedBannerColor) {
      setBannerColor(savedBannerColor);
    }
    if (savedCustomStatus) {
      setCustomStatus(savedCustomStatus);
    }
    if (savedNotificationSound !== null) {
      setNotificationSoundEnabled(savedNotificationSound === 'true');
    }
    
    // Trigger fade-in animation after a brief delay
    requestAnimationFrame(() => {
      setTimeout(() => setFadeIn(true), 10);
    });
  }, []);

  // Sync conversation with browser back/forward when URL changes (without routing)
  useEffect(() => {
    const handlePopState = () => {
      try {
        const match = typeof window !== 'undefined' ? window.location.pathname.match(/^\/chat\/(.+)$/) : null;
        const id = match?.[1] || null;
        if (!id) return;
        const conv = conversations.find(c => c.urlId === id || c._id === id);
        if (conv) {
          selectConversation(conv);
          localStorage.setItem('lastConversationId', conv._id);
        }
      } catch (e) {
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', handlePopState);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('popstate', handlePopState);
      }
    };
  }, [conversations, selectConversation]);
  
  // Auto-select conversation on load with priority: URL param > localStorage > first
  useEffect(() => {
    if (conversations.length > 0 && !currentConversation && !hasAutoSelected.current) {
      hasAutoSelected.current = true;
      let convToSelect = null;
      
      // Check localStorage for last conversation
      const lastConvId = localStorage.getItem('lastConversationId');
      if (lastConvId) {
        convToSelect = conversations.find(c => c._id === lastConvId);
      }
      
      // Priority 2: First conversation (if nothing else works)
      if (!convToSelect) {
        convToSelect = conversations[0];
      }
      
      selectConversation(convToSelect);

      if (convToSelect?._id) {
        localStorage.setItem('lastConversationId', convToSelect._id);
        const target = `/chat/${convToSelect.urlId || convToSelect._id}`;
        if (typeof window !== 'undefined' && window.location.pathname !== target) {
          window.history.replaceState(null, '', target);
        }
      }
    }
  }, [conversations, currentConversation, selectConversation]);

  useEffect(() => {
    if (isFullyLoaded) return;

    if (!token && !currentUser) return;

    const hasConversations = conversations.length > 0;
    const hasSelectedConversation = currentConversation !== null;
    const hasLoadedMessages = !isLoadingConversation; 
    const socketConnected = isConnected; 

    const isAuthenticated = token !== null;
    const noConversationsButReady = isAuthenticated && conversations.length === 0 && !isLoading && socketConnected;
    
    if (socketConnected && (noConversationsButReady || (hasConversations && hasSelectedConversation && hasLoadedMessages))) {
      setShowLoadingOverlay(true);
      setIsFullyLoaded(true);

      setTimeout(() => {
        scrollToBottom();
        setShowLoadingOverlay(false);
      }, 300);
    }
  }, [conversations, currentConversation, isLoadingConversation, isLoading, token, currentUser, isConnected, isFullyLoaded]);

  useEffect(() => {
    if (!currentUser?.isAdmin || conversations.length === 0) return;
    
    const newBannedUsers = {};
    conversations.forEach(conv => {
      if (!conv.isGroup && conv.participants) {
        conv.participants.forEach(participant => {
          const participantId = normalizeId(participant?._id);
          if (participantId && participantId !== currentUserId && participant.isBanned) {
            newBannedUsers[participantId] = true;
          }
        });
      }
    });
    
    setBannedUsers(prev => {
      const prevKeys = Object.keys(prev);
      const newKeys = Object.keys(newBannedUsers);
      const hasChange = prevKeys.length !== newKeys.length || newKeys.some(key => !prev[key]);
      if (!hasChange) {
        return prev;
      }
      return newBannedUsers;
    });
  }, [conversations, currentUserId]);
  
  // Track changes in settings
  useEffect(() => {
    const hasChanges = 
      userName !== originalSettings.userName ||
      userAvatar !== originalSettings.userAvatar ||
      userBio !== originalSettings.userBio ||
      theme !== originalSettings.theme ||
      bannerColor !== originalSettings.bannerColor ||
      tempCustomStatus !== originalSettings.customStatus;
    setHasUnsavedChanges(hasChanges);
  }, [userName, userAvatar, userBio, theme, bannerColor, tempCustomStatus, originalSettings]);

  useEffect(() => {
    setTempUsername(userName);
  }, [userName]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (gifPickerRef.current && !gifPickerRef.current.contains(event.target)) {
        setShowGifPicker(false);
      }
    };

    if (showGifPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showGifPicker]);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
  };
  
  const handleSaveSettings = async () => {
    setHasUnsavedChanges(false);

    const loadingToastId = toast.loading('Saving changes...');
    
    localStorage.setItem('goonChat_theme', theme);
    localStorage.setItem('goonChat_userName', userName);
    localStorage.setItem('goonChat_userAvatar', userAvatar);
    localStorage.setItem('goonChat_userBio', userBio);
    localStorage.setItem('goonChat_bannerColor', bannerColor);
    localStorage.setItem('goonChat_customStatus', tempCustomStatus);
    
    let hasErrors = false;
    let newAvatarUrl = null;
  let finalCustomStatusValue = tempCustomStatus ?? customStatus ?? '';

    // Upload avatar first if a new file was selected
    if (avatarFile) {
      try {
        console.log('📤 Uploading new avatar...');
        const formData = new FormData();
        formData.append('token', token);
        formData.append('avatar', avatarFile);

        const response = await fetch(`${config.url}/api/updateAvatar`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.success && data.avatar) {
          newAvatarUrl = data.avatar;
          
          setAvatarFile(null);
        } else {
          toast.error(data.message || 'Failed to upload avatar', { id: loadingToastId });
          hasErrors = true;
        }
      } catch (error) {
        toast.error('Failed to upload avatar', { id: loadingToastId });
        hasErrors = true;
      }
    }

    if (userName !== originalSettings.userName) {
      try {
        const response = await fetch(`${config.url}/api/updateUsername`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            token,
            username: userName.trim()
          }),
        });

        const data = await response.json();

        if (data.success) {
        } else {
          toast.error(data.message || 'Failed to update username', { id: loadingToastId });
          hasErrors = true;
        }
      } catch (error) {
        toast.error('Failed to update username', { id: loadingToastId });
        hasErrors = true;
      }
    }
    
    if (userBio !== originalSettings.userBio) {
      try {
        const response = await fetch(`${config.url}/api/updateBio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            token,
            bio: userBio.trim()
          }),
        });

        const data = await response.json();

        if (data.success) {
        } else {
          toast.error(data.message || 'Failed to update bio', { id: loadingToastId });
          hasErrors = true;
        }
      } catch (error) {
        toast.error('Failed to update bio', { id: loadingToastId });
        hasErrors = true;
      }
    }

    if (bannerColor !== originalSettings.bannerColor) {
      try {
        const response = await fetch(`${config.url}/api/updateAvatarColor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            token,
            avatarColor: bannerColor
          }),
        });

        const data = await response.json();

        if (data.success) {
        } else {
          toast.error(data.message || 'Failed to update banner color', { id: loadingToastId });
          hasErrors = true;
        }
      } catch (error) {
        toast.error('Failed to update banner color', { id: loadingToastId });
        hasErrors = true;
      }
    }

    if (tempCustomStatus !== originalSettings.customStatus) {
      try {
        const response = await fetch(`${config.url}/api/chat/profile/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ customStatus: tempCustomStatus })
        });
        
        if (!response.ok) {
          toast.error('Failed to update custom status', { id: loadingToastId });
          hasErrors = true;
        } else {
          setCustomStatus(tempCustomStatus);
        }
      } catch (error) {
        toast.error('Failed to update custom status', { id: loadingToastId });
        hasErrors = true;
      }
    }

    if (!hasErrors) {
      // Update toast to show we're finalizing
      toast.loading('Finalizing settings...', { id: loadingToastId });
      
      // Wait 3 seconds before refreshing user data
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      try {
        const response = await fetch(`${config.url}/api/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          const data = await response.json();
          const user = data.user;

          if (user) {
            setUserName(user.username || userName);
            setUserBio(user.bio || '');
            setBannerColor(user.avatarColor || bannerColor);

            const backendCustomStatus = user.customStatus;
            const resolvedCustomStatus = backendCustomStatus !== undefined && backendCustomStatus !== null
              ? backendCustomStatus
              : (tempCustomStatus ?? customStatus ?? '');
            finalCustomStatusValue = resolvedCustomStatus;
            setCustomStatus(resolvedCustomStatus);
            setTempCustomStatus(resolvedCustomStatus);

            const finalAvatarUrl = newAvatarUrl || user.avatar || userAvatar;
            setUserAvatar(finalAvatarUrl);

            if (currentUser) {
              setCurrentUser(prev => ({ 
                ...prev, 
                username: user.username || prev.username,
                avatar: finalAvatarUrl,
                bio: user.bio || prev.bio,
                avatarColor: user.avatarColor || prev.avatarColor,
                customStatus: resolvedCustomStatus !== undefined ? resolvedCustomStatus : prev.customStatus
              }));
            }

            if (finalAvatarUrl && currentUser?._id) {
              const currentUserId = currentUser._id;

              setMessages(prev => prev.map(msg => 
                msg.sender?._id === currentUserId 
                  ? { ...msg, sender: { ...msg.sender, avatar: finalAvatarUrl } }
                  : msg
              ));
              
              // Update message cache for all conversations
              if (messageCache && messageCache.current) {
                messageCache.current.forEach((cachedMessages, convId) => {
                  const updated = cachedMessages.map(msg =>
                    msg.sender?._id === currentUserId
                      ? { ...msg, sender: { ...msg.sender, avatar: finalAvatarUrl } }
                      : msg
                  );
                  messageCache.current.set(convId, updated);
                });
              }

              setConversations(prev => prev.map(conv => {
                // Update participants array if current user is in it
                if (conv.participants && Array.isArray(conv.participants)) {
                  return {
                    ...conv,
                    participants: conv.participants.map(p => {
                      if (typeof p === 'object' && p._id === currentUserId) {
                        return { ...p, avatar: finalAvatarUrl };
                      }
                      return p;
                    })
                  };
                }
                return conv;
              }));
            }
            
            toast.success('Settings updated successfully!', { id: loadingToastId });
          }
        } else {
          toast.success('Changes saved!', { id: loadingToastId });
        }
      } catch (error) {
        toast.success('Changes saved!', { id: loadingToastId });
      }
      
      setOriginalSettings({
        userName,
        userAvatar: newAvatarUrl || userAvatar,
        userBio,
        theme,
        bannerColor,
        customStatus: finalCustomStatusValue
      });
    }
  };

  const handleCancelSettings = () => {
    setUserName(originalSettings.userName);
    setUserAvatar(originalSettings.userAvatar);
    setUserBio(originalSettings.userBio);
    setTheme(originalSettings.theme);
    setBannerColor(originalSettings.bannerColor);
    setTempCustomStatus(originalSettings.customStatus);
    setHasUnsavedChanges(false);
  };

  const toggleBlockUser = (userId) => {
    const newBlockedUsers = blockedUsers.includes(userId)
      ? blockedUsers.filter(id => id !== userId)
      : [...blockedUsers, userId];
    setBlockedUsers(newBlockedUsers);
    localStorage.setItem('goonChat_blockedUsers', JSON.stringify(newBlockedUsers));
  };

  const currentTheme = THEMES[theme];

  useEffect(() => {
    if (hoveredConvIndex !== null && conversationsContainerRef.current) {
      const convElement = conversationsContainerRef.current.querySelector(`[data-conv-index="${hoveredConvIndex}"]`);
      if (convElement) {
        const container = conversationsContainerRef.current;
        const scrollTop = container.scrollTop;
        const offsetTop = convElement.offsetTop;

        const hoveredConvId = convElement.getAttribute('data-conv-id');
        const isSelectedHovered = currentConversation && hoveredConvId === currentConversation._id;

        setHoverStyle({
          top: `${offsetTop - scrollTop}px`,
          height: `${convElement.offsetHeight}px`,
          opacity: 1,
          backgroundColor: currentTheme.bg.tertiary,
        });
      }
    } else {
      setHoverStyle({ opacity: 0 });
    }
  }, [hoveredConvIndex, currentTheme, currentConversation]);

  // Prune expired entries from mutedUsers map so admin Unmute disappears at expiry
  useEffect(() => {
    const interval = setInterval(() => {
      setMutedUsers(prev => {
        if (!prev || typeof prev !== 'object') return prev;
        const now = new Date();
        let changed = false;
        const copy = { ...prev };
        for (const [uid, iso] of Object.entries(copy)) {
          if (iso && new Date(iso) <= now) {
            delete copy[uid];
            changed = true;
          }
        }
        return changed ? copy : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update hover position on scroll
  useEffect(() => {
    const container = conversationsContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (hoveredConvIndex !== null) {
        const convElement = container.querySelector(`[data-conv-index="${hoveredConvIndex}"]`);
        if (convElement) {
          const scrollTop = container.scrollTop;
          const offsetTop = convElement.offsetTop;
          
          setHoverStyle(prev => ({
            ...prev,
            top: `${offsetTop - scrollTop}px`,
          }));
        }
      }
    };

    container.addEventListener('scroll', handleScroll);

    return () => container.removeEventListener('scroll', handleScroll);
  }, [hoveredConvIndex]);

  // IntersectionObserver to load more when skeletons at bottom come into view
  useEffect(() => {
    const sentinel = convoLoadSentinelRef.current;
    if (!sentinel) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (hasMoreConversations && !isLoadingMoreConversations) {
            loadMoreConversations();
          }
        }
      });
    }, { root: conversationsContainerRef.current, rootMargin: '0px 0px 200px 0px' });

    io.observe(sentinel);

    return () => io.disconnect();
  }, [hasMoreConversations, isLoadingMoreConversations, loadMoreConversations]);

  // Handle loading older messages when reaching the top
  const handleLoadMoreMessages = useCallback(async () => {
    if (isLoadingMoreMessages || !hasMoreMessages) {
      return;
    }

    if (!currentConversationId) {
      return;
    }

    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    scrollRestorationRef.current = {
      scrollHeight: container.scrollHeight,
      scrollTop: container.scrollTop,
      conversationId: currentConversationId,
    };

    isLoadingOlderMessagesRef.current = true;
    await loadMoreMessages();
  }, [isLoadingMoreMessages, hasMoreMessages, loadMoreMessages, currentConversationId]);

  useEffect(() => {
    if (!currentConversationId || isLoadingConversation || !isFullyLoaded) {
      return;
    }

    const container = messagesContainerRef.current;
    const sentinel = messagesLoadMoreSentinelRef.current;

    if (!container || !sentinel || !hasMoreMessages) {
      return;
    }

    let pending = false;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {

        if (!initialScrollCompleteRef.current) return;
        if (!entry.isIntersecting) return;
        if (pending || isLoadingMoreMessages) return;
        pending = true;
        Promise.resolve(handleLoadMoreMessages()).finally(() => {
          pending = false;
        });
      });
    }, {
      root: container,
      rootMargin: '0px 0px -70% 0px',
      threshold: 0
    });

  observer.observe(sentinel);

    // Conservative fallback: if the initial scroll completion hasn't been
    // marked within a short time (e.g. images prevented rAF finalize), mark it
    // so the top sentinel can start working. This prevents the sentinel from
    // being permanently ignored in edge cases where finalizeScroll is never
    // reached.
    if (!initialScrollCompleteRef.current) {
      if (initialScrollFallbackTimerRef.current) clearTimeout(initialScrollFallbackTimerRef.current);
      initialScrollFallbackTimerRef.current = setTimeout(() => {
        if (!initialScrollCompleteRef.current) {
          initialScrollCompleteRef.current = true;
          setInitialScrollComplete(true);
        }
      }, 400);
    }

    return () => {
      observer.disconnect();
      if (initialScrollFallbackTimerRef.current) {
        clearTimeout(initialScrollFallbackTimerRef.current);
        initialScrollFallbackTimerRef.current = null;
      }
    };
  }, [
    currentConversationId,
    hasMoreMessages,
    isLoadingConversation,
    isLoadingMoreMessages,
    isFullyLoaded,
    handleLoadMoreMessages,
    initialScrollComplete,
    messages.length
  ]);

  // Scroll to bottom for new messages (normal flow, bottom = scrollHeight)
  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  };

  // Handle conversation changes and scroll to bottom
  useEffect(() => {
    if (currentConversation) {
      const conversationChanged = currentConversation._id !== previousConversationIdRef.current;
      if (conversationChanged) {
        previousConversationIdRef.current = currentConversation._id;
        previousMessageCountRef.current = 0; // Reset count for new conversation
        isLoadingOlderMessagesRef.current = false; // Reset loading state for new conversation
        // Reset initial scroll complete — we'll set it true after we explicitly scroll
        // to bottom for the newly opened conversation. This prevents the top load
        // sentinel from triggering while the initial scroll settles.
        initialScrollCompleteRef.current = false;
        setInitialScrollComplete(false);
      }
    }
  }, [currentConversation?._id]);

  // Scroll to bottom when messages are loaded for a conversation (after DOM updates)
  useLayoutEffect(() => {
    // Only scroll to bottom if:
    // 1. We have a current conversation
    // 2. We're not loading the conversation anymore (messages are ready)
    // 3. We have messages to display
    // 4. We're not in the middle of loading older messages
    // 5. Messages container is visible (not in settings)
    // 6. Not currently deleting a message
    if (!showSettings && currentConversation && !isLoadingConversation && messages.length > 0 && !isLoadingOlderMessagesRef.current && !scrollRestorationRef.current && !isDeletingMessageRef.current) {
      const container = messagesContainerRef.current;
      if (container) {
        // Immediately snap before paint to avoid flashing the top of the list
        container.scrollTop = container.scrollHeight;

        // Use triple rAF to catch any late layout shifts (images, load-more banners, etc.)
        let frame1;
        let frame2;
        let frame3;

        const finalizeScroll = () => {
          const c = messagesContainerRef.current;
          if (c) {
            c.scrollTop = c.scrollHeight;
          }
          // Mark initial scroll complete so the top IntersectionObserver can safely
          // be attached without triggering extra loads.
          if (!initialScrollCompleteRef.current) {
            initialScrollCompleteRef.current = true;
            setInitialScrollComplete(true);
          }
        };

        frame1 = requestAnimationFrame(() => {
          frame2 = requestAnimationFrame(() => {
            frame3 = requestAnimationFrame(finalizeScroll);
          });
        });

        return () => {
          if (frame1) cancelAnimationFrame(frame1);
          if (frame2) cancelAnimationFrame(frame2);
          if (frame3) cancelAnimationFrame(frame3);
        };
      }
    }
  }, [showSettings, currentConversation?._id, messages.length, isLoadingConversation, hasMoreMessages]);

  // Only scroll to bottom when NEW messages are added (not when loading older messages)
  useEffect(() => {
    const currentCount = messages.length;
    const previousCount = previousMessageCountRef.current;
    
    // Only scroll if:
    // 1. We have messages
    // 2. Not loading initial conversation
    // 3. Not deleting a message
    // 4. Not loading older messages
    // 5. Message count INCREASED (new message arrived)
    // 6. Previous count was not zero (to avoid triggering on conversation switch)
    const isNewMessage = currentCount > previousCount && 
                        previousCount > 0 &&
                        !isLoadingConversation && 
                        !isDeletingMessageRef.current && 
                        !isLoadingOlderMessagesRef.current;
    
    if (isNewMessage && messages.length > 0) {
      requestAnimationFrame(() => scrollToBottom());
    }
    
    // Reset the flag after loading older messages is complete
    if (isLoadingOlderMessagesRef.current && !isLoadingMoreMessages) {
      isLoadingOlderMessagesRef.current = false;
    }
    
    // Update the count for next comparison
    previousMessageCountRef.current = currentCount;
  }, [messages.length, isLoadingConversation, isLoadingMoreMessages]);

  // Restore scroll position after loading older messages
  useLayoutEffect(() => {
    if (scrollRestorationRef.current && !isLoadingMoreMessages) {
      const { conversationId: restorationConversationId } = scrollRestorationRef.current;

      if (restorationConversationId !== currentConversationId) {
        scrollRestorationRef.current = null;
        return;
      }

      const container = messagesContainerRef.current;
      if (container) {
        const { scrollHeight: oldScrollHeight, scrollTop: oldScrollTop } = scrollRestorationRef.current;
        const newScrollHeight = container.scrollHeight;
        const heightDifference = newScrollHeight - oldScrollHeight;
        
        // Adjust scroll position to maintain view (normal flow: add the height added)
        container.scrollTop = oldScrollTop + heightDifference;
        
        // Clear the restoration data
        scrollRestorationRef.current = null;
        // If we haven't marked the initial scroll complete yet, do it now because
        // we have restored the scroll position and it's safe to allow the top
        // sentinel to trigger future loads.
        if (!initialScrollCompleteRef.current) {
          initialScrollCompleteRef.current = true;
          setInitialScrollComplete(true);
        }
      }
    }
  }, [messages, isLoadingMoreMessages, currentConversationId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleChatMediaLoaded = () => {
      const container = messagesContainerRef.current;
      if (!container) return;

      const distanceFromBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
      if (distanceFromBottom <= 120) {
        requestAnimationFrame(() => {
          const currentContainer = messagesContainerRef.current;
          if (!currentContainer) return;
          currentContainer.scrollTop = currentContainer.scrollHeight;
        });
      }
    };

    window.addEventListener('chatMediaLoaded', handleChatMediaLoaded);
    return () => {
      window.removeEventListener('chatMediaLoaded', handleChatMediaLoaded);
    };
  }, []);
  



  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const newHeight = Math.min(inputRef.current.scrollHeight, 120);
      inputRef.current.style.height = `${newHeight}px`;
    }
  }, [inputValue]);

  // Auto-resize edit textarea
  useEffect(() => {
    if (editInputRef.current) {
      editInputRef.current.style.height = 'auto';
      const newHeight = Math.min(editInputRef.current.scrollHeight, 120);
      editInputRef.current.style.height = `${newHeight}px`;
    }
  }, [editValue]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingMessage && editInputRef.current) {
      editInputRef.current.focus();
      // Move cursor to end
      const length = editInputRef.current.value.length;
      editInputRef.current.setSelectionRange(length, length);
    }
  }, [editingMessage]);

  // Focus input when conversation changes (Discord-like behavior)
  useEffect(() => {
    if (currentConversation && inputRef.current && !showSettings && isFullyLoaded) {
      // Use requestAnimationFrame and blur/focus to ensure cursor appears
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.blur();
          setTimeout(() => {
            inputRef.current?.focus();
          }, 0);
        }
      });
    }
  }, [currentConversation, showSettings, isFullyLoaded]);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        if (showMoreMenu) {
          setIsClosingMoreMenu(true);
          setTimeout(() => {
            setShowMoreMenu(null);
            setIsClosingMoreMenu(false);
          }, 120);
        }
      }
    };

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMoreMenu]);

  // Close conversation menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (conversationMenuRef.current && !conversationMenuRef.current.contains(event.target) &&
          conversationMenuButtonRef.current && !conversationMenuButtonRef.current.contains(event.target)) {
        setIsClosingConversationMenu(true);
        setTimeout(() => {
          setShowConversationMenu(false);
          setIsClosingConversationMenu(false);
        }, 150);
      }
    };

    if (showConversationMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showConversationMenu]);

  // Close any open context menus on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (showMoreMenu) {
          setIsClosingMoreMenu(true);
          setTimeout(() => {
            setShowMoreMenu(null);
            setIsClosingMoreMenu(false);
          }, 120);
        }
        if (showConversationMenu) {
          setIsClosingConversationMenu(true);
          setTimeout(() => {
            setShowConversationMenu(false);
            setIsClosingConversationMenu(false);
          }, 150);
        }
        if (showConvoListMenu) {
          setIsClosingConvoListMenu(true);
          setTimeout(() => {
            setShowConvoListMenu(null);
            setIsClosingConvoListMenu(false);
          }, 120);
        }
        if (showMemberMenu) {
          setIsClosingMemberMenu(true);
          setTimeout(() => {
            setShowMemberMenu(null);
            setIsClosingMemberMenu(false);
          }, 120);
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showMoreMenu, showConversationMenu, showConvoListMenu, showMemberMenu]);

  // Close sidebar convo list menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (convoListMenuRef.current && !convoListMenuRef.current.contains(event.target)) {
        setIsClosingConvoListMenu(true);
        setTimeout(() => {
          setShowConvoListMenu(null);
          setIsClosingConvoListMenu(false);
        }, 120);
      }
    };
    if (showConvoListMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showConvoListMenu]);

  // Close member menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (memberMenuRef && !event.target.closest('[data-member-menu]')) {
        setIsClosingMemberMenu(true);
        setTimeout(() => {
          setShowMemberMenu(null);
          setIsClosingMemberMenu(false);
        }, 120);
      }
    };
    if (showMemberMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMemberMenu, memberMenuRef]);

  useEffect(() => {
    const onContext = (e) => {
      try {
        const el = e.target;
        if (el.closest && (el.closest('[data-chat-context]') || el.closest('[data-convo-context]'))) {
          return;
        }

        if (moreMenuRef.current && moreMenuRef.current.contains(el)) return;
        if (convoListMenuRef.current && convoListMenuRef.current.contains(el)) return;
        if (conversationMenuRef.current && conversationMenuRef.current.contains(el)) return;
        if (conversationMenuButtonRef.current && conversationMenuButtonRef.current.contains(el)) return;
        if (moreButtonRef.current && moreButtonRef.current.contains(el)) return;

        if (el.closest && el.closest('input, textarea, [contenteditable="true"]')) return;

        e.preventDefault();
      } catch (err) {
        // ignore
      }
    };

    document.addEventListener('contextmenu', onContext);
    return () => document.removeEventListener('contextmenu', onContext);
  }, []);

  // Auto-focus input when typing without any input/textarea focused
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip if user is editing a message
      if (editingMessage) return;
      
      // Skip if settings panel is open
      if (showSettings) return;
      
      // Skip if any modal is open
      if (showReportModal || showNotificationModal || showGroupModal || showUpdateGroupModal || showMuteModal || showBanModal || showDeleteMessageModal) return;
      
      // Skip special keys
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (['Escape', 'Tab', 'Enter', 'Backspace', 'Delete', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      
      // Check if user is already focused on input/textarea
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
        return;
      }
      
      // Focus the input if we have a conversation and are typing a printable character
      if (currentConversation && inputRef.current && e.key.length === 1) {
        inputRef.current.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentConversation, showSettings, editingMessage, showReportModal, showNotificationModal, showGroupModal, showUpdateGroupModal, showMuteModal, showBanModal, showDeleteGroupModal, showDeleteDMModal, showDeleteMessageModal]);

  // Auto-focus input after modals close
  useEffect(() => {
    if (!showReportModal && !showNotificationModal && !showGroupModal && !showUpdateGroupModal && !showMuteModal && !showBanModal && !showDeleteGroupModal && !showDeleteDMModal && !showDeleteMessageModal && !showSettings && currentConversation && inputRef.current && isFullyLoaded) {
      // Small delay to ensure modal close animation completes, with blur/focus for cursor
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.blur();
          setTimeout(() => {
            inputRef.current?.focus();
          }, 0);
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [showReportModal, showNotificationModal, showGroupModal, showUpdateGroupModal, showMuteModal, showBanModal, showDeleteGroupModal, showDeleteDMModal, showDeleteMessageModal, showSettings, currentConversation, isFullyLoaded]);

  // Global copy handler: replace Twemoji <img> with native emojis when copying
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.__twemojiCopyInstalled) return;
    window.__twemojiCopyInstalled = true;

    const onCopy = (e) => {
      try {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount || !selection.toString()) return;

        const range = selection.getRangeAt(0);
        const frag = range.cloneContents();
        const temp = document.createElement('div');
        temp.appendChild(frag);

        // Only handle if selection includes any twemoji images
        if (!temp.querySelector('img.twemoji[data-emoji]')) return;

        const nativeText = extractNativeEmojis(temp.innerHTML);
        if (!nativeText) return;

        e.clipboardData.setData('text/plain', nativeText);
        e.preventDefault();
      } catch (err) {
        // ignore
      }
    };

    document.addEventListener('copy', onCopy);
    return () => {
      document.removeEventListener('copy', onCopy);
      try { delete window.__twemojiCopyInstalled; } catch {}
    };
  }, []);

  // Update profile preview status when userStatuses changes
  useEffect(() => {
    if (previewUser && showProfilePreview) {
      const userId = previewUser._id || previewUser.id;
      const statusData = userStatuses.get(userId);
      const currentStatus = statusData?.status;
      if (currentStatus && currentStatus !== previewUser.status) {
        setPreviewUser(prev => ({
          ...prev,
          status: currentStatus
        }));
      }
    }
  }, [userStatuses, previewUser, showProfilePreview]);

  useEffect(() => {
    const updateStatus = async () => {
      if (!token || !currentUser) return;
      
      try {
        const response = await fetch(`${config.url}/api/chat/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: userStatus })
        });
        
        if (!response.ok) {
        } else {
        }
      } catch (error) {
      }
    };
    
    updateStatus();
  }, [userStatus, token, currentUser]);

  // Load notification preference when conversation changes
  useEffect(() => {
    const loadNotificationPreference = async () => {
      if (!token || !currentConversation?._id) return;

      try {
        const response = await fetch(
          `${config.url}/api/chat/notification-preference/${currentConversation._id}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.preference) {
            setNotificationPreference(data.preference);
          }
        }
      } catch (error) {
      }
    };

    loadNotificationPreference();
  }, [currentConversation?._id, token]);

  // Listen for mute events from socket
  useEffect(() => {
    if (!currentUser) return;
    
    const handleMuted = (data) => {
      setMutedUsers(prev => ({ ...prev, [data.userId]: data.mutedUntil }));
      if (data.userId === currentUser._id.toString()) {
        setIsMuted(true);
        setMutedUntil(new Date(data.mutedUntil));
      }
    };
    
    const handleUnmuted = (data) => {
      setMutedUsers(prev => {
        const copy = { ...prev };
        delete copy[data.userId];
        return copy;
      });
      if (data.userId === currentUser._id.toString()) {
        setIsMuted(false);
        setMutedUntil(null);
      }
    };
    
    const handleBanned = (data) => {
      const userId = normalizeId(data.userId);
      if (!userId) return;
      setBannedUsers(prev => ({ ...prev, [userId]: true }));
      
      // Check if it's the current user who got banned
      if (normalizeId(currentUser?._id) === userId) {
        setCurrentUserIsBanned(true);
      }
    };
    
    const handleUnbanned = (data) => {
      const userId = normalizeId(data.userId);
      if (!userId) return;
      setBannedUsers(prev => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
      
      // Check if it's the current user who got unbanned
      if (normalizeId(currentUser?._id) === userId) {
        setCurrentUserIsBanned(false);
      }
    };
    
    chatService.on('user:muted', handleMuted);
    chatService.on('user:unmuted', handleUnmuted);
    chatService.on('user:banned', handleBanned);
    chatService.on('user:unbanned', handleUnbanned);
    
    return () => {
      chatService.off('user:muted', handleMuted);
      chatService.off('user:unmuted', handleUnmuted);
      chatService.off('user:banned', handleBanned);
      chatService.off('user:unbanned', handleUnbanned);
    };
  }, [currentUser]);

  // Check if mute has expired every second
  useEffect(() => {
    if (!isMuted || !mutedUntil) return;
    
    const interval = setInterval(() => {
      if (new Date() >= mutedUntil) {
        setIsMuted(false);
        setMutedUntil(null);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isMuted, mutedUntil]);

  // Handle profile picture click
  const handleProfileClick = async (event, user, sourceId = null) => {
    event.stopPropagation();
    event.preventDefault();
    
    const userId = user._id || user.id;
    
    // Store the rect immediately before any async operations
    const rect = event.currentTarget?.getBoundingClientRect();
    if (!rect) return; // Exit if element doesn't exist
    
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const isMobile = windowWidth < 1024;

    // Mobile: Center the modal
    if (isMobile) {
      const fullWidth = 335;
      const fullHeight = 320;
      const left = Math.max(10, (windowWidth - fullWidth) / 2);
      const top = Math.max(10, (windowHeight - fullHeight) / 2);
      
      setProfilePreviewPosition({ top, left });
      setProfilePreviewSourceId(sourceId);
      
      // Check cache first
      const cachedProfile = profileCache.current.get(userId);
      if (cachedProfile) {
        const statusData = userStatuses.get(userId);
        const profileWithStatus = {
          ...cachedProfile,
          status: statusData?.status || cachedProfile.status
        };
        setPreviewUser(profileWithStatus);
        setProfilePreviewLoading(false);
        setProfilePreviewFromCache(true);
      } else {
        setProfilePreviewLoading(true);
        setProfilePreviewFromCache(false);
        setShowProfilePreview(true);
        setTimeout(() => setProfilePreviewAnimating(true), 10);
        
        const profile = await fetchUserProfile(userId);
        if (!profile) {
          setShowProfilePreview(false);
          setProfilePreviewLoading(false);
          return;
        }
        profileCache.current.set(userId, profile);
        
        const statusData = userStatuses.get(userId);
        const profileWithStatus = {
          ...profile,
          status: statusData?.status || profile.status
        };
        setPreviewUser(profileWithStatus);
        setProfilePreviewLoading(false);
      }
      
      setShowProfilePreview(true);
      setProfilePreviewAnimating(false);
      setTimeout(() => setProfilePreviewAnimating(true), 10);
      return;
    }

    const loadingWidth = 115;
    const loadingHeight = 100;
    const fullWidth = 335;
    const fullHeight = 320; // Reduced from 350 to better match typical profile heights
    // Nudge amount when aligning to bottom for replies (calculated in px from rem)
    const baseNudge = 8;
    let replyOffset = 0;
    if (sourceId && typeof sourceId === 'string' && sourceId.startsWith('message-')) {
      try {
        const msgId = sourceId.replace(/^message-/, '');
        const found = messages.find(m => (m?._id || '').toString() === msgId.toString());
        if (found && found.replyTo) {
          const rootRem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
          replyOffset = Math.round(rootRem * 0.75); // 0.75rem
        }
      } catch (e) {
        // ignore
      }
    }
    
    // Check if profile is cached
    const cachedProfile = profileCache.current.get(userId);
    
    if (cachedProfile) {
      // Use full width for cached profiles (no loading state)
      let left = rect.right + 10;

      // Horizontal bounds: if off right edge, open to the left of avatar
      if (left + fullWidth > windowWidth - 20) {
        left = rect.left - fullWidth - 10;
      }

      // Vertical placement preference: try align to avatar top, else bottom, else center (all clamped)
      const minTop = 20;
      const maxTop = windowHeight - fullHeight - 20;
      const topAlignTop = rect.top;
      const topAlignBottom = rect.bottom - fullHeight;
      const topCenter = rect.top + rect.height / 2 - fullHeight / 2;
      let top;
      if (topAlignTop >= minTop && topAlignTop <= maxTop) {
        top = topAlignTop;
      } else if (topAlignBottom >= minTop && topAlignBottom <= maxTop) {
        // Nudge slightly down so bottom-aligned previews don't sit too high
        const nudged = Math.min(topAlignBottom + baseNudge + replyOffset, maxTop);
        top = nudged;
      } else {
        top = Math.max(minTop, Math.min(topCenter, maxTop));
      }

      setProfilePreviewPosition({ top, left });
      setProfilePreviewSourceId(sourceId);
      
      // Update status from userStatuses before showing
      const statusData = userStatuses.get(userId);
      const profileWithStatus = {
        ...cachedProfile,
        status: statusData?.status || cachedProfile.status
      };
      
      setPreviewUser(profileWithStatus);
      setProfilePreviewLoading(false);
      setProfilePreviewFromCache(true);
      setShowProfilePreview(true);
      setProfilePreviewAnimating(false);
      setTimeout(() => setProfilePreviewAnimating(true), 10);
      return;
    }
    
    // Not cached - show loading state
    // Calculate initial position for loading state (smaller size)
    let left = rect.right + 10;
    
    // If loading modal goes off right edge, place it to the left of avatar
    if (left + loadingWidth > windowWidth - 20) {
      left = rect.left - loadingWidth - 10;
    }
    
    // Vertical placement preference for loading state
    let top;
    {
      const minTop = 20;
      const maxTop = windowHeight - loadingHeight - 20;
      const topAlignTop = rect.top;
      const topAlignBottom = rect.bottom - loadingHeight;
      const topCenter = rect.top + rect.height / 2 - loadingHeight / 2;
      if (topAlignTop >= minTop && topAlignTop <= maxTop) {
        top = topAlignTop;
      } else if (topAlignBottom >= minTop && topAlignBottom <= maxTop) {
        const nudged = Math.min(topAlignBottom + baseNudge + replyOffset, maxTop);
        top = nudged;
      } else {
        top = Math.max(minTop, Math.min(topCenter, maxTop));
      }
    }
    
    setProfilePreviewPosition({ top, left });
    setProfilePreviewSourceId(sourceId);
    setShowProfilePreview(true);
    setProfilePreviewLoading(true);
    setProfilePreviewFromCache(false);
    setTimeout(() => setProfilePreviewAnimating(true), 10);
    
    // Fetch real user profile
    const profile = await fetchUserProfile(userId);
    if (!profile) {
      setShowProfilePreview(false);
      setProfilePreviewLoading(false);
      return;
    }
    
    // Cache the profile
    profileCache.current.set(userId, profile);
    
    // Recalculate position for full-size modal before setting user
    let newLeft = rect.right + 10;
    
    // If full modal goes off right edge, place it to the left of avatar
    if (newLeft + fullWidth > windowWidth - 20) {
      newLeft = rect.left - fullWidth - 10;
    }
    
    // Vertical placement preference for full preview
    let newTop;
    {
      const minTop = 20;
      const maxTop = windowHeight - fullHeight - 20;
      const topAlignTop = rect.top;
      const topAlignBottom = rect.bottom - fullHeight;
      const topCenter = rect.top + rect.height / 2 - fullHeight / 2;
      if (topAlignTop >= minTop && topAlignTop <= maxTop) {
        newTop = topAlignTop;
      } else if (topAlignBottom >= minTop && topAlignBottom <= maxTop) {
        const nudged = Math.min(topAlignBottom + baseNudge + replyOffset, maxTop);
        newTop = nudged;
      } else {
        newTop = Math.max(minTop, Math.min(topCenter, maxTop));
      }
    }
    
    // Update position first, then load content
    setProfilePreviewPosition({ top: newTop, left: newLeft });
    
    // Update status from userStatuses before showing
    const statusData = userStatuses.get(userId);
    const profileWithStatus = {
      ...profile,
      status: statusData?.status || profile.status
    };
    
    setPreviewUser(profileWithStatus);
    setProfilePreviewLoading(false);

  };

  const handleCloseProfilePreview = () => {
    setProfilePreviewAnimating(false);
    setTimeout(() => {
      setShowProfilePreview(false);
      setPreviewUser(null);
      setProfilePreviewSourceId(null);
      setProfilePreviewLoading(false);
      setProfilePreviewFromCache(false);
    }, 150); // Match animation duration
  };

  // Mention handlers - must be before all useMemo/useEffect to maintain hook order
  const detectMentionTrigger = useCallback((value = '', caretPosition) => {
    // Check if we have participants with valid usernames (defer to inside callback to avoid TDZ)
    const hasParticipants = currentConversation?.participants?.some(p => Boolean(p?.username) && normalizeId(p?._id) !== currentUserId);
    if (!hasParticipants) {
      setMentionState(prev => (prev.isOpen ? createMentionState() : prev));
      return;
    }

    const safeCaret = typeof caretPosition === 'number' ? caretPosition : value.length;
    const uptoCaret = value.slice(0, safeCaret);
    const match = uptoCaret.match(/(^|[\s([{>])@([A-Za-z0-9_.-]*)$/);

    if (!match) {
      setMentionState(prev => (prev.isOpen ? createMentionState() : prev));
      return;
    }

    const query = match[2] || '';
    const triggerIndex = safeCaret - query.length - 1;

    setMentionState(prev => {
      if (prev.isOpen && prev.triggerIndex === triggerIndex && prev.query === query) {
        return prev;
      }
      return {
        isOpen: true,
        triggerIndex,
        query,
        selectedIndex: 0,
      };
    });
  }, [currentConversation?.participants, currentUser?._id]);

  const handleInputChange = useCallback((e) => {
    const { value, selectionStart } = e.target;
    setInputValue(value);
    detectMentionTrigger(value, selectionStart);
    
    // Trigger typing indicator - pass character count for threshold check
    const trimmedLength = value.trim().length;
    if (trimmedLength > 0) {
      startTyping(trimmedLength);
    } else {
      // Stop typing if input is cleared
      stopTyping();
    }
  }, [detectMentionTrigger, startTyping, stopTyping]);

  const handleMentionSelect = useCallback((user) => {
    if (!user?.username || mentionState.triggerIndex == null) return;

    let nextCursorPosition = null;
    setInputValue(prev => {
      const before = prev.slice(0, mentionState.triggerIndex);
      const queryLength = (mentionState.query || '').length;
      const afterStart = mentionState.triggerIndex + queryLength + 1;
      const after = prev.slice(afterStart);
      const mentionText = `@${user.username}`;
      const needsSpace = after.length === 0 ? true : !/^[\s.,!?)]/.test(after[0]);
      const spacer = needsSpace ? ' ' : '';
      const nextValue = `${before}${mentionText}${spacer}${after}`;
      nextCursorPosition = before.length + mentionText.length + spacer.length;
      return nextValue;
    });

    requestAnimationFrame(() => {
      if (typeof nextCursorPosition === 'number') {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(nextCursorPosition, nextCursorPosition);
      }
    });

    resetMentionState();
  }, [mentionState, resetMentionState]);

  const handleSendMessage = () => {
    if (inputValue.trim() && currentConversation) {
      const tempId = `temp-${Date.now()}`;
      const messageContent = inputValue;
      const replyToId = replyingTo?._id || null;
      
      const optimisticMessage = {
        _id: tempId,
        content: messageContent,
        sender: currentUser,
        conversationId: currentConversation._id,
        createdAt: new Date().toISOString(),
        isPending: true,
        type: 'text',
        replyTo: replyingTo || null
      };
      
      // Clear input and UI state immediately for instant feedback
      setInputValue("");
      setReplyingTo(null);
      resetMentionState();
      stopTyping();
      
      // Add optimistic message
      setMessages(prev => [...prev, optimisticMessage]);
      
      // Send message (non-blocking)
      sendChatMessage(messageContent, replyToId);

      // Scroll to bottom after sending (batched with next frame)
      requestAnimationFrame(() => scrollToBottom());
    }
  };

  const handleKeyPress = (e) => {
    const hasMentionOptions = mentionState.isOpen && mentionState.query?.length >= MENTION_MIN_CHARS && mentionSuggestions.length > 0;

    if (hasMentionOptions && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      setMentionState(prev => {
        if (!prev.isOpen || mentionSuggestions.length === 0) return prev;
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        const count = mentionSuggestions.length;
        const nextIndex = (prev.selectedIndex + delta + count) % count;
        if (nextIndex === prev.selectedIndex) return prev;
        return { ...prev, selectedIndex: nextIndex };
      });
      return;
    }

    if (mentionState.isOpen && e.key === 'Escape') {
      e.preventDefault();
      resetMentionState();
      return;
    }

    if (hasMentionOptions && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const target = mentionSuggestions[mentionState.selectedIndex] || mentionSuggestions[0];
      if (target) {
        handleMentionSelect(target);
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else if (e.key === 'Escape' && replyingTo) {
      e.preventDefault();
      setReplyingTo(null);
    }
  };

  const handleEditMessage = (message) => {
    // Prevent editing if muted
    if (isMuted) return;
    
    setEditingMessage(message);
    setEditValue(message.content);
  };

  const handleSaveEdit = () => {
    if (editValue.trim() && editingMessage) {
      const updated = editValue;
      setMessages(prev => prev.map(msg => 
        msg._id === editingMessage._id 
          ? { 
              ...msg,
              content: updated,
              editedAt: new Date().toISOString(),
              isEdited: true,
              isEditPending: true
            }
          : msg
      ));
      
      editChatMessage(editingMessage._id, updated);
      setEditingMessage(null);
      setEditValue("");
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditValue("");
  };

  const handleEditKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleCopyText = (message) => {
    const textWithNativeEmojis = message.content;
    navigator.clipboard.writeText(textWithNativeEmojis);
  };

  const handleOpenDeleteMessage = (messageId) => {
    setDeletingMessageId(messageId);
    setShowDeleteMessageModal(true);
    setShowMoreMenu(null);
  };

  const handleConfirmDeleteMessage = async () => {
    if (!deletingMessageId) return;
    
    setIsDeletingMessage(true);
    isDeletingMessageRef.current = true;
    
    try {
      await deleteChatMessage(deletingMessageId);
      
      // Close modal after successful deletion
      setIsClosingDeleteMessageModal(true);
      setTimeout(() => {
        setShowDeleteMessageModal(false);
        setIsClosingDeleteMessageModal(false);
        setDeletingMessageId(null);
        setIsDeletingMessage(false);
        // Reset the flag after modal is fully closed and state updates are complete
        // Use a longer timeout to account for socket round-trip latency
        setTimeout(() => {
          isDeletingMessageRef.current = false;
        }, 1000);
      }, 150);
    } catch (error) {
      console.error('Failed to delete message:', error);
      setIsDeletingMessage(false);
      isDeletingMessageRef.current = false;
    }
  };

  const handleCancelDeleteMessage = () => {
    setIsClosingDeleteMessageModal(true);
    setTimeout(() => {
      setShowDeleteMessageModal(false);
      setIsClosingDeleteMessageModal(false);
      setDeletingMessageId(null);
    }, 150);
  };

  const handleDeleteMessage = (messageId) => {
    isDeletingMessageRef.current = true;
    deleteChatMessage(messageId);
    setShowMoreMenu(null);
    setTimeout(() => {
      isDeletingMessageRef.current = false;
    }, 100);
  };

  const handleOpenReport = (message) => {
    setReportingMessage(message);
    setShowReportModal(true);
    setShowMoreMenu(null);
  };

  const handleSubmitReport = async () => {
    if (!reportReason || !reportingMessage) return;
    
    setIsSubmittingReport(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsSubmittingReport(false);
        return;
      }

      const response = await fetch(`${config.url}/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          contentId: reportingMessage._id,
          contentType: 'message',
          category: reportReason.toLowerCase().replace(/ /g, ''),
          details: reportDetails.trim()
        })
      });

      const data = await response.json();

      if (data.success) {

        setShowReportModal(false);
        setReportReason("");
        setReportDetails("");
        setReportingMessage(null);
        toast.success(data.message)
        // Focus input after modal closes
        setTimeout(() => inputRef.current?.focus(), 200);
      } else {
        console.error('Report submission failed:', data.message);
        alert(data.message || 'Failed to submit report. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('An error occurred while submitting the report. Please try again.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleConversationSelect = async (conv) => {
    // If there are unsaved changes in settings, revert them
    if (showSettings && hasUnsavedChanges) {
      handleCancelSettings();
    }
    
    // Clear any active reply
    setReplyingTo(null);
    
    // Wait for conversation to be selected and messages to load
    await selectConversation(conv);
    
    // Only close settings after conversation is ready
    setShowSettings(false);
    setShowMobileSidebar(false);
    
    // Save to localStorage and update URL without routing
    if (conv?._id) {
      localStorage.setItem('lastConversationId', conv._id);
      // Use History API to avoid a Next.js route change
      const target = `/chat/${conv.urlId || conv._id}`;
      if (typeof window !== 'undefined' && window.location.pathname !== target) {
        // For manual selection, use pushState so back button works
        window.history.pushState(null, '', target);
      }
    }
  };

  const handleConversationMenuClick = (event) => {
    event.stopPropagation();
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const chatArea = button.closest('.relative');
    const chatRect = chatArea?.getBoundingClientRect();

    // If menu is open, play closing animation instead of instantly unmounting
    if (showConversationMenu) {
      setIsClosingConversationMenu(true);
      setTimeout(() => {
        setShowConversationMenu(false);
        setIsClosingConversationMenu(false);
      }, 150);
      return;
    }

    if (chatRect) {
      // Calculate position relative to the chat area container
      setConversationMenuPosition({
        top: rect.bottom - chatRect.top + 25,
        right: chatRect.right - rect.right
      });
    }
    setShowConversationMenu(true);
  };

  // Right-click on a message to open the same More Menu at cursor
  const handleMessageContextMenu = (e, message) => {
    e.preventDefault();
    e.stopPropagation();
    const clickX = e.clientX;
    const clickY = e.clientY;
    const menuWidth = 192; // w-48 = 12rem = 192px
    const menuHeight = 200; // approximate
    const shouldOpenUpward = (window.innerHeight - clickY) < menuHeight + 16;
    
    // Position menu to the right of cursor, with bounds checking
    let left = clickX + 8;
    let top = clickY;
    
    // If menu would go off right edge, position to left of cursor
    if (left + menuWidth > window.innerWidth - 16) {
      left = clickX - menuWidth - 8;
    }
    
    // If menu would go off bottom, adjust upward
    if (top + menuHeight > window.innerHeight - 16) {
      top = window.innerHeight - menuHeight - 16;
    }
    
    // If menu would go off top, clamp to top
    if (top < 16) {
      top = 16;
    }
    
    setMenuPosition({
      top,
      left,
      openUpward: shouldOpenUpward,
    });
    setShowMoreMenu(message._id);
  };

  // Right-click on conversation list item
  const handleConvoListContextMenu = (e, conv) => {
    e.preventDefault();
    e.stopPropagation();
    const clickX = e.clientX;
    const clickY = e.clientY;
    const menuWidth = 208; // w-52 = 13rem = 208px
    const menuHeight = 200; // approximate
    
    // Position menu to the right of cursor, with bounds checking
    let left = clickX + 8;
    let top = clickY;
    
    // If menu would go off right edge, position to left of cursor
    if (left + menuWidth > window.innerWidth - 16) {
      left = clickX - menuWidth - 8;
    }
    
    // If menu would go off bottom, adjust upward
    if (top + menuHeight > window.innerHeight - 16) {
      top = window.innerHeight - menuHeight - 16;
    }
    
    // If menu would go off top, clamp to top
    if (top < 16) {
      top = 16;
    }
    
    setShowConvoListMenu(conv._id);
    setConvoListMenuPosition({ top, left });
  };

  const handleMemberContextMenu = (e, member) => {
    e.preventDefault();
    e.stopPropagation();
    const clickX = e.clientX;
    const clickY = e.clientY;
    const menuWidth = 220; // w-52 = 13rem = 208px
    const menuHeight = 200; // approximate
    
    // Position menu to the right of cursor, with bounds checking
    let left = clickX + 8;
    let top = clickY;
    
    // If menu would go off right edge, position to left of cursor
    if (left + menuWidth > window.innerWidth - 16) {
      left = clickX - menuWidth - 8;
    }
    
    // If menu would go off bottom, adjust upward
    if (top + menuHeight > window.innerHeight - 16) {
      top = window.innerHeight - menuHeight - 16;
    }
    
    // If menu would go off top, clamp to top
    if (top < 16) {
      top = 16;
    }
    
    setShowMemberMenu(member._id);
    setMemberMenuPosition({ top, left });
  };


  const handleDeleteConversation = () => {
    // For groups: only admins can delete
    // For DMs: any participant can delete
    if (currentConversation?.isGroup && !currentUser?.isAdmin) {
      console.log('Only admins can delete group conversations');
      return;
    }
    
    if (!currentConversation?.urlId && !currentConversation?._id) return;
    
    // Close conversation menu and show appropriate delete modal
    setIsClosingConversationMenu(true);
    setTimeout(() => {
      setShowConversationMenu(false);
      setIsClosingConversationMenu(false);
      
      // Show group delete modal or DM delete modal based on conversation type
      if (currentConversation.isGroup) {
        setShowDeleteGroupModal(true);
      } else {
        setShowDeleteDMModal(true);
      }
    }, 150);
  };

  const handleConfirmDeleteConversation = async () => {
    if (!currentConversation?.urlId && !currentConversation?._id) return;
    
    try {
      setIsDeletingConversation(true);
      
      // Call delete conversation API using urlId
      const result = await deleteConversationChat(currentConversation.urlId || currentConversation._id);
      if (result?.success) {
        console.log('Conversation deleted successfully');
        toast.success('Conversation deleted successfully');
        // Update URL to /chat
        if (typeof window !== 'undefined') {
          window.history.pushState(null, '', '/chat');
        }
      } else {
        console.error('Failed to delete conversation:', result?.message);
        toast.error(result?.message || 'Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    } finally {
      setIsDeletingConversation(false);
    }
    
    // Close the delete modal
    if (currentConversation.isGroup) {
      setIsClosingDeleteGroupModal(true);
      setTimeout(() => {
        setShowDeleteGroupModal(false);
        setIsClosingDeleteGroupModal(false);
      }, 150);
    } else {
      setIsClosingDeleteDMModal(true);
      setTimeout(() => {
        setShowDeleteDMModal(false);
        setIsClosingDeleteDMModal(false);
      }, 150);
    }
  };

  const handleNotificationSettings = () => {
    setShowNotificationModal(true);
    setIsClosingConversationMenu(true);
    setTimeout(() => {
      setShowConversationMenu(false);
      setIsClosingConversationMenu(false);
    }, 150);
  };

  const closeNotificationModal = () => {
    if (isClosingNotificationModal) return;
    setIsClosingNotificationModal(true);
    setTimeout(() => {
      setShowNotificationModal(false);
      setIsClosingNotificationModal(false);
      // Focus input after modal closes
      setTimeout(() => inputRef.current?.focus(), 50);
    }, 150);
  };

  const closeGroupModal = () => {
    if (isClosingGroupModal) return; // Prevent multiple calls
    setIsClosingGroupModal(true);
    setTimeout(() => {
      setShowGroupModal(false);
      setIsClosingGroupModal(false);
      setGroupName("");
      setGroupAvatar("");
      setGroupAvatarFile(null);
      // Focus input after modal closes
      setTimeout(() => inputRef.current?.focus(), 50);
    }, 150); // Slightly shorter for smoother feel
  };

  // Mute modal helpers
  const closeMuteModal = () => {
    if (isClosingMuteModal) return;
    setIsClosingMuteModal(true);
    setTimeout(() => {
      setShowMuteModal(false);
      setIsClosingMuteModal(false);
      setMuteTargetUser(null);
      setMuteDuration('60s');
      // Focus input after modal closes
      setTimeout(() => inputRef.current?.focus(), 50);
    }, 150);
  };

  const handleSubmitMute = async () => {
    if (!muteTargetUser || !token || isMuting) return;
    
    setIsMuting(true);
    
    // Convert duration string to seconds
    const durationMap = {
      '60s': 60,
      '5m': 300,
      '10m': 600,
      '1h': 3600,
      '1d': 86400,
      '1w': 604800
    };
    const durationSeconds = durationMap[muteDuration] || 60;
    
    try {
      const result = await chatService.muteUser(token, muteTargetUser._id, durationSeconds);
      if (result.success) {
        // Close modal immediately on success
        setShowMuteModal(false);
        setIsClosingMuteModal(false);
        setMuteTargetUser(null);
        setMuteDuration('60s');
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setIsMuting(false);
    }
  };

  const handleUnmute = async (user) => {
    if (!token || !currentUser?.isAdmin) return;
    
    try {
      const result = await chatService.unmuteUser(token, user._id);
      if (result.success) {
        // Handle success silently
      }
    } catch (error) {
      // Handle error silently
    }
  };

  const handleUnban = async (user) => {
    if (!token || !currentUser?.isAdmin || !user) return;
    
    try {
      const result = await chatService.unbanUser(token, user._id);
      if (result.success) {
        toast.success(result.message || `${user.username} has been unbanned`);
        // Remove from bannedUsers state
        setBannedUsers(prev => {
          const userId = normalizeId(user._id);
          if (!userId) return prev;
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      } else {
        toast.error(result.message || 'Failed to unban user');
      }
    } catch (err) {
      toast.error('Failed to unban user');
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !currentUser?.isAdmin) return;
    
    setIsCreatingGroup(true);
    try {
      // Use FormData if there's a file, otherwise JSON
      let response;
      
      if (groupAvatarFile) {
        const formData = new FormData();
        formData.append('groupName', groupName.trim());
        formData.append('groupAvatar', groupAvatarFile);
        
        response = await fetch(`${config.url}/api/chat/conversations/group`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
      } else {
        response = await fetch(`${config.url}/api/chat/conversations/group`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            groupName: groupName.trim(),
            groupAvatar: groupAvatar.trim() || null
          })
        });
      }
      
      const data = await response.json();
      if (data.success) {
        closeGroupModal();
        // Group will appear in conversations automatically via socket broadcast
      } else {
        alert(data.message || 'Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const closeUpdateGroupModal = () => {
    if (isClosingUpdateGroupModal) return;
    setIsClosingUpdateGroupModal(true);
    setTimeout(() => {
      setShowUpdateGroupModal(false);
      setIsClosingUpdateGroupModal(false);
      setUpdateGroupName("");
      setUpdateGroupAvatar("");
      setUpdateGroupAvatarFile(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }, 150);
  };

  const handleUpdateGroup = async () => {
    if (!updateGroupName.trim() || !currentUser?.isAdmin || !currentConversation) return;
    
    setIsUpdatingGroup(true);
    try {
      let response;
      
      if (updateGroupAvatarFile) {
        const formData = new FormData();
        formData.append('groupName', updateGroupName.trim());
        formData.append('groupAvatar', updateGroupAvatarFile);
        
        response = await fetch(`${config.url}/api/chat/conversations/${currentConversation.urlId}/update`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
      } else {
        response = await fetch(`${config.url}/api/chat/conversations/${currentConversation.urlId}/update`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            groupName: updateGroupName.trim(),
            groupAvatar: updateGroupAvatar.trim() || null
          })
        });
      }
      
      const data = await response.json();
      if (data.success) {
        closeUpdateGroupModal();
        toast.success('Group updated successfully');
        // Update will be reflected via socket broadcast
      } else {
        alert(data.message || 'Failed to update group');
      }
    } catch (error) {
      console.error('Error updating group:', error);
      alert('Failed to update group');
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  const filteredConversations = React.useMemo(() => {
    if (!searchQuery) return conversations;
    const query = searchQuery.toLowerCase();
    const userId = currentUser?._id;
    
    return conversations.filter(conv => {
      if (conv.isGroup) {
        return conv.groupName?.toLowerCase().includes(query);
      }
      const otherUser = conv.participants?.find(p => p._id !== userId);
      return otherUser?.username?.toLowerCase().includes(query);
    });
  }, [conversations, searchQuery, currentUser?._id]);

  // Messages that are replies to me - memoized for performance
  const repliedToMeIds = React.useMemo(() => {
    const set = new Set();
    const userId = currentUser?._id;
    if (!userId || !Array.isArray(messages)) return set;
    
    for (const m of messages) {
      if (m?.replyTo?.sender?._id === userId && m.sender?._id !== userId) {
        set.add(m._id);
      }
    }
    return set;
  }, [messages, currentUser?._id]);

  // Messages that mention me - memoized for performance
  const mentionedToMeIds = React.useMemo(() => {
    const set = new Set();
    const userId = currentUser?._id;
    const username = currentUser?.username;
    if (!userId || !username || !Array.isArray(messages)) return set;
    
    const mentionPattern = new RegExp(`@${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
    for (const m of messages) {
      if (m?.content && mentionPattern.test(m.content) && m.sender?._id !== userId) {
        set.add(m._id);
      }
    }
    return set;
  }, [messages, currentUser?._id, currentUser?.username]);

  const allUsers = React.useMemo(() => {
    if (!currentConversation?.participants) return [];
    
    const userId = currentUser?._id;
    return currentConversation.participants.map(participant => {
      const isCurrentUser = participant._id === userId;
      const status = userStatuses.get(participant._id);
      
      return {
        ...participant,
        status: isCurrentUser ? userStatus : (status?.status || 'offline'),
        lastSeen: isCurrentUser ? new Date() : status?.lastSeen,
        customStatus: isCurrentUser ? customStatus : (status?.customStatus || '')
      };
    });
  }, [currentConversation?.participants, userStatuses, currentUser?._id, customStatus, userStatus]);

  const mentionParticipants = React.useMemo(() => {
    if (!currentConversation?.participants) return [];
    return currentConversation.participants.filter(participant => Boolean(participant?.username));
  }, [currentConversation?.participants]);

  const mentionSuggestionUsers = React.useMemo(() => {
    const userId = currentUser?._id;
    return mentionParticipants.filter(user => user._id !== userId);
  }, [mentionParticipants, currentUser?._id]);

  const mentionHighlightUsernames = React.useMemo(() => {
    const names = mentionParticipants
      .map(user => user.username)
      .filter(Boolean);
    return names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [mentionParticipants]);

  const mentionSuggestions = React.useMemo(() => {
    if (!mentionState.isOpen || mentionState.triggerIndex === null) return [];
    if (!mentionSuggestionUsers.length) return [];
    if (!mentionState.query || mentionState.query.length < MENTION_MIN_CHARS) return [];
    const query = mentionState.query.toLowerCase();
    return mentionSuggestionUsers
      .filter(user => user.username?.toLowerCase().includes(query))
      .slice(0, MENTION_SUGGESTION_LIMIT);
  }, [mentionState, mentionSuggestionUsers]);

  useEffect(() => {
    if (!mentionSuggestionUsers.length) {
      setMentionState(prev => (prev.isOpen ? createMentionState() : prev));
    }
  }, [mentionSuggestionUsers.length]);

  useEffect(() => {
    if (!mentionState.isOpen) return;
    if (mentionSuggestions.length === 0 && mentionState.selectedIndex !== 0) {
      setMentionState(prev => ({ ...prev, selectedIndex: 0 }));
      return;
    }
    if (mentionSuggestions.length > 0 && mentionState.selectedIndex >= mentionSuggestions.length) {
      setMentionState(prev => ({ ...prev, selectedIndex: 0 }));
    }
  }, [mentionState.isOpen, mentionState.selectedIndex, mentionSuggestions.length]);
  
  const onlineMembers = allUsers.filter(user => ['online', 'idle', 'away', 'dnd'].includes(user.status));
  const offlineMembers = allUsers.filter(user => !['online', 'idle', 'away', 'dnd'].includes(user.status));
  const bannedUsersStamp = useMemo(() => Object.keys(bannedUsers).sort().join('|'), [bannedUsers]);

  const loadingMessages = [
    "Getting things ready...",
    "Preparing your experience...",
    "Almost there...",
    "Loading conversations...",
    "Just a moment...",
    "Hang tight, loading...",
  ];

  if (authError) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: currentTheme?.bg.primary || THEMES.dark.bg.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}
      >
        <div
          style={{
            textAlign: 'center',
            maxWidth: '420px',
            opacity: 0,
            animation: 'fadeIn 0.6s ease forwards',
            animationDelay: '0.1s'
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              margin: '0 auto 2rem',
              borderRadius: '50%',
              backgroundColor: `${currentTheme?.accent || THEMES.dark.accent}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <i
              className="ri-lock-line"
              style={{
                fontSize: '2rem',
                color: currentTheme?.accent || THEMES.dark.accent,
              }}
            />
          </div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: '600',
              color: currentTheme?.text.primary || THEMES.dark.text.primary,
              marginBottom: '0.75rem',
              letterSpacing: '-0.02em',
              fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
            }}
          >
            Authentication Required
          </h1>
          <p
            style={{
              fontSize: '0.95rem',
              color: currentTheme?.text.secondary || THEMES.dark.text.secondary,
              marginBottom: '2rem',
              lineHeight: '1.6',
              fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
            }}
          >
            {authErrorMessage}
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: currentTheme?.accent || THEMES.dark.accent,
              textDecoration: 'none',
              fontWeight: '500',
              fontSize: '0.9rem',
              transition: 'gap 0.2s ease',
              fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
            }}
            onMouseEnter={(e) => e.currentTarget.style.gap = '0.75rem'}
            onMouseLeave={(e) => e.currentTarget.style.gap = '0.5rem'}
          >
            <span>Return to home</span>
            <i className="ri-arrow-right-line" style={{ fontSize: '1rem' }} />
          </Link>
        </div>
      </div>
    );
  }
  
  if (!isClient || !isFullyLoaded) {
    return <LoadingScreen currentTheme={currentTheme || THEMES.dark} loadingMessages={loadingMessages} />;
  }

  // Show ban screen if current user is banned
  if (currentUserIsBanned || currentUser?.isBanned) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: currentTheme.bg.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '1.5rem',
          padding: '2rem'
        }}
      >
        <div
          style={{
            textAlign: 'center',
            maxWidth: '500px'
          }}
        >
          <i
            className="ri-forbid-line"
            style={{
              fontSize: '4rem',
              color: '#ed4245',
              marginBottom: '1rem',
              display: 'block'
            }}
          />
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: currentTheme.text.primary,
              marginBottom: '0.5rem'
            }}
          >
            You've Been Banned
          </h1>
          <p
            style={{
              fontSize: '1rem',
              color: currentTheme.text.secondary,
              marginBottom: '1.5rem',
              lineHeight: '1.5'
            }}
          >
            You have been banned from this server. You no longer have access to chat and cannot send messages.
          </p>
          <p
            style={{
              fontSize: '0.875rem',
              color: currentTheme.text.tertiary
            }}
          >
            If you believe this was a mistake, please contact us at <br /> goonchan.support@proton.me
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
    {showLoadingOverlay && (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: currentTheme.bg.primary,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 0.3s ease-out'
        }}
      >
        <LoadingScreen currentTheme={currentTheme} loadingMessages={loadingMessages} isOverlay={true} />
      </div>
    )}
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes scaleIn {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      @keyframes fadeOut {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }
      @keyframes scaleOut {
        from {
          opacity: 1;
          transform: scale(1);
        }
        to {
          opacity: 0;
          transform: scale(0.95);
        }
      }
    `}</style>
    <div 
      className="h-screen flex overflow-hidden select-none" 
      style={{ 
        backgroundColor: currentTheme.bg.primary,
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out'
      }}
    >
      
      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Left Sidebar - Conversations */}
      <div 
        className={`flex flex-col border-r transition-transform duration-300 ease-in-out z-50 lg:z-0 lg:translate-x-0 lg:w-[320px] lg:relative ${
          showMobileSidebar 
            ? 'fixed inset-y-0 left-0 w-[85%] max-w-[320px] translate-x-0 shadow-2xl' 
            : 'fixed inset-y-0 left-0 w-[85%] max-w-[320px] -translate-x-full lg:flex'
        }`}
        style={{ backgroundColor: currentTheme.bg.secondary, borderColor: currentTheme.border.primary }}
      >
        {/* Header */}
        <div className="h-12 px-5 flex items-center justify-between border-b flex-shrink-0" style={{ borderColor: currentTheme.border.primary }}>
          {/* <h1 className="text-white font-semibold text-base font-pop">Messages</h1>
          <button className="p-1.5 hover:bg-[#1a1a1a] rounded transition-colors text-[#999]">
            <FiSettings className="text-lg" />
          </button> */}
          {/* back to website or Add Group for admins */}
          <Link title="Back to website" href="/" className="flex items-center cursor-pointer hover:opacity-90 transition-all ease-in-out gap-3">
            <div className="flex items-center gap-2">
              <img src="/logo.webp" alt="logo" className="w-6 h-6 rounded-full object-cover" />
              <h1 className="font-semibold text-base font-pop" style={{ color: currentTheme.text.primary }}>Goon<span style={{ color: currentTheme.accent }}>Chat</span></h1>
              {/* <h1 className="font-semibold text-base font-pop" style={{ color: currentTheme.text.primary }}>Stealth<span style={{ color: "#B5B000" }}>Chat</span></h1> */}
            </div>
          </Link>
          {currentUser?.isAdmin ? (
            <button
              onClick={() => setShowGroupModal(true)}
              className="flex group items-center gap-1 px-2.5 py-1.5 rounded cursor-pointer transition-colors group"
              style={{ color: currentTheme.text.tertiary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = currentTheme.text.secondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = currentTheme.text.tertiary;
              }}
              title="Create Group"
            >
              <i className="ri-add-line group-hover:rotate-90 transition-transform duration-400"></i>
              <span className="text-xs font-medium font-inter">Add Group</span>
            </button>
          ) : (
            <Link 
              href="/"
              className="flex group items-center gap-1 px-2.5 py-1.5 rounded cursor-pointer transition-colors group"
              style={{ color: currentTheme.text.tertiary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = currentTheme.text.secondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = currentTheme.text.tertiary;
              }}
              title="Back to website"
            >
              <i className="ri-arrow-left-line group-hover:-translate-x-[1.5px] transition-transform duration-300"></i>
              <span className="text-xs font-medium font-inter">Back</span>
            </Link>
          )}


        </div>

        {/* Search */}
        {/* <div className="px-5 py-4 border-b border-[#1a1a1a] flex-shrink-0">
          <div className="flex items-center bg-[#0f0f0f] border border-[#1a1a1a] rounded-md px-3 py-2 focus-within:border-[#ea4197]/40 transition-colors">
            <FiSearch className="text-[#666] text-sm flex-shrink-0" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent ml-2.5 text-[#c0c0c0] placeholder-[#666] focus:outline-none text-sm font-inter"
            />
            {searchQuery && (
              <FiX 
                className="text-[#666] cursor-pointer hover:text-[#ea4197] transition-colors flex-shrink-0 text-sm" 
                onClick={() => setSearchQuery("")}
              />
            )}
          </div>
        </div> */}

        {/* Conversations List */}
        <div 
          ref={conversationsContainerRef} 
          className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 mb-[52px] relative"
          onMouseLeave={() => setHoveredConvIndex(null)}
        >
          {/* Smooth hover overlay */}
          <div
            className="absolute left-2 right-2 rounded-md transition-all duration-200 ease-in-out pointer-events-none"
            style={{
              backgroundColor: currentTheme.bg.tertiary,
              ...hoverStyle,
            }}
          />
          
          {isLoading && conversations.length === 0 ? (
            <ConversationSkeleton currentTheme={currentTheme} />
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6">
              <FiSearch className="text-3xl mb-3" style={{ color: currentTheme.border.secondary }} />
              <p className="text-sm font-inter text-center" style={{ color: currentTheme.text.tertiary }}>No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conv, index) => (
              <div
                key={conv._id}
                data-conv-context="item"
                onMouseEnter={() => setHoveredConvIndex(index)}
              >
                <ConversationItem
                  conversation={conv}
                  index={index}
                  currentUser={currentUser}
                  currentConversation={currentConversation}
                  showSettings={showSettings}
                  userStatuses={userStatuses}
                  onSelect={handleConversationSelect}
                  onContextMenu={handleConvoListContextMenu}
                  currentTheme={currentTheme}
                />
              </div>
            ))
          )}

          {/* Load more conversations button */}
          {!searchQuery && hasMoreConversations && (
            <div className="px-3 py-3 flex items-center justify-center">
              <button
                onClick={loadMoreConversations}
                disabled={isLoadingMoreConversations}
                className={`px-3 py-1.5 ${isLoadingMoreConversations ? 'hidden' : ''} rounded-md text-sm font-medium transition-colors`}
                style={{
                  backgroundColor: isLoadingMoreConversations ? currentTheme.bg.hover : currentTheme.bg.tertiary,
                  color: currentTheme.text.secondary,
                  border: `1px solid ${currentTheme.border.primary}`,
                  cursor: isLoadingMoreConversations ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!isLoadingMoreConversations) e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                }}
                onMouseLeave={(e) => {
                  if (!isLoadingMoreConversations) e.currentTarget.style.backgroundColor = currentTheme.bg.tertiary;
                }}
              >
                {isLoadingMoreConversations ? 'Loading...' : 'Load more chats'}
              </button>
              {isLoadingMoreConversations && (
                <div className="ml-2 w-5 h-5 rounded-full border-2 animate-spin" style={{ 
                  borderColor: `${(currentTheme?.accent || THEMES.dark.accent)}30`,
                  borderTopColor: currentTheme?.accent || THEMES.dark.accent,
                }} />
              )}
            </div>
          )}
        </div>

        {/* Profile Card at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 border-t" style={{ backgroundColor: currentTheme.bg.secondary, borderColor: currentTheme.border.primary }}>
          {/* Profile Status Popup */}
          {showProfileCard && (
            <>
              <div 
                className="fixed inset-0 z-10"
                onClick={() => {
                  setIsClosingStatusCard(true);
                  setTimeout(() => {
                    setShowProfileCard(false);
                    setIsClosingStatusCard(false);
                  }, 150);
                }}
              />
              <div 
                className="absolute bottom-[84px] left-3 right-3 border rounded-lg shadow-lg z-20 overflow-hidden"
                style={{ 
                  backgroundColor: currentTheme.bg.secondary, 
                  borderColor: currentTheme.border.primary,
                  animation: isClosingStatusCard 
                    ? 'scaleOut 0.15s cubic-bezier(0.36, 0, 0.66, -0.56) forwards' 
                    : 'scaleIn 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transformOrigin: 'bottom center'
                }}
              >
                <div className="p-3">
                  {/* Status Section */}
                  <div className="mb-0">
                    <label className="text-[11px] font-medium mb-2 block font-inter" style={{ color: currentTheme.text.tertiary }}>
                      Status
                    </label>
                    <div className="space-y-0.5">
                      {[
                        { value: 'online', label: 'Online' },
                        { value: 'idle', label: 'Idle' },
                        { value: 'dnd', label: 'Do Not Disturb' },
                      ].map((status) => (
                        <button
                          key={status.value}
                          onClick={() => setUserStatus(status.value)}
                          className="w-full cursor-pointer flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-colors"
                          style={{
                            backgroundColor: userStatus === status.value ? currentTheme.bg.hover : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (userStatus !== status.value) {
                              e.currentTarget.style.backgroundColor = currentTheme.bg.tertiary;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (userStatus !== status.value) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          <StatusBadge 
                            status={status.value}
                            size="sm"
                            borderColor={currentTheme.bg.secondary}
                          />
                          <span 
                            className="text-[13px] font-inter flex-1 text-left" 
                            style={{
                              color: userStatus === status.value ? currentTheme.text.primary : currentTheme.text.secondary
                            }}
                          >
                            {status.label}
                          </span>
                          {userStatus === status.value && (
                            <i 
                              className="ri-check-line text-sm"
                              style={{ color: currentTheme.text.tertiary }}
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Profile Bar */}
          <div 
            className="px-3 py-2.5 flex items-center justify-between gap-3 transition-colors"
          >
            <div
              className="px-3 py-2 flex-1 min-w-0 cursor-pointer rounded hover:bg-opacity-10 transition-colors flex items-center gap-3"
              onClick={() => setShowProfileCard(!showProfileCard)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = currentTheme.bg.tertiary}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="relative">
                <img 
                  src={userAvatar || currentUserAvatarUrl}
                  onError={(e) => {
                    if (currentUserAvatarUrl && e.target.src !== currentUserAvatarUrl) {
                      e.target.src = currentUserAvatarUrl;
                    }
                  }} 
                  alt={userName}
                  className="w-9 h-9 rounded-full object-cover"
                />
                <StatusBadge 
                  status={userStatus} 
                  size="sm" 
                  borderColor={currentTheme.bg.secondary}
                  className="absolute -bottom-0.5 -right-0.5"
                />
              </div>
              
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-sm font-semibold font-inter block" style={{ 
                  color: currentTheme.text.primary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%'
                }}>{userName}</p>
                <p className="text-xs font-inter block" style={{ 
                  color: currentTheme.text.tertiary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%'
                }}>
                  {customStatus}
                </p>
              </div>
            </div>

            <div className="flex px-4 items-center gap-1 flex-shrink-0">
              <button 
                className="p-2 rounded-md cursor-pointer transition-all"
                style={{ 
                  color: currentTheme.text.tertiary
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = currentTheme.text.secondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = currentTheme.text.tertiary;
                }}
                onClick={() => {
                  const newState = !notificationSoundEnabled;
                  setNotificationSoundEnabled(newState);
                  localStorage.setItem('goonChat_notificationSound', newState.toString());
                }}
                title={notificationSoundEnabled ? "Notification sounds enabled" : "Notification sounds disabled"}
              >
                <i className={`text-lg ${notificationSoundEnabled ? 'ri-volume-up-line' : 'ri-volume-mute-line'}`} />
              </button>
              <button 
                className="p-2 group rounded-md cursor-pointer transition-all"
                style={{ 
                  color: showSettings ? currentTheme.text.primary : currentTheme.text.tertiary
                }}
                onMouseEnter={(e) => {
                  // e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                  e.currentTarget.style.color = currentTheme.text.primary;
                }}
                onMouseLeave={(e) => {

                  showSettings ? e.currentTarget.style.color = currentTheme.text.primary : e.currentTarget.style.color = currentTheme.text.tertiary;
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  // If closing settings while there are unsaved changes, cancel them
                  if (showSettings && hasUnsavedChanges) {
                    handleCancelSettings();
                  }
                  // When opening settings, seed the temp edit fields from current values
                  if (!showSettings) {
                    setTempCustomStatus(customStatus || '');
                  }
                  setShowSettings(!showSettings);
                  setShowProfileCard(false);
                  setShowMobileSidebar(false); // Close mobile sidebar when opening settings
                }}
              >
                <IoSettingsOutline className="text-lg group-hover:rotate-80 transition-transform duration-400"></IoSettingsOutline>
              </button>
            </div>

          </div>
        </div>
      </div>

      {showSettings ? (
        <SettingsPanel
          currentTheme={currentTheme}
          THEMES={THEMES}
          hasUnsavedChanges={hasUnsavedChanges}
          onClose={() => {
            setShowSettings(false);
            // Scroll to bottom when closing settings
            setTimeout(() => scrollToBottom(), 20);
          }}
          handleCancelSettings={handleCancelSettings}
          selectConversation={async (conv) => {
            await selectConversation(conv);
            setTimeout(() => scrollToBottom(), 50);
            // Scroll happens automatically via useLayoutEffect after messages load
          }}
          conversations={conversations}
          currentConversation={currentConversation}
          bannerColor={bannerColor}
          setBannerColor={setBannerColor}
          showColorPicker={showColorPicker}
          setShowColorPicker={setShowColorPicker}
          colorPickerRef={colorPickerRef}
          userAvatar={userAvatar}
          setUserAvatar={setUserAvatar}
          setAvatarFile={setAvatarFile}
          currentUserAvatarUrl={currentUserAvatarUrl}
          userName={userName}
          isEditingUsername={isEditingUsername}
          setIsEditingUsername={setIsEditingUsername}
          tempUsername={tempUsername}
          setTempUsername={setTempUsername}
          setUserName={setUserName}
          usernameInputRef={usernameInputRef}
          customStatus={customStatus}
          setCustomStatus={setCustomStatus}
          tempCustomStatus={tempCustomStatus}
          setTempCustomStatus={setTempCustomStatus}
          userBio={userBio}
          setUserBio={setUserBio}
          theme={theme}
          handleThemeChange={handleThemeChange}
          notificationSoundEnabled={notificationSoundEnabled}
          setNotificationSoundEnabled={setNotificationSoundEnabled}
          blockedUsers={blockedUsers}
          toggleBlockUser={toggleBlockUser}
          handleSaveSettings={handleSaveSettings}
        />
      ) : (
        <>
      <div className="flex-1 flex flex-col relative min-w-0" style={{ backgroundColor: currentTheme.bg.primary }}>
        <div className="h-12 border-b px-3 lg:px-5 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: currentTheme.bg.primary, borderColor: currentTheme.border.primary }}>
          {currentConversation ? (
            <div className="flex items-center gap-3">
              {/* Mobile Hamburger */}
              <button
                className="lg:hidden p-1.5 -ml-2 mr-1 rounded-md transition-colors"
                style={{ color: currentTheme.text.tertiary }}
                onClick={() => setShowMobileSidebar(true)}
              >
                <i className="ri-menu-line text-xl"></i>
              </button>
              {currentConversation.isGroup ? (
                // Group chat header
                <>
                  <div className="relative">
                    <img 
                      src={currentConversation.groupAvatar || `https://ui-avatars.com/api/?name=${currentConversation.groupName}&background=${currentConversation.groupAvatarColor?.replace('#', '') || '1f1f1f'}&rounded=true`}
                      alt={currentConversation.groupName}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <HiUserGroup className="text-sm" style={{ color: currentTheme.text.tertiary }} />
                    <h2 className="font-semibold text-sm font-inter" style={{ color: currentTheme.text.primary }}>
                      {currentConversation.groupName}
                    </h2>
                    <span className="text-xs sm:block hidden font-inter" style={{ color: currentTheme.text.tertiary }}>
                      ({currentConversation.participants?.length || 0} members)
                    </span>
                  </div>
                </>
              ) : (
                // DM chat header
                <>
                  <div className="relative">
                    <UserAvatar
                      user={findOtherParticipant(currentConversation?.participants || [])}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    {(() => {
                      const otherUserStatus = userStatuses.get(findOtherParticipant(currentConversation?.participants || [])?._id)?.status;
                      if (!otherUserStatus || otherUserStatus === 'offline') return null;
                      return (
                        <StatusBadge 
                          status={otherUserStatus} 
                          size="xs" 
                          borderColor={currentTheme.bg.primary}
                          className="absolute -bottom-0.5 -right-0.5"
                        />
                      );
                    })()}
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm font-inter" style={{ color: currentTheme.text.primary }}>
                      {findOtherParticipant(currentConversation?.participants || [])?.username || 'User'}
                    </h2>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* Mobile Hamburger */}
              <button
                className="lg:hidden p-1.5 -ml-2 mr-1 rounded-md transition-colors"
                style={{ color: currentTheme.text.tertiary }}
                onClick={() => setShowMobileSidebar(true)}
              >
                <i className="ri-menu-line text-xl"></i>
              </button>
              <h2 className="font-semibold text-sm font-inter" style={{ color: currentTheme.text.tertiary }}>Select a conversation</h2>
            </div>
          )}
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowMembers(!showMembers)}
              className="p-2 rounded transition-colors lg:hidden"
              style={{ color: showMembers ? currentTheme.text.primary : currentTheme.text.tertiary }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = currentTheme.bg.hover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Toggle Members"
            >
              <HiUserGroup className="text-xl" />
            </button>
            <button 
              ref={conversationMenuButtonRef}
              className="p-2 rounded cursor-pointer transition-colors" 
              style={{ color: currentTheme.text.tertiary }}
              onClick={handleConversationMenuClick}
              onMouseEnter={(e) => !showConversationMenu && (e.currentTarget.style.color = currentTheme.text.secondary)}
              onMouseLeave={(e) => !showConversationMenu && (e.currentTarget.style.color = currentTheme.text.tertiary)}
            >
              <FiMoreHorizontal className="text-xl" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div 
          ref={messagesContainerRef} 
          className="flex-1 overflow-y-auto scrollbar-thin select-text"
          onClick={() => {
            if (window.innerWidth < 1024 && activeMessageId) {
              setActiveMessageId(null);
            }
          }}
        >
          <div className="max-w-[1100px] mx-auto w-full py-4 select-text">
            {!currentConversation ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2 font-pop" style={{ color: currentTheme.text.secondary }}>No conversation selected</h3>
                  <p className="text-sm font-inter" style={{ color: currentTheme.text.tertiary }}>Choose a conversation from the sidebar to start chatting</p>
                </div>
              </div>
            ) : isLoadingConversation ? (
              <MessageSkeleton currentTheme={currentTheme} />
            ) : (
              <>
                {/* Infinite scroll sentinel with skeleton shimmer */}
                {(hasMoreMessages && messages.length > 0) && (messages.length > 29) && (
                  <div ref={messagesLoadMoreSentinelRef} aria-hidden="true">
                    <MessageSkeleton currentTheme={currentTheme} rows={14} />
                  </div>
                )}
                
                {/* Welcome Banner - only show when we've reached the beginning (no more messages to load) */}
                {((!hasMoreMessages) || (messages.length === 0 && !isLoadingConversation) || (messages.length < 29)) && (
                  <div className="px-3 lg:px-5 mb-4 mt-8">
                    <div className="max-w-[1100px] mx-auto w-full pb-4 mb-4" style={{ borderBottom: `1px solid ${currentTheme.border.primary}` }}>
                      <div className="flex select-none flex-col items-start">
                      {currentConversation.isGroup ? (
                        // Group chat welcome banner
                        <>
                          <div className="mb-4">
                            <img 
                              src={currentConversation.groupAvatar || `https://ui-avatars.com/api/?name=${currentConversation.groupName}&background=${currentConversation.groupAvatarColor?.replace('#', '') || '1f1f1f'}&rounded=true&size=80`}
                              alt={currentConversation.groupName}
                              className="w-20 h-20 rounded-full object-cover shadow-lg"
                            />
                          </div>
                          <h1 className="text-[32px] font-bold font-pop mb-2" style={{ color: currentTheme.text.primary }}>
                            {currentConversation.groupName}
                          </h1>
                          <div className="flex items-center gap-2 mb-3">
                            <HiUserGroup className="text-base" style={{ color: currentTheme.text.tertiary }} />
                            <span className="text-sm font-inter" style={{ color: currentTheme.text.tertiary }}>
                              {currentConversation.participants?.length || 0} members
                            </span>
                          </div>
                          <p className="text-sm font-inter mb-2" style={{ color: currentTheme.text.secondary }}>
                            This is the beginning of the <span className="font-semibold">{currentConversation.groupName}</span> group.
                          </p>
                        </>
                      ) : (
                        // DM welcome banner
                        (() => {
                          const otherUser = findOtherParticipant(currentConversation?.participants || []);
                          return otherUser ? (
                            <>
                              <div className="mb-4 cursor-pointer" onClick={(e) => handleProfileClick(e, otherUser, 'welcome-banner')}>
                                <UserAvatar
                                  user={otherUser}
                                  className="w-20 h-20 rounded-full object-cover shadow-lg hover:opacity-90 transition-opacity"
                                />
                              </div>
                              <h1 
                                className="text-[32px] font-bold font-pop mb-2" 
                                style={{ color: currentTheme.text.primary }}
                                // onClick={(e) => handleProfileClick(e, otherUser, 'welcome-banner')}
                              >
                                @{otherUser.username}
                              </h1>
                              <p className="text-sm font-inter" style={{ color: currentTheme.text.secondary }}>
                                This is the beginning of your direct message history with <span 
                                  className="font-semibold"
                                  // onClick={(e) => handleProfileClick(e, otherUser, 'welcome-banner')}
                                >{otherUser.username}</span>.
                              </p>
                            </>
                          ) : null;
                        })()
                      )}
                      </div>
                    </div>
                  </div>
                )}

                {messages.map((message, index) => {
              const userId = currentUser?._id;
              const isMe = message.sender._id === userId;
              const prevMsg = messages[index - 1];
              const nextMsg = messages[index + 1];
              const prevSameSender = prevMsg && prevMsg.sender._id === message.sender._id;

              const timeSinceLastMessage = prevMsg 
                ? new Date(message.createdAt) - new Date(prevMsg.createdAt)
                : Infinity;
              const hasTimeGap = timeSinceLastMessage > 420000; // 7 minutes
              
              const showAvatar = !prevSameSender || !!message.replyTo || hasTimeGap;
              const isLastInGroup = !nextMsg || nextMsg.sender._id !== message.sender._id;
              const isReplyTarget = replyingTo?._id === message._id;
              const isRepliedToMeTarget = repliedToMeIds.has(message._id);
              const isMentionedToMeTarget = mentionedToMeIds.has(message._id);
              
              return (
                <div
                  key={message._id || `${index}-${message.createdAt}`}
                  data-message-id={message._id}
                  className={`${showMoreMenu && showMoreMenu !== message._id ? '' : 'group'} px-2 lg:px-5 relative ${showAvatar ? 'mt-2.5' : ''} ${isLastInGroup ? 'mb-1' : ''} ${showMoreMenu === message._id || profilePreviewSourceId === `message-${message._id}` ? 'is-menu-active' : ''} ${isReplyTarget ? 'is-replying' : ''} ${isRepliedToMeTarget || isMentionedToMeTarget ? 'is-replied-to-me' : ''}`}
                  style={{
                    borderRadius: '6px',
                    isolation: 'isolate'
                  }}
                  data-chat-context="message"
                  onContextMenu={(e) => handleMessageContextMenu(e, message)}
                  onClick={(e) => {
                    // If mobile, toggle active state to show menu
                    if (window.innerWidth < 1024) {
                      e.stopPropagation();
                      if (activeMessageId === message._id) {
                        setActiveMessageId(null);
                      } else {
                        setActiveMessageId(message._id);
                      }
                    }
                  }}
                >
                  <div
                    className={`absolute inset-0 transition-opacity duration-0 pointer-events-none ${showMoreMenu === message._id || profilePreviewSourceId === `message-${message._id}` || activeMessageId === message._id ? 'opacity-100' : `${showMoreMenu ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}`}
                    style={{
                      // Hover background for default; special tints for reply states
                      backgroundColor: isReplyTarget
                        ? 'rgba(88, 101, 242, 0.06)'
                        : ((isRepliedToMeTarget || isMentionedToMeTarget) ? 'rgba(250, 166, 26, 0.045)' : currentTheme.bg.secondary),
                      borderRadius: '4px',
                      zIndex: 0
                    }}
                  />
                  {(isReplyTarget || isRepliedToMeTarget || isMentionedToMeTarget) && (
                    <div
                      className="absolute left-0 top-0 bottom-0 rounded pointer-events-none"
                      style={{
                        width: '2px',
                        backgroundColor: isReplyTarget ? 'rgba(88, 101, 242, 0.65)' : 'rgba(250, 166, 26, 0.45)',
                        opacity: 0.7,
                        zIndex: 1
                      }}
                    />
                  )}

                  {/* Discord-like reply reference ABOVE the entire row (avatar + username/content) */}
                  {message.replyTo && message.replyTo.sender && (
                    <div className="relative pl-14 mb-0.5 mt-1 select-text" style={{ zIndex: 1 }}>
                      
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: '18px',
                          top: '8px',
                          width: '38px',
                          height: '16px',
                          borderLeft: `1.6px solid ${currentTheme.border.secondary}`,
                          borderTop: `1.6px solid ${currentTheme.border.secondary}`,
                          borderTopLeftRadius: '8px',
                          opacity: 0.6,
                          filter: 'brightness(1.1)'
                        }}
                      />
                      <div className="flex items-center gap-2 group/reply select-text">
                        <div 
                          className="flex items-center gap-1.5 cursor-pointer select-text"
                          onClick={(e) => {
                            const replyUser = message.replyTo.sender;
                            handleProfileClick(e, replyUser, `message-${message._id}`);
                          }}
                        >
                          <UserAvatar
                            user={message.replyTo.sender}
                            className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0 select-none"
                          />
                          <span className="text-[11px] hover:underline cursor-pointer font-medium font-inter select-text" style={{ color: currentTheme.text.tertiary }}>
                            {message.replyTo.sender.username}
                          </span>
                        </div>
                        <span 
                          className="text-[11px] font-inter truncate flex-1 min-w-0 select-text" 
                          style={{ color: currentTheme.text.muted }}
                        >
                          {message.replyTo.content}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className={`relative -mx-2 px-2 select-text ${showAvatar ? 'py-0.5' : 'py-0.5'}`} style={{ zIndex: 1 }}>
                    <div className="flex gap-3 select-text">
                    <div className="w-10 flex-shrink-0 select-none">
                      {showAvatar && (
                        <UserAvatar
                          user={message.sender}
                          className="w-[2.4rem] h-[2.4rem] rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity select-none"
                          onClick={(e) => handleProfileClick(e, message.sender, `message-${message._id}`)}
                        />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 select-text">
                      {showAvatar && (
                        <div className="flex items-baseline gap-2.5 mb-[1px] select-text">
                          <div className="flex items-center gap-[0.31rem]">{/* closer crown wrapper */}
                            <span
                              className="font-medium text-[15px] font-inter cursor-pointer hover:underline select-text"
                              style={{
                                color: currentTheme.text.primary,
                                textDecorationThickness: '0.5px'
                              }}
                              onClick={(e) => handleProfileClick(e, message.sender, `message-${message._id}`)}
                            >
                              <TwemojiText text={message.sender.username} />
                            </span>

                            {message.sender.isAdmin && (
                              <span title="Admin">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#fbbf24' }}>
                                  <path d="M2.00488 19H22.0049V21H2.00488V19ZM2.00488 5L7.00488 8L12.0049 2L17.0049 8L22.0049 5V17H2.00488V5Z"></path>
                                </svg>
                              </span>
                            )}
                          </div>
                          <span className="text-xs opacity-60 font-roboto select-text" style={{ color: currentTheme.text.tertiary }}>
                            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    
                      <div 
                        className="text-[15px] leading-[1.4] font-inter break-words select-text" 
                        style={{ 
                          color: currentTheme.text.secondary,
                          opacity: (message.isPending || message.isEditPending) ? 0.5 : 1,
                          transition: 'opacity 0.2s ease'
                        }}
                      >
                        {editingMessage?._id === message._id && (
                          <div className="mt-1 mb-2 relative">
                            <TwemojiTextarea
                              textareaRef={editInputRef}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleEditKeyPress}
                              className="w-full bg-transparent border rounded px-3 py-2 text-[15px] leading-[1.4] font-inter resize-none focus:outline-none select-text"
                              style={{
                                backgroundColor: currentTheme.bg.input,
                                borderColor: currentTheme.border.primary,
                                color: currentTheme.text.secondary,
                                minHeight: '40px',
                                maxHeight: '120px',
                                padding: '0.5rem 0.75rem'
                              }}
                              rows={1}
                              currentTheme={currentTheme}
                            />
                            <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: currentTheme.text.tertiary }}>
                              <span>escape to <span 
                                className="cursor-pointer hover:underline"
                                style={{ color: currentTheme.accent }}
                                onClick={handleCancelEdit}
                              >cancel</span></span>
                              <span>•</span>
                              <span>enter to <span 
                                className="cursor-pointer hover:underline font-medium"
                                style={{ color: currentTheme.accent }}
                                onClick={handleSaveEdit}
                              >save</span></span>
                            </div>
                          </div>
                        )}

                        <MessageContent 
                          content={message.content} 
                          currentTheme={currentTheme}
                          showAvatar={showAvatar}
                          previews={message.previews || []}
                          isLast={index === messages.length - 1}
                          replyTo={message.replyTo}
                          isEdited={Boolean(message.editedAt || message.isEdited)}
                          hideTextContent={editingMessage?._id === message._id}
                          mentionUsernames={mentionHighlightUsernames}
                          conversationParticipants={currentConversation?.participants || []}
                          onMentionClick={handleProfileClick}
                        />
                      </div>
                    </div>
                    

                    <div className={`absolute ${message.replyTo ? '-top-10' : '-top-6'} right-4 transition-opacity duration-0 select-none ${showMoreMenu === message._id || profilePreviewSourceId === `message-${message._id}` || activeMessageId === message._id ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'}`}>
                      <div 
                      className="flex items-center rounded-md shadow-lg border"
                      style={{
                        backgroundColor: currentTheme.bg.primary,
                        borderColor: currentTheme.border.secondary
                      }}
                      >
                      {/* Edit button - only for own messages */}
                        {isMe && (
                          <button 
                            className="px-1.5 pl-2 py-0.5 cursor-pointer transition-colors rounded-l-md"
                            style={{ color: currentTheme.text.tertiary }}
                            onClick={() => {
                              if (isMuted) return;
                              handleEditMessage(message);
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                              e.currentTarget.style.color = currentTheme.text.primary;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = currentTheme.text.tertiary;
                            }}
                            title="Edit"
                          >
                            <i className="ri-pencil-line text-base"></i>
                          </button>
                        )}
                        
                        {/* Reply button */}
                        <button 
                          className="px-1.5 py-0.5 cursor-pointer transition-colors"
                          style={{ color: currentTheme.text.tertiary }}
                          onClick={() => {
                            // Prevent replying if muted
                            if (isMuted) return;
                            
                            setReplyingTo(message);
                            inputRef.current?.focus();
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                            e.currentTarget.style.color = currentTheme.text.primary;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = currentTheme.text.tertiary;
                          }}
                          title="Reply"
                        >
                          <i className="ri-reply-line text-base"></i>
                        </button>
                        
                        {/* More options button */}
                        <div className="relative">
                          <button 
                            ref={showMoreMenu === message._id ? moreButtonRef : null}
                            className="px-1.5 py-0.5 cursor-pointer transition-colors rounded-r-md"
                            style={{ color: currentTheme.text.tertiary }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (showMoreMenu === message._id) {
                                setShowMoreMenu(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const menuHeight = 200; // Approximate menu height
                                const spaceBelow = window.innerHeight - rect.bottom;
                                const shouldOpenUpward = spaceBelow < menuHeight + 20;
                                
                                // Position the menu so its right edge aligns to the button's right edge
                                // (opens right-to-left). Use clamping to keep it on-screen.
                                const menuWidth = 192; // matches w-48
                                let leftPos = rect.right - menuWidth;
                                const minLeft = 8;
                                const maxLeft = window.innerWidth - menuWidth - 8;
                                if (leftPos < minLeft) leftPos = minLeft;
                                if (leftPos > maxLeft) leftPos = maxLeft;

                                setMenuPosition({
                                  top: shouldOpenUpward ? undefined : rect.bottom + 8,
                                  bottom: shouldOpenUpward ? (window.innerHeight - rect.top + 8) : undefined,
                                  left: leftPos,
                                  openUpward: shouldOpenUpward
                                });
                                setShowMoreMenu(message._id);
                              }
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                              e.currentTarget.style.color = currentTheme.text.primary;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = currentTheme.text.tertiary;
                            }}
                            title="More"
                          >
                            <i className="ri-more-fill text-base"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
              </>
            )}
            <div ref={messagesEndRef} data-bottom-anchor />
          </div>

          {/* Fixed Position More Menu */}
          {(showMoreMenu || isClosingMoreMenu) && (
            <div 
              ref={moreMenuRef}
              className="fixed w-48 rounded-lg shadow-xl border overflow-hidden"
              style={{
                top: menuPosition.top != null ? `${menuPosition.top}px` : undefined,
                bottom: menuPosition.bottom != null ? `${menuPosition.bottom}px` : undefined,
                left: menuPosition.left != null ? `${menuPosition.left}px` : undefined,
                right: menuPosition.right != null ? `${menuPosition.right}px` : undefined,
                backgroundColor: currentTheme.bg.secondary,
                borderColor: currentTheme.border.secondary,
                zIndex: 100,
                animation: isClosingMoreMenu 
                  ? 'scaleOut 0.1s cubic-bezier(0.36, 0, 0.66, -0.56) forwards' 
                  : 'scaleIn 0.12s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transformOrigin: `${menuPosition.openUpward ? 'bottom right' : 'top right'}`,
                pointerEvents: isClosingMoreMenu ? 'none' : 'auto'
              }}
            >
              {messages.find(m => m._id === showMoreMenu)?.sender?._id === currentUser?._id && (
                <button
                  className="w-full px-4 py-2 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
                  style={{ color: currentTheme.text.secondary }}
                  onClick={() => {
                    if (isMuted) return;
                    const msg = messages.find(m => m._id === showMoreMenu);
                    if (msg) handleEditMessage(msg);
                    setIsClosingMoreMenu(true);
                    setTimeout(() => {
                      setShowMoreMenu(null);
                      setIsClosingMoreMenu(false);
                    }, 120);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <i className="ri-pencil-line text-base" style={{ color: currentTheme.text.tertiary }}></i>
                  Edit Message
                </button>
              )}

              <button
                className="w-full px-4 py-2 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
                style={{ color: currentTheme.text.secondary }}
                onClick={() => {
                  if (isMuted) return;
                  const msg = messages.find(m => m._id === showMoreMenu);
                  if (msg) {
                    setReplyingTo(msg);
                    inputRef.current?.focus();
                  }
                  setIsClosingMoreMenu(true);
                  setTimeout(() => {
                    setShowMoreMenu(null);
                    setIsClosingMoreMenu(false);
                  }, 120);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <i className="ri-reply-line text-base" style={{ color: currentTheme.text.tertiary }}></i>
                Reply
              </button>

              <button
                className="w-full px-4 py-2 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
                style={{ color: currentTheme.text.secondary }}
                onClick={() => {
                  const msg = messages.find(m => m._id === showMoreMenu);
                  if (msg) handleCopyText(msg);
                  setIsClosingMoreMenu(true);
                  setTimeout(() => {
                    setShowMoreMenu(null);
                    setIsClosingMoreMenu(false);
                  }, 120);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <i className="ri-file-copy-line text-base" style={{ color: currentTheme.text.tertiary }}></i>
                Copy Text
              </button>

              {/* Delete own message - shown above separator */}
              {messages.find(m => m._id === showMoreMenu)?.sender?._id === currentUser?._id && (
                <button
                  className="w-full px-4 py-2 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
                  style={{ color: '#ed4245' }}
                  onClick={() => {
                    handleOpenDeleteMessage(showMoreMenu);
                    setIsClosingMoreMenu(true);
                    setTimeout(() => {
                      setShowMoreMenu(null);
                      setIsClosingMoreMenu(false);
                    }, 120);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <i className="ri-delete-bin-line text-base"></i>
                  Delete Message
                </button>
              )}

              {/* Report message - only for other users' messages and non-admins */}
              {messages.find(m => m._id === showMoreMenu)?.sender?._id !== currentUser?._id && !currentUser?.isAdmin && (
                  <button
                  className="w-full px-4 py-2 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
                  style={{ color: '#ed4245' }}
                  onClick={() => {
                    const msg = messages.find(m => m._id === showMoreMenu);
                    if (msg) handleOpenReport(msg);
                    setIsClosingMoreMenu(true);
                    setTimeout(() => {
                      setShowMoreMenu(null);
                      setIsClosingMoreMenu(false);
                    }, 120);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <i className="ri-flag-line text-base"></i>
                  Report Message
                </button>
              )}

              {/* Admin Controls - Only shown to admins (message menu: only Mute here) */}
              {currentUser?.isAdmin && messages.find(m => m._id === showMoreMenu)?.sender?._id !== currentUser?._id && (() => {
                const msg = messages.find(m => m._id === showMoreMenu);
                if (!msg) return null;
                // Check muted state from global map
                const mutedIso = mutedUsers[msg.sender._id];
                const isUserMuted = !!mutedIso && new Date(mutedIso) > new Date();
                
                return (
                  <>
                    {/* Divider before admin section */}
                    <div className="h-px my-1" style={{ backgroundColor: currentTheme.border.primary }} />

                    {isUserMuted ? (
                      <button
                        className="w-full px-4 py-2 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
                        style={{ color: '#57f287' }}
                        onClick={() => {
                          handleUnmute(msg.sender);
                          setIsClosingMoreMenu(true);
                          setTimeout(() => {
                            setShowMoreMenu(null);
                            setIsClosingMoreMenu(false);
                          }, 120);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <i className="ri-volume-up-line text-base"></i>
                        Unmute User
                      </button>
                    ) : (
                      <button
                        className="w-full px-4 py-2 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
                        style={{ color: '#ed4245' }}
                        onClick={() => {
                          // Close the action menu with animation, then open mute modal
                          setIsClosingMoreMenu(true);
                          setTimeout(() => {
                            setShowMoreMenu(null);
                            setIsClosingMoreMenu(false);
                            setMuteTargetUser(msg.sender);
                            setMuteDuration('60s');
                            setShowMuteModal(true);
                          }, 120);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <i className="ri-volume-mute-line text-base"></i>
                        Mute User
                      </button>
                    )}

                    {/* Admin delete other user's message */}
                    <button
                      className="w-full px-4 py-2 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
                      style={{ color: '#ed4245' }}
                      onClick={() => {
                        handleOpenDeleteMessage(showMoreMenu);
                        setIsClosingMoreMenu(true);
                        setTimeout(() => {
                          setShowMoreMenu(null);
                          setIsClosingMoreMenu(false);
                        }, 120);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <i className="ri-delete-bin-line text-base"></i>
                      Delete Message
                    </button>
                  </>
                );
              })()}
            </div>
          )}

          {/* Conversation Menu */}
          {(showConversationMenu || isClosingConversationMenu) && (
            <div 
              ref={conversationMenuRef}
              className="absolute w-52 rounded-lg shadow-xl border overflow-hidden"
              key={`conv-menu-${currentConversation?._id}-${bannedUsersStamp}`}
              style={{
                top: `${conversationMenuPosition.top}px`,
                right: `${conversationMenuPosition.right}px`,
                backgroundColor: currentTheme.bg.secondary,
                borderColor: currentTheme.border.secondary,
                zIndex: 100,
                animation: isClosingConversationMenu 
                  ? 'scaleOut 0.1s cubic-bezier(0.36, 0, 0.66, -0.56) forwards'
                  : 'scaleIn 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transformOrigin: 'top right',
                pointerEvents: isClosingConversationMenu ? 'none' : 'auto'
              }}
            >
              <button
                className="w-full px-4 py-2.5 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
                style={{ color: currentTheme.text.secondary }}
                onClick={handleNotificationSettings}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <FiBell className="text-base" style={{ color: currentTheme.text.tertiary }} />
                Notification Settings
              </button>

              {/* Update Group - moved into admin-only section below */}

              {/* Delete chat - DMs: any participant, Groups: admins only */}
              {(currentConversation?.isGroup ? currentUser?.isAdmin : true) && (
                <button
                  className="w-full px-4 py-2.5 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
                  style={{ color: '#ed4245' }}
                  onClick={handleDeleteConversation}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <FiTrash2 className="text-base" />
                  Delete Chat
                </button>
              )}

              {/* Divider before admin controls */}
              {currentUser?.isAdmin && (
                <div className="h-px my-1" style={{ backgroundColor: currentTheme.border.primary }} />
              )}

              {/* Admin Controls - Only for DMs (not groups) */}
              {currentUser?.isAdmin && currentConversation && !currentConversation.isGroup && (() => {
                const otherUser = findOtherParticipant(currentConversation?.participants || []);
                if (otherUser) {
                  const otherUserId = normalizeId(otherUser._id);
                  const mutedIso = mutedUsers[otherUserId];
                  const isUserMuted = !!mutedIso && new Date(mutedIso) > new Date();
                  const isUserBanned = !!(otherUserId && bannedUsers[otherUserId]);
                  
                  return (
                    <>
                      
                      {isUserBanned ? (
                        <button
                          className="w-full px-4 py-2.5 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
                          style={{ color: '#57f287' }}
                          onClick={() => {
                            handleUnban(otherUser);
                            setIsClosingConversationMenu(true);
                            setTimeout(() => {
                              setShowConversationMenu(false);
                              setIsClosingConversationMenu(false);
                            }, 150);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <i className="ri-shield-check-line text-base"></i>
                          Unban User
                        </button>
                      ) : (
                        <button
                          className="w-full px-4 py-2.5 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
                          style={{ color: '#ed4245' }}
                          onClick={() => {
                            setIsClosingConversationMenu(true);
                            setTimeout(() => {
                              setShowConversationMenu(false);
                              setIsClosingConversationMenu(false);
                              setBanTargetUser(otherUser);
                              setShowBanModal(true);
                            }, 150);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <i className="ri-forbid-line text-base"></i>
                          Ban User
                        </button>
                      )}

                      {isUserMuted ? (
                        <button
                          className="w-full px-4 py-2.5 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
                          style={{ color: '#57f287' }}
                          onClick={() => {
                            handleUnmute(otherUser);
                            setIsClosingConversationMenu(true);
                            setTimeout(() => {
                              setShowConversationMenu(false);
                              setIsClosingConversationMenu(false);
                            }, 150);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <i className="ri-volume-up-line text-base"></i>
                          Unmute User
                        </button>
                      ) : (
                        <button
                          className="w-full px-4 py-2.5 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
                          style={{ color: '#ed4245' }}
                          onClick={() => {
                            console.log('Mute user (opening modal):', otherUser.username);
                            // Close conversation menu then open mute modal
                            setIsClosingConversationMenu(true);
                            setTimeout(() => {
                              setShowConversationMenu(false);
                              setIsClosingConversationMenu(false);
                              setMuteTargetUser(otherUser);
                              setMuteDuration('60s');
                              setShowMuteModal(true);
                            }, 120);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <i className="ri-volume-mute-line text-base"></i>
                          Mute User
                        </button>
                      )}
                    </>
                  );
                }
                return null;
                })()}

              {/* Update Group - Only for admins and groups (placed inside admin section) */}
              {currentUser?.isAdmin && currentConversation && currentConversation.isGroup && (
                <>
                  <button
                    className="w-full px-4 py-2.5 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
                    style={{ color: currentTheme.text.secondary }}
                    onClick={() => {
                      setIsClosingConversationMenu(true);
                      setTimeout(() => {
                        setShowConversationMenu(false);
                        setIsClosingConversationMenu(false);
                        setUpdateGroupName(currentConversation.groupName || '');
                        setUpdateGroupAvatar('');
                        setUpdateGroupAvatarFile(null);
                        setShowUpdateGroupModal(true);
                      }, 120);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <i className="ri-edit-line text-base" style={{ color: currentTheme.text.tertiary }}></i>
                    Update Group
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Typing Indicator - Above Message Input */}
        <TypingIndicator 
          typingUsers={typingUsers}
          currentConversation={currentConversation}
          currentTheme={currentTheme}
        />

        {/* Message Input - Discord Style */}
        <div className="flex-shrink-0 px-2 lg:px-5 pb-4" style={{ backgroundColor: currentTheme.bg.primary }}>
          <div className="max-w-[1100px] mx-auto">
            {/* Muted Notice for Groups */}
            {isMuted && currentConversation?.isGroup && mutedUntil && (
              <div 
                className="border rounded-lg px-4 py-4 flex items-center gap-3"
                style={{
                  backgroundColor: currentTheme.bg.tertiary,
                  borderColor: currentTheme.border.primary,
                }}
              >
                <i className="ri-volume-mute-fill text-2xl flex-shrink-0" style={{ color: currentTheme.text.tertiary }} />
                <div className="flex-1">
                  <p className="text-sm font-semibold font-inter mb-0.5" style={{ color: currentTheme.text.primary }}>
                    You have been timed out
                  </p>
                  <p className="text-xs font-inter" style={{ color: currentTheme.text.tertiary }}>
                    You cannot send messages in groups until <MuteCountdown 
                      mutedUntil={mutedUntil} 
                      onExpire={() => {
                        setIsMuted(false);
                        setMutedUntil(null);
                      }} 
                    />
                  </p>
                </div>
              </div>
            )}

            {(!isMuted || !currentConversation?.isGroup) && (
              <>
                {replyingTo && (
                  <div 
                    className="flex items-center gap-2.5 rounded-t-lg px-3 py-2"
                    style={{ 
                      backgroundColor: currentTheme.bg.tertiary,
                    }}
                  >
                    <i className="ri-corner-up-right-line text-sm flex-shrink-0" style={{ color: currentTheme.text.muted }}></i>
                    <UserAvatar
                      user={replyingTo.sender}
                      className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                    />

                    <span className="text-xs font-medium font-inter truncate" style={{ color: currentTheme.text.tertiary, maxWidth: '60%' }}>
                      Replying to {replyingTo.sender?.username || 'User'}
                    </span>

                    <div className="flex-1" />

                    <button
                      onClick={() => setReplyingTo(null)}
                      className="p-0.5 cursor-pointer rounded transition-colors flex-shrink-0"
                      style={{ color: currentTheme.text.muted }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = currentTheme.text.primary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = currentTheme.text.muted;
                      }}
                    >
                      <FiX className="text-sm" />
                    </button>
                  </div>
                )}
                
                <div 
                  className={`border rounded-lg px-4 py-3.5 transition-colors flex items-end gap-2 ${replyingTo ? 'rounded-t-none' : ''}`}
                  style={{
                    backgroundColor: currentTheme.bg.tertiary,
                    borderColor: currentTheme.border.primary,
                  }}
                >
                  <div className="flex gap-1 cursor-pointer items-center">
                    <div className="relative" ref={emojiPickerRef}>
                      <button 
                        className="p-0.5 cursor-pointer pr-1.5 rounded-md transition-colors flex-shrink-0 mb-0.5"
                        style={{ color: showEmojiPicker ? currentTheme.text.primary : currentTheme.text.tertiary }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowEmojiPicker(!showEmojiPicker);
                          setShowGifPicker(false); // Close gif picker if open
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = currentTheme.text.primary;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = showEmojiPicker ? currentTheme.text.primary : currentTheme.text.tertiary;
                        }}
                        title="Emoji Picker"
                      >
                        <BsEmojiSmile className="text-lg" />
                      </button>

                      {showEmojiPicker && (
                        <div 
                          className="absolute bottom-full mb-6 left-0 z-50"
                          style={{
                            animation: 'scaleIn 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            transformOrigin: 'bottom left'
                          }}
                        >
                          <EmojiPicker
                            onEmojiClick={(emojiData) => {
                              setInputValue(prev => prev + emojiData.emoji);
                              inputRef.current?.focus();
                            }}
                            theme={theme === 'light' ? 'light' : 'dark'}
                            searchDisabled={false}
                            skinTonesDisabled={true}
                            width={343}
                            height={435}
                            previewConfig={{ showPreview: false }}
                            lazyLoadEmojis={true}
                            emojiStyle="twitter"
                            style={{
                              '--epr-bg-color': currentTheme.bg.secondary,
                              '--epr-category-label-bg-color': currentTheme.bg.secondary,
                              '--epr-category-navigation-button-size': '28px',
                            '--epr-text-color': currentTheme.text.primary,
                            '--epr-search-input-bg-color': currentTheme.bg.tertiary,
                            '--epr-search-input-text-color': currentTheme.text.secondary,
                            '--epr-search-border-color': currentTheme.border.primary,
                            '--epr-hover-bg-color': currentTheme.bg.hover,
                            '--epr-focus-bg-color': currentTheme.bg.hover,
                            '--epr-highlight-color': 'none',
                            '--epr-category-icon-active-color': 'none',
                            '--epr-skin-tone-picker-menu-color': currentTheme.bg.tertiary,
                            border: `1px solid ${currentTheme.border.secondary}`,
                            borderRadius: '12px',
                            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
                          }}
                        />
                      </div>
                    )}
                  </div>

                </div>
                  
                  <div className="flex-1 relative">
                    <TwemojiTextarea
                      textareaRef={inputRef}
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyPress}
                      placeholder={currentConversation ? `Message @${findOtherParticipant(currentConversation?.participants || [])?.username || 'User'}` : 'Select a conversation to start messaging'}
                      disabled={!currentConversation}
                      className="w-full bg-transparent focus:outline-none text-[15px] resize-none font-inter leading-[1.375] py-0.5 select-text"
                      rows={1}
                      style={{ maxHeight: '120px', minHeight: '24px', color: currentTheme.text.secondary, opacity: currentConversation ? 1 : 0.5 }}
                      currentTheme={currentTheme}
                    />
                    {mentionState.isOpen && currentConversation && mentionSuggestionUsers.length > 0 && (
                      <div className="absolute bottom-full left-0 mb-2 w-72 z-20">
                        <div
                          className="rounded-xl border shadow-2xl overflow-hidden"
                          style={{
                            backgroundColor: currentTheme.bg.secondary,
                            borderColor: currentTheme.border.primary,
                            boxShadow: '0 12px 30px rgba(0,0,0,0.35)'
                          }}
                        >
                          <div
                            className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider"
                            style={{
                              borderBottom: `1px solid ${currentTheme.border.primary}`,
                              color: currentTheme.text.tertiary,
                              letterSpacing: '0.08em'
                            }}
                          >
                            Mentions
                          </div>
                          {(!mentionState.query || mentionState.query.length < MENTION_MIN_CHARS) && (
                            <div className="px-3 py-3 text-sm" style={{ color: currentTheme.text.secondary }}>
                              Type at least {MENTION_MIN_CHARS} characters to find someone in this chat.
                            </div>
                          )}
                          {mentionState.query?.length >= MENTION_MIN_CHARS && mentionSuggestions.length === 0 && (
                            <div className="px-3 py-3 text-sm" style={{ color: currentTheme.text.secondary }}>
                              No members match “{mentionState.query}”.
                            </div>
                          )}
                          {mentionState.query?.length >= MENTION_MIN_CHARS && mentionSuggestions.length > 0 && (
                            <div className="max-h-[320px] overflow-y-auto py-1.5 px-1.5">
                              {mentionSuggestions.map((user, idx) => {
                                const isActive = idx === mentionState.selectedIndex;
                                return (
                                  <button
                                    key={user._id}
                                    type="button"
                                    className="w-full cursor-pointer px-3 py-2 flex items-center gap-2.5 text-left transition-all duration-150 rounded-md mb-0.5"
                                    style={{
                                      backgroundColor: isActive ? 'rgba(88, 101, 242, 0.15)' : 'transparent',
                                      color: currentTheme.text.primary,
                                      border: isActive ? '1px solid rgba(88, 101, 242, 0.3)' : '1px solid transparent'
                                    }}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleMentionSelect(user)}
                                    onMouseEnter={() => setMentionState(prev => prev.selectedIndex === idx ? prev : ({ ...prev, selectedIndex: idx }))}
                                  >
                                    <UserAvatar user={user} className="w-5 h-5 rounded-full flex-shrink-0 ring-1 ring-black/10" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[13.5px] font-medium truncate font-inter">
                                        <TwemojiText text={user.username} />
                                      </div>
                                      {user.customStatus && (
                                        <div className="text-xs truncate opacity-70 mt-0.5 font-inter" style={{ color: currentTheme.text.tertiary }}>
                                          <TwemojiText text={user.customStatus} size="1.1em" />
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Desktop: GIF Picker */}
                  <div className="relative hidden lg:block" ref={gifPickerRef}>
                    <button 
                      className="p-0.5 cursor-pointer pl-1.5 rounded-md transition-colors flex-shrink-0 mb-0.5"
                      style={{ color: showGifPicker ? currentTheme.text.primary : currentTheme.text.tertiary }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowGifPicker(!showGifPicker);
                        setShowEmojiPicker(false); // Close emoji picker if open
                      }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = currentTheme.text.primary;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = currentTheme.text.tertiary;
                        }}
                      title="GIF Picker"
                    >
                      <HiGif className="text-2xl" />
                    </button>

                    {showGifPicker && (
                      <div 
                        className="absolute bottom-full mb-6 right-0 z-50"
                        style={{
                          animation: 'scaleIn 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          transformOrigin: 'bottom right'
                        }}
                      >
                        <TenorPicker
                          currentTheme={currentTheme}
                          onGifSelect={(gifUrl) => {
                            setInputValue(prev => prev + (prev ? ' ' : '') + gifUrl);
                            setShowGifPicker(false);
                            inputRef.current?.focus();
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Mobile: Send Button */}
                  <button
                    className="lg:hidden p-0.5 cursor-pointer pl-1.5 rounded-md transition-colors flex-shrink-0 mb-0.5"
                    style={{ 
                      color: inputValue.trim() ? currentTheme.text.primary : currentTheme.text.tertiary,
                      opacity: inputValue.trim() ? 1 : 0.5
                    }}
                    onClick={() => {
                      if (inputValue.trim()) {
                        handleSendMessage();
                      }
                    }}
                    disabled={!inputValue.trim() || !currentConversation}
                    title="Send Message"
                  >
                    <IoSend className="text-xl" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Member List - Always visible unless settings open */}
      {!showSettings && (
        <div className="hidden lg:flex w-[280px] border-l flex-col" style={{ backgroundColor: currentTheme.bg.secondary, borderColor: currentTheme.border.primary }}>
          <div className="h-12 px-5 flex items-center border-b flex-shrink-0" style={{ borderColor: currentTheme.border.primary }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider font-pop" style={{ color: currentTheme.text.tertiary }}>Members — {allUsers.length}</h3>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
            {isLoading && allUsers.length === 0 ? (
              <MemberSkeleton currentTheme={currentTheme} />
            ) : (
              <>
            {onlineMembers.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-2 px-2 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold font-pop" style={{ color: currentTheme.text.tertiary }}>
                    Online — {onlineMembers.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {onlineMembers.map(member => (
                    <MemberItem
                      key={member._id}
                      member={member}
                      onProfileClick={handleProfileClick}
                      onContextMenu={handleMemberContextMenu}
                      profilePreviewSourceId={profilePreviewSourceId}
                      currentTheme={currentTheme}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Offline Members */}
            {offlineMembers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-2 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold font-pop" style={{ color: currentTheme.text.tertiary }}>
                    Offline — {offlineMembers.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {offlineMembers.map(member => (
                    <MemberItem
                      key={member._id}
                      member={member}
                      onProfileClick={handleProfileClick}
                      onContextMenu={handleMemberContextMenu}
                      profilePreviewSourceId={profilePreviewSourceId}
                      currentTheme={currentTheme}
                    />
                  ))}
                </div>
              </div>
            )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Member List Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${
          showMembers && !showSettings ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowMembers(false)}
      />

      <div 
        className={`fixed inset-y-0 right-0 z-50 w-[85%] max-w-[280px] flex flex-col shadow-2xl lg:hidden transition-transform duration-300 ease-in-out ${
          showMembers && !showSettings ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ backgroundColor: currentTheme.bg.secondary, borderColor: currentTheme.border.primary }}
      >
          <div className="h-12 px-5 flex items-center border-b flex-shrink-0" style={{ borderColor: currentTheme.border.primary }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider font-pop" style={{ color: currentTheme.text.tertiary }}>Members — {allUsers.length}</h3>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
            {isLoading && allUsers.length === 0 ? (
              <MemberSkeleton currentTheme={currentTheme} />
            ) : (
              <>
            {onlineMembers.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-2 px-2 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold font-pop" style={{ color: currentTheme.text.tertiary }}>
                    Online — {onlineMembers.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {onlineMembers.map(member => (
                    <MemberItem
                      key={member._id}
                      member={member}
                      onProfileClick={handleProfileClick}
                      onContextMenu={handleMemberContextMenu}
                      profilePreviewSourceId={profilePreviewSourceId}
                      currentTheme={currentTheme}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Offline Members */}
            {offlineMembers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-2 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold font-pop" style={{ color: currentTheme.text.tertiary }}>
                    Offline — {offlineMembers.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {offlineMembers.map(member => (
                    <MemberItem
                      key={member._id}
                      member={member}
                      onProfileClick={handleProfileClick}
                      onContextMenu={handleMemberContextMenu}
                      profilePreviewSourceId={profilePreviewSourceId}
                      currentTheme={currentTheme}
                    />
                  ))}
                </div>
              </div>
            )}
              </>
            )}
          </div>
        </div>

      {/* Member Menu */}
      {(showMemberMenu || isClosingMemberMenu) && (() => {
        const member = allUsers.find(u => u._id === showMemberMenu);
        if (!member) return null;

        const memberId = normalizeId(member._id);
        const mutedIso = mutedUsers[memberId];
        const isUserMuted = !!mutedIso && new Date(mutedIso) > new Date();
        const isUserBanned = !!(memberId && bannedUsers[memberId]);

        return (
          <div data-member-menu>
            <MemberMenu
              show={showMemberMenu || isClosingMemberMenu}
              isClosing={isClosingMemberMenu}
              position={memberMenuPosition}
              member={member}
              currentUser={currentUser}
              isAdmin={currentUser?.isAdmin}
              onNotificationSettings={() => {
                setIsClosingMemberMenu(true);
                setTimeout(() => {
                  setShowMemberMenu(null);
                  setIsClosingMemberMenu(false);
                  // Create or select conversation first
                  createDirectConversation(member._id).then(conv => {
                    if (conv && (conv._id || conv.urlId)) {
                      selectConversation(conv);
                      setShowNotificationModal(true);
                    }
                  });
                }, 120);
              }}
              onBan={() => {
                setIsClosingMemberMenu(true);
                setTimeout(() => {
                  setShowMemberMenu(null);
                  setIsClosingMemberMenu(false);
                  setBanTargetUser(member);
                  setShowBanModal(true);
                }, 120);
              }}
              onUnban={() => {
                handleUnban(member);
                setIsClosingMemberMenu(true);
                setTimeout(() => {
                  setShowMemberMenu(null);
                  setIsClosingMemberMenu(false);
                }, 120);
              }}
              onMute={() => {
                setIsClosingMemberMenu(true);
                setTimeout(() => {
                  setShowMemberMenu(null);
                  setIsClosingMemberMenu(false);
                  setMuteTargetUser(member);
                  setMuteDuration('60s');
                  setShowMuteModal(true);
                }, 120);
              }}
              onUnmute={() => {
                handleUnmute(member);
                setIsClosingMemberMenu(true);
                setTimeout(() => {
                  setShowMemberMenu(null);
                  setIsClosingMemberMenu(false);
                }, 120);
              }}
              currentTheme={currentTheme}
              menuRef={(ref) => setMemberMenuRef(ref)}
              isBanned={isUserBanned}
              isMuted={isUserMuted}
            />
          </div>
        );
      })()}

      </>
      )}

      {/* Report Modal */}
      <ReportModal
        showModal={showReportModal}
        isClosing={isClosingReportModal}
        onClose={() => {
          setIsClosingReportModal(true);
          setTimeout(() => {
            setShowReportModal(false);
            setIsClosingReportModal(false);
            setReportReason("");
            setReportDetails("");
          }, 150);
        }}
        reportReason={reportReason}
        setReportReason={setReportReason}
        reportDetails={reportDetails}
        setReportDetails={setReportDetails}
        onSubmit={handleSubmitReport}
        currentTheme={currentTheme}
        isLoading={isSubmittingReport}
      />

      {/* Mute User Modal */}
      <MuteModal
        showModal={showMuteModal}
        isClosing={isClosingMuteModal}
        currentTheme={currentTheme}
        targetUser={muteTargetUser}
        duration={muteDuration}
        setDuration={setMuteDuration}
        onClose={closeMuteModal}
        onSubmit={handleSubmitMute}
        isLoading={isMuting}
      />

      {/* Ban User Modal */}
      <BanModal
        showModal={showBanModal}
        isClosing={isClosingBanModal}
        currentTheme={currentTheme}
        targetUser={banTargetUser}
        onClose={() => {
          setIsClosingBanModal(true);
          setTimeout(() => {
            setShowBanModal(false);
            setIsClosingBanModal(false);
          }, 150);
        }}
        onConfirm={async () => {
          if (!banTargetUser) return;
          try {
            setIsBanning(true);
            const result = await chatService.banUser(token, banTargetUser._id);
            if (result.success) {
              toast.success(result.message || `${banTargetUser.username} has been banned`);
              // Add to bannedUsers state
              setBannedUsers(prev => {
                const userId = normalizeId(banTargetUser._id);
                if (!userId) return prev;
                const updated = { ...prev, [userId]: true };
                return updated;
              });
            } else {
              toast.error(result.message || 'Failed to ban user');
            }
          } catch (err) {
            toast.error('Failed to ban user');
          } finally {
            setIsBanning(false);
          }

          setIsClosingBanModal(true);
          setTimeout(() => {
            setShowBanModal(false);
            setIsClosingBanModal(false);
          }, 150);
        }}
        isLoading={isBanning}
      />

      {/* Delete Message Modal */}
      <DeleteMessageModal
        showModal={showDeleteMessageModal}
        isClosing={isClosingDeleteMessageModal}
        currentTheme={currentTheme}
        onClose={handleCancelDeleteMessage}
        onConfirm={handleConfirmDeleteMessage}
        isDeleting={isDeletingMessage}
        isOwnMessage={messages.find(m => m._id === deletingMessageId)?.sender?._id === currentUser?._id}
      />

      <ProfilePreview
        show={showProfilePreview}
        isAnimating={profilePreviewAnimating}
        isLoading={profilePreviewLoading}
        position={profilePreviewPosition}
        user={previewUser}
        currentUser={currentUser}
        currentTheme={currentTheme}
        onClose={handleCloseProfilePreview}
        onMessage={async () => {
          if (previewUser && previewUser._id !== currentUser?._id) {
            // createDirectConversation returns the conversation object (or null)
            const conv = await createDirectConversation(previewUser._id);
            if (conv && (conv._id || conv.urlId)) {
              // ensure conversation is selected in UI
              selectConversation(conv);

              // update URL to include the conversation id (prefer urlId)
              if (typeof window !== 'undefined') {
                const urlId = conv.urlId || conv._id;
                // only push state if urlId exists
                if (urlId) window.history.pushState(null, '', `/chat/${urlId}`);
              }

              // close the preview after navigation
              handleCloseProfilePreview();
            }
          }
        }}
        onViewProfile={() => {
          handleCloseProfilePreview();
        }}
        onBan={() => {
          handleCloseProfilePreview();
          setTimeout(() => {
            setBanTargetUser(previewUser);
            setShowBanModal(true);
          }, 160);
        }}
        onMute={() => {
          handleCloseProfilePreview();
          setTimeout(() => {
            setMuteTargetUser(previewUser);
            setMuteDuration('60s');
            setShowMuteModal(true);
          }, 160);
        }}
        onUnmute={() => {
          handleCloseProfilePreview();
          if (previewUser) {
            handleUnmute(previewUser);
          }
        }}
        onUnban={() => {
          handleCloseProfilePreview();
          if (previewUser) {
            handleUnban(previewUser);
          }
        }}
        onNotificationSettings={() => {
          handleCloseProfilePreview();
          setTimeout(() => {
            setShowNotificationModal(true);
          }, 160);
        }}
        mutedUsers={mutedUsers}
        isAdmin={currentUser?.isAdmin}
        isBanned={previewUser && bannedUsers[normalizeId(previewUser._id)]}
        fromCache={profilePreviewFromCache}
      />

      {/* Notification Settings Modal */}
      <NotificationModal
        showModal={showNotificationModal}
        isClosing={isClosingNotificationModal}
    currentTheme={currentTheme}
    conversationName={currentConversation?.isGroup ? currentConversation.groupName : findOtherParticipant(currentConversation?.participants || [])?.username}
        preference={notificationPreference}
        setPreference={setNotificationPreference}
        onClose={closeNotificationModal}
        onSave={async () => {
          try {
            // Save notification preference to backend
            const response = await fetch(`${config.url}/api/chat/notification-preference`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                token,
                conversationId: currentConversation._id,
                preference: notificationPreference
              }),
            });

            const data = await response.json();

            if (data.success) {
              toast.success('Notification settings saved');
            } else {
              toast.error(data.message || 'Failed to save settings');
            }
          } catch (error) {
            console.error('Error saving notification preference:', error);
            toast.error('Failed to save settings');
          }
          closeNotificationModal();
        }}
      />

      {/* Group Creation Modal */}
      <GroupModal
        showModal={showGroupModal}
        isClosing={isClosingGroupModal}
        currentTheme={currentTheme}
        groupName={groupName}
        setGroupName={setGroupName}
        groupAvatar={groupAvatar}
        setGroupAvatar={setGroupAvatar}
        groupAvatarFile={groupAvatarFile}
        setGroupAvatarFile={setGroupAvatarFile}
        isCreating={isCreatingGroup}
        onClose={closeGroupModal}
        onCreate={handleCreateGroup}
      />

      {/* Update Group Modal */}
      <UpdateGroupModal
        showModal={showUpdateGroupModal}
        isClosing={isClosingUpdateGroupModal}
        currentTheme={currentTheme}
        groupName={updateGroupName}
        setGroupName={setUpdateGroupName}
        groupAvatar={updateGroupAvatar}
        setGroupAvatar={setUpdateGroupAvatar}
        groupAvatarFile={updateGroupAvatarFile}
        setGroupAvatarFile={setUpdateGroupAvatarFile}
        currentGroupAvatar={currentConversation?.groupAvatar}
        isUpdating={isUpdatingGroup}
        onClose={closeUpdateGroupModal}
        onUpdate={handleUpdateGroup}
      />

      {/* Delete Group Chat Modal */}
      <DeleteGroupModal
        showModal={showDeleteGroupModal}
        isClosing={isClosingDeleteGroupModal}
        onClose={() => {
          setIsClosingDeleteGroupModal(true);
          setTimeout(() => {
            setShowDeleteGroupModal(false);
            setIsClosingDeleteGroupModal(false);
          }, 150);
        }}
        groupName={currentConversation?.groupName || 'this group'}
        onConfirm={handleConfirmDeleteConversation}
        currentTheme={currentTheme}
        isDeleting={isDeletingConversation}
      />

      {/* Delete Direct Message Modal */}
      <DeleteDMModal
        showModal={showDeleteDMModal}
        isClosing={isClosingDeleteDMModal}
        onClose={() => {
          setIsClosingDeleteDMModal(true);
          setTimeout(() => {
            setShowDeleteDMModal(false);
            setIsClosingDeleteDMModal(false);
          }, 150);
        }}
        userName={findOtherParticipant(currentConversation?.participants || [])?.username || 'this user'}
        onConfirm={handleConfirmDeleteConversation}
        currentTheme={currentTheme}
        isDeleting={isDeletingConversation}
      />

      {/* Sidebar Conversation Context Menu - Global Fixed Position */}
      {(showConvoListMenu || isClosingConvoListMenu) && (
        <div
          ref={convoListMenuRef}
          className="fixed w-52 rounded-lg shadow-xl border overflow-hidden"
          key={`convo-list-menu-${showConvoListMenu}-${bannedUsersStamp}`}
          style={{
            top: `${convoListMenuPosition.top}px`,
            left: `${convoListMenuPosition.left}px`,
            backgroundColor: currentTheme.bg.secondary,
            borderColor: currentTheme.border.secondary,
            zIndex: 200,
            animation: isClosingConvoListMenu
              ? 'scaleOut 0.1s cubic-bezier(0.36, 0, 0.66, -0.56) forwards'
              : 'scaleIn 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transformOrigin: 'top left',
            pointerEvents: isClosingConvoListMenu ? 'none' : 'auto'
          }}
        >
          <button
            className="w-full px-4 py-2.5 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
            style={{ color: currentTheme.text.secondary }}
            onClick={() => {
              const conv = conversations.find(c => c._id === showConvoListMenu);
              if (conv) handleConversationSelect(conv);
              setIsClosingConvoListMenu(true);
              setTimeout(() => {
                setShowConvoListMenu(null);
                setIsClosingConvoListMenu(false);
              }, 120);
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = currentTheme.bg.hover; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <i className="ri-chat-3-line text-base" style={{ color: currentTheme.text.tertiary }}></i>
            Open Chat
          </button>

          <button
            className="w-full px-4 py-2.5 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
            style={{ color: currentTheme.text.secondary }}
            onClick={() => {
              const conv = conversations.find(c => c._id === showConvoListMenu);
              if (conv) handleConversationSelect(conv);
              setShowNotificationModal(true);
              setIsClosingConvoListMenu(true);
              setTimeout(() => {
                setShowConvoListMenu(null);
                setIsClosingConvoListMenu(false);
              }, 120);
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = currentTheme.bg.hover; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <FiBell className="text-base" style={{ color: currentTheme.text.tertiary }} />
            Notification Settings
          </button>

          {/* Update Group - Only for admins and groups */}
          {currentUser?.isAdmin && (() => {
            const conv = conversations.find(c => c._id === showConvoListMenu);
            const isGroup = conv?.isGroup;
            
            if (isGroup) {
              return (
                <>
                  <div className="h-px my-1" style={{ backgroundColor: currentTheme.border.primary }} />
                  <button
                    className="w-full px-4 py-2.5 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
                    style={{ color: currentTheme.text.secondary }}
                    onClick={() => {
                      const conv = conversations.find(c => c._id === showConvoListMenu);
                      if (conv) handleConversationSelect(conv);
                      setIsClosingConvoListMenu(true);
                      setTimeout(() => {
                        setShowConvoListMenu(null);
                        setIsClosingConvoListMenu(false);
                        setUpdateGroupName(conv.groupName || '');
                        setUpdateGroupAvatar('');
                        setUpdateGroupAvatarFile(null);
                        setShowUpdateGroupModal(true);
                      }, 120);
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = currentTheme.bg.hover; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <i className="ri-edit-line text-base" style={{ color: currentTheme.text.tertiary }}></i>
                    Update Group
                  </button>
                </>
              );
            }
            return null;
          })()}

          {/* Admin Controls - Only for DMs (not groups) and only for admins */}
          {currentUser?.isAdmin && (() => {
            const conv = conversations.find(c => c._id === showConvoListMenu);
            const isGroup = conv?.isGroup;
            const otherUser = findOtherParticipant(conv?.participants || []);
            
            if (!isGroup && otherUser) {
              const otherUserId = normalizeId(otherUser._id);
              const mutedIso = mutedUsers[otherUserId];
              const isUserMuted = !!mutedIso && new Date(mutedIso) > new Date();
              const isUserBanned = !!(otherUserId && bannedUsers[otherUserId]);
              
              return (
                <>
                  <div className="h-px my-1" style={{ backgroundColor: currentTheme.border.primary }} />
                  
                  {isUserBanned ? (
                    <button
                      className="w-full px-4 py-2.5 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
                      style={{ color: '#57f287' }}
                      onClick={() => {
                        handleUnban(otherUser);
                        setIsClosingConvoListMenu(true);
                        setTimeout(() => {
                          setShowConvoListMenu(null);
                          setIsClosingConvoListMenu(false);
                        }, 120);
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = currentTheme.bg.hover; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <i className="ri-shield-check-line text-base"></i>
                      Unban User
                    </button>
                  ) : (
                    <button
                      className="w-full px-4 py-2.5 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
                      style={{ color: '#ed4245' }}
                      onClick={() => {
                        setIsClosingConvoListMenu(true);
                        setTimeout(() => {
                          setShowConvoListMenu(null);
                          setIsClosingConvoListMenu(false);
                          setBanTargetUser(otherUser);
                          setShowBanModal(true);
                        }, 120);
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = currentTheme.bg.hover; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <i className="ri-forbid-line text-base"></i>
                      Ban User
                    </button>
                  )}

                  {isUserMuted ? (
                    <button
                      className="w-full px-4 py-2.5 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
                      style={{ color: '#57f287' }}
                      onClick={() => {
                        handleUnmute(otherUser);
                        setIsClosingConvoListMenu(true);
                        setTimeout(() => {
                          setShowConvoListMenu(null);
                          setIsClosingConvoListMenu(false);
                        }, 120);
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = currentTheme.bg.hover; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <i className="ri-volume-up-line text-base"></i>
                      Unmute User
                    </button>
                  ) : (
                    <button
                      className="w-full px-4 py-2.5 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
                      style={{ color: '#ed4245' }}
                      onClick={() => {
                        // Close convo-list menu then open mute modal for the other user
                        setIsClosingConvoListMenu(true);
                        setTimeout(() => {
                          setShowConvoListMenu(null);
                          setIsClosingConvoListMenu(false);
                          setMuteTargetUser(otherUser);
                          setMuteDuration('60s');
                          setShowMuteModal(true);
                        }, 120);
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = currentTheme.bg.hover; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <i className="ri-volume-mute-line text-base"></i>
                      Mute User
                    </button>
                  )}
                </>
              );
            }
            return null;
          })()}

          {(() => {
            const currentConv = conversations.find(c => c._id === showConvoListMenu);
            return currentConv ? (currentConv.isGroup ? currentUser?.isAdmin : true) : false;
          })() && (
            <button
              className="w-full px-4 py-2.5 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
              style={{ color: '#ed4245' }}
              onClick={() => {
                const conv = conversations.find(c => c._id === showConvoListMenu);
                if (conv) {
                  // Select the conversation first so the modal has the right context
                  selectConversation(conv);
                  
                  // Close convo-list menu and show appropriate delete modal
                  setIsClosingConvoListMenu(true);
                  setTimeout(() => {
                    setShowConvoListMenu(null);
                    setIsClosingConvoListMenu(false);
                    
                    // Show group delete modal or DM delete modal based on conversation type
                    if (conv.isGroup) {
                      setShowDeleteGroupModal(true);
                    } else {
                      setShowDeleteDMModal(true);
                    }
                  }, 120);
                }
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = currentTheme.bg.hover; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <FiTrash2 className="text-base" />
              Delete Chat
            </button>
          )}
        </div>
      )}
      
      {/* Markdown Guide Modal */}
      {showMarkdownGuide && (
        <MarkdownGuide
          currentTheme={currentTheme}
          onClose={() => setShowMarkdownGuide(false)}
        />
      )}
    </div>
    </>
  );
};

export default ChatPage;
