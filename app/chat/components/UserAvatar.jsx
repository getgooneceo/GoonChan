import React from 'react';
import useUserAvatar from '../../../hooks/useUserAvatar';

export const UserAvatar = ({ user, className, onClick, alt, size }) => {
  const { avatarUrl } = useUserAvatar(user);
  const finalSrc = user?.avatar || avatarUrl;
  
  return (
    <img 
      src={finalSrc}
      onError={(e) => {
        // On error, try the hook URL if we haven't already
        if (avatarUrl && e.target.src !== avatarUrl) {
          e.target.src = avatarUrl;
        }
      }}
      alt={alt || user?.username}
      className={className}
      onClick={onClick}
    />
  );
};
