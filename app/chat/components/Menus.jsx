import React from 'react';
import { FiBell, FiTrash2 } from 'react-icons/fi';
import { toast } from 'sonner';

// Context Menu Wrapper
export const ContextMenu = ({ show, isClosing, position, currentTheme, children, menuRef, transformOrigin = 'top right' }) => {
  if (!show && !isClosing) return null;

  return (
    <div 
      ref={menuRef}
      className="fixed w-52 rounded-lg shadow-xl border overflow-hidden"
      style={{
        top: position.top != null ? `${position.top}px` : undefined,
        bottom: position.bottom != null ? `${position.bottom}px` : undefined,
        left: position.left != null ? `${position.left}px` : undefined,
        right: position.right != null ? `${position.right}px` : undefined,
        backgroundColor: currentTheme.bg.secondary,
        borderColor: currentTheme.border.secondary,
        zIndex: 100,
        animation: isClosing 
          ? 'scaleOut 0.1s cubic-bezier(0.36, 0, 0.66, -0.56) forwards' 
          : 'scaleIn 0.12s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transformOrigin,
        pointerEvents: isClosing ? 'none' : 'auto'
      }}
    >
      {children}
    </div>
  );
};

// Menu Item
export const MenuItem = ({ icon, label, onClick, currentTheme, isDanger = false, disabled = false }) => (
  <button
    className="w-full px-4 py-2 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    style={{ color: isDanger ? '#ed4245' : currentTheme.text.secondary, pointerEvents: disabled ? 'none' : 'auto' }}
    onClick={disabled ? undefined : onClick}
    onMouseEnter={(e) => {
      if (!disabled) e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
    }}
    onMouseLeave={(e) => {
      if (!disabled) e.currentTarget.style.backgroundColor = 'transparent';
    }}
  >
    {typeof icon === 'string' ? (
      <i className={`${icon} text-base`} style={{ color: isDanger ? '#ed4245' : currentTheme.text.tertiary }}></i>
    ) : (
      React.cloneElement(icon, { className: 'text-base', style: { color: isDanger ? '#ed4245' : currentTheme.text.tertiary } })
    )}
    {label}
  </button>
);

// Menu Divider
export const MenuDivider = ({ currentTheme }) => (
  <div className="h-px my-1" style={{ backgroundColor: currentTheme.border.primary }} />
);

// Message More Menu
export const MessageMoreMenu = ({ 
  show, 
  isClosing, 
  position, 
  message, 
  currentUserId, 
  isAdmin,
  onEdit, 
  onReply, 
  onCopy, 
  onDelete, 
  onReport, 
  onMute,
  onUnmute,
  isCurrentUserMuted = false,
  isTargetUserMuted = false,
  currentTheme,
  menuRef 
}) => {
  const isOwnMessage = message?.sender?._id === currentUserId;

  return (
    <ContextMenu 
      show={show} 
      isClosing={isClosing} 
      position={position} 
      currentTheme={currentTheme}
      menuRef={menuRef}
      transformOrigin={position.openUpward ? 'bottom right' : 'top right'}
    >
      {isOwnMessage && (
        <MenuItem 
          icon="ri-pencil-line" 
          label="Edit Message" 
          onClick={() => { if (!isCurrentUserMuted) onEdit && onEdit(); }} 
          currentTheme={currentTheme} 
          disabled={isCurrentUserMuted}
        />
      )}
      
      <MenuItem 
        icon="ri-reply-line" 
        label="Reply" 
        onClick={() => { if (!isCurrentUserMuted) onReply && onReply(); }} 
        currentTheme={currentTheme} 
        disabled={isCurrentUserMuted}
      />
      
      <MenuItem 
        icon="ri-file-copy-line" 
        label="Copy Text" 
        onClick={onCopy} 
        currentTheme={currentTheme} 
      />

      {(isOwnMessage || isAdmin) && (
        <MenuItem 
          icon="ri-delete-bin-line" 
          label="Delete Message" 
          onClick={onDelete} 
          currentTheme={currentTheme}
          isDanger 
        />
      )}

      {!isOwnMessage && !isAdmin && (
        <MenuItem 
          icon="ri-flag-line" 
          label="Report Message" 
          onClick={onReport} 
          currentTheme={currentTheme}
          isDanger 
        />
      )}

      {isAdmin && !isOwnMessage && (
        <>
          <MenuDivider currentTheme={currentTheme} />
          {isTargetUserMuted ? (
            <MenuItem 
              icon="ri-volume-up-line" 
              label="Unmute User" 
              onClick={onUnmute} 
              currentTheme={currentTheme}
            />
          ) : (
            <MenuItem 
              icon="ri-volume-mute-line" 
              label="Mute User" 
              onClick={onMute} 
              currentTheme={currentTheme}
              isDanger 
            />
          )}
        </>
      )}
    </ContextMenu>
  );
};

