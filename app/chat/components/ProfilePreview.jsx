import React, { useState, useRef } from 'react';
import { FiMoreHorizontal } from 'react-icons/fi';
import { StatusBadge } from './StatusBadge';
import { UserAvatar } from './UserAvatar';
import { TwemojiText } from './TwemojiContent';

export const ProfilePreview = ({
  show,
  isAnimating,
  isLoading,
  position,
  user,
  currentUser,
  currentTheme,
  onClose,
  onMessage,
  onViewProfile,
  onBan,
  onUnban,
  onMute,
  isAdmin,
  fromCache,
  onNotificationSettings,
  onUnmute,
  mutedUsers = {},
  isBanned = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isClosingMenu, setIsClosingMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const [isMessaging, setIsMessaging] = useState(false);
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);
  
  if (!show) return null;

  const handleMenuClick = (event) => {
    event.stopPropagation();
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const previewCard = button.closest('[data-preview-card]');
    const previewRect = previewCard?.getBoundingClientRect();

    if (showMenu) {
      setIsClosingMenu(true);
      setTimeout(() => {
        setShowMenu(false);
        setIsClosingMenu(false);
      }, 150);
      return;
    }

    if (previewRect) {
      setMenuPosition({
        top: rect.bottom - previewRect.top + 8,
        right: previewRect.right - rect.right
      });
    }
    setShowMenu(true);
  };

  const handleCloseMenu = () => {
    setIsClosingMenu(true);
    setTimeout(() => {
      setShowMenu(false);
      setIsClosingMenu(false);
    }, 150);
  };

  const mutedIso = mutedUsers[user?._id];
  const isUserMuted = !!mutedIso && new Date(mutedIso) > new Date();

  return (
    <>
      <div 
        className="fixed inset-0 z-50 transition-opacity duration-150"
        style={{
          opacity: isAnimating ? 0.3 : 0
        }}
        onClick={onClose}
      />

      <div 
        className="fixed z-50 rounded-xl overflow-hidden ease-out"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          backgroundColor: currentTheme.bg.secondary,
          border: `1px solid ${currentTheme.border.primary}`,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          opacity: isAnimating ? 1 : 0,
          transform: isAnimating ? 'translateX(0)' : 'translateX(10px)',
          transition: (isLoading || fromCache)
            ? 'opacity 0.15s ease-out, transform 0.15s ease-out, top 0.15s ease-out, left 0.15s ease-out'
            : 'none'
        }}
      >
        {isLoading ? (
          <div className="h-[100px] w-[100px] flex items-center justify-center">
            <div className="relative w-7 h-7">
              <div 
                className="absolute inset-0 border-4 rounded-full border-t-transparent"
                style={{ 
                  borderColor: currentTheme.accent,
                  borderTopColor: 'transparent',
                  animation: 'spin 0.8s linear infinite'
                }}
              />
            </div>
          </div>
        ) : user ? (
          <>
          <div 
            className="w-[320px]"
            data-preview-card
            style={{
              animation: 'fadeIn 0.3s ease-out'
            }}
          >

            <div 
              className="h-[4.5rem] relative"
              style={{ 
                background: `linear-gradient(135deg, ${user.banner || user.avatarColor || '#3ba55d'} 0%, ${user.banner || user.avatarColor || '#2d8a45'} 100%)`,
              }}
            >
              {/* Three-dot menu button - only show for other users */}
              {user._id !== currentUser._id && (
                <button
                  ref={menuButtonRef}
                  className="absolute top-3 right-3 px-1.5  py-1 rounded-md cursor-pointer transition-colors z-10"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    color: 'rgba(255, 255, 255, 0.9)'
                  }}
                  onClick={handleMenuClick}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
                  }}
                >
                  <FiMoreHorizontal className="text-lg" />
                </button>
              )}
            </div>
            
            <div className="px-4 pb-4">
              <div className="relative -mt-8 mb-2">
                <div 
                  className="w-20 h-20 rounded-full relative"
                  style={{ 
                    borderWidth: '6px', 
                    borderColor: currentTheme.bg.secondary,
                    backgroundColor: currentTheme.bg.secondary
                  }}
                >
                  <UserAvatar
                    user={user}
                    className="w-full h-full object-cover rounded-full"
                  />
                  <StatusBadge 
                    status={user.status} 
                    size="lg" 
                    borderColor={currentTheme.bg.secondary}
                    className="absolute -bottom-1 -right-1"
                  />
                </div>

                {/* Custom Status Thought Bubble */}
                {user.customStatus && (
                  <div 
                    className="absolute left-[95px] top-[25px] max-w-[200px]"
                    style={{ zIndex: 10 }}
                  >
                    {/* Bubble Tail */}
                    <div 
                      className="absolute left-[-8px] top-[12px] w-0 h-0"
                      style={{
                        borderTop: '6px solid transparent',
                        borderBottom: '6px solid transparent',
                        borderRight: `8px solid ${currentTheme.bg.tertiary}`,
                      }}
                    />
                    {/* Bubble Content */}
                    <div 
                      className="rounded-lg px-3 py-2 shadow-lg"
                      style={{
                        backgroundColor: currentTheme.bg.tertiary,
                        borderWidth: '1px',
                        borderColor: currentTheme.border.primary,
                      }}
                    >
                      <p className="text-xs font-inter leading-relaxed break-words" style={{ color: currentTheme.text.secondary }}>
                        <TwemojiText text={user.customStatus} size="1.1em" />
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Username */}
              <div className="mb-2.5">
                <div className="flex items-center gap-1.5">
                  <p className="text-lg font-semibold font-inter" style={{ color: currentTheme.text.primary }}>
                    @<TwemojiText text={user.username} size="1.15em" />
                  </p>
                  {user.isAdmin && (
                    <span title="Admin">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0" style={{ color: '#fbbf24' }}>
                        <path d="M2.00488 19H22.0049V21H2.00488V19ZM2.00488 5L7.00488 8L12.0049 2L17.0049 8L22.0049 5V17H2.00488V5Z"></path>
                      </svg>
                    </span>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px mb-3" style={{ backgroundColor: currentTheme.border.primary }} />

              {/* Bio */}
              {user.bio && (
                <div className="mb-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-1.5 font-pop" style={{ color: currentTheme.text.tertiary }}>
                    About
                  </h4>
                  <p className="text-sm font-inter select-text leading-relaxed" style={{ color: currentTheme.text.secondary }}>
                    <TwemojiText text={user.bio} size="1.15em" />
                  </p>
                </div>
              )}

              {/* Content Stats */}
              {user.videosUploaded !== undefined && user.imagesUploaded !== undefined && (
                <div className="mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <i className="ri-video-line text-base" style={{ color: currentTheme.text.tertiary }} />
                      <span className="text-sm font-inter" style={{ color: currentTheme.text.secondary }}>
                        {user.videosUploaded} video{user.videosUploaded !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="ri-image-line text-base" style={{ color: currentTheme.text.tertiary }} />
                      <span className="text-sm font-inter" style={{ color: currentTheme.text.secondary }}>
                        {user.imagesUploaded} image{user.imagesUploaded !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5">
                <button
                  className="flex-1 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all ease-out duration-200 cursor-pointer font-inter flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: currentTheme.bg.tertiary,
                    color: currentTheme.text.primary,
                    border: `1px solid ${currentTheme.border.primary}`,
                    opacity: isMessaging ? 0.6 : 1,
                    pointerEvents: isMessaging ? 'none' : 'auto'
                  }}
                  onMouseEnter={(e) => {
                    if (!isMessaging) {
                      e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = currentTheme.bg.tertiary;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  onClick={async () => {
                    setIsMessaging(true);
                    await onMessage();
                    setIsMessaging(false);
                  }}
                >
                  {isMessaging && (
                    <div className="relative w-3.5 h-3.5">
                      <div 
                        className="absolute inset-0 border-2 rounded-full border-t-transparent"
                        style={{ 
                          borderColor: currentTheme.text.primary,
                          borderTopColor: 'transparent',
                          animation: 'spin 0.6s linear infinite'
                        }}
                      />
                    </div>
                  )}
                  <span>Message</span>
                </button>
                <a
                  href={`/profile?user=${user.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all ease-out duration-200 cursor-pointer font-inter text-center no-underline"
                  style={{
                    backgroundColor: currentTheme.bg.tertiary,
                    color: currentTheme.text.primary,
                    border: `1px solid ${currentTheme.border.primary}`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = currentTheme.bg.tertiary;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  View Profile
                </a>
              </div>

            </div>
          </div>

          {/* Profile Preview Menu */}
          {(showMenu || isClosingMenu) && (
            <div 
              ref={menuRef}
              className="absolute w-52 rounded-lg shadow-xl border overflow-hidden"
              style={{
                top: `${menuPosition.top}px`,
                right: `${menuPosition.right}px`,
                backgroundColor: currentTheme.bg.secondary,
                borderColor: currentTheme.border.secondary,
                zIndex: 150,
                animation: isClosingMenu 
                  ? 'scaleOut 0.1s cubic-bezier(0.36, 0, 0.66, -0.56) forwards'
                  : 'scaleIn 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transformOrigin: 'top right',
                pointerEvents: isClosingMenu ? 'none' : 'auto'
              }}
            >
              <button
                className="w-full px-4 py-2.5 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
                style={{ color: currentTheme.text.secondary }}
                onClick={() => {
                  handleCloseMenu();
                  onNotificationSettings && onNotificationSettings();
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <i className="ri-notification-3-line text-base" style={{ color: currentTheme.text.tertiary }} />
                Notification Settings
              </button>

              {/* Admin Controls */}
              {isAdmin && user && user._id !== currentUser?._id && (
                <>
                  <div className="h-px my-1" style={{ backgroundColor: currentTheme.border.primary }} />
                  
                  {isBanned ? (
                    <button
                      className="w-full px-4 py-2.5 cursor-pointer text-left text-sm font-inter flex items-center gap-3 transition-colors"
                      style={{ color: '#57f287' }}
                      onClick={() => {
                        handleCloseMenu();
                        onUnban && onUnban();
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
                        handleCloseMenu();
                        onBan && onBan();
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
                        handleCloseMenu();
                        onUnmute && onUnmute();
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
                        handleCloseMenu();
                        onMute && onMute();
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
              )}
            </div>
          )}
          </>
        ) : null}
      </div>
    </>
  );
};
