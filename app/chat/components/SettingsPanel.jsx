import React from 'react';
import { FiX } from 'react-icons/fi';
import { HexColorPicker } from 'react-colorful';
import { UserAvatar } from './UserAvatar';
import { TwemojiText } from './TwemojiContent';

export const SettingsPanel = ({
  currentTheme,
  THEMES,
  hasUnsavedChanges,
  onClose,
  handleCancelSettings,
  selectConversation,
  conversations,
  currentConversation,
  // Profile section
  bannerColor,
  setBannerColor,
  showColorPicker,
  setShowColorPicker,
  colorPickerRef,
  userAvatar,
  setUserAvatar,
  setAvatarFile,
  currentUserAvatarUrl,
  userName,
  isEditingUsername,
  setIsEditingUsername,
  tempUsername,
  setTempUsername,
  setUserName,
  usernameInputRef,
  customStatus,
  setCustomStatus,
  tempCustomStatus,
  setTempCustomStatus,
  userBio,
  setUserBio,
  // Theme section
  theme,
  handleThemeChange,
  // Notification settings
  notificationSoundEnabled,
  setNotificationSoundEnabled,
  // Save/Cancel
  handleSaveSettings,
}) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: currentTheme.bg.primary }}>
      {/* Header */}
      <div className="h-14 px-6 flex items-center justify-between border-b flex-shrink-0" style={{ backgroundColor: currentTheme.bg.primary, borderColor: currentTheme.border.primary }}>
        <h2 className="font-semibold text-lg font-inter" style={{ color: currentTheme.text.primary }}>Settings</h2>
        <button
          onClick={() => {
            if (hasUnsavedChanges) {
              handleCancelSettings();
            }
            onClose();
            if (!currentConversation && conversations.length > 0) {
              selectConversation(conversations[0]);
            }
          }}
          className="p-2 rounded-lg transition-all hover:scale-105"
          style={{ color: currentTheme.text.tertiary, backgroundColor: 'transparent' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = currentTheme.bg.hover}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <FiX className="text-xl" />
        </button>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-5xl mx-auto px-6 py-8">
          
          {/* Profile Section */}
          <div className="mb-8">
            <h3 className="text-xs font-medium uppercase tracking-wide mb-5 font-inter" style={{ color: currentTheme.text.muted }}>
              Profile
            </h3>
            
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: currentTheme.bg.secondary, borderColor: currentTheme.border.primary }}>
              {/* Banner */}
              <div className="relative h-32" style={{ backgroundColor: bannerColor }}>
                <button 
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-lg border flex items-center justify-center cursor-pointer transition-all hover:scale-105"
                  style={{ 
                    backgroundColor: currentTheme.bg.secondary,
                    borderColor: currentTheme.border.primary
                  }}
                >
                  <i className="ri-palette-line text-lg" style={{ color: currentTheme.text.secondary }} />
                </button>
                
                {/* Color Picker Popover */}
                {showColorPicker && (
                  <div 
                    ref={colorPickerRef}
                    className="absolute top-16 right-4 p-4 rounded-xl border shadow-2xl z-50"
                    style={{ 
                      backgroundColor: currentTheme.bg.primary,
                      borderColor: currentTheme.border.secondary
                    }}
                  >
                    <HexColorPicker 
                      color={bannerColor} 
                      onChange={setBannerColor}
                    />
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="text"
                        value={bannerColor}
                        onChange={(e) => setBannerColor(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm rounded-lg border focus:outline-none font-mono transition-colors"
                        style={{
                          backgroundColor: currentTheme.bg.tertiary,
                          borderColor: currentTheme.border.primary,
                          color: currentTheme.text.primary,
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = currentTheme.accent}
                        onBlur={(e) => e.currentTarget.style.borderColor = currentTheme.border.primary}
                      />
                      <button
                        onClick={() => setShowColorPicker(false)}
                        className="px-4 cursor-pointer py-2 text-sm rounded-lg transition-opacity font-medium"
                        style={{
                          backgroundColor: currentTheme.accent,
                          color: '#ffffff'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Profile Picture & Info */}
              <div className="px-6 pb-6">
                {/* Profile Picture */}
                <div className="relative -mt-16 mb-6">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="avatar-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Store the file for upload
                        setAvatarFile(file);
                        
                        // Show preview using FileReader
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setUserAvatar(reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="block w-28 h-28 rounded-2xl cursor-pointer relative group"
                    style={{ 
                      borderWidth: '5px', 
                      borderColor: currentTheme.bg.secondary,
                      backgroundColor: currentTheme.bg.secondary
                    }}
                  >
                    <img 
                      src={userAvatar || currentUserAvatarUrl}
                      onError={(e) => {
                        if (currentUserAvatarUrl && e.target.src !== currentUserAvatarUrl) {
                          e.target.src = currentUserAvatarUrl;
                        }
                      }} 
                      alt={userName}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                    <div 
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
                    >
                      <i className="ri-camera-line text-2xl text-white" />
                    </div>
                  </label>
                </div>

                {/* Username */}
                <div className="mb-6">
                  <label className="text-xs font-medium mb-2 block font-inter" style={{ color: currentTheme.text.tertiary }}>
                    Username
                  </label>
                  {isEditingUsername ? (
                    <div>
                      <input
                        ref={usernameInputRef}
                        type="text"
                        value={tempUsername}
                        onChange={(e) => {
                          const sanitized = e.target.value.replace(/\s+/g, '');
                          setTempUsername(sanitized);
                        }}
                        placeholder="Enter your username"
                        maxLength={16}
                        className="w-full text-lg font-semibold border rounded-lg px-3 py-2.5 focus:outline-none transition-colors font-inter select-text"
                        style={{
                          backgroundColor: currentTheme.bg.tertiary,
                          borderColor: currentTheme.accent,
                          color: currentTheme.text.primary,
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const sanitized = tempUsername.replace(/\s+/g, '');
                            setTempUsername(sanitized);
                            setUserName(sanitized);
                            setIsEditingUsername(false);
                          } else if (e.key === 'Escape') {
                            setTempUsername(userName);
                            setIsEditingUsername(false);
                          }
                        }}
                        onBlur={() => {
                          setTempUsername(userName);
                          setIsEditingUsername(false);
                        }}
                        autoFocus
                      />
                      <p className="text-xs mt-1.5 font-inter" style={{ color: currentTheme.text.muted }}>
                        Press Enter to save, Esc to cancel
                      </p>
                    </div>
                  ) : (
                    <div
                      className="group cursor-pointer rounded-lg px-3 py-2.5 border transition-colors"
                      style={{ 
                        backgroundColor: currentTheme.bg.tertiary,
                        borderColor: currentTheme.border.primary
                      }}
                      onClick={() => {
                        setTempUsername(userName);
                        setIsEditingUsername(true);
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = currentTheme.border.secondary}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = currentTheme.border.primary}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold font-inter flex-1" style={{ color: currentTheme.text.primary }}>
                          <TwemojiText text={userName} size="1em" />
                        </span>
                        <i 
                          className="ri-pencil-line text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: currentTheme.text.tertiary }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Custom Status & Bio - Side by Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Custom Status */}
                  <div>
                    <label className="text-xs font-medium mb-2 block font-inter" style={{ color: currentTheme.text.tertiary }}>
                      Custom Status
                    </label>
                    <textarea
                      value={tempCustomStatus}
                      onChange={(e) => setTempCustomStatus(e.target.value)}
                      placeholder="What's on your mind?"
                      maxLength={45}
                      rows={3}
                      className="w-full rounded-lg px-3 py-2.5 text-base border focus:outline-none resize-none transition-colors font-inter select-text"
                      style={{
                        backgroundColor: currentTheme.bg.tertiary,
                        borderColor: currentTheme.border.primary,
                        color: currentTheme.text.primary,
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = currentTheme.accent}
                      onBlur={(e) => e.currentTarget.style.borderColor = currentTheme.border.primary}
                    />
                    <p className="text-xs mt-1.5 font-inter" style={{ color: currentTheme.text.muted }}>
                      {tempCustomStatus.length}/45
                    </p>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="text-xs font-medium mb-2 block font-inter" style={{ color: currentTheme.text.tertiary }}>
                      Bio
                    </label>
                    <textarea
                      value={userBio}
                      onChange={(e) => setUserBio(e.target.value)}
                      placeholder="Tell others about yourself..."
                      maxLength={120}
                      rows={3}
                      className="w-full rounded-lg px-3 py-2.5 text-base border focus:outline-none resize-none transition-colors font-inter select-text"
                      style={{
                        backgroundColor: currentTheme.bg.tertiary,
                        borderColor: currentTheme.border.primary,
                        color: currentTheme.text.primary,
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = currentTheme.accent}
                      onBlur={(e) => e.currentTarget.style.borderColor = currentTheme.border.primary}
                    />
                    <p className="text-xs mt-1.5 font-inter" style={{ color: currentTheme.text.muted }}>
                      {userBio.length}/120
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Appearance & Notifications Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Appearance */}
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wide mb-5 font-inter" style={{ color: currentTheme.text.muted }}>
                Appearance
              </h3>
              <div className="rounded-xl border p-5" style={{ backgroundColor: currentTheme.bg.secondary, borderColor: currentTheme.border.primary }}>
                <label className="text-xs font-medium mb-4 block font-inter" style={{ color: currentTheme.text.tertiary }}>
                  Theme
                </label>
                <div className="space-y-3">
                  {Object.entries(THEMES).map(([key, themeData]) => (
                    <button
                      key={key}
                      onClick={() => handleThemeChange(key)}
                      className="w-full flex items-center cursor-pointer gap-4 p-4 rounded-lg border transition-all"
                      style={{
                        backgroundColor: theme === key ? currentTheme.bg.hover : currentTheme.bg.tertiary,
                        borderColor: theme === key ? `${currentTheme.accent}` : currentTheme.border.primary,
                        // borderWidth: theme === key ? '2px' : '2px'
                      }}
                      onMouseEnter={(e) => {
                        if (theme !== key) {
                          e.currentTarget.style.borderColor = currentTheme.border.secondary;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (theme !== key) {
                          e.currentTarget.style.borderColor = currentTheme.border.primary;
                        }
                      }}
                    >
                      <div className="flex gap-1.5 flex-shrink-0">
                        <div className="w-6 h-6 rounded-md" style={{ backgroundColor: themeData.bg.secondary }} />
                        <div className="w-6 h-6 rounded-md" style={{ backgroundColor: themeData.bg.tertiary }} />
                        <div className="w-6 h-6 rounded-md" style={{ backgroundColor: themeData.accent }} />
                      </div>
                      <span className="text-sm font-medium font-inter flex-1 text-left" style={{ color: theme === key ? currentTheme.text.primary : currentTheme.text.secondary }}>
                        {themeData.name}
                      </span>
                      {theme === key && (
                        <i className="ri-check-line text-lg" style={{ color: currentTheme.accent }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wide mb-5 font-inter" style={{ color: currentTheme.text.muted }}>
                Notifications
              </h3>
              <div className="rounded-xl border p-5" style={{ backgroundColor: currentTheme.bg.secondary, borderColor: currentTheme.border.primary }}>
                <label className="text-xs font-medium mb-4 block font-inter" style={{ color: currentTheme.text.tertiary }}>
                  Sound Settings
                </label>
                
                {/* DM Notification Sounds Toggle */}
                <button
                  onClick={() => {
                    const newState = !notificationSoundEnabled;
                    setNotificationSoundEnabled(newState);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('goonChat_notificationSound', newState.toString());
                    }
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-lg border transition-all"
                  style={{
                    backgroundColor: currentTheme.bg.tertiary,
                    borderColor: currentTheme.border.primary,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = currentTheme.border.secondary}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = currentTheme.border.primary}
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: notificationSoundEnabled ? `${currentTheme.accent}22` : currentTheme.bg.hover }}
                  >
                    <i 
                      className={`text-lg ${notificationSoundEnabled ? 'ri-volume-up-line' : 'ri-volume-mute-line'}`}
                      style={{ color: notificationSoundEnabled ? currentTheme.accent : currentTheme.text.tertiary }}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium font-inter mb-0.5" style={{ color: currentTheme.text.primary }}>
                      DM Notification Sounds
                    </p>
                    <p className="text-xs font-inter" style={{ color: currentTheme.text.tertiary }}>
                      {notificationSoundEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <div 
                    className="w-11 cursor-pointer h-6 rounded-full transition-all flex-shrink-0 relative"
                    style={{ 
                      backgroundColor: notificationSoundEnabled ? currentTheme.accent : currentTheme.bg.hover 
                    }}
                  >
                    <div 
                      className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                      style={{ 
                        backgroundColor: '#ffffff',
                        left: notificationSoundEnabled ? 'calc(100% - 22px)' : '2px'
                      }}
                    />
                  </div>
                </button>

                <p className="text-xs mt-4 font-inter leading-relaxed" style={{ color: currentTheme.text.muted }}>
                  Play a sound when you receive new direct messages. This respects your per-conversation notification preferences.
                </p>
              </div>
            </div>
          </div>

        </div>
        
        {/* Floating Save/Cancel Bar */}
        <div 
          className="fixed bottom-8 left-1/2 rounded-xl border shadow-2xl px-5 py-4 flex items-center gap-4"
          style={{
            backgroundColor: currentTheme.bg.secondary,
            borderColor: currentTheme.border.secondary,
            zIndex: 50,
            transform: hasUnsavedChanges ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(150px)',
            opacity: hasUnsavedChanges ? 1 : 0,
            pointerEvents: hasUnsavedChanges ? 'auto' : 'none',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <div className="flex items-center gap-2">
            {/* <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: currentTheme.accent }} /> */}
            <span className="text-sm font-medium font-inter" style={{ color: currentTheme.text.primary }}>
              There are Unsaved changes
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelSettings}
              className="px-4 cursor-pointer py-2 text-sm font-medium rounded-lg transition-all font-inter"
              style={{
                backgroundColor: currentTheme.bg.tertiary,
                color: currentTheme.text.secondary,
                borderWidth: '1px',
                borderColor: currentTheme.border.primary
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                e.currentTarget.style.color = currentTheme.text.primary;
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = currentTheme.bg.tertiary;
                e.currentTarget.style.color = currentTheme.text.secondary;
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSettings}
              className="px-4 cursor-pointer py-2 text-sm font-medium rounded-lg transition-all font-inter"
              style={{
                backgroundColor: currentTheme.accent,
                color: '#ffffff'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
  