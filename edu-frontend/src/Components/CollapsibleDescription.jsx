import React, { useState } from 'react';

/**
 * Component hiển thị nội dung đề bài/mô tả có tính năng thu gọn tự động khi nội dung quá dài.
 * Có nút 'Xem thêm ▼' / 'Thu gọn ▲' để người dùng xổ ra hoặc thu lại.
 */
export default function CollapsibleDescription({
  text = '',
  maxLength = 120,
  maxLines = 3,
  className = '',
  textClassName = 'text-xs text-gray-700'
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text || typeof text !== 'string' || !text.trim()) {
    return null;
  }

  const lineCount = text.split('\n').length;
  const isLong = text.length > maxLength || lineCount > maxLines;

  if (!isLong) {
    return (
      <div className={className}>
        <p className={`${textClassName} whitespace-pre-wrap leading-relaxed break-words`}>
          {text}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <div className={`relative transition-all duration-200 ${!isExpanded ? 'max-h-20 overflow-hidden' : ''}`}>
        <p className={`${textClassName} whitespace-pre-wrap leading-relaxed break-words`}>
          {text}
        </p>
        {!isExpanded && (
          <div className="absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer select-none pt-0.5"
      >
        <span>{isExpanded ? 'Thu gọn ▲' : 'Xem thêm ▼'}</span>
      </button>
    </div>
  );
}