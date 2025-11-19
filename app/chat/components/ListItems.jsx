import React from 'react';
import { HiUserGroup } from 'react-icons/hi';
import { UserAvatar } from './UserAvatar';
import { StatusBadge } from './StatusBadge';
import { TwemojiText } from './TwemojiContent';

// Helper function to format unread count (caps at 99, shows 99+ for higher values)
const formatUnreadCount = (count) => {
  if (count > 99) return '99+';
  return count;
};

// Conversation List Item
export const ConversationItem = ({ 
  conversation, 
  index,
  currentUser, 
  currentConversation,
  showSettings,
  userStatuses, 
  onSelect, 
  onContextMenu,
  currentTheme 
}) => {
  const isSelected = currentConversation?._id === conversation._id && !showSettings;

  if (conversation.isGroup) {
    return (
      <div
        key={conversation._id}
        data-conv-index={index}
        data-conv-id={conversation._id}
        onClick={() => onSelect(conversation)}
        className="px-3 py-3 mb-1 flex items-center gap-3 cursor-pointer rounded-md relative z-10"
        style={{
          backgroundColor: isSelected ? `${currentTheme.accent}11` : 'transparent',
          transition: 'background-color 0.2s ease'
        }}
        onContextMenu={(e) => onContextMenu(e, conversation)}
      >
        <div className="relative flex-shrink-0">
          <img 
            src={conversation.groupAvatar || `https://ui-avatars.com/api/?name=${conversation.groupName}&background=${conversation.groupAvatarColor?.replace('#', '') || '1f1f1f'}`}
            alt={conversation.groupName}
            className="w-10 h-10 rounded-xl object-cover"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {/* <HiUserGroup className="text-sm" style={{ color: currentTheme.text.tertiary }} /> */}
              <h3 className="text-sm font-semibold truncate font-inter" style={{
                color: currentTheme.text.secondary
              }}>
                <TwemojiText text={conversation.groupName} />
              </h3>
            </div>
            <span className="text-xs font-roboto flex-shrink-0 ml-2" style={{ color: currentTheme.text.tertiary }}>
              {new Date(conversation.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium truncate font-inter" style={{ color: currentTheme.text.tertiary }}>
              <TwemojiText text={conversation.lastMessage?.content || 'No messages yet'} size="1.1em" />
            </p>
            {conversation.unread > 0 && (
              <span className="flex-shrink-0 text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center" style={{ backgroundColor: currentTheme.accent, color: currentTheme.bg.primary }}>
                {formatUnreadCount(conversation.unread)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // DM chat
  const otherUser = conversation.participants?.find(p => p._id !== currentUser?._id);
  if (!otherUser) return null;

  const userStatus = userStatuses.get(otherUser._id.toString());
  const status = userStatus?.status || 'offline';
  const showStatusBadge = status !== 'offline';
  const displayName = otherUser.username || 'Unknown User';
  const unreadCount = (typeof conversation.unread === 'number')
    ? conversation.unread
    : (() => {
        const entry = (conversation.unreadCount || []).find(u => {
          const uid = (u.user && typeof u.user === 'object') ? (u.user._id || u.user.id) : u.user;
          return uid?.toString() === currentUser?._id?.toString();
        });
        return entry?.count || 0;
      })();

  return (
    <div
      key={conversation._id}
      data-conv-index={index}
      data-conv-id={conversation._id}
      onClick={() => onSelect(conversation)}
      className="px-3 py-3 mb-1 flex items-center gap-3 cursor-pointer rounded-md relative z-10"
      style={{
        backgroundColor: isSelected ? `${currentTheme.accent}11` : 'transparent',
        transition: 'background-color 0.2s ease'
      }}
      onContextMenu={(e) => onContextMenu(e, conversation)}
    >
      <div className="relative flex-shrink-0">
        <UserAvatar
          user={otherUser}
          className="w-10 h-10 rounded-full object-cover"
        />
        {showStatusBadge && (
          <div className="absolute -bottom-0.5 -right-0.5">
            <StatusBadge 
              status={status} 
              size="sm" 
              borderColor={currentTheme.bg.secondary}
            />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold truncate font-inter" style={{
            color: currentTheme.text.secondary
          }}>
            <TwemojiText text={displayName} />
          </h3>
          <span className="text-xs font-roboto flex-shrink-0 ml-2" style={{ color: currentTheme.text.tertiary }}>
            {new Date(conversation.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium truncate font-inter" style={{ color: currentTheme.text.tertiary }}>
            <TwemojiText text={conversation.lastMessage?.content || 'No messages yet'} size="1.1em" />
          </p>
          {unreadCount > 0 && (
            <span className="flex-shrink-0 text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center" style={{ backgroundColor: currentTheme.accent, color: currentTheme.bg.primary }}>
              {formatUnreadCount(unreadCount)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Member List Item
export const MemberItem = ({ 
  member, 
  onProfileClick, 
  onContextMenu,
  profilePreviewSourceId, 
  currentTheme 
}) => {
  const isOffline = !['online', 'idle', 'away', 'dnd'].includes(member.status);
  const sourceId = `member-${member._id}`;
  const isActive = profilePreviewSourceId === sourceId;

  const handleContextMenu = (e) => {
    if (onContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e, member);
    }
  };

  return (
    <div 
      key={member._id}
      className={`flex items-center gap-3 px-2 py-2 rounded cursor-pointer transition-colors group ${isOffline ? 'opacity-40' : ''}`}
      style={{
        backgroundColor: isActive ? currentTheme.bg.tertiary : 'transparent'
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = currentTheme.bg.tertiary;
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
      onClick={(e) => onProfileClick(e, member, sourceId)}
      onContextMenu={handleContextMenu}
    >
      <div className="relative flex-shrink-0">
        <UserAvatar
          user={member}
          className={`w-8 h-8 rounded-full object-cover ${isOffline ? 'grayscale' : ''}`}
        />
        {!isOffline && (
          <StatusBadge 
            status={member.status} 
            size="sm" 
            borderColor={currentTheme.bg.secondary}
            className="absolute -bottom-0.5 -right-0.5"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-[0.31rem]">{/* username + crown: slightly closer */}
            <p className="text-sm font-medium truncate font-inter transition-colors" style={{ color: currentTheme.text.secondary }}>
              <TwemojiText text={member.username} />
            </p>
            {member.isAdmin && (
              <span title="Admin" className="flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5" style={{ color: '#fbbf24' }}>
                  <path d="M2.00488 19H22.0049V21H2.00488V19ZM2.00488 5L7.00488 8L12.0049 2L17.0049 8L22.0049 5V17H2.00488V5Z"></path>
                </svg>
              </span>
            )}
          </div>
        </div>
        {!isOffline && member.customStatus ? (
          <p className="text-xs truncate font-inter" style={{ color: currentTheme.text.tertiary }}>
            <TwemojiText text={member.customStatus} size="1.1em" />
          </p>
        ) : isOffline && member.lastSeen ? (
          <p className="text-xs truncate font-inter" style={{ color: currentTheme.text.tertiary }}>
            Last seen {new Date(member.lastSeen).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        ) : null}
      </div>
    </div>
  );
};
