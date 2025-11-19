// Twemoji utility for converting emoji to images
// Preserves native emoji in the DOM for copy operations

// Convert emoji to codepoint for CDN URL
export function emojiToCodepoint(emoji) {
  const codePoints = [];
  for (let i = 0; i < emoji.length; i++) {
    const code = emoji.codePointAt(i);
    if (code) {
      codePoints.push(code.toString(16));
      if (code > 0xFFFF) i++; // Skip surrogate pair
    }
  }
  return codePoints.join('-');
}


export function parseEmoji(text, options = {}) {
  if (!text) return text;
  
  const {
    className = 'twemoji',
    size = '1.2em',
    folder = '72x72',
    ext = 'png',
    base = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
  } = options;

  // Comprehensive emoji regex pattern
  const emojiRegex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;

  return text.replace(emojiRegex, (emoji) => {
    const codepoint = emojiToCodepoint(emoji);
    const url = `${base}${folder}/${codepoint}.${ext}`;
    
    // Store native emoji in data attribute for copy operations
    return `<img class="${className}" draggable="false" alt="${emoji}" src="${url}" data-emoji="${emoji}" loading="eager" style="height: ${size}; width: ${size}; margin: 0 0.05em 0 0.1em; vertical-align: -0.2em; display: inline-block;" />`;
  });
}

// React hook for parsing emoji in real-time
export function useTwemoji(text, options = {}) {
  if (typeof window === 'undefined') return text;
  return parseEmoji(text, options);
}

// Extract native emojis for clipboard
export function extractNativeEmojis(htmlString) {
  if (typeof window === 'undefined') return htmlString;
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlString;
  
  // Replace twemoji images with their native emoji
  const imgs = tempDiv.querySelectorAll('img.twemoji[data-emoji]');
  imgs.forEach(img => {
    const nativeEmoji = img.getAttribute('data-emoji');
    if (nativeEmoji) {
      img.replaceWith(document.createTextNode(nativeEmoji));
    }
  });
  
  return tempDiv.textContent || tempDiv.innerText || '';
}

// Copy text with native emojis
export function copyWithNativeEmojis(element) {
  if (typeof window === 'undefined') return;
  
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
  
  // Create a temporary element with native emojis
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = element.innerHTML;
  
  const imgs = tempDiv.querySelectorAll('img.twemoji[data-emoji]');
  imgs.forEach(img => {
    const nativeEmoji = img.getAttribute('data-emoji');
    if (nativeEmoji) {
      img.replaceWith(document.createTextNode(nativeEmoji));
    }
  });
  
  // Copy to clipboard
  const text = tempDiv.textContent || tempDiv.innerText || '';
  navigator.clipboard.writeText(text);
  
  selection.removeAllRanges();
}
