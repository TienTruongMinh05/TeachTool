import { useState, useRef, useEffect } from 'react';
import { fileApi } from '../api/fileApi';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { 
  getOptimizedAudioConstraints, 
  createOptimizedMediaRecorder, 
  formatAudioFileSize 
} from '../utils/audioOptimizer';
import { BoltIcon } from './Icons';

export default function AudioRecorder({ onRecordingUploaded }) {
  const { lang } = useThemeLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setError('');
    setAudioUrl(null);
    setAudioBlob(null);
    setUploadSuccess(false);
    audioChunksRef.current = [];

    try {
      // 1. Áp dụng chuẩn thu âm giọng nói Mono + Giảm tiếng ồn môi trường
      const stream = await navigator.mediaDevices.getUserMedia(getOptimizedAudioConstraints());
      
      // 2. Kích hoạt bộ mã hóa nén tối ưu 32kbps Opus/WebM (giảm 70-80% dung lượng)
      const mediaRecorder = createOptimizedMediaRecorder(stream, { audioBitsPerSecond: 32000 });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);

        // Tắt tất cả audio tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Lỗi khi truy cập Microphone:', err);
      setError(lang === 'en' ? 'Cannot access microphone. Please allow microphone permissions in your browser.' : 'Không thể truy cập Microphone. Vui lòng cho phép quyền truy cập Micro trên trình duyệt.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleUploadAudio = async () => {
    if (!audioBlob) return;
    try {
      setUploading(true);
      setError('');
      const ext = audioBlob.type.includes('mp4') ? 'm4a' : 'webm';
      const file = new File([audioBlob], `recording_${Date.now()}.${ext}`, { type: audioBlob.type });
      
      const res = await fileApi.upload(file);
      setUploadSuccess(true);
      if (onRecordingUploaded) {
        onRecordingUploaded({
          fileUrl: res.fileUrl,
          fileName: res.fileName || file.name
        });
      }
    } catch (err) {
      setError(lang === 'en' ? ('Error uploading audio recording: ' + (err.response?.data?.message || err.message)) : ('Lỗi khi tải file ghi âm lên hệ thống: ' + (err.response?.data?.message || err.message)));
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          {lang === 'en' ? 'Direct Microphone Recording' : 'Ghi Âm Trực Tiếp Bằng Microphone'}
        </span>
        {isRecording && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-rose-950/60 text-red-700 dark:text-rose-400 border border-transparent dark:border-rose-800/50 animate-pulse">
            {lang === 'en' ? 'Recording' : 'Đang ghi âm'} ({formatTime(recordingTime)})
          </span>
        )}
      </div>

      {error && (
        <div className="p-2.5 bg-red-50 dark:bg-rose-950/50 border border-red-200 dark:border-rose-900/60 rounded-lg text-red-700 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Nút điều khiển Ghi âm */}
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition cursor-pointer shadow-xs">
            {audioUrl ? (lang === 'en' ? 'Re-record from start' : 'Ghi âm lại từ đầu') : (lang === 'en' ? 'Start Recording' : 'Bắt đầu ghi âm')}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition cursor-pointer shadow-xs">
            {lang === 'en' ? 'Stop Recording' : 'Dừng ghi âm'}
          </button>
        )}
      </div>

      {/* Trình nghe lại sau khi thu âm */}
      {audioUrl && !isRecording && (
        <div className="pt-2 space-y-3 border-t border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {lang === 'en' ? 'Review audio playback' : 'Nghe lại bản thu âm'} ({formatTime(recordingTime)}):
              </span>
              {audioBlob && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                  <BoltIcon className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  {lang === 'en' ? 'Optimized compression:' : 'Nén tối ưu:'} {formatAudioFileSize(audioBlob.size)}
                </span>
              )}
            </div>
            <audio controls src={audioUrl} className="w-full h-10" />
          </div>

          {!uploadSuccess ? (
            <button
              type="button"
              disabled={uploading}
              onClick={handleUploadAudio}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition cursor-pointer shadow-xs">
              {uploading ? (lang === 'en' ? 'Uploading audio file...' : 'Đang tải bản ghi âm lên...') : (lang === 'en' ? 'Confirm and submit this recording' : 'Xác nhận nộp file ghi âm này')}
            </button>
          ) : (
            <div className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded border border-emerald-200 dark:border-emerald-800">
              {lang === 'en' ? 'Audio recording attached successfully to your submission!' : 'Đã đính kèm bản ghi âm thành công vào bài làm!'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
