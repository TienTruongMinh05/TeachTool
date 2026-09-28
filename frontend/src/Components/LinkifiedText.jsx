import React from 'react';
import { ExternalLinkIcon } from './Icons';

/**
 * Parses plain text containing URLs and renders them as clickable links
 * along with preserving regular text.
 */
export default function LinkifiedText({ text = '', className = '' }) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Regular expression to match standard URLs (http://, https://, and www.)
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s]|www\.[^\s<]+[^<.,:;"')\]\s])/gi;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    const matchedUrl = match[0];
    const startIndex = match.index;

    // Push preceding plain text
    if (startIndex > lastIndex) {
      parts.push(text.substring(lastIndex, startIndex));
    }

    // Format href
    const href = matchedUrl.startsWith('http://') || matchedUrl.startsWith('https://')
      ? matchedUrl
      : `https://${matchedUrl}`;

    parts.push(
      <a
        key={`${startIndex}-${matchedUrl}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline underline-offset-2 break-all inline-flex items-center gap-1 font-medium transition-colors cursor-pointer"
      >
        <span>{matchedUrl}</span>
        <ExternalLinkIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />
      </a>
    );

    lastIndex = startIndex + matchedUrl.length;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return (
    <span className={`whitespace-pre-line break-words ${className}`}>
      {parts.length > 0 ? parts : text}
    </span>
  );
}
