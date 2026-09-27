import React, { useState, useEffect, useCallback } from 'react';
import { submissionCommentApi } from '../api/submissionCommentApi';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import StudentFeedbackAudioPlayer from './StudentFeedbackAudioPlayer';

export default function SubmissionFeedbackThread({ submissionId, onMistakeSaved = null }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, lang } = useThemeLanguage();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!submissionId) return;
    try {
      setLoading(true);
      const res = await submissionCommentApi.getBySubmission(submissionId);
      setComments(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Lỗi khi tải bình luận phản hồi:', err);
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      setSubmitting(true);
      await submissionCommentApi.addComment(submissionId, {
        content: replyText.trim(),
        audioUrl: null
      });
      setReplyText('');
      toast.success(lang === 'en' ? 'Reply sent.' : 'Đã gửi phản hồi.');
      fetchComments();
    } catch (err) {
      toast.error(lang === 'en' ? ('Error sending reply: ' + (err.response?.data?.message || err.message)) : ('Lỗi khi gửi phản hồi: ' + (err.response?.data?.message || err.message)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveToMistakeNotebook = (text) => {
    try {
      const savedKey = `student_mistakes_${user?.id}`;
      const existing = JSON.parse(localStorage.getItem(savedKey) || '[]');
      const newEntry = {
        id: Date.now(),
        submissionId,
        content: text,
        savedAt: new Date().toISOString()
      };
      existing.unshift(newEntry);
      localStorage.setItem(savedKey, JSON.stringify(existing));
      toast.success(lang === 'en' ? 'Saved to mistake notebook!' : (t('savedToNotebook') || 'Đã lưu vào sổ tay lỗi sai!'));
      if (onMistakeSaved) onMistakeSaved(newEntry);
    } catch {
      toast.error(lang === 'en' ? 'Could not save to notebook.' : 'Không thể lưu vào sổ tay.');
    }
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  };

  return (
    <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {t('feedbackThread')} ({comments.length})
        </h5>
        <button
          type="button"
          onClick={fetchComments}
          className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">
          {t('refresh')}
        </button>
      </div>

      {/* List of comments */}
      {loading ? (
        <div className="py-4 text-center text-xs text-slate-400 font-mono">
          {t('saving')}
        </div>
      ) : comments.length === 0 ? (
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-sm text-xs text-slate-500 dark:text-slate-400 text-center">
          {lang === 'en' ? 'No discussion yet for this submission. Send the first reply below.' : 'Chưa có trao đổi nào về bài nộp này. Hãy gửi phản hồi đầu tiên bên dưới.'}
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {comments.map((c) => {
            const isMe = user?.id && String(c.senderId) === String(user.id);
            const isTeacher = c.senderRole === 'TEACHER';

            return (
              <div
                key={c.id}
                className={`p-2.5 rounded-sm border text-xs space-y-1.5 ${
                  isTeacher
                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}>
                <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {c.senderName || (isTeacher ? (lang === 'en' ? 'Teacher' : 'Giáo viên') : (lang === 'en' ? 'Student' : 'Học sinh'))}
                    {isTeacher && <span className="ml-1 text-[10px] text-blue-600 dark:text-blue-400 font-bold">[{lang === 'en' ? 'Teacher' : 'GV'}]</span>}
                  </span>
                  <span>{formatTime(c.createdAt)}</span>
                </div>

                <div className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                  {c.content}
                </div>

                {c.audioUrl && (
                  <div className="pt-1">
                    <StudentFeedbackAudioPlayer audioUrl={c.audioUrl} />
                  </div>
                )}

                {/* Nút lưu vào Sổ tay lỗi sai cho học sinh khi đọc nhận xét của giáo viên */}
                {isTeacher && user?.role === 'STUDENT' && (
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSaveToMistakeNotebook(c.content)}
                      className="text-[10px] font-mono text-slate-500 hover:text-slate-900 dark:hover:text-white underline cursor-pointer">
                      + {t('saveToMistakeNotebook')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Input reply form */}
      <form onSubmit={handleSend} className="flex gap-2 items-start">
        <textarea
          rows={2}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder={t('enterReplyPlaceholder')}
          className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-sm focus:border-slate-900 dark:focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 leading-normal"
        />
        <button
          type="submit"
          disabled={submitting || !replyText.trim()}
          className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white text-xs font-semibold rounded-sm transition cursor-pointer self-stretch flex items-center justify-center">
          {submitting ? '...' : t('sendReply')}
        </button>
      </form>
    </div>
  );
}
