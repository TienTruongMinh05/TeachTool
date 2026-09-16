/**
 * Tiện ích bảo mật làm sạch URL (Sanitize URLs)
 * Ngăn chặn tấn công DOM XSS qua URI scheme (ví dụ: javascript:alert(1), vbscript:, data:text/html...)
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '#';
  
  const trimmed = url.trim();
  
  // Cho phép relative URLs an toàn (bắt đầu bằng / hoặc ./)
  if (trimmed.startsWith('/') || trimmed.startsWith('./')) {
    return trimmed;
  }

  // Cho phép các scheme an toàn
  const safeProtocols = ['http:', 'https:', 'blob:', 'data:audio/', 'data:image/'];
  const lower = trimmed.toLowerCase();
  
  const isSafe = safeProtocols.some((proto) => lower.startsWith(proto));
  if (isSafe) {
    return trimmed;
  }

  // Mọi scheme nguy hiểm (javascript:, vbscript:, file:, ...) bị thay thế an toàn
  console.warn('Blocked unsafe URL scheme:', trimmed);
  return '#';
}
