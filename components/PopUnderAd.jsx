"use client";
import { useEffect, useRef } from 'react';

const PopUnderAd = () => {
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current || document.querySelector('script[src*="mnpw3.js"]')) {
      return;
    }

    const script1 = document.createElement('script');
    script1.type = 'text/javascript';
    script1.src = '//static.scptpz.com/mnpw3.js';
    script1.async = true;
    
    script1.onload = () => {
      setTimeout(() => {
        try {
          const script2 = document.createElement('script');
          script2.innerHTML = `
            if (typeof mnpw !== 'undefined') {
              mnpw.add('https://t.mbslr2.com/324742/8780/0?bo=2779,2C2778,2C2777,2C2776,2C2775&po=6533&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0005&pud=scptpz', {
                newTab: true, 
                cookieExpires: 86401
              });
            }
          `;
          document.head.appendChild(script2);
          scriptLoaded.current = true;
        } catch (error) {
          console.error('Error loading pop-under config:', error);
        }
      }, 200);
    };

    document.head.appendChild(script1);

    return () => {
      if (scriptLoaded.current) {
        const scripts = document.querySelectorAll('script[src*="mnpw3.js"]');
        scripts.forEach(script => {
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
        });
        scriptLoaded.current = false;
      }
    };
  }, []);

  return null;
};

export default PopUnderAd;

export const usePopUnderLink = () => {
  const createPopUnderLink = (href, delay = 100) => {
    return (e) => {
      e.preventDefault();

      try {
        window.open(href, '_blank');
      } catch (error) {
        console.log('Failed to open content in new tab');
      }

      setTimeout(() => {
        try {
          window.location.href = 'https://t.mbslr2.com/324742/8780/0?bo=2779,2C2778,2C2777,2C2776,2C2775&po=6533&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0005&pud=scptpz';
        } catch (error) {
          console.log('Pop-under redirect failed');
        }
      }, delay);
    };
  };

  return { createPopUnderLink };
};