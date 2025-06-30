"use client";
import { useEffect, useRef } from 'react';

const ChatHeadAd = () => {
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (!scriptLoaded.current) {
      const script = document.createElement('script');
      script.defer = true;
      script.src = "https://crxcr1.com/im_jerky?landing_id=%7Boffer_url_id%7D&genders=f%2Cff&providersId=27&skin=1&containerAlignment=center&cols=1&rows=1&number=1&background=transparent&useFeed=1&animateFeed=1&smoothAnimation=1&ratio=1&verticalSpace=10px&horizontalSpace=10px&colorFilter=0&colorFilterStrength=0&AuxiliaryCSS=%0A&lang=en&token=949d6da0-5582-11f0-aa39-058024ced544&api_key=3fbc83bcff2f0d2eeb4792818d564de206f9d4dfc6e8913fbb28c7c8fab9960d";
      
      document.head.appendChild(script);
      scriptLoaded.current = true;
    }
  }, []);

  return (
    <></>
  );
};

export default ChatHeadAd;