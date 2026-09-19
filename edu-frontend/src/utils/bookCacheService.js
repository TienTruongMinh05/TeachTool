// Book Cache Service for TeachTool
// Caches digital textbooks / PDF files in the browser's CacheStorage
// Enables instant loading (0 network delay), offline readiness, and massive bandwidth savings

const CACHE_NAME = 'teachtool-digital-books-v1';

/**
 * Kiểm tra xem trình duyệt có hỗ trợ Cache API không
 */
const isCacheStorageAvailable = () => {
  return typeof window !== 'undefined' && 'caches' in window;
};

/**
 * Tải sách số từ bộ nhớ đệm (CacheStorage) hoặc tải từ mạng nếu chưa có
 * @param {string} url - Đường dẫn tệp PDF sách số
 * @param {function} onProgress - Callback tiến độ tải (0 đến 100%)
 * @returns {Promise<{ data: Uint8Array, fromCache: boolean, size: number }>}
 */
export async function loadBookWithCache(url, onProgress = null) {
  if (!url) throw new Error('Đường dẫn sách số không hợp lệ.');

  // 1. Kiểm tra trong CacheStorage
  if (isCacheStorageAvailable()) {
    try {
      const cache = await window.caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(url);

      if (cachedResponse) {
        const buffer = await cachedResponse.arrayBuffer();
        if (onProgress) onProgress(100);
        return {
          data: new Uint8Array(buffer),
          fromCache: true,
          size: buffer.byteLength
        };
      }
    } catch (err) {
      console.warn('Lỗi khi đọc từ CacheStorage:', err);
    }
  }

  // 2. Nếu chưa có trong cache: Tải qua mạng và lưu vào CacheStorage
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Không thể tải sách số (HTTP ${response.status}: ${response.statusText})`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  // Hỗ trợ streaming để hiển thị thanh tiến trình %
  let loaded = 0;
  const reader = response.body.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total > 0 && onProgress) {
      onProgress(Math.min(99, Math.round((loaded / total) * 100)));
    }
  }

  // Ghép các chunk lại thành một Uint8Array
  const combined = new Uint8Array(loaded);
  let position = 0;
  for (const chunk of chunks) {
    combined.set(chunk, position);
    position += chunk.length;
  }

  if (onProgress) onProgress(100);

  // Lưu bản sao vào CacheStorage cho các lần truy cập tiếp theo
  if (isCacheStorageAvailable()) {
    try {
      const cache = await window.caches.open(CACHE_NAME);
      const responseToCache = new Response(combined.buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': String(loaded),
          'X-Cached-At': new Date().toISOString()
        }
      });
      await cache.put(url, responseToCache);
    } catch (err) {
      console.warn('Không thể lưu sách vào CacheStorage:', err);
    }
  }

  return {
    data: combined,
    fromCache: false,
    size: loaded
  };
}

/**
 * Xóa một cuốn sách khỏi bộ nhớ đệm (khi giáo viên tải bản cập nhật mới)
 */
export async function clearBookCache(url) {
  if (!isCacheStorageAvailable() || !url) return false;
  try {
    const cache = await window.caches.open(CACHE_NAME);
    return await cache.delete(url);
  } catch (err) {
    console.warn('Lỗi khi xóa sách khỏi cache:', err);
    return false;
  }
}

/**
 * Kiểm tra xem cuốn sách đã được lưu sẵn trong bộ nhớ đệm chưa
 */
export async function isBookCached(url) {
  if (!isCacheStorageAvailable() || !url) return false;
  try {
    const cache = await window.caches.open(CACHE_NAME);
    const match = await cache.match(url);
    return !!match;
  } catch {
    return false;
  }
}
