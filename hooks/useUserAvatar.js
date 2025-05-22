"use client";

import { useState, useEffect } from 'react';

/**
 * Custom hook to fetch user avatar with their color
 * @param {Object} user - The user object containing avatarColor
 * @returns {Object} - Contains the avatar URL and loading state
 */

export default function useUserAvatar(user) {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserAvatar = async () => {
      setError(null);

      if (!user || !user.avatarColor) {
        setAvatarUrl(null);
        return;
      }
      
      try {
        setIsLoading(true);
        const avatarBlobUrl = `/api/userAvatar?color=${encodeURIComponent(user.avatarColor)}`;
        setAvatarUrl(avatarBlobUrl);
      } catch (err) {
        console.error('Error fetching user avatar:', err);
        setError(err.message);
        setAvatarUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserAvatar();
  }, [user?.avatarColor]);

  return { avatarUrl, isLoading, error };
}