// Conversation Header Menu
export const ConversationMenu = ({ 
  show, 
  isClosing, 
  position, 
  isGroup,
  otherUser,
  isAdmin,
  onNotificationSettings,
  onUpdateGroup,
  onBanUser,
  onUnbanUser,
  onMuteUser,
  onUnmuteUser,
  onDelete, 
  currentTheme,
  menuRef,
  isBanned = false
}) => {
  return (
    <ContextMenu 
      show={show || isClosing} 
      isClosing={isClosing} 
      position={position} 
      currentTheme={currentTheme}
      menuRef={menuRef}
    >
      <MenuItem 
        icon={<FiBell />} 
        label="Notification Settings" 
        onClick={onNotificationSettings} 
        currentTheme={currentTheme} 
      />

      {/* Groups: admin only, DMs: any user */}
      {(isGroup ? isAdmin : true) && (
        <MenuItem 
          icon={<FiTrash2 />} 
          label="Delete Conversation" 
          onClick={onDelete} 
          currentTheme={currentTheme}
          isDanger 
        />
      )}

      {/* Divider for admin-only features */}
      {isAdmin && (
        <MenuDivider currentTheme={currentTheme} />
      )}

  {isAdmin && isGroup && (
    <>
          <MenuItem 
            icon="ri-edit-line" 
            label="Update Group" 
            onClick={onUpdateGroup} 
            currentTheme={currentTheme}
          />
        </>
      )}

  {isAdmin && !isGroup && otherUser && (
        <>
          <MenuDivider currentTheme={currentTheme} />
          {isBanned ? (
            <MenuItem 
              icon="ri-checkbox-circle-line" 
              label="Unban User" 
              onClick={onUnbanUser} 
              currentTheme={currentTheme}
            />
          ) : (
            <MenuItem 
              icon="ri-forbid-line" 
              label="Ban User" 
              onClick={onBanUser} 
              currentTheme={currentTheme}
              isDanger 
            />
          )}
          {otherUser.mutedUntil && new Date(otherUser.mutedUntil) > new Date() ? (
            <MenuItem 
              icon="ri-volume-up-line" 
              label="Unmute User" 
              onClick={onUnmuteUser} 
              currentTheme={currentTheme}
            />
          ) : (
            <MenuItem 
              icon="ri-volume-mute-line" 
              label="Mute User" 
              onClick={onMuteUser} 
              currentTheme={currentTheme}
              isDanger 
            />
          )}
        </>
      )}

      {/* Groups: admin only, DMs: any user */}
      {(isGroup ? isAdmin : true) && (
        <MenuItem 
          icon={<FiTrash2 />} 
          label="Delete Conversation" 
          onClick={onDelete} 
          currentTheme={currentTheme}
          isDanger 
        />
      )}
    </ContextMenu>
  );
};

