import React, { useMemo } from 'react';
import { TwemojiText } from './TwemojiContent';

export const TypingIndicator = ({ typingUsers, currentConversation, currentTheme }) => {
  // Get typing users for current conversation
  const typingUsersArray = useMemo(() => {
    if (!currentConversation) return [];
    const conversationTyping = typingUsers.get(currentConversation._id);
    if (!conversationTyping || conversationTyping.size === 0) return [];
    
    return Array.from(conversationTyping.values()).map(data => data.username);
  }, [typingUsers, currentConversation]);

  // Generate typing text based on number of users
  const typingText = useMemo(() => {
    const count = typingUsersArray.length;
    if (count === 0) return '';
    if (count === 1) return `${typingUsersArray[0]} is typing…`;
    if (count === 2) return `${typingUsersArray[0]} and ${typingUsersArray[1]} are typing…`;
    if (count === 3) return `${typingUsersArray[0]}, ${typingUsersArray[1]}, and ${typingUsersArray[2]} are typing…`;
    return 'Several people are typing…';
  }, [typingUsersArray]);

  if (typingUsersArray.length === 0) {
    return null;
  }

  return (
    <div 
      className="px-5 py-1.5 flex items-center gap-1.5 transition-opacity duration-150 ease-in-out"
      style={{ 
        backgroundColor: currentTheme.bg.primary,
        opacity: 1
      }}
    >
      <div className="max-w-[1100px] mx-auto w-full flex items-center gap-1.5">
        <div className="flex gap-0.5">
          <span 
            className="w-1 h-1 rounded-full"
            style={{ 
              backgroundColor: currentTheme.text.secondary,
              animation: 'typingDot 1.2s infinite',
              animationDelay: '0s'
            }}
          />
          <span 
            className="w-1 h-1 rounded-full"
            style={{ 
              backgroundColor: currentTheme.text.secondary,
              animation: 'typingDot 1.2s infinite',
              animationDelay: '0.15s'
            }}
          />
          <span 
            className="w-1 h-1 rounded-full"
            style={{ 
              backgroundColor: currentTheme.text.secondary,
              animation: 'typingDot 1.2s infinite',
              animationDelay: '0.3s'
            }}
          />
        </div>
        <span 
          className="text-xs font-medium font-inter"
          style={{ color: currentTheme.text.secondary }}
        >
          <TwemojiText text={typingText} />
        </span>
      </div>

      <style jsx>{`
        @keyframes typingDot {
          0%, 60%, 100% {
            opacity: 0.3;
          }
          30% {
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
};
