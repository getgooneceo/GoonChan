import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { parseEmoji, extractNativeEmojis } from '../../../lib/twemoji';
import '../markdown-styles.css';

const emojiQuickRegex = /[\u{1F300}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2700}-\u{27BF}]/u;

const emojiCountRegex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;

const MessageContentInner = ({
  content,
  currentTheme,
  isLast,
  previews: serverPreviews = [],
  showAvatar = true,
  replyTo = null,
  isEdited = false,
  hideTextContent = false,
  mentionUsernames = [],
  conversationParticipants = [],
  onMentionClick = null,
}) => {
  const previews = useMemo(() => Array.isArray(serverPreviews) ? serverPreviews.slice(0, 2) : [] , [serverPreviews]);
  const hasPreviews = previews.length > 0;
  // Map image url -> kind: 'banner' | 'thumb' | null
  const [imageKinds, setImageKinds] = useState({});
  // Track which images have loaded to show skeletons
  const [loadedImages, setLoadedImages] = useState(new Set());
  // Track loaded GIFs (direct .gif links in the message content)
  const [loadedGifs, setLoadedGifs] = useState(new Set());
  const skeletonScrollSentRef = useRef(false);

  const extractUrls = (text, limit = 2) => {
    const regex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const matches = text.match(regex) || [];
    const picked = [];
    for (const m of matches) {
      if (picked.length >= limit) break;
      const esc = m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const mdPattern = new RegExp(`\\[[^\\]]+\\]\\(${esc}\\)`);
      if (mdPattern.test(text)) continue;
      picked.push(m);
    }
    return picked;
  };

  const gifUrls = useMemo(() => {
    const regex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*\.gif(\?[^\s]*)?)/gi;
    const matches = content.match(regex) || [];
    return matches.filter(url => {
      const esc = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const mdPattern = new RegExp(`\\[[^\\]]+\\]\\(${esc}\\)`);
      return !mdPattern.test(content);
    });
  }, [content]);
  
  const contentWithoutGifs = useMemo(() => {
    let result = content;
    gifUrls.forEach(url => {
      result = result.replace(url, '').trim();
    });
    return result;
  }, [content, gifUrls]);

  const contentHasEmoji = useMemo(() => emojiQuickRegex.test(contentWithoutGifs), [contentWithoutGifs]);

  const emojiOnlyInfo = useMemo(() => {
    const trimmed = contentWithoutGifs.trim();
    if (!trimmed) return { isEmojiOnly: false, count: 0 };

    const emojiMatches = trimmed.match(emojiCountRegex);
    if (!emojiMatches) return { isEmojiOnly: false, count: 0 };

    const textWithoutEmoji = trimmed.replace(emojiCountRegex, '').trim();
    const hasOnlyEmojis = textWithoutEmoji.length === 0;
    const emojiCount = emojiMatches.length;
    
    return {
      isEmojiOnly: hasOnlyEmojis && emojiCount <= 4 && emojiCount > 0,
      count: emojiCount
    };
  }, [contentWithoutGifs]);
  
  const contentWithEmoji = useMemo(() => {

    const emojiSize = emojiOnlyInfo.isEmojiOnly ? '3em' : '1.2em';
    return contentHasEmoji ? parseEmoji(contentWithoutGifs, { size: emojiSize }) : contentWithoutGifs;
  }, [contentWithoutGifs, contentHasEmoji, emojiOnlyInfo.isEmojiOnly]);

  const mentionLookup = useMemo(() => {
    if (!Array.isArray(mentionUsernames) || mentionUsernames.length === 0) return null;
    const set = new Set();
    mentionUsernames.forEach(name => {
      if (typeof name === 'string' && name.trim()) {
        set.add(name.toLowerCase());
      }
    });
    return set.size ? set : null;
  }, [mentionUsernames]);

  const contentWithMentions = useMemo(() => {
    if (!mentionLookup) return contentWithEmoji;
    return contentWithEmoji.replace(/(^|[^@A-Za-z0-9_.-])@([A-Za-z0-9_.-]{1,32})/g, (match, boundary, name) => {
      if (!mentionLookup.has(name.toLowerCase())) return match;
      const safeName = name.replace(/"/g, '&quot;');
      return `${boundary}<span class="mention-chip" data-username="${safeName}">@${name}</span>`;
    });
  }, [contentWithEmoji, mentionLookup]);
  
  const firstTwoUrls = useMemo(() => extractUrls(content, 2), [content]);

  const hasGifInFirstTwo = useMemo(() => {
    return firstTwoUrls.some(u => typeof u === 'string' && /\.gif(\?|$)/i.test(u));
  }, [firstTwoUrls]);
  
  const shouldShowSkeletons = firstTwoUrls.length > 0 && !hasGifInFirstTwo && !hasPreviews;

  // Heuristic: decide if preview.image should be big banner or right-side thumbnail
  useEffect(() => {
    const nextKinds = {};
    const imgsToMeasure = [];
    (previews || []).forEach(pv => {
      if (pv?.image && !imageKinds[pv.image]) {
        imgsToMeasure.push(pv.image);
      } else if (pv?.image && imageKinds[pv.image]) {
        nextKinds[pv.image] = imageKinds[pv.image];
      }
    });

    if (imgsToMeasure.length === 0) return;

    let cancelled = false;
      const loaders = imgsToMeasure.map(url => new Promise(resolve => {
      const img = new Image();
      const settle = () => resolve({ url, width: img.naturalWidth, height: img.naturalHeight });
      img.onload = settle;
      img.onerror = settle;
      img.src = url;
    }));

    Promise.all(loaders).then(results => {
      if (cancelled) return;
      const updated = { ...imageKinds };
      for (const { url, width, height } of results) {
        // If no dims, fall back to filename heuristic
        const lower = String(url || '').toLowerCase();
        const nameHint = /(logo|icon|favicon|avatar|badge)/.test(lower);
        let kind = 'thumb';
        if (width && height) {
          const aspect = width / Math.max(1, height);
          // Prefer banner for landscape or reasonably wide images. This makes OG thumbnails
          // show large preview (like Discord) instead of a small right-side thumbnail.
          if (aspect >= 1.0 || width >= 600) kind = 'banner';
          else kind = 'thumb';
        } else if (!nameHint) {
          // No dimensions but not obviously an icon -> default to banner
          kind = 'banner';
        }
        updated[url] = kind;
      }
      setImageKinds(updated);
    });

    return () => { cancelled = true; };
  }, [previews]);

  // Markdown component overrides
  const components = {
    a: ({ href, children, ...props }) => {
      const external = href?.startsWith('http');
      return (
        <a
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          className="hover:underline"
          style={{ color: '#00b0f4', textDecoration: 'none', cursor: 'pointer' }}
          {...props}
        >
          {children}
        </a>
      );
    },
    code: ({ inline, children, ...props }) => {
      if (inline) {
        return (
          <code
            className="px-1.5 py-0.5 rounded text-[13px] font-mono"
            style={{ backgroundColor: currentTheme.bg.tertiary, color: '#eb459e', fontWeight: 500 }}
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <code
          className="block p-3 rounded-md my-2 overflow-x-auto border text-[13px] font-mono"
          style={{ backgroundColor: currentTheme.bg.tertiary, borderColor: currentTheme.border.primary, color: currentTheme.text.secondary }}
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ children, ...props }) => (
      <div
        className="p-3 rounded-md my-2 overflow-x-auto border"
        style={{ backgroundColor: currentTheme.bg.tertiary, borderColor: currentTheme.border.primary }}
        {...props}
      >
        {children}
      </div>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="border-l-4 pl-3 my-2 py-1"
        style={{ borderColor: currentTheme.border.secondary, color: currentTheme.text.secondary, backgroundColor: `${currentTheme.bg.tertiary}40`, borderRadius: '0 4px 4px 0' }}
        {...props}
      >
        {children}
      </blockquote>
    ),
    strong: ({ children, ...props }) => (
      <strong style={{ color: currentTheme.text.primary, fontWeight: 700 }} {...props}>{children}</strong>
    ),
    em: ({ children, ...props }) => (
      <em style={{ fontStyle: 'italic' }} {...props}>{children}</em>
    ),
    del: ({ children, ...props }) => (
      <del style={{ textDecoration: 'line-through', opacity: 0.7 }} {...props}>{children}</del>
    ),
    ul: ({ children, ...props }) => (
      <ul className="list-disc my-1 space-y-0.5" style={{ color: currentTheme.text.secondary }} {...props}>{children}</ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="list-decimal my-1 space-y-0.5" style={{ color: currentTheme.text.secondary }} {...props}>{children}</ol>
    ),
    h1: ({ children, ...props }) => (
      <h1 className="text-2xl font-bold my-2 pb-1 border-b" style={{ color: currentTheme.text.primary, borderColor: currentTheme.border.primary }} {...props}>{children}</h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 className="text-xl font-bold my-2" style={{ color: currentTheme.text.primary }} {...props}>{children}</h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className="text-lg font-semibold my-1" style={{ color: currentTheme.text.primary }} {...props}>{children}</h3>
    ),
    p: ({ children, ...props }) => {
      const hasBlock = React.Children.toArray(children).some(ch => React.isValidElement(ch) && ['div','pre','blockquote','ul','ol','table'].includes(ch.type));
      if (hasBlock) {
        return <div className="whitespace-pre-wrap twemoji-text" style={{ marginBottom: '0.05rem' }} {...props}>{children}</div>;
      }
      return <p className="whitespace-pre-wrap twemoji-text" style={{ marginBottom: '0.05rem' }} {...props}>{children}</p>;
    },
    table: ({ children, ...props }) => (
      <div className="overflow-x-auto my-2">
        <table className="border-collapse" style={{ borderColor: currentTheme.border.primary, minWidth: '100%' }} {...props}>{children}</table>
      </div>
    ),
    th: ({ children, ...props }) => (
      <th className="border px-3 py-2 font-semibold text-left" style={{ borderColor: currentTheme.border.primary, backgroundColor: currentTheme.bg.tertiary, color: currentTheme.text.primary }} {...props}>{children}</th>
    ),
    td: ({ children, ...props }) => (
      <td className="border px-3 py-2" style={{ borderColor: currentTheme.border.primary, color: currentTheme.text.secondary }} {...props}>{children}</td>
    ),
    hr: (props) => (
      <hr className="my-3" style={{ borderColor: currentTheme.border.primary, opacity: 0.5 }} {...props} />
    )
  };

  // Apply a small top margin for previews only when this is a continued message (no avatar shown)
  // Only add spacing when there are previews, the avatar is not shown, and the preview is not a direct GIF
  const previewSpacingClass = (firstTwoUrls.length > 0 && !showAvatar && !hasGifInFirstTwo) ? 'mt-1' : '';

  const singleLine = useMemo(() => !/[\n`]/.test(content) && content.length < 260, [content]);

  // If content is only GIF URLs (after removing them, nothing left), don't add any spacing
  const hasOnlyGifs = contentWithoutGifs.trim().length === 0 && gifUrls.length > 0;

  // Scroll on initial skeleton appearance for GIFs
  useEffect(() => {
    if (gifUrls.length === 0) return;
    // If there is at least one GIF not loaded yet, trigger a scroll now (skeleton state)
    const anyUnloaded = gifUrls.some(g => !loadedGifs.has(g));
    if (anyUnloaded && !skeletonScrollSentRef.current) {
      skeletonScrollSentRef.current = true;
      try { window.dispatchEvent(new Event('chatMediaLoaded')); } catch {}
    }
  }, [gifUrls, loadedGifs]);

  // Handle copy event to restore native emojis
  const messageRef = useRef(null);
  
  useEffect(() => {
    const messageEl = messageRef.current;
    if (!messageEl) return;

    const buildSelectedNativeText = (range, root) => {
      let out = '';
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        null
      );
      const pushTextPortion = (node) => {
        if (!range.intersectsNode(node)) return;
        let start = 0;
        let end = node.nodeValue?.length || 0;
        if (range.startContainer === node) start = range.startOffset;
        if (range.endContainer === node) end = range.endOffset;
        if (start < end) out += node.nodeValue.slice(start, end);
      };
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.nodeType === Node.TEXT_NODE) {
          pushTextPortion(node);
        } else if (
          node.nodeType === Node.ELEMENT_NODE &&
          node.tagName === 'IMG' &&
          node.classList.contains('twemoji') &&
          range.intersectsNode(node)
        ) {
          const emoji = node.getAttribute('data-emoji');
          if (emoji) out += emoji;
        }
      }
      return out;
    };

    const handleCopy = (e) => {
      try {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);

        // Only handle if selection touches this message element
        if (
          !messageEl.contains(range.commonAncestorContainer) &&
          !messageEl.contains(range.startContainer) &&
          !messageEl.contains(range.endContainer)
        ) {
          return;
        }

        const native = buildSelectedNativeText(range, messageEl);
        if (native && native.length > 0) {
          e.clipboardData.setData('text/plain', native);
          e.preventDefault();
        }
      } catch (err) {
        console.warn('Copy handler error:', err);
      }
    };

    messageEl.addEventListener('copy', handleCopy, true);
    return () => messageEl.removeEventListener('copy', handleCopy, true);
  }, []);

  // Handle mention clicks
  const handleMentionClick = useCallback((e) => {
    const chip = e.target?.closest?.('.mention-chip');
    if (!chip || !onMentionClick || conversationParticipants.length === 0) return;

    const usernameAttr = chip.getAttribute('data-username');
    const usernameText = chip.textContent?.replace(/^@/, '');
    const username = (usernameAttr || usernameText || '').trim();
    if (!username) return;

    const user = conversationParticipants.find(
      (participant) => participant.username?.toLowerCase() === username.toLowerCase()
    );
    if (!user) return;

    e.preventDefault();
    e.stopPropagation();

    const syntheticEvent = {
      stopPropagation: () => {},
      preventDefault: () => {},
      currentTarget: chip,
    };

    onMentionClick(syntheticEvent, user, `mention-${user._id}`);
  }, [conversationParticipants, onMentionClick]);

  return (
    <div 
      ref={messageRef} 
      className={`message-content ${hasOnlyGifs ? '' : previewSpacingClass}`}
      onClick={handleMentionClick}
    >
      {!hideTextContent && (
        <div 
          className={singleLine ? 'inline-flex flex-wrap items-baseline max-w-full' : 'prose prose-sm max-w-none'} 
          style={singleLine ? { lineHeight: 1.4 } : undefined}
          data-twemoji-content="true"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={components}>
            {contentWithMentions}
          </ReactMarkdown>
          {isEdited && singleLine && (
            <span className="ml-1.5 text-[10px] select-none opacity-60" style={{ color: currentTheme.text.tertiary }}>(edited)</span>
          )}
        </div>
      )}
      {/* Edited marker for multi-line messages (keep close, avoid below previews) */}
      {isEdited && !singleLine && !hideTextContent && (
        <div className="mt-0.5 -mb-0.5">
          <span className="text-[10px] select-none opacity-50" style={{ color: currentTheme.text.tertiary }}>(edited)</span>
        </div>
      )}
      {/* Direct GIFs (render independently from link previews to guarantee skeleton + load scroll) */}
      {gifUrls.length > 0 && (
        <div className={hasOnlyGifs ? 'mt-[-0.6rem]' : 'mt-0.5'}>
          {gifUrls.map((gifUrl, idx) => {
            const isLoaded = loadedGifs.has(gifUrl);
            return (
              <div
                key={gifUrl + idx}
                className="inline-block rounded-md overflow-hidden mb-2 last:mb-0"
                style={{ position: 'relative', width: 'auto', maxWidth: '100%' }}
              >
                {!isLoaded && (
                  <div
                    className="rounded-md"
                    style={{
                      backgroundColor: currentTheme.bg.tertiary,
                      width: '300px',
                      height: '200px',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                    }}
                  />
                )}
                <img
                  src={gifUrl}
                  alt="GIF"
                  className="rounded-md select-none cursor-default"
                  style={{
                    maxHeight: '300px',
                    height: 'auto',
                    width: 'auto',
                    maxWidth: '100%',
                    display: isLoaded ? 'block' : 'none'
                  }}
                  onLoad={() => {
                    setLoadedGifs(prev => {
                      const next = new Set(prev); next.add(gifUrl); return next;
                    });
                    // Scroll again now that actual dimensions are known
                    try { window.dispatchEvent(new Event('chatMediaLoaded')); } catch {}
                  }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            );
          })}
        </div>
      )}
      {firstTwoUrls.length > 0 && (
        <div className={hasOnlyGifs ? 'mt-[-0.6rem]' : 'mt-0.5'}>
          {shouldShowSkeletons ? (
            // Show skeleton placeholder while previews load
            firstTwoUrls.slice(0, 2).map((url, idx) => {
              const isDirectGif = /\.gif(\?|$)/i.test(url);
              if (isDirectGif) return null; // handled by dedicated GIF block above
              // Link preview placeholder
              return (
                <div
                  key={url + idx}
                  className="block rounded-md overflow-hidden border mb-2 last:mb-0"
                  style={{
                    backgroundColor: currentTheme.bg.tertiary,
                    borderColor: currentTheme.border.secondary,
                    maxWidth: '520px',
                    minHeight: '120px',
                    transition: 'opacity 0.18s ease',
                    opacity: 1
                  }}
                >
                  <div className="p-3 flex gap-3 items-start">
                    <div
                      className="w-8 h-8 rounded flex-shrink-0"
                      style={{
                        backgroundColor: currentTheme.bg.primary,
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }}
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div
                        className="h-3 rounded"
                        style={{
                          backgroundColor: currentTheme.bg.primary,
                          width: '40%',
                          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                        }}
                      />
                      <div
                        className="h-4 rounded"
                        style={{
                          backgroundColor: currentTheme.bg.primary,
                          width: '80%',
                          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                        }}
                      />
                      <div
                        className="h-3 rounded"
                        style={{
                          backgroundColor: currentTheme.bg.primary,
                          width: '60%',
                          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          ) : hasPreviews ? (
            previews.map((pv, idx) => {
            // Skip direct GIFs (already rendered separately)
            const isDirectGif = pv.url?.toLowerCase().match(/\.(gif)(\?|$)/);
            if (isDirectGif) return null;
            
            // Regular link preview card
            return (
              <a
                key={pv.url + idx}
                href={pv.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-md overflow-hidden border transition-colors mb-2 last:mb-0 will-change-transform"
                style={{ backgroundColor: currentTheme.bg.tertiary, borderColor: currentTheme.border.secondary, textDecoration: 'none', maxWidth: '460px' }}
              >
                {pv.title || pv.image || pv.domain ? (
                  <>
                    {pv.image && (imageKinds[pv.image] === 'banner' || imageKinds[pv.image] === undefined || (pv.url && pv.url.includes('/watch?v='))) && (
                      <div className="w-full" style={{ height: '260px', minHeight: '200px', maxHeight: '420px', position: 'relative', overflow: 'hidden' }}>
                        {(!loadedImages.has(pv.image) || imageKinds[pv.image] === undefined) && (
                          <div
                            className="absolute inset-0"
                            style={{
                              width: '100%',
                              height: '200px',
                              backgroundColor: currentTheme.bg.primary,
                              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                            }}
                          />
                        )}
                        <img
                          src={pv.image}
                          alt={pv.title || pv.domain || 'link image'}
                          className="object-cover"
                          style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              opacity: (loadedImages.has(pv.image) && imageKinds[pv.image] === 'banner') ? 1 : 0,
                              transition: 'opacity 0s ease-in',
                              objectFit: 'cover'
                            }}
                          onLoad={() => {
                            setLoadedImages(prev => {
                              const next = new Set(prev);
                              next.add(pv.image);
                              return next;
                            });
                            try { window.dispatchEvent(new Event('chatMediaLoaded')); } catch {}
                          }}
                          onError={(e) => { 
                            e.currentTarget.style.display = 'none';
                            setLoadedImages(prev => {
                              const next = new Set(prev);
                              next.add(pv.image);
                              return next;
                            });
                          }}
                        />
                      </div>
                    )}
                    <div className="p-3 flex gap-3 items-start">
                      {pv.icon && (
                        <div className="w-8 h-8 rounded flex-shrink-0" style={{ position: 'relative', border: `1px solid ${currentTheme.border.primary}`, backgroundColor: currentTheme.bg.primary, overflow: 'hidden' }}>
                          {!loadedImages.has(pv.icon) && (
                            <div
                              className="absolute inset-0 w-full h-full"
                              style={{
                                backgroundColor: currentTheme.bg.primary,
                                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                              }}
                            />
                          )}
                          <img
                            src={pv.icon}
                            alt="icon"
                            className="w-full h-full rounded object-cover"
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              opacity: loadedImages.has(pv.icon) ? 1 : 0,
                              transition: 'opacity 0s ease-in'
                            }}
                            onLoad={() => {
                              setLoadedImages(prev => {
                                const next = new Set(prev);
                                next.add(pv.icon);
                                return next;
                              });
                              try { window.dispatchEvent(new Event('chatMediaLoaded')); } catch {}
                            }}
                            onError={(e) => { 
                              e.currentTarget.style.display = 'none';
                              setLoadedImages(prev => {
                                const next = new Set(prev);
                                next.add(pv.icon);
                                return next;
                              });
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium mb-1 font-inter" style={{ color: currentTheme.text.tertiary }}>{pv.domain}</div>
                        <div className="text-sm font-semibold mb-1 font-inter" style={{ color: '#00b0f4' }}>{pv.title || pv.url}</div>
                        {pv.description && (
                          <div className="text-xs font-inter" style={{ color: currentTheme.text.secondary }}>{pv.description}</div>
                        )}
                      </div>
                      {pv.image && imageKinds[pv.image] === 'thumb' && !(pv.url && pv.url.includes('/watch?v=')) && (
                        <div className="ml-3 flex-shrink-0" style={{ width: '84px', height: '84px', position: 'relative', overflow: 'hidden', borderRadius: '0.375rem' }}>
                          {!loadedImages.has(pv.image) && (
                            <div
                              className="absolute inset-0 w-full h-full"
                              style={{
                                backgroundColor: currentTheme.bg.primary,
                                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                              }}
                            />
                          )}
                          <img
                            src={pv.image}
                            alt={pv.title || pv.domain || 'link image'}
                            className="w-full h-full rounded object-cover"
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              opacity: loadedImages.has(pv.image) ? 1 : 0,
                              transition: 'opacity 0s ease-in'
                            }}
                            onLoad={() => {
                              setLoadedImages(prev => {
                                const next = new Set(prev);
                                next.add(pv.image);
                                return next;
                              });
                              try { window.dispatchEvent(new Event('chatMediaLoaded')); } catch {}
                            }}
                            onError={(e) => { 
                              e.currentTarget.style.display = 'none';
                              setLoadedImages(prev => {
                                const next = new Set(prev);
                                next.add(pv.image);
                                return next;
                              });
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-3">
                    <span className="text-sm font-inter" style={{ color: currentTheme.text.tertiary }}>Loading preview...</span>
                  </div>
                )}
              </a>
            );
          })
          ) : null}
        </div>
      )}
    </div>
  );
};

// Custom comparator to prevent unnecessary re-renders.
// Re-render only when relevant props actually change.
export const MessageContent = React.memo(MessageContentInner, (prev, next) => {
  if (prev.content !== next.content) return false;
  if (prev.isEdited !== next.isEdited) return false;
  if (prev.hideTextContent !== next.hideTextContent) return false;
  if (prev.showAvatar !== next.showAvatar) return false;
  if (prev.onMentionClick !== next.onMentionClick) return false;
  // Theme object likely stable by reference; if it changes identity, re-render
  if (prev.currentTheme !== next.currentTheme) return false;
  const prevMentions = prev.mentionUsernames || [];
  const nextMentions = next.mentionUsernames || [];
  if (prevMentions.length !== nextMentions.length) return false;
  for (let i = 0; i < prevMentions.length; i++) {
    if (prevMentions[i] !== nextMentions[i]) return false;
  }
  const prevParticipants = prev.conversationParticipants || [];
  const nextParticipants = next.conversationParticipants || [];
  if (prevParticipants.length !== nextParticipants.length) return false;
  for (let i = 0; i < prevParticipants.length; i++) {
    if (prevParticipants[i]?._id !== nextParticipants[i]?._id) return false;
  }
  // Previews: compare length + primary identifying fields for first two previews
  const prevPv = prev.previews || [];
  const nextPv = next.previews || [];
  if (prevPv.length !== nextPv.length) return false;
  for (let i = 0; i < Math.min(2, prevPv.length); i++) {
    const a = prevPv[i];
    const b = nextPv[i];
    if (!a && !b) continue;
    if (!a || !b) return false;
    if (a.url !== b.url || a.title !== b.title || a.image !== b.image || a.icon !== b.icon) return false;
  }
  return true; // skip re-render
});
