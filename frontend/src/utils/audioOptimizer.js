// Audio Optimization Utility for TeachTool
// Optimizes speech recording bandwidth & storage by 70-80% using mono 32kbps Opus/WebM encoding

/**
 * Cấu hình Microphone tối ưu cho giọng nói / phát âm:
 * - channelCount: 1 (Mono - giảm 50% dung lượng so với stereo)
 * - echoCancellation & noiseSuppression: Giảm tiếng ồn môi trường
 * - autoGainControl: Ổn định âm lượng giọng nói
 * - sampleRate: 24000 (Chuẩn giọng nói tối ưu)
 */
export const getOptimizedAudioConstraints = () => ({
  audio: {
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 24000
  }
});

/**
 * Tìm định dạng ghi âm nén tối ưu được trình duyệt hỗ trợ
 */
export const getOptimalAudioMimeType = () => {
  if (typeof window === 'undefined' || !window.MediaRecorder) {
    return 'audio/webm';
  }

  const preferredTypes = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/webm'
  ];

  for (const type of preferredTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return 'audio/webm';
};

/**
 * Tạo MediaRecorder với cấu hình nén giọng nói tối ưu (32 kbps mono)
 * Giảm dung lượng từ ~1.5MB/phút xuống chỉ còn ~240KB/phút mà giọng nói vẫn trong trẻo rõ ràng
 */
export const createOptimizedMediaRecorder = (stream, options = {}) => {
  const mimeType = options.mimeType || getOptimalAudioMimeType();
  const bitrate = options.audioBitsPerSecond || 32000; // 32 kbps voice-optimized

  const recorderOptions = {
    mimeType,
    audioBitsPerSecond: bitrate,
    ...options
  };

  try {
    return new MediaRecorder(stream, recorderOptions);
  } catch (err) {
    console.warn('Không thể khởi tạo MediaRecorder với tùy chọn nén tối ưu, fallback cấu hình mặc định:', err);
    return new MediaRecorder(stream);
  }
};

/**
 * Format kích thước byte sang KB / MB thân thiện
 */
export const formatAudioFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 KB';
  const k = 1024;
  if (bytes < k * 1024) {
    return `${(bytes / k).toFixed(1)} KB`;
  }
  return `${(bytes / (k * k)).toFixed(2)} MB`;
};
