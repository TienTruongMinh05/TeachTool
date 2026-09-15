import { useState, useRef, useEffect } from 'react';

const parseSecondsFromTimeStr = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
};

const formatSeconds = (sec) => {
  if (isNaN(sec) || sec == null) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function StudentFeedbackAudioPlayer({ rawFeedback }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  if (!rawFeedback) return null;

  // Trích xuất link Audio ghép nếu có
  const audioMatch = rawFeedback.match(/\[FEEDBACK_AUDIO:\s*(https?:\/\/[^\]]+)\]/i);
  const feedbackAudioUrl = audioMatch ? audioMatch[1].trim() : null;

  // Loại bỏ tag [FEEDBACK_AUDIO: ...] khỏi text nhận xét
  const cleanText = rawFeedback.replace(/\[FEEDBACK_AUDIO:\s*https?:\/\/[^\]]+\]\s*/i, '').trim();

  // Tách text thành các dòng và nhận diện các mốc [mm:ss]
  const lines = cleanText.split('\n');

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
  }, [feedbackAudioUrl]);

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

  const jumpToSeconds = (sec) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = sec;
    setCurrentTime(sec);
    audio.play();
    setIsPlaying(true);
  };

  return (
    <div className="space-y-3">
      {/* Player âm thanh lồng tiếng sửa bài */}
      {feedbackAudioUrl && (
        <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 shadow-md space-y-3 animate-in fade-in">
          <audio ref={audioRef} src={feedbackAudioUrl} preload="metadata" />

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div>
              <h5 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                <span>Bản Lồng Tiếng Sửa Mẫu Của Giáo Viên</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded">Đã ghép nối</span>
              </h5>
              <span className="text-[11px] text-slate-400">
                Bao gồm bài nói của bạn và các đoạn giáo viên trực tiếp phát âm sửa lỗi
              </span>
            </div>

            {/* Speed Buttons */}
            <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
              {[0.8, 1.0, 1.25].map(rate => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleSpeedChange(rate)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                    playbackRate === rate ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* Timeline & Slider */}
          <div className="space-y-1">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span className="text-blue-400 font-bold">{formatSeconds(currentTime)}</span>
              <span>{formatSeconds(duration)}</span>
            </div>
          </div>

          {/* Play / Pause */}
          <div className="flex items-center justify-between pt-0.5">
            <button
              type="button"
              onClick={togglePlay}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>{isPlaying ? 'Tạm Dừng' : 'Nghe Nhận Xét'}</span>
            </button>
            <a
              href={feedbackAudioUrl}
              download="Giao_Vien_Sua_Bai.wav"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
            >
              Tải file audio về máy ↗
            </a>
          </div>
        </div>
      )}

      {/* Chi tiết nhận xét theo mốc thời gian & Ghi chú giáo viên */}
      {cleanText && (
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs">
          <span className="font-bold text-amber-900 block">
            Nhận xét & Đánh giá của Giáo Viên:
          </span>
          <div className="space-y-1.5 text-gray-800">
            {lines.map((line, idx) => {
              const trimmed = line.trim();
              if (!trimmed) return null;

              // Header phân cách
              if (trimmed.includes('--- CHI TIẾT SỬA BÀI THEO MỐC THỜI GIAN ---')) {
                return (
                  <div key={idx} className="font-bold text-slate-700 pt-1 border-t border-amber-200/60 text-[11px] uppercase tracking-wider">
                    Chi tiết sửa bài theo từng giây:
                  </div>
                );
              }

              // Mốc thời gian [00:03]
              const timeMatch = trimmed.match(/^\[(\d{1,2}:\d{2})\]\s*(.*)$/);
              if (timeMatch) {
                const timeStr = timeMatch[1];
                const content = timeMatch[2];
                const sec = parseSecondsFromTimeStr(timeStr);

                return (
                  <div key={idx} className="flex items-start gap-2 bg-white/80 p-2 rounded-lg border border-amber-200/50">
                    <button
                      type="button"
                      onClick={() => jumpToSeconds(sec)}
                      className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-mono font-bold text-[11px] rounded border border-blue-200 cursor-pointer whitespace-nowrap transition shadow-2xs"
                      title="Bấm để nghe đúng mốc thời gian này"
                    >
                      {timeStr}
                    </button>
                    <span className="text-gray-800 font-medium leading-relaxed self-center">
                      {content}
                    </span>
                  </div>
                );
              }

              return (
                <p key={idx} className="leading-relaxed whitespace-pre-wrap text-slate-700">
                  {trimmed}
                </p>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
