import React, { useMemo } from 'react';
import { parseEmoji } from '../../../lib/twemoji';

// Inline Twemoji renderer for simple dynamic text fields (username, status, bio, group names).
// It keeps the original text copyable by replacing emoji codepoints with <img.twemoji> elements.
// Falls back to plain text when no emojis are detected for performance.
export const TwemojiText = ({
	text = '',
	className = '',
	style = {},
	as: Tag = 'span',
	size = '1.2em'
}) => {
	const emojiQuickRegex = useMemo(() => /[\u2190-\u21FF\u2300-\u23FA\u2400-\u27BF\u2B05-\u2B55\u2600-\u26FF]|\p{Extended_Pictographic}/u, []);
	const hasEmoji = useMemo(() => Boolean(text) && emojiQuickRegex.test(text), [text, emojiQuickRegex]);
	const html = useMemo(() => hasEmoji ? parseEmoji(text, { size }) : null, [hasEmoji, text, size]);

	if (!hasEmoji) {
		return <Tag className={className} style={style}>{text}</Tag>;
	}

	return (
		<Tag
			className={`twemoji-text select-text ${className}`}
			style={style}
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
};

