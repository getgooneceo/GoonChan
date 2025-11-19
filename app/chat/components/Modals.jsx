import React from 'react';
import { FiX, FiBell, FiTrash2 } from 'react-icons/fi';

// Base Modal Wrapper
export const ModalWrapper = ({ isClosing, onClose, children, currentTheme, style = {} }) => (
  <div 
    className="fixed inset-0 flex items-center justify-center z-[150]"
    style={{ 
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(8px)',
      animation: isClosing ? 'fadeOut 0.12s ease-in forwards' : 'fadeIn 0.12s ease-out',
      pointerEvents: isClosing ? 'none' : 'auto',
      ...style
    }}
    onClick={isClosing ? undefined : onClose}
  >
    {children}
  </div>
);

// Modal Content Container
export const ModalContent = ({ isClosing, children, currentTheme, onClick, maxWidth = 'max-w-md' }) => (
  <div 
    className={`rounded-xl shadow-2xl border w-full ${maxWidth} mx-4`}
    style={{ 
      backgroundColor: currentTheme.bg.secondary,
      borderColor: currentTheme.border.secondary,
      animation: isClosing ? 'scaleOut 0.15s cubic-bezier(0.36, 0, 0.66, -0.56) forwards' : 'scaleIn 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)'
    }}
    onClick={onClick}
  >
    {children}
  </div>
);

// Modal Header
export const ModalHeader = ({ title, subtitle, onClose, currentTheme }) => (
  <div className="px-6 py-5 border-b" style={{ borderColor: currentTheme.border.primary }}>
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold font-pop" style={{ color: currentTheme.text.primary }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs mt-1 font-inter" style={{ color: currentTheme.text.tertiary }}>
            {subtitle}
          </p>
        )}
      </div>
      <button
        onClick={onClose}
        className="p-2 rounded-lg transition-all cursor-pointer hover:rotate-90"
        style={{ 
          color: currentTheme.text.tertiary,
          transition: 'all 0.35s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = currentTheme.text.secondary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = currentTheme.text.tertiary;
        }}
      >
        <i className="ri-close-line text-2xl"></i>
      </button>
    </div>
  </div>
);

// Modal Footer
const shadeColor = (hex, percent) => {
  try {
    const f = hex.slice(1);
    const R = parseInt(f.substring(0,2), 16);
    const G = parseInt(f.substring(2,4), 16);
    const B = parseInt(f.substring(4,6), 16);
    const calc = (c) => Math.max(0, Math.min(255, Math.round(c * (100 + percent) / 100)));
    const r = calc(R);
    const g = calc(G);
    const b = calc(B);
    return `#${(1<<24 | r<<16 | g<<8 | b).toString(16).slice(1)}`;
  } catch (e) {
    return hex;
  }
};

