"use client";
import { useEffect, useRef } from 'react';

const PrestitialAd = ({ 
  delay = 1000, 
  width = '85%', 
  height = '85%',
  adUrl = 'https://t.mbslr2.com/324742/8780/0?bo=2779,2778,2777,2776,2775&po=6533&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0016'
}) => {
  const popupShown = useRef(false);

  useEffect(() => {
    if (popupShown.current) {
      return;
    }

    const timer = setTimeout(() => {
      createPopup();
      popupShown.current = true;
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, adUrl]);

  const createPopup = () => {
    if (document.querySelector('.postitial-overlay')) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'postitial-overlay';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background-color: rgba(0, 0, 0, 0.5); z-index: 10000;
      display: flex; justify-content: center; align-items: center;
      animation: fadeIn 0.3s ease-in-out;
      opacity: 0; visibility: hidden;
    `;

    const popup = document.createElement('div');
    popup.style.cssText = `
      width: ${width}; height: ${height}; background: white; border: 1px solid #000;
      border-radius: 8px; position: relative; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease-out; overflow: hidden;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute; top: 10px; right: 15px; background: #000; color: #fff;
      border: none; width: 30px; height: 30px; border-radius: 50%; cursor: pointer;
      font-size: 18px; z-index: 10001; font-weight: bold;
      transition: background-color 0.2s ease;
    `;

    closeBtn.onmouseover = () => {
      closeBtn.style.backgroundColor = '#333';
    };

    closeBtn.onmouseout = () => {
      closeBtn.style.backgroundColor = '#000';
    };

    const iframe = document.createElement('iframe');
    iframe.src = adUrl;
    iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
    iframe.allow = 'autoplay; encrypted-media';
    iframe.sandbox = 'allow-scripts allow-same-origin allow-popups allow-forms';

    iframe.onload = () => {
      overlay.style.opacity = '1';
      overlay.style.visibility = 'visible';
    };

    iframe.onerror = () => {
      console.log('Iframe blocked by X-Frame-Options, opening in new window...');
      window.open(adUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      closePopup();
    };

    const fallbackTimer = setTimeout(() => {
      if (overlay.style.opacity === '0') {
        console.log('Iframe taking too long to load, showing popup anyway...');
        overlay.style.opacity = '1';
        overlay.style.visibility = 'visible';
      }
    }, 10000);

    iframe.onload = () => {
      clearTimeout(fallbackTimer);
      overlay.style.opacity = '1';
      overlay.style.visibility = 'visible';
    };

    const closePopup = () => {
      overlay.style.animation = 'fadeOut 0.3s ease-in-out';
      setTimeout(() => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
      }, 300);
    };

    closeBtn.onclick = closePopup;
    
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closePopup();
      }
    };

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        closePopup();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);

    if (!document.querySelector('#postitial-styles')) {
      const style = document.createElement('style');
      style.id = 'postitial-styles';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    popup.appendChild(iframe);
    popup.appendChild(closeBtn);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
  };

  return null;
};

export default PrestitialAd;