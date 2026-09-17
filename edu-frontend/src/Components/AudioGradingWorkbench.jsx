import { useState, useRef, useEffect } from 'react';
import { spliceAndMergeAudio } from '../utils/audioSplicer';
import { useToast } from '../context/ToastContext';

const formatSeconds = (sec) => {
  if (isNaN(sec) || sec == null) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function AudioGradingWorkbench({
  studentAudioUrl,
  studentName = 'Học sinh',
  onSplicedAudioReady = null,
  onUpdateFeedbackSummary = null
}) {
  const { toast } = useToast();
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  // Danh sách các mốc sửa: { id, type: 'AUDIO'|'TEXT', timestamp, timeStr, text?, audioBlob?, audioUrl?, duration? }
  const [corrections, setCorrections] = useState([]);

  // Trạng thái ghi âm của Giáo viên
  const [isRecordingTeacherVoice, setIsRecordingTeacherVoice] = useState(false);
  const [teacherRecordingTime, setTeacherRecordingTime] = useState(0);
  const [activeCorrectionTimestamp, setActiveCorrectionTimestamp] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Trạng thái nhập Text comment
  const [isAddingTextComment, setIsAddingTextComment] = useState(false);
  const [textCommentInput, setTextCommentInput] = useState('');

  // Trạng thái render audio ghép
  const [isProcessingMerge, setIsProcessingMerge] = useState(false);
  const [mergedPreviewUrl, setMergedPreviewUrl] = useState(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [studentAudioUrl]);

  // Cập nhật tổng hợp nhận xét mốc thời gian ra ngoài cho form chấm điểm
  useEffect(() => {
    if (onUpdateFeedbackSummary) {
      const sorted = [...corrections].sort((a, b) => a.timestamp - b.timestamp);
      let summary = '';
      if (sorted.length > 0) {
        summary = '--- CHI TIẾT SỬA BÀI THEO MỐC THỜI GIAN ---\n' +
          sorted.map(c => {
            if (c.type === 'AUDIO') {
              return `[${c.timeStr}] Nhận xét bằng giọng nói (${Math.round(c.duration || 0)}s)`;
            }
            return `[${c.timeStr}] ${c.text}`;
          }).join('\n');
      }
      onUpdateFeedbackSummary(summary, sorted);
    }
  }, [corrections, onUpdateFeedbackSummary]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = Number(e.target.value);
    audio.currentTime = target;
    setCurrentTime(target);
  };

  const handleSpeedChange = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  };

  // 1. BẮT ĐẦU SỬA BẰNG AUDIO TẠI GIÂY HIỆN TẠI
  const handleStartAudioCorrection = async () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      setIsPlaying(false);
    }

    const stamp = audio ? audio.currentTime : currentTime;
    setActiveCorrectionTimestamp(stamp);
    setIsAddingTextComment(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      recordedChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const durationSec = teacherRecordingTime;

        const newCorrection = {
          id: 'audio-cor-' + Date.now(),
          type: 'AUDIO',
          timestamp: Math.round(stamp * 10) / 10,
          timeStr: formatSeconds(stamp),
          audioBlob,
          audioUrl,
          duration: durationSec
        };

        setCorrections(prev => [...prev, newCorrection].sort((a, b) => a.timestamp - b.timestamp));
        setIsRecordingTeacherVoice(false);
        setTeacherRecordingTime(0);

        // Dừng toàn bộ tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecordingTeacherVoice(true);
      setTeacherRecordingTime(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setTeacherRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      toast.error('Không thể truy cập Microphone để thu âm nhận xét: ' + err.message);
    }
  };

  const handleStopAudioCorrection = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleCancelAudioCorrection = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingTeacherVoice(false);
    setTeacherRecordingTime(0);
  };

  // 2. BẮT ĐẦU SỬA BẰNG VĂN BẢN (TIMESTAMPED TEXT)
  const handleOpenTextComment = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      setIsPlaying(false);
    }
    const stamp = audio ? audio.currentTime : currentTime;
    setActiveCorrectionTimestamp(stamp);
    setIsRecordingTeacherVoice(false);
    setTextCommentInput('');
    setIsAddingTextComment(true);
  };

  const handleSaveTextComment = (e) => {
    e.preventDefault();
    if (!textCommentInput.trim()) return;

    const newCorrection = {
      id: 'text-cor-' + Date.now(),
      type: 'TEXT',
      timestamp: Math.round(activeCorrectionTimestamp * 10) / 10,
      timeStr: formatSeconds(activeCorrectionTimestamp),
      text: textCommentInput.trim()
    };

    setCorrections(prev => [...prev, newCorrection].sort((a, b) => a.timestamp - b.timestamp));
    setTextCommentInput('');
    setIsAddingTextComment(false);
  };

  const handleDeleteCorrection = (id) => {
    setCorrections(prev => prev.filter(c => c.id !== id));
  };

  const handleJumpToTimestamp = (stamp) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = stamp;
    setCurrentTime(stamp);
    audio.play();
    setIsPlaying(true);
  };

  // 3. GHÉP NỐI AUDIO HOÀN CHỈNH (TEST PREVIEW)
  const handleGenerateMergedAudio = async () => {
    if (!studentAudioUrl) return;
    const audioItems = corrections.filter(c => c.type === 'AUDIO');
    if (audioItems.length === 0) {
      toast.warning('Chưa có đoạn sửa bằng giọng nói nào để ghép!');
      return;
    }

    try {
      setIsProcessingMerge(true);
      const mergedBlob = await spliceAndMergeAudio(studentAudioUrl, audioItems);
      const previewUrl = URL.createObjectURL(mergedBlob);
      setMergedPreviewUrl(previewUrl);
      if (onSplicedAudioReady) {
        onSplicedAudioReady(mergedBlob);
      }
    } catch (err) {
      toast.error('Lỗi ghép audio: ' + err.message);
    } finally {
      setIsProcessingMerge(false);
    }
  };

  return (
    <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 space-y-4 border border-slate-700 shadow-md">
      {/* Ẩn thẻ audio nguyên bản, điều khiển qua custom UI */}
      <audio ref={audioRef} src={studentAudioUrl} preload="metadata" />

      {/* Header Player */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div>
            <h4 className="font-bold text-sm text-white">Chấm Speaking Audio & Sửa Mẫu</h4>
            <span className="text-[11px] text-slate-400">
              Bài nói của: <b className="text-slate-200">{studentName}</b>
            </span>
          </div>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
          {[0.8, 1.0, 1.2, 1.5].map(rate => (
            <button
              key={rate}
              type="button"
              onClick={() => handleSpeedChange(rate)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                playbackRate === rate ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      {/* Scrubber & Time */}
      <div className="space-y-1.5">
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-xs font-mono text-slate-400">
          <span className="text-blue-400 font-bold">{formatSeconds(currentTime)}</span>
          <span>{formatSeconds(duration)}</span>
        </div>
      </div>

      {/* Main Playback & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Play/Pause */}
        <button
          type="button"
          onClick={togglePlay}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
        >
          {isPlaying ? 'Tạm dừng' : 'Nghe tiếp'}
        </button>

        {/* Nhóm nút Sửa Audio & Sửa Text */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleStartAudioCorrection}
            disabled={isRecordingTeacherVoice}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
            title="Dừng tại đây và thu âm giọng nói giáo viên chèn vào"
          >
            Sửa bằng Audio ({formatSeconds(currentTime)})
          </button>

          <button
            type="button"
            onClick={handleOpenTextComment}
            disabled={isRecordingTeacherVoice}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
            title="Dừng tại đây và nhập nhận xét văn bản"
          >
            Sửa bằng Text ({formatSeconds(currentTime)})
          </button>
        </div>
      </div>

      {/* BẢNG THU ÂM CỦA GIÁO VIÊN (KHI BẤM SỬA BẰNG AUDIO) */}
      {isRecordingTeacherVoice && (
        <div className="p-4 bg-rose-950/60 border border-rose-500/50 rounded-xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></span>
              <span className="font-bold text-xs text-rose-300">
                Đang thu âm lời sửa mẫu tại mốc: <b className="text-white font-mono">{formatSeconds(activeCorrectionTimestamp)}</b>
              </span>
            </div>
            <span className="font-mono text-sm font-bold text-rose-200">
              {formatSeconds(teacherRecordingTime)}
            </span>
          </div>

          <p className="text-[11px] text-slate-300">
            Hãy nói to, rõ ràng đoạn phát âm chuẩn hoặc lời giải thích của thầy cô. Khi xong bấm <b>"Xong & Chèn vào"</b>.
          </p>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancelAudioCorrection}
              className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleStopAudioCorrection}
              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs cursor-pointer"
            >
              Xong & Chèn vào mốc {formatSeconds(activeCorrectionTimestamp)}
            </button>
          </div>
        </div>
      )}

      {/* BẢNG NHẬP TEXT COMMENT (KHI BẤM SỬA BẰNG TEXT) */}
      {isAddingTextComment && (
        <form onSubmit={handleSaveTextComment} className="p-3.5 bg-purple-950/60 border border-purple-500/50 rounded-xl space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs text-purple-300 font-bold">
            <span>Nhận xét văn bản tại mốc {formatSeconds(activeCorrectionTimestamp)}:</span>
            <button
              type="button"
              onClick={() => setIsAddingTextComment(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            required
            autoFocus
            value={textCommentInput}
            onChange={(e) => setTextCommentInput(e.target.value)}
            placeholder="VD: Chú ý phát âm âm đuôi /s/, dùng thì quá khứ đơn..."
            className="w-full bg-slate-900 border border-purple-400/40 rounded-lg p-2 text-xs text-white focus:ring-2 focus:ring-purple-400 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddingTextComment(false)}
              className="px-3 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-3.5 py-1 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded cursor-pointer shadow-xs"
            >
              Lưu nhận xét
            </button>
          </div>
        </form>
      )}

      {/* DANH SÁCH CÁC MỐC SỬA (TIMELINE CORRECTIONS) */}
      {corrections.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Các đoạn đã sửa ({corrections.length} mốc):
            </span>
            <button
              type="button"
              onClick={handleGenerateMergedAudio}
              disabled={isProcessingMerge}
              className="text-[11px] font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
            >
              {isProcessingMerge ? 'Đang ghép audio...' : 'Nghe thử bản ghép hoàn chỉnh'}
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {corrections.map((cor) => (
              <div
                key={cor.id}
                className="p-2 bg-slate-800/80 border border-slate-700 rounded-lg flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <button
                    type="button"
                    onClick={() => handleJumpToTimestamp(cor.timestamp)}
                    className="px-2 py-0.5 font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded text-[11px] hover:bg-blue-500/40 cursor-pointer"
                    title="Nhảy đến giây này trong bài nói"
                  >
                    {cor.timeStr}
                  </button>

                  {cor.type === 'AUDIO' ? (
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-semibold text-rose-400 flex items-center gap-1">
                        Lời sửa giáo viên ({Math.round(cor.duration || 0)}s)
                      </span>
                      {cor.audioUrl && (
                        <audio controls src={cor.audioUrl} className="h-6 w-36" />
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-200 truncate" title={cor.text}>
                      {cor.text}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteCorrection(cor.id)}
                  className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                  title="Xóa mốc này"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Player nghe thử bản ghép hoàn chỉnh */}
      {mergedPreviewUrl && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl space-y-1.5 animate-in fade-in">
          <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
            <span>Bản Audio Ghép Liền Mạch (Học sinh nói + Thầy sửa phát âm):</span>
            <button
              type="button"
              onClick={() => setMergedPreviewUrl(null)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
          <audio controls src={mergedPreviewUrl} className="w-full h-8" />
        </div>
      )}
    </div>
  );
}