export const ModalFooter = ({ onCancel, onConfirm, confirmText, confirmDisabled, currentTheme, confirmIcon, isLoading, confirmColor }) => (
  <div className="px-6 py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: currentTheme.border.primary }}>
    <button
      onClick={onCancel}
      disabled={isLoading}
      className="px-5 py-2.5 rounded-lg font-medium transition-all cursor-pointer font-inter disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        backgroundColor: 'transparent',
        color: currentTheme.text.secondary
      }}
      onMouseEnter={(e) => {
        if (!isLoading) {
          e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
        }
      }}
      onMouseLeave={(e) => {
        if (!isLoading) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      Cancel
    </button>
    <button
      onClick={onConfirm}
      disabled={confirmDisabled}
      className="px-5 py-2 rounded-lg font-medium transition-all font-inter cursor-pointer"
      style={{
        backgroundColor: confirmDisabled ? currentTheme.bg.hover : (confirmColor || `${currentTheme.accent}cc`),
        color: confirmDisabled ? currentTheme.text.muted : '#ffffff',
        opacity: confirmDisabled ? 0.5 : 1,
        cursor: confirmDisabled ? 'not-allowed' : 'pointer'
      }}
      onMouseEnter={(e) => {
        if (!confirmDisabled) {
          const hover = confirmColor ? shadeColor(confirmColor, -12) : `${currentTheme.accent}ee`;
          e.currentTarget.style.backgroundColor = hover;
        }
      }}
      onMouseLeave={(e) => {
        if (!confirmDisabled) {
          e.currentTarget.style.backgroundColor = confirmColor || `${currentTheme.accent}cc`;
        }
      }}
    >
      <span className="flex items-center gap-2">
        {isLoading && (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {confirmIcon && !isLoading && <i className={confirmIcon}></i>}
        {confirmText}
      </span>
    </button>
  </div>
);

// Report Modal
export const ReportModal = ({ 
  showModal, 
  isClosing, 
  onClose, 
  reportReason, 
  setReportReason, 
  reportDetails, 
  setReportDetails, 
  onSubmit, 
  currentTheme,
  isLoading 
}) => {
  if (!showModal) return null;

  const reasons = [
    'Spam or misleading',
    'Harassment or bullying',
    'Hate speech or discrimination',
    'Other'
  ];

  return (
    <ModalWrapper isClosing={isClosing} onClose={onClose} currentTheme={currentTheme}>
      <ModalContent isClosing={isClosing} currentTheme={currentTheme} onClick={(e) => e.stopPropagation()}>
        <ModalHeader 
          title="Report Message" 
          subtitle="Please select a reason for reporting this message"
          onClose={onClose}
          currentTheme={currentTheme}
        />

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider mb-2 block font-pop" style={{ color: currentTheme.text.tertiary }}>
              Reason *
            </label>
            <div className="space-y-2">
              {reasons.map((reason) => (
                <label
                  key={reason}
                  className="flex items-center gap-3 px-3 py-2.5 rounded cursor-pointer transition-colors"
                  style={{
                    backgroundColor: reportReason === reason ? currentTheme.bg.hover : 'transparent',
                    opacity: isLoading ? 0.6 : 1,
                    pointerEvents: isLoading ? 'none' : 'auto'
                  }}
                  onMouseEnter={(e) => {
                    if (reportReason !== reason && !isLoading) {
                      e.currentTarget.style.backgroundColor = currentTheme.bg.tertiary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (reportReason !== reason && !isLoading) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {/* Accessible native input (visually hidden) */}
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason}
                    checked={reportReason === reason}
                    onChange={(e) => setReportReason(e.target.value)}
                    disabled={isLoading}
                    className="sr-only"
                    style={{ accentColor: currentTheme.accent }}
                  />

                  {/* Custom radio visual */}
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{
                      border: `2px solid ${reportReason === reason ? currentTheme.accent : currentTheme.border.secondary}`,
                      backgroundColor: reportReason === reason ? currentTheme.accent : 'transparent'
                    }}
                  >
                    {reportReason === reason && (
                      // Use the modal background as the inner fill so the radio appears as an accent ring
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentTheme.bg.secondary }} />
                    )}
                  </div>

                  <span className="text-sm font-inter" style={{ color: currentTheme.text.secondary }}>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wider mb-2 block font-pop" style={{ color: currentTheme.text.tertiary }}>
              Additional Details (Optional)
            </label>
            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Provide any additional context..."
              rows={3}
              disabled={isLoading}
              className="w-full rounded-md px-3 py-2 text-sm border focus:outline-none resize-none transition-all font-inter select-text disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                backgroundColor: currentTheme.bg.input,
                borderColor: currentTheme.border.primary,
                color: currentTheme.text.secondary,
              }}
            />
          </div>
        </div>

        <ModalFooter
          onCancel={onClose}
          onConfirm={onSubmit}
          confirmText={isLoading ? 'Submitting...' : 'Submit Report'}
          confirmDisabled={!reportReason || isLoading}
          currentTheme={currentTheme}
          confirmIcon="ri-flag-line"
          isLoading={isLoading}
        />
      </ModalContent>
    </ModalWrapper>
  );
};

// Mute Modal
export const MuteModal = ({ 
  showModal, 
  isClosing, 
  onClose, 
  targetUser, 
  duration, 
  setDuration, 
  onSubmit, 
  currentTheme,
  isLoading 
}) => {
  if (!showModal) return null;

  const durations = [
    { value: '60s', label: '60 seconds' },
    { value: '5m', label: '5 minutes' },
    { value: '10m', label: '10 minutes' },
    { value: '1h', label: '1 hour' },
    { value: '1d', label: '1 day' },
    { value: '1w', label: '1 week' },
  ];

  return (
    <ModalWrapper isClosing={isClosing} onClose={onClose} currentTheme={currentTheme}>
      <ModalContent isClosing={isClosing} currentTheme={currentTheme} onClick={(e) => e.stopPropagation()} maxWidth="max-w-sm">
        <ModalHeader 
          title={`Timeout ${targetUser?.username || 'User'}`}
          subtitle="Members who are in timeout are temporarily not allowed to chat in any of the groups."
          onClose={onClose}
          currentTheme={currentTheme}
        />

        <div className="px-6 py-4">
          <label className="block text-xs font-semibold uppercase tracking-wider mb-3 font-pop" style={{ color: currentTheme.text.tertiary }}>
            Duration
          </label>
          <div className="flex flex-wrap gap-2">
            {durations.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDuration(opt.value)}
                disabled={isLoading}
                className="px-4 py-2 cursor-pointer rounded text-sm font-medium transition-all font-inter transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: duration === opt.value ? currentTheme.accent : currentTheme.bg.tertiary,
                  color: duration === opt.value ? '#ffffff' : currentTheme.text.primary,
                  border: `1px solid ${duration === opt.value ? currentTheme.accent : currentTheme.border.primary}`
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <ModalFooter
          onCancel={onClose}
          onConfirm={onSubmit}
          confirmText={isLoading ? 'Timing out...' : 'Timeout'}
          confirmDisabled={!duration || isLoading}
          currentTheme={currentTheme}
          isLoading={isLoading}
        />
      </ModalContent>
    </ModalWrapper>
  );
};

// Ban Confirmation Modal
export const BanModal = ({ 
  showModal, 
  isClosing, 
  onClose, 
  targetUser, 
  onConfirm, 
  currentTheme,
  isLoading = false
}) => {
  if (!showModal) return null;

  return (
    <ModalWrapper isClosing={isClosing} onClose={onClose} currentTheme={currentTheme}>
      <ModalContent isClosing={isClosing} currentTheme={currentTheme} onClick={(e) => e.stopPropagation()} maxWidth="max-w-md">
        <ModalHeader 
          title="Ban User" 
          subtitle={`Permanently ban ${targetUser?.username || 'this user'} from the website?`}
          onClose={onClose}
          currentTheme={currentTheme}
        />

        <div className="px-6 py-4">
          <div 
            className="rounded-lg px-4 py-3 flex items-start gap-3"
            style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}
          >
            <i className="ri-alert-line text-xl mt-0.5" style={{ color: '#ef4444' }} />
            <div>
              <p className="text-sm font-semibold font-inter mb-1" style={{ color: '#ef4444' }}>
                Critical Action
              </p>
              <p className="text-xs font-inter leading-relaxed" style={{ color: currentTheme.text.secondary }}>
                The banned user will no longer be able to access the entire website until manually unbanned by an administrator.
              </p>
            </div>
          </div>
        </div>

        <ModalFooter
          onCancel={onClose}
          onConfirm={onConfirm}
          confirmText={isLoading ? 'Banning...' : 'Ban User'}
          confirmDisabled={isLoading}
          currentTheme={currentTheme}
          isLoading={isLoading}
          confirmIcon="ri-forbid-line"
          confirmColor="#ef4444"
        />
      </ModalContent>
    </ModalWrapper>
  );
};

// Notification Settings Modal
export const NotificationModal = ({ 
  showModal, 
  isClosing, 
  onClose, 
  conversationName, 
  preference, 
  setPreference, 
  onSave, 
  currentTheme 
}) => {
  if (!showModal) return null;

  const options = [
    { value: 'all', label: 'All Messages', desc: 'Get notified for every message' },
    { value: 'mentions', label: 'Only @mentions', desc: "Only notify when you're mentioned" },
    { value: 'nothing', label: 'Nothing', desc: 'Mute this conversation' },
  ];

  return (
    <ModalWrapper isClosing={isClosing} onClose={onClose} currentTheme={currentTheme}>
      <ModalContent isClosing={isClosing} currentTheme={currentTheme} onClick={(e) => e.stopPropagation()}>
        <ModalHeader 
          title="Notification Settings" 
          subtitle={`Manage notifications for ${conversationName}`}
          onClose={onClose}
          currentTheme={currentTheme}
        />

        <div className="px-6 py-4">
          <div className="space-y-2">
            {options.map((opt) => (
              <label 
                key={opt.value}
                className="flex items-center justify-between cursor-pointer py-2.5 transition-colors"
                onClick={() => setPreference(opt.value)}
              >
                <div>
                  <p className="text-sm font-inter" style={{ color: currentTheme.text.primary }}>
                    {opt.label}
                  </p>
                  <p className="text-xs font-inter mt-0.5" style={{ color: currentTheme.text.tertiary }}>
                    {opt.desc}
                  </p>
                </div>
                <div 
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: preference === opt.value ? currentTheme.accent : currentTheme.border.secondary
                  }}
                >
                  {preference === opt.value && (
                    <div 
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: currentTheme.accent }}
                    ></div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        <ModalFooter
          onCancel={onClose}
          onConfirm={onSave}
          confirmText="Save Changes"
          confirmIcon="ri-check-line"
          currentTheme={currentTheme}
        />
      </ModalContent>
    </ModalWrapper>
  );
};

// Group Creation Modal
export const GroupModal = ({ 
  showModal, 
  isClosing, 
  onClose, 
  groupName, 
  setGroupName, 
  groupAvatar, 
  setGroupAvatar,
  groupAvatarFile,
  setGroupAvatarFile,
  onCreate, 
  isCreating, 
  currentTheme 
}) => {
  if (!showModal) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupAvatarFile(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setGroupAvatar(previewUrl);
    }
  };

  const clearAvatar = () => {
    setGroupAvatarFile(null);
    setGroupAvatar('');
  };

  return (
    <ModalWrapper isClosing={isClosing} onClose={onClose} currentTheme={currentTheme}>
      <ModalContent isClosing={isClosing} currentTheme={currentTheme} onClick={(e) => e.stopPropagation()}>
        <ModalHeader 
          title="Create Group Chat" 
          subtitle="Start a conversation with multiple people"
          onClose={onClose}
          currentTheme={currentTheme}
        />
        
        <div className="px-6 py-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2.5 font-pop" style={{ color: currentTheme.text.tertiary }}>
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && groupName.trim()) {
                  onCreate();
                }
              }}
              placeholder="Enter a name for your group"
              className="w-full px-4 py-3 rounded-lg border font-inter focus:outline-none transition-all select-text"
              style={{
                backgroundColor: currentTheme.bg.input,
                borderColor: currentTheme.border.primary,
                color: currentTheme.text.primary,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = currentTheme.primary;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${currentTheme.primary}20`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = currentTheme.border.primary;
                e.currentTarget.style.boxShadow = 'none';
              }}
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2.5 font-pop" style={{ color: currentTheme.text.tertiary }}>
              Group Avatar (Optional)
            </label>
            
            {/* Preview if avatar is set */}
            {groupAvatar && (
              <div className="mb-3 flex items-center gap-3">
                <img 
                  src={groupAvatar} 
                  alt="Group avatar preview" 
                  className="w-16 h-16 rounded-full object-cover"
                  style={{ borderColor: currentTheme.border.primary, borderWidth: '2px' }}
                />
                <button
                  onClick={clearAvatar}
                  className="px-3 py-1.5 rounded-md font-medium text-sm transition-all cursor-pointer font-inter"
                  style={{
                    backgroundColor: currentTheme.bg.hover,
                    color: currentTheme.text.secondary
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = currentTheme.border.secondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                  }}
                >
                  Remove
                </button>
              </div>
            )}

            {/* File upload button */}
            <div className="flex gap-3">
              <label 
                className="px-4 py-2.5 rounded-lg font-medium transition-all cursor-pointer font-inter inline-flex items-center gap-2"
                style={{
                  backgroundColor: currentTheme.bg.hover,
                  color: currentTheme.text.primary,
                  border: `1px solid ${currentTheme.border.primary}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = currentTheme.border.secondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                }}
              >
                <i className="ri-upload-2-line"></i>
                Upload Image
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="mt-2 text-xs font-inter" style={{ color: currentTheme.text.muted }}>
              Accepts JPG, PNG, WebP, or GIF (max 10MB)
            </p>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: currentTheme.border.primary }}>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg font-medium transition-all cursor-pointer font-inter"
            style={{
              backgroundColor: 'transparent',
              color: currentTheme.text.secondary
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={!groupName.trim() || isCreating}
            className="px-5 py-2.5 rounded-lg font-medium transition-all font-inter cursor-pointer"
            style={{
              backgroundColor: groupName.trim() && !isCreating ? `${currentTheme.accent}cc` : currentTheme.bg.hover,
              color: groupName.trim() && !isCreating ? '#ffffff' : currentTheme.text.tertiary,
              cursor: groupName.trim() && !isCreating ? 'pointer' : 'not-allowed',
              transform: groupName.trim() && !isCreating ? 'scale(1)' : 'scale(0.98)',
              opacity: groupName.trim() && !isCreating ? 1 : 0.5
            }}
            onMouseEnter={(e) => {
              if (groupName.trim() && !isCreating) {
                e.currentTarget.style.backgroundColor = `${currentTheme.accent}ee`;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor  = groupName.trim() && !isCreating ? `${currentTheme.accent}cc` : currentTheme.bg.hover;
            }}
          >
            {isCreating ? (
              <span className="flex items-center gap-2">
                <i className="ri-loader-4-line animate-spin"></i>
                Creating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <i className="ri-check-line"></i>
                Create Group
              </span>
            )}
          </button>
        </div>
      </ModalContent>
    </ModalWrapper>
  );
};

// Delete Group Chat Modal
export const DeleteGroupModal = ({ 
  showModal, 
  isClosing, 
  onClose, 
  groupName, 
  onConfirm, 
  currentTheme,
  isDeleting = false
}) => {
  const [confirmChecked, setConfirmChecked] = React.useState(false);

  React.useEffect(() => {
    if (!showModal) {
      setConfirmChecked(false);
    }
  }, [showModal]);

  if (!showModal) return null;

  return (
    <ModalWrapper isClosing={isClosing} onClose={onClose} currentTheme={currentTheme}>
      <ModalContent isClosing={isClosing} currentTheme={currentTheme} onClick={(e) => e.stopPropagation()} maxWidth="max-w-md">
        <ModalHeader 
          title="Delete Group Chat" 
          subtitle={`Are you sure you want to delete ${groupName || 'this group'}?`}
          onClose={onClose}
          currentTheme={currentTheme}
        />

        <div className="px-6 py-4 space-y-4">
          <div 
            className="rounded-lg px-4 py-3 flex items-start gap-3"
            style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}
          >
            <i className="ri-alert-line text-xl mt-0.5" style={{ color: '#ef4444' }} />
            <div>
              <p className="text-sm font-semibold font-inter mb-1" style={{ color: '#ef4444' }}>
                Warning
              </p>
              <p className="text-xs font-inter leading-relaxed" style={{ color: currentTheme.text.secondary }}>
                All messages and content in the group will be permanently deleted for every member. This action cannot be undone.
              </p>
            </div>
          </div>

          <label
            className="flex items-start gap-3 px-3 py-2.5 rounded cursor-pointer transition-colors"
            style={{
              backgroundColor: confirmChecked ? currentTheme.bg.hover : 'transparent',
              opacity: isDeleting ? 0.6 : 1,
              pointerEvents: isDeleting ? 'none' : 'auto'
            }}
            onMouseEnter={(e) => {
              if (!isDeleting) {
                e.currentTarget.style.backgroundColor = currentTheme.bg.tertiary;
              }
            }}
            onMouseLeave={(e) => {
              if (!isDeleting) {
                e.currentTarget.style.backgroundColor = confirmChecked ? currentTheme.bg.hover : 'transparent';
              }
            }}
          >
            <input
              type="checkbox"
              checked={confirmChecked}
              onChange={(e) => setConfirmChecked(e.target.checked)}
              disabled={isDeleting}
              className="sr-only"
            />
            
            <div
              className="w-5 h-5 rounded flex items-center justify-center transition-all flex-shrink-0 mt-0.5"
              style={{
                border: `2px solid ${confirmChecked ? '#ef4444' : currentTheme.border.secondary}`,
                backgroundColor: confirmChecked ? '#ef4444' : 'transparent'
              }}
            >
              {confirmChecked && (
                <i className="ri-check-line text-sm text-white"></i>
              )}
            </div>

            <div>
              <p className="text-sm font-medium font-inter" style={{ color: currentTheme.text.primary }}>
                I understand this action is irreversible
              </p>
              <p className="text-xs font-inter mt-0.5" style={{ color: currentTheme.text.tertiary }}>
                This will permanently delete all group data
              </p>
            </div>
          </label>
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: currentTheme.border.primary }}>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-lg font-medium transition-all cursor-pointer font-inter disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'transparent',
              color: currentTheme.text.secondary
            }}
            onMouseEnter={(e) => {
              if (!isDeleting) {
                e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
              }
            }}
            onMouseLeave={(e) => {
              if (!isDeleting) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!confirmChecked || isDeleting}
            className="px-5 py-2.5 rounded-lg font-medium transition-all cursor-pointer font-inter disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: confirmChecked && !isDeleting ? '#ef4444' : currentTheme.bg.hover,
              color: confirmChecked && !isDeleting ? '#ffffff' : currentTheme.text.tertiary,
              cursor: confirmChecked && !isDeleting ? 'pointer' : 'not-allowed'
            }}
            onMouseEnter={(e) => {
              if (confirmChecked && !isDeleting) {
                e.currentTarget.style.backgroundColor = '#dc2626';
              }
            }}
            onMouseLeave={(e) => {
              if (confirmChecked && !isDeleting) {
                e.currentTarget.style.backgroundColor = '#ef4444';
              }
            }}
          >
            <span className="flex items-center gap-2">
              {isDeleting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {!isDeleting && <i className="ri-delete-bin-line"></i>}
              {isDeleting ? 'Deleting...' : 'Delete Group'}
            </span>
          </button>
        </div>
      </ModalContent>
    </ModalWrapper>
  );
};

