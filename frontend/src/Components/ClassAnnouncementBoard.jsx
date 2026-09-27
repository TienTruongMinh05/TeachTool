import React, { useState, useEffect, useCallback } from 'react';
import { announcementApi } from '../api/announcementApi';
import { useToast } from '../context/ToastContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';

export default function ClassAnnouncementBoard({ classId, isTeacher = false, classInfo = null }) {
  const { toast, confirm } = useToast();
  const { t, lang } = useThemeLanguage();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    if (!classId) return;
    try {
      setLoading(true);
      const res = await announcementApi.getByClass(classId);
      setAnnouncements(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Lỗi khi tải thông báo lớp:', err);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleStartCreate = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setIsPinned(false);
    setIsCreating(true);
  };

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setTitle(item.title || '');
    setContent(item.content || '');
    setIsPinned(Boolean(item.isPinned));
    setIsCreating(true);
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingId(null);
    setTitle('');
    setContent('');
    setIsPinned(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error(lang === 'en' ? 'Please enter both announcement title and content.' : 'Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        await announcementApi.update(editingId, {
          title: title.trim(),
          content: content.trim(),
          attachmentsJson: null
        });
        toast.success(lang === 'en' ? 'Announcement updated successfully.' : 'Đã cập nhật thông báo thành công.');
      } else {
        await announcementApi.create(classId, {
          title: title.trim(),
          content: content.trim(),
          isPinned,
          attachmentsJson: null
        });
        toast.success(lang === 'en' ? 'Announcement published successfully.' : 'Đã đăng thông báo thành công.');
      }
      handleCancelForm();
      fetchAnnouncements();
    } catch (err) {
      toast.error(lang === 'en' ? ('Error saving announcement: ' + (err.response?.data?.message || err.message)) : ('Lỗi khi lưu thông báo: ' + (err.response?.data?.message || err.message)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePin = async (id) => {
    try {
      await announcementApi.togglePin(id);
      toast.success(lang === 'en' ? 'Pin status updated.' : 'Đã thay đổi trạng thái ghim.');
      fetchAnnouncements();
    } catch (err) {
      toast.error(lang === 'en' ? ('Error pinning announcement: ' + (err.response?.data?.message || err.message)) : ('Lỗi khi ghim thông báo: ' + (err.response?.data?.message || err.message)));
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm(lang === 'en' ? 'Are you sure you want to delete this announcement?' : 'Bạn có chắc chắn muốn xóa thông báo này không?');
    if (!ok) return;

    try {
      await announcementApi.delete(id);
      toast.success(lang === 'en' ? 'Announcement deleted.' : 'Đã xóa thông báo.');
      fetchAnnouncements();
    } catch (err) {
      toast.error(lang === 'en' ? ('Error deleting: ' + (err.response?.data?.message || err.message)) : ('Lỗi khi xóa: ' + (err.response?.data?.message || err.message)));
    }
  };

  const formatDateTime = (dtStr) => {
    if (!dtStr) return '';
    const d = new Date(dtStr);
    return d.toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('tabAnnouncements')} {classInfo?.name ? `- ${classInfo.name}` : ''}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {lang === 'en' ? 'Important reminders, class rules, and schedules' : 'Thông tin dặn dò, nội quy và lịch học quan trọng của lớp'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isTeacher && !isCreating && (
            <button
              type="button"
              onClick={handleStartCreate}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white text-xs font-semibold rounded-sm transition cursor-pointer">
              + {t('createAnnouncement')}
            </button>
          )}
          <button
            type="button"
            onClick={fetchAnnouncements}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-sm transition cursor-pointer border border-slate-300 dark:border-slate-700">
            {t('refresh')}
          </button>
        </div>
      </div>

      {/* Form tạo / sửa thông báo (dành cho Giáo viên) */}
      {isTeacher && isCreating && (
        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-sm space-y-3">
          <div className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {editingId ? (lang === 'en' ? 'Edit Announcement' : 'Chỉnh sửa thông báo') : t('createAnnouncement')}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {lang === 'en' ? 'Title' : 'Tiêu đề'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={lang === 'en' ? 'e.g. Holiday announcement & makeup schedule' : 'VD: Thông báo nghỉ lễ 30/4 & Lịch học bù'}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-sm focus:border-slate-900 dark:focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {lang === 'en' ? 'Announcement Content' : 'Nội dung thông báo'} <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={lang === 'en' ? 'Enter detailed reminder content for students...' : 'Nhập nội dung chi tiết dặn dò học sinh...'}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-sm focus:border-slate-900 dark:focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 leading-relaxed"
              required
            />
          </div>

          {!editingId && (
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded-xs border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>{t('pinAnnouncement')}</span>
            </label>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleCancelForm}
              disabled={submitting}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-sm transition cursor-pointer">
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white rounded-sm transition cursor-pointer">
              {submitting ? t('saving') : (editingId ? t('save') : (lang === 'en' ? 'Post now' : 'Đăng ngay'))}
            </button>
          </div>
        </form>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border border-slate-200 dark:border-slate-800 rounded-sm bg-slate-100 dark:bg-slate-800/40 animate-pulse space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-xs w-1/3"></div>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-xs w-full"></div>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-xs w-2/3"></div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && announcements.length === 0 && (
        <div className="p-8 border border-dashed border-slate-300 dark:border-slate-700 rounded-sm text-center space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('noAnnouncements')}
          </p>
          {isTeacher && !isCreating && (
            <button
              type="button"
              onClick={handleStartCreate}
              className="px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-sm transition cursor-pointer border border-slate-300 dark:border-slate-700">
              {t('createAnnouncement')}
            </button>
          )}
        </div>
      )}

      {/* Announcements List */}
      {!loading && announcements.length > 0 && (
        <div className="space-y-3">
          {announcements.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-sm border transition ${
                item.isPinned
                  ? 'bg-slate-50 dark:bg-slate-900 border-slate-400 dark:border-slate-600'
                  : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
              }`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.isPinned && (
                    <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xs">
                      {t('pinned')}
                    </span>
                  )}
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {item.title}
                  </h4>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 font-mono">
                  <span>{formatDateTime(item.createdAt)}</span>
                  {item.authorName && (
                    <span>• {item.authorName}</span>
                  )}
                </div>
              </div>

              {/* Nội dung thông báo */}
              <div className="pt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {item.content}
              </div>

              {/* Action buttons (cho giáo viên) */}
              {isTeacher && (
                <div className="flex items-center justify-end gap-2 pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleTogglePin(item.id)}
                    className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer">
                    {item.isPinned ? t('unpin') : t('pin')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(item)}
                    className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer">
                    {t('edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="px-2 py-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline transition cursor-pointer">
                    {t('delete')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
