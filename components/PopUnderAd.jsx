"use client";
import { useEffect, useRef } from 'react';

/**
 * PopUnderAd Component - DEPRECATED
 * 
 * Popunder ads are now handled directly in VideoGrid component
 * with dynamic URLs from the backend admin settings.
 * 
 * This file is kept for reference only.
 */

const PopUnderAd = () => {
  return null;
};

export default PopUnderAd;

/**
 * usePopUnderLink Hook - DEPRECATED
 * 
 * Popunder logic is now integrated directly into VideoGrid component.
 * URLs are managed through backend admin settings and passed via props.
 */
export const usePopUnderLink = () => {
  const createPopUnderLink = (href) => {
    return (e) => {
      e.preventDefault();
      window.location.href = href;
    };
  };

  return { createPopUnderLink };
};