// Delete Direct Message Modal
export const DeleteDMModal = ({ 
  showModal, 
  isClosing, 
  onClose, 
  userName, 
  onConfirm, 
  currentTheme,
  isDeleting = false
}) => {
  const [confirmChecked, setConfirmChecked] = React.useState(false);

  React.useEffect(() => {
    if (!showModal) {
      setConfirmChecked(false);
    }
  }, [showModal]);

  if (!showModal) return null;

  return (
    <ModalWrapper isClosing={isClosing} onClose={onClose} currentTheme={currentTheme}>
      <ModalContent isClosing={isClosing} currentTheme={currentTheme} onClick={(e) => e.stopPropagation()} maxWidth="max-w-md">
        <ModalHeader 
          title="Delete Direct Message" 
          subtitle={`Delete your conversation with ${userName || 'this user'}?`}
          onClose={onClose}
          currentTheme={currentTheme}
        />

        <div className="px-6 py-4 space-y-4">
          <div 
            className="rounded-lg px-4 py-3 flex items-start gap-3"
            style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}
          >
            <i className="ri-alert-line text-xl mt-0.5" style={{ color: '#ef4444' }} />
            <div>
              <p className="text-sm font-semibold font-inter mb-1" style={{ color: '#ef4444' }}>
                Warning
              </p>
              <p className="text-xs font-inter leading-relaxed" style={{ color: currentTheme.text.secondary }}>
                The entire conversation will be permanently deleted for both participants. This action cannot be undone.
              </p>
            </div>
          </div>

          <label
            className="flex items-start gap-3 px-3 py-2.5 rounded cursor-pointer transition-colors"
            style={{
              backgroundColor: confirmChecked ? currentTheme.bg.hover : 'transparent',
              opacity: isDeleting ? 0.6 : 1,
              pointerEvents: isDeleting ? 'none' : 'auto'
            }}
            onMouseEnter={(e) => {
              if (!isDeleting) {
                e.currentTarget.style.backgroundColor = currentTheme.bg.tertiary;
              }
            }}
            onMouseLeave={(e) => {
              if (!isDeleting) {
                e.currentTarget.style.backgroundColor = confirmChecked ? currentTheme.bg.hover : 'transparent';
              }
            }}
          >
            <input
              type="checkbox"
              checked={confirmChecked}
              onChange={(e) => setConfirmChecked(e.target.checked)}
              disabled={isDeleting}
              className="sr-only"
            />
            
            <div
              className="w-5 h-5 rounded flex items-center justify-center transition-all flex-shrink-0 mt-0.5"
              style={{
                border: `2px solid ${confirmChecked ? '#ef4444' : currentTheme.border.secondary}`,
                backgroundColor: confirmChecked ? '#ef4444' : 'transparent'
              }}
            >
              {confirmChecked && (
                <i className="ri-check-line text-sm text-white"></i>
              )}
            </div>

            <div>
              <p className="text-sm font-medium font-inter" style={{ color: currentTheme.text.primary }}>
                I understand this action is irreversible
              </p>
              <p className="text-xs font-inter mt-0.5" style={{ color: currentTheme.text.tertiary }}>
                This will permanently delete the entire chat for both
              </p>
            </div>
          </label>
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: currentTheme.border.primary }}>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-lg font-medium transition-all cursor-pointer font-inter disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'transparent',
              color: currentTheme.text.secondary
            }}
            onMouseEnter={(e) => {
              if (!isDeleting) {
                e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
              }
            }}
            onMouseLeave={(e) => {
              if (!isDeleting) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!confirmChecked || isDeleting}
            className="px-5 py-2.5 rounded-lg font-medium transition-all cursor-pointer font-inter disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: confirmChecked && !isDeleting ? '#ef4444' : currentTheme.bg.hover,
              color: confirmChecked && !isDeleting ? '#ffffff' : currentTheme.text.tertiary,
              cursor: confirmChecked && !isDeleting ? 'pointer' : 'not-allowed'
            }}
            onMouseEnter={(e) => {
              if (confirmChecked && !isDeleting) {
                e.currentTarget.style.backgroundColor = '#dc2626';
              }
            }}
            onMouseLeave={(e) => {
              if (confirmChecked && !isDeleting) {
                e.currentTarget.style.backgroundColor = '#ef4444';
              }
            }}
          >
            <span className="flex items-center gap-2">
              {isDeleting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {!isDeleting && <i className="ri-delete-bin-line"></i>}
              {isDeleting ? 'Deleting...' : 'Delete Chat'}
            </span>
          </button>
        </div>
      </ModalContent>
    </ModalWrapper>
  );
};