// Sidebar Conversation List Menu
export const ConversationListMenu = ({ 
  show, 
  isClosing, 
  position, 
  conversation,
  isAdmin,
  onOpen,
  onNotificationSettings,
  onUpdateGroup,
  onBanUser,
  onUnbanUser,
  onMuteUser,
  onUnmuteUser,
  onDelete, 
  currentTheme,
  menuRef,
  currentUserId,
  isBanned = false
}) => {
  const isGroup = conversation?.isGroup;
  const otherUser = conversation?.participants?.find(p => p._id !== currentUserId);

  return (
    <ContextMenu 
      show={show || isClosing} 
      isClosing={isClosing} 
      position={position} 
      currentTheme={currentTheme}
      menuRef={menuRef}
      transformOrigin="top left"
    >
      <MenuItem 
        icon="ri-chat-3-line" 
        label="Open Conversation" 
        onClick={onOpen} 
        currentTheme={currentTheme} 
      />

      <MenuItem 
        icon={<FiBell />} 
        label="Notification Settings" 
        onClick={onNotificationSettings} 
        currentTheme={currentTheme} 
      />

      {isAdmin && isGroup && (
        <>
          <MenuDivider currentTheme={currentTheme} />
          <MenuItem 
            icon="ri-edit-line" 
            label="Update Group" 
            onClick={onUpdateGroup} 
            currentTheme={currentTheme}
          />
        </>
      )}

      {isAdmin && !isGroup && otherUser && (
        <>
          <MenuDivider currentTheme={currentTheme} />
          {isBanned ? (
            <MenuItem 
              icon="ri-checkbox-circle-line" 
              label="Unban User" 
              onClick={onUnbanUser} 
              currentTheme={currentTheme}
            />
          ) : (
            <MenuItem 
              icon="ri-forbid-line" 
              label="Ban User" 
              onClick={onBanUser} 
              currentTheme={currentTheme}
              isDanger 
            />
          )}
          {otherUser.mutedUntil && new Date(otherUser.mutedUntil) > new Date() ? (
            <MenuItem 
              icon="ri-volume-up-line" 
              label="Unmute User" 
              onClick={onUnmuteUser} 
              currentTheme={currentTheme}
            />
          ) : (
            <MenuItem 
              icon="ri-volume-mute-line" 
              label="Mute User" 
              onClick={onMuteUser} 
              currentTheme={currentTheme}
              isDanger 
            />
          )}
        </>
      )}

      {/* Groups: admin only, DMs: any user */}
      {(isGroup ? isAdmin : true) && (
        <MenuItem 
          icon={<FiTrash2 />} 
          label="Delete Conversation" 
          onClick={onDelete} 
          currentTheme={currentTheme}
          isDanger 
        />
      )}
    </ContextMenu>
  );
};

// Member List Context Menu
export const MemberMenu = ({
  show,
  isClosing,
  position,
  member,
  currentUser,
  isAdmin,
  onNotificationSettings,
  onBan,
  onUnban,
  onMute,
  onUnmute,
  currentTheme,
  menuRef,
  isBanned = false,
  isMuted = false
}) => {
  if (!member || member._id === currentUser?._id) return null;

  return (
    <ContextMenu 
      show={show || isClosing} 
      isClosing={isClosing} 
      position={position} 
      currentTheme={currentTheme}
      menuRef={menuRef}
      transformOrigin="top left"
    >
      <MenuItem 
        icon="ri-notification-3-line" 
        label="Notification Settings" 
        onClick={onNotificationSettings} 
        currentTheme={currentTheme} 
      />

      {/* Admin Controls */}
      {isAdmin && (
        <>
          <MenuDivider currentTheme={currentTheme} />
          
          {isBanned ? (
            <MenuItem 
              icon="ri-shield-check-line" 
              label="Unban User" 
              onClick={onUnban} 
              currentTheme={currentTheme}
            />
          ) : (
            <MenuItem 
              icon="ri-forbid-line" 
              label="Ban User" 
              onClick={onBan} 
              currentTheme={currentTheme}
              isDanger 
            />
          )}

          {isMuted ? (
            <MenuItem 
              icon="ri-volume-up-line" 
              label="Unmute User" 
              onClick={onUnmute} 
              currentTheme={currentTheme}
            />
          ) : (
            <MenuItem 
              icon="ri-volume-mute-line" 
              label="Mute User" 
              onClick={onMute} 
              currentTheme={currentTheme}
              isDanger 
            />
          )}
        </>
      )}
    </ContextMenu>
  );
};

