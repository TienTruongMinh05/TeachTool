import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';

import { XIcon } from './Icons';

export default function MistakeNotebookModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, lang } = useThemeLanguage();

  const [mistakes, setMistakes] = useState([]);
  const [filterText, setFilterText] = useState('');

  const loadMistakes = () => {
    try {
      const savedKey = `student_mistakes_${user?.id}`;
      const data = JSON.parse(localStorage.getItem(savedKey) || '[]');
      setMistakes(data);
    } catch {
      setMistakes([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMistakes();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = (id) => {
    try {
      const savedKey = `student_mistakes_${user?.id}`;
      const updated = mistakes.filter(m => m.id !== id);
      localStorage.setItem(savedKey, JSON.stringify(updated));
      setMistakes(updated);
      toast.success(lang === 'en' ? 'Removed from mistake notebook.' : 'Đã xóa khỏi sổ tay.');
    } catch {
      toast.error(lang === 'en' ? 'Unable to delete.' : 'Không thể xóa.');
    }
  };

  const filteredMistakes = mistakes.filter(m => 
    !filterText.trim() || (m.content && m.content.toLowerCase().includes(filterText.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-sm shadow-xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              {t('mistakeNotebookTitle')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'en' ? 'Summary of mistakes and areas of improvement noted by teachers' : 'Tổng hợp những lỗi sai và điểm cần cải thiện do giáo viên nhận xét'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder={t('search')}
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-sm focus:border-slate-900 focus:outline-none"
          />
        </div>

        {/* Mistake Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredMistakes.length === 0 ? (
            <div className="py-12 border border-dashed border-slate-300 dark:border-slate-700 rounded-sm text-center text-xs text-slate-500 dark:text-slate-400">
              {filterText
                ? (lang === 'en' ? 'No matching results found.' : 'Không tìm thấy kết quả phù hợp.')
                : (lang === 'en' ? 'No mistakes saved yet. When viewing teacher feedback on assignments, click "Save to mistake notebook" to keep for review.' : 'Chưa có lỗi sai nào được lưu vào sổ tay. Khi xem nhận xét bài làm của giáo viên, bấm "Lưu vào sổ tay lỗi sai" để lưu lại ôn tập.')}
            </div>
          ) : (
            filteredMistakes.map((m) => (
              <div
                key={m.id}
                className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-sm space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>{new Date(m.savedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN')}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    className="text-rose-500 hover:underline cursor-pointer">
                    {t('delete') || (lang === 'en' ? 'Delete' : 'Xóa')}
                  </button>
                </div>
                <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                  {m.content}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 font-mono">
          <span>{lang === 'en' ? `Total: ${mistakes.length} items` : `Tổng số: ${mistakes.length} mục`}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-sm cursor-pointer font-medium">
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