// Update Group Modal
export const UpdateGroupModal = ({ 
  showModal, 
  isClosing, 
  onClose, 
  groupName, 
  setGroupName, 
  groupAvatar, 
  setGroupAvatar,
  groupAvatarFile,
  setGroupAvatarFile,
  onUpdate, 
  isUpdating, 
  currentTheme,
  currentGroupAvatar 
}) => {
  if (!showModal) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupAvatarFile(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setGroupAvatar(previewUrl);
    }
  };

  const clearAvatar = () => {
    setGroupAvatarFile(null);
    setGroupAvatar('');
  };

  return (
    <ModalWrapper isClosing={isClosing} onClose={onClose} currentTheme={currentTheme}>
      <ModalContent isClosing={isClosing} currentTheme={currentTheme} onClick={(e) => e.stopPropagation()}>
        <ModalHeader 
          title="Update Group" 
          subtitle="Change the group name and avatar"
          onClose={onClose}
          currentTheme={currentTheme}
        />
        
        <div className="px-6 py-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2.5 font-pop" style={{ color: currentTheme.text.tertiary }}>
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && groupName.trim()) {
                  onUpdate();
                }
              }}
              placeholder="Enter a name for your group"
              className="w-full px-4 py-3 rounded-lg border font-inter focus:outline-none transition-all select-text"
              style={{
                backgroundColor: currentTheme.bg.input,
                borderColor: currentTheme.border.primary,
                color: currentTheme.text.primary,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = currentTheme.primary;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${currentTheme.primary}20`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = currentTheme.border.primary;
                e.currentTarget.style.boxShadow = 'none';
              }}
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2.5 font-pop" style={{ color: currentTheme.text.tertiary }}>
              Group Avatar (Optional)
            </label>
            
            {/* Preview if avatar is set or current avatar exists */}
            {(groupAvatar || currentGroupAvatar) && (
              <div className="mb-3 flex items-center gap-3">
                <img 
                  src={groupAvatar || currentGroupAvatar} 
                  alt="Group avatar preview" 
                  className="w-16 h-16 rounded-full object-cover"
                  style={{ borderColor: currentTheme.border.primary, borderWidth: '2px' }}
                />
                {groupAvatar && (
                  <button
                    onClick={clearAvatar}
                    className="px-3 py-1.5 rounded-md font-medium text-sm transition-all cursor-pointer font-inter"
                    style={{
                      backgroundColor: currentTheme.bg.hover,
                      color: currentTheme.text.secondary
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = currentTheme.border.secondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            )}

            {/* File upload button */}
            <div className="flex gap-3">
              <label 
                className="px-4 py-2.5 rounded-lg font-medium transition-all cursor-pointer font-inter inline-flex items-center gap-2"
                style={{
                  backgroundColor: currentTheme.bg.hover,
                  color: currentTheme.text.primary,
                  border: `1px solid ${currentTheme.border.primary}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = currentTheme.border.secondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                }}
              >
                <i className="ri-upload-2-line"></i>
                Upload New Image
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="mt-2 text-xs font-inter" style={{ color: currentTheme.text.muted }}>
              Accepts JPG, PNG, WebP, or GIF (max 10MB)
            </p>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: currentTheme.border.primary }}>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg font-medium transition-all cursor-pointer font-inter"
            style={{
              backgroundColor: 'transparent',
              color: currentTheme.text.secondary
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Cancel
          </button>
          <button
            onClick={onUpdate}
            disabled={!groupName.trim() || isUpdating}
            className="px-5 py-2.5 rounded-lg font-medium transition-all font-inter cursor-pointer"
            style={{
              backgroundColor: groupName.trim() && !isUpdating ? `${currentTheme.accent}cc` : currentTheme.bg.hover,
              color: groupName.trim() && !isUpdating ? '#ffffff' : currentTheme.text.tertiary,
              cursor: groupName.trim() && !isUpdating ? 'pointer' : 'not-allowed',
              transform: groupName.trim() && !isUpdating ? 'scale(1)' : 'scale(0.98)',
              opacity: groupName.trim() && !isUpdating ? 1 : 0.5
            }}
            onMouseEnter={(e) => {
              if (groupName.trim() && !isUpdating) {
                e.currentTarget.style.backgroundColor = `${currentTheme.accent}ee`;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor  = groupName.trim() && !isUpdating ? `${currentTheme.accent}cc` : currentTheme.bg.hover;
            }}
          >
            {isUpdating ? (
              <span className="flex items-center gap-2">
                <i className="ri-loader-4-line animate-spin"></i>
                Updating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <i className="ri-check-line"></i>
                Update Group
              </span>
            )}
          </button>
        </div>
      </ModalContent>
    </ModalWrapper>
  );
};

// Delete Message Modal
export const DeleteMessageModal = ({ 
  showModal, 
  isClosing, 
  onClose, 
  onConfirm, 
  currentTheme,
  isDeleting = false,
  isOwnMessage = true
}) => {
  if (!showModal) return null;

  return (
    <ModalWrapper isClosing={isClosing} onClose={onClose} currentTheme={currentTheme}>
      <ModalContent isClosing={isClosing} currentTheme={currentTheme} onClick={(e) => e.stopPropagation()} maxWidth="max-w-md">
        <ModalHeader 
          title="Delete Message" 
          subtitle={`Are you sure you want to delete this message?`}
          onClose={onClose}
          currentTheme={currentTheme}
        />

        <div className="px-6 py-4">
          <div 
            className="rounded-lg px-4 py-3 flex items-start gap-3"
            style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}
          >
            <i className="ri-alert-line text-xl mt-0.5" style={{ color: '#ef4444' }} />
            <div>
              <p className="text-sm font-semibold font-inter mb-1" style={{ color: '#ef4444' }}>
                Warning
              </p>
              <p className="text-xs font-inter leading-relaxed" style={{ color: currentTheme.text.secondary }}>
                {isOwnMessage 
                  ? 'This message will be permanently deleted. This action cannot be undone.'
                  : 'This will permanently delete another user\'s message. This action cannot be undone.'}
              </p>
            </div>
          </div>
        </div>

        <ModalFooter
          onCancel={onClose}
          onConfirm={onConfirm}
          confirmText={isDeleting ? 'Delete Message' : 'Delete Message'}
          confirmDisabled={isDeleting}
          currentTheme={currentTheme}
          isLoading={isDeleting}
          confirmIcon="ri-delete-bin-line"
          confirmColor="#ef4444"
        />
      </ModalContent>
    </ModalWrapper>
  );
};
