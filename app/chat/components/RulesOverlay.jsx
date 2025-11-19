import React from 'react';

const RulesOverlay = ({ onAccept, theme }) => {
  const themeStyles = {
    dark: {
      bg: '#080808',
      text: '#ffffff',
      textSecondary: '#b5b5b5',
      textTertiary: '#666666',
      accent: '#ea4197',
    },
    gray: {
      bg: '#1a1a1d',
      text: '#ffffff',
      textSecondary: '#94a1b2',
      textTertiary: '#6b7280',
      accent: '#ea4197',
    },
    blue: {
      bg: '#0f1419',
      text: '#ffffff',
      textSecondary: '#8899a6',
      textTertiary: '#6b7780',
      accent: '#1d9bf0',
    },
    purple: {
      bg: '#1a0d2e',
      text: '#ffffff',
      textSecondary: '#b8a5d8',
      textTertiary: '#8b7ba8',
      accent: '#a855f7',
    },
  };

  const currentTheme = themeStyles[theme] || themeStyles.dark;

  const rules = [
    'You must be 18 years or older to use the chat service.',
    'No posting or linking to images/videos of anyone under 18, including links to websites associated with illegal material.',
    'No spamming or flooding the rooms.',
    'No harassment of members or rooms.',
    'No requests for pictures/videos that violate the Terms of Use.',
    'No solicitation to use external instant messaging services (e.g., Telegram, Discord, etc).',
    'No discussion of underage persons.',
    'Disruptive or intentionally annoying behavior is prohibited.',
  ];

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: currentTheme.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        padding: '1rem',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: '600px',
          width: '100%',
          margin: 'auto',
          padding: '1rem 0',
        }}
      >
        <i
          className="ri-shield-check-line"
          style={{
            fontSize: 'clamp(3rem, 8vw, 4rem)',
            color: currentTheme.accent,
            marginBottom: '1rem',
            display: 'block',
          }}
        />

        <h1
          style={{
            fontSize: 'clamp(1.5rem, 5vw, 2rem)',
            fontWeight: '700',
            color: currentTheme.text,
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em',
            padding: '0 1rem',
          }}
        >
          Chat Rules & Guidelines
        </h1>

        <p
          style={{
            fontSize: 'clamp(0.875rem, 3vw, 1rem)',
            color: currentTheme.textSecondary,
            marginBottom: '1.5rem',
            lineHeight: '1.5',
            padding: '0 1rem',
          }}
        >
          Please review and accept the following terms before joining the chat
        </p>

        <div
          style={{
            textAlign: 'left',
            marginBottom: '1.5rem',
            maxHeight: 'none',
            paddingRight: '0.5rem',
            paddingLeft: '0.5rem',
          }}
          className="custom-scrollbar"
        >
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.875rem',
            }}
          >
            {rules.map((rule, index) => (
              <li
                key={index}
                style={{
                  display: 'flex',
                  gap: '0.625rem',
                  fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
                  color: currentTheme.textSecondary,
                  lineHeight: '1.6',
                }}
              >
                <span
                  style={{
                    color: currentTheme.accent,
                    fontWeight: '600',
                    flexShrink: 0,
                    minWidth: '1.25rem',
                  }}
                >
                  {index + 1}.
                </span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={onAccept}
          aria-label="Accept chat rules"
          title="Accept chat rules"
          style={{
            background: `${currentTheme.accent}15`,
            color: currentTheme.accent,
            padding: 'clamp(0.5rem, 2vw, 0.625rem) clamp(1rem, 4vw, 1.5rem)',
            borderRadius: '0.375rem',
            fontSize: 'clamp(0.875rem, 3vw, 0.95rem)',
            fontWeight: 600,
            border: `1px solid ${currentTheme.accent}`,
            cursor: 'pointer',
            transition: 'all 0.12s ease',
            outline: 'none',
            width: 'auto',
            minWidth: '120px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${currentTheme.accent}20`;
            e.currentTarget.style.boxShadow = `0 6px 12px ${currentTheme.accent}20`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = `${currentTheme.accent}15`,
            e.currentTarget.style.boxShadow = 'none';
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = `0 0 0 4px ${currentTheme.accent}20`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          I Accept & Agree
        </button>

        <p
          style={{
            fontSize: 'clamp(0.7rem, 2vw, 0.75rem)',
            color: currentTheme.textTertiary,
            marginTop: '1rem',
            padding: '0 1rem',
            marginBottom: '1rem',
          }}
        >
          By accepting, you confirm that you have read and agree to follow these rules
        </p>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${currentTheme.textTertiary};
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${currentTheme.accent};
        }

        @media (max-width: 640px) {
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
        }
      `}</style>
    </div>
  );
};

export default RulesOverlay;
