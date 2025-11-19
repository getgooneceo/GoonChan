import React, { useRef, useEffect, useState, useMemo, useDeferredValue } from 'react';
import { parseEmoji } from '../../../lib/twemoji';

// Twemoji-enabled textarea component
// Shows Twemoji preview overlay while maintaining native textarea for input
export const TwemojiTextarea = ({ 
  value, 
  onChange, 
  onKeyDown,
  placeholder,
  disabled,
  className,
  style,
  rows = 1,
  currentTheme,
  textareaRef
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const overlayRef = useRef(null);
  const overlayContentRef = useRef(null);
  const internalRef = useRef(null);
  const inputRef = textareaRef || internalRef;
  
  // Quick test for presence of emojis (fast path)
  const emojiQuickRegex = useMemo(() => /[\u2190-\u21FF\u2300-\u23FA\u2400-\u27BF\u2B05-\u2B55\u2600-\u26FF]|\p{Extended_Pictographic}/u, []);
  const deferredValue = useDeferredValue(value);

  const mightHaveEmojis = useMemo(() => Boolean(value) && emojiQuickRegex.test(value), [value, emojiQuickRegex]);

  // Parse emoji for preview (deferred to keep typing responsive)
  const previewHtml = useMemo(() => {
    if (!deferredValue || !mightHaveEmojis) return '';
    return parseEmoji(deferredValue, { size: '1.2em' });
  }, [deferredValue, mightHaveEmojis]);

  // Determine if parsed content actually contains emojis
  const hasEmojis = useMemo(() => {
    return Boolean(mightHaveEmojis) && typeof previewHtml === 'string' && previewHtml.includes('<img');
  }, [mightHaveEmojis, previewHtml]);
  
  // Sync scroll between textarea and overlay
  const handleScroll = () => {
    if (overlayContentRef.current && inputRef.current) {
      const { scrollTop, scrollLeft } = inputRef.current;
      // Translate inner overlay content opposite to textarea scroll so the
      // visible region stays aligned while keeping overlay container clipped.
      overlayContentRef.current.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
    }
  };
  
  // Prevent scroll chaining when the textarea hits its top/bottom so the page
  // doesn't "bounce" and shift surrounding layout.
  const handleWheel = (e) => {
    const el = inputRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const deltaY = e.deltaY;
    const atTop = scrollTop <= 0;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 1; // tolerate float rounding
    if ((atTop && deltaY < 0) || (atBottom && deltaY > 0)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.addEventListener('scroll', handleScroll);
      return () => textarea.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Ensure the overlay position is correct on first render and whenever the
  // content changes (which can alter scrollTop due to auto-resize logic).
  useEffect(() => {
    handleScroll();
  }, [value, rows]);

  // Keep overlay text metrics perfectly in sync with the textarea so emoji
  // images line up across wrapped/multiline content.
  const syncOverlayMetrics = () => {
    const ta = inputRef.current;
    const oc = overlayContentRef.current;
    if (!ta || !oc) return;
    const cs = window.getComputedStyle(ta);
    // Use the shorthand 'font' to capture family/weight/size/line-height in one shot
    oc.style.font = cs.font;
    oc.style.lineHeight = cs.lineHeight;
    oc.style.letterSpacing = cs.letterSpacing;
    oc.style.wordBreak = cs.wordBreak;
    oc.style.whiteSpace = cs.whiteSpace; // should be pre-wrap for textarea
    oc.style.tabSize = cs.tabSize;
    oc.style.textIndent = cs.textIndent;
    // Mirror text align to keep image positioning for RTL/centered text
    oc.style.textAlign = cs.textAlign;
    // Ensure box sizing alignment so paddings map 1:1
    oc.style.boxSizing = cs.boxSizing;
  };

  useEffect(() => {
    syncOverlayMetrics();
  });
  
  return (
    <div style={{ position: 'relative', width: '100%', overscrollBehavior: 'contain' }}>
      {/* Twemoji preview overlay (only shows emoji images, text is transparent) */}
      {hasEmojis && (
        <div
          ref={overlayRef}
          aria-hidden="true"
          className={`absolute inset-0 pointer-events-none overflow-hidden ${className || ''}`}
          style={{
            // The container is only a clipping layer; paddings remain here
            paddingLeft: style?.paddingLeft || style?.padding,
            paddingRight: style?.paddingRight || style?.padding,
            paddingTop: style?.paddingTop || style?.padding,
            paddingBottom: style?.paddingBottom || style?.padding,
            boxSizing: 'border-box',
            zIndex: 3, // stay above the native textarea content so images overlay emojis
            background: 'transparent',
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
            mixBlendMode: 'normal',
            contain: 'paint'
          }}
        >
          <div
            ref={overlayContentRef}
            className="whitespace-pre-wrap break-words select-text"
            style={{
              // Render full text + twemoji images above the textarea so native
              // emoji glyphs underneath can be fully transparent yet still copyable.
              color: style?.color || currentTheme?.text?.secondary,
              userSelect: 'text',
              willChange: 'transform'
            }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      )}

      {/* Actual textarea (shows native text and caret; overlay images sit above visually) */}
      <textarea
        ref={inputRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onWheel={handleWheel}
        onFocus={() => setIsFocused(true)}
        maxLength={1000}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        rows={rows}
        style={{
          ...style,
          position: 'relative',
          zIndex: 2,
          // Hide all underlying glyphs so native emojis don't show; overlay renders text + images.
          color: hasEmojis ? 'transparent' : (style?.color || currentTheme?.text.secondary),
          caretColor: style?.color || currentTheme?.text.secondary,
          background: 'transparent',
          overscrollBehaviorY: 'contain' // keep scroll contained within textarea
        }}
      />
    </div>
  );
};
