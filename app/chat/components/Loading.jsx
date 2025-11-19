import React, { useState, useEffect } from 'react';

// Loading Screen
export const LoadingScreen = ({ currentTheme, loadingMessages }) => {
  const [loadingIndex, setLoadingIndex] = useState(0);

  useEffect(() => {
    let interval = null;
    let timeout = null;

    timeout = setTimeout(() => {
      const pickRandom = () => Math.floor(1 + Math.random() * Math.max(1, loadingMessages.length - 1));
      setLoadingIndex(pickRandom());

      interval = setInterval(() => {
        setLoadingIndex(pickRandom());
      }, 2000);
    }, 2000);

    return () => {
      if (timeout) clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [loadingMessages.length]);

  return (
    <div className="h-screen flex overflow-hidden select-none" style={{ backgroundColor: currentTheme?.bg?.primary }}>
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 animate-spin" style={{ 
              borderColor: `${currentTheme?.accent}30`,
              borderTopColor: currentTheme?.accent,
              animationDuration: '1s'
            }}></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <i className="ri-chat-heart-line text-2xl" style={{ color: currentTheme?.accent }}></i>
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-medium mb-1" style={{ color: currentTheme?.text?.secondary }}>
              {loadingMessages[loadingIndex]}
            </div>
            <div className="text-xs" style={{ color: currentTheme?.text?.tertiary }}>
              Please wait while we connect you
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Skeleton Loaders
export const ConversationSkeleton = ({ currentTheme }) => (
  <div className="px-3 space-y-2">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="py-3 flex items-center gap-3 animate-pulse">
        <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: currentTheme.bg.tertiary }}></div>
        <div className="flex-1 space-y-2">
          <div className="h-3 rounded" style={{ backgroundColor: currentTheme.bg.tertiary, width: '60%' }}></div>
          <div className="h-2 rounded" style={{ backgroundColor: currentTheme.bg.tertiary, width: '80%' }}></div>
        </div>
      </div>
    ))}
  </div>
);

export const MessageSkeleton = ({ currentTheme, rows = 8 }) => {
  // Generate random message patterns
  const generateMessagePattern = () => {
    const patterns = [];
    const messageCount = rows || 8;
    
    for (let i = 0; i < messageCount; i++) {
      const random = Math.random();
      
      if (random < 0.35) {
        // Image message (≈35% chance)
        patterns.push({
          type: 'image',
          lines: Math.random() > 0.6 ? [Math.random() * 40 + 40] : [], // Optional caption
          imageSize: Math.random() > 0.5 ? 'small' : 'medium'
        });
      } else {
        // Text message (≈65% chance)
        const lineCount = Math.random() > 0.7 ? 3 : Math.random() > 0.4 ? 2 : 1;
        const lines = [];
        for (let j = 0; j < lineCount; j++) {
          lines.push(Math.random() * 40 + 40); // Width between 40-80%
        }
        patterns.push({
          type: 'text',
          lines
        });
      }
    }
    
    return patterns;
  };

  const [patterns] = useState(() => generateMessagePattern());

  return (
    <div className="px-5 space-y-5">
      {patterns.map((pattern, i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: currentTheme.bg.tertiary }}></div>
          
          <div className="flex-1 space-y-2">
            {/* Username and timestamp */}
            <div className="flex items-center gap-2">
              <div className="h-3.5 rounded" style={{ backgroundColor: currentTheme.bg.tertiary, width: `${Math.random() * 20 + 15}%` }}></div>
              <div className="h-2.5 rounded" style={{ backgroundColor: currentTheme.bg.tertiary, width: '35px' }}></div>
            </div>
            
            {/* Message content */}
            {pattern.type === 'text' ? (
              <div className="space-y-2">
                {pattern.lines.map((width, j) => (
                  <div 
                    key={j} 
                    className="h-3.5 rounded" 
                    style={{ 
                      backgroundColor: currentTheme.bg.tertiary, 
                      width: `${width}%`,
                      maxWidth: j === pattern.lines.length - 1 ? `${width}%` : '100%'
                    }}
                  ></div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Image placeholder */}
                <div 
                  className="rounded-lg" 
                  style={{ 
                    backgroundColor: currentTheme.bg.tertiary,
                    width: pattern.imageSize === 'small' ? '180px' : '240px',
                    height: pattern.imageSize === 'small' ? '180px' : '240px'
                  }}
                ></div>
                {/* Optional caption */}
                {pattern.lines.length > 0 && (
                  <div className="h-3.5 rounded" style={{ backgroundColor: currentTheme.bg.tertiary, width: `${pattern.lines[0]}%` }}></div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export const MemberSkeleton = ({ currentTheme }) => (
  <div className="space-y-2">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex items-center gap-3 px-2 py-2 animate-pulse">
        <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: currentTheme.bg.tertiary }}></div>
        <div className="flex-1 space-y-1.5">
          <div className="h-3 rounded" style={{ backgroundColor: currentTheme.bg.tertiary, width: '70%' }}></div>
          <div className="h-2 rounded" style={{ backgroundColor: currentTheme.bg.tertiary, width: '50%' }}></div>
        </div>
      </div>
    ))}
  </div>
);
