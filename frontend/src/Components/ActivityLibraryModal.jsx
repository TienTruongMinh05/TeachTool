import React, { useState, useEffect, useMemo } from 'react';
import { activityApi } from '../api/activityApi';
import { useToast } from '../context/ToastContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';

const CATEGORIES = [
  { id: 'ALL', label: 'Tất cả hoạt động', labelEn: 'All Activities' },
  { id: 'IELTS_LISTENING', label: 'IELTS Listening', labelEn: 'IELTS Listening' },
  { id: 'IELTS_READING', label: 'IELTS Reading', labelEn: 'IELTS Reading' },
  { id: 'IELTS_WRITING_T1', label: 'IELTS Writing Task 1', labelEn: 'IELTS Writing Task 1' },
  { id: 'IELTS_WRITING_T2', label: 'IELTS Writing Task 2', labelEn: 'IELTS Writing Task 2' },
  { id: 'IELTS_SPEAKING', label: 'IELTS Speaking', labelEn: 'IELTS Speaking' },
  { id: 'TESOL_SPEAKING', label: 'TESOL - Giao tiếp', labelEn: 'TESOL - Speaking' },
  { id: 'VOCAB_GRAMMAR', label: 'Từ vựng & Ngữ pháp', labelEn: 'Vocabulary & Grammar' },
  { id: 'WARMUP_GAMES', label: 'Khởi động & Game', labelEn: 'Warm-up & Games' },
];

const categorizeActivity = (name = '', desc = '') => {
  const n = (name || '').toLowerCase();
  const text = (name + ' ' + desc).toLowerCase();

  if (n.includes('ielts listening') || (text.includes('listening') && !text.includes('reading'))) {
    return 'IELTS_LISTENING';
  }
  if (n.includes('ielts reading') || (text.includes('reading') && !text.includes('task 1') && !text.includes('task 2') && !text.includes('chain writing'))) {
    return 'IELTS_READING';
  }
  if (n.includes('writing task 1') || text.includes('task 1') || text.includes('human graph') || text.includes('helicopter view')) {
    return 'IELTS_WRITING_T1';
  }
  if (n.includes('writing task 2') || text.includes('task 2') || text.includes('peel') || text.includes('band descriptors')) {
    return 'IELTS_WRITING_T2';
  }
  if (n.includes('ielts speaking') || text.includes('part 1 & 3') || text.includes('cue card') || text.includes('just a minute') || text.includes('collocation bluff')) {
    return 'IELTS_SPEAKING';
  }
  if (text.includes('tìm người') || text.includes('khoảng trống') || text.includes('vòng tròn đối thoại') || text.includes('đóng vai') || text.includes('thám tử') || text.includes('speaking') || text.includes('giao tiếp')) {
    return 'TESOL_SPEAKING';
  }
  if (text.includes('ghế nóng') || text.includes('chính tả') || text.includes('từ cấm') || text.includes('đấu giá') || text.includes('tam sao') || text.includes('từ vựng') || text.includes('ngữ pháp') || text.includes('phát âm')) {
    return 'VOCAB_GRAMMAR';
  }
  return 'WARMUP_GAMES';
};

const getCategoryMeta = (cat, lang = 'vi') => {
  switch (cat) {
    case 'IELTS_LISTENING':
      return { label: 'IELTS Listening', color: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50' };
    case 'IELTS_READING':
      return { label: 'IELTS Reading', color: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/50' };
    case 'IELTS_WRITING_T1':
      return { label: 'IELTS Writing Task 1', color: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/50' };
    case 'IELTS_WRITING_T2':
      return { label: 'IELTS Writing Task 2', color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50' };
    case 'IELTS_SPEAKING':
      return { label: 'IELTS Speaking', color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50' };
    case 'TESOL_SPEAKING':
      return { label: lang === 'en' ? 'TESOL Speaking' : 'TESOL Giao tiếp', color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50' };
    case 'VOCAB_GRAMMAR':
      return { label: lang === 'en' ? 'Vocabulary & Grammar' : 'Từ vựng & Ngữ pháp', color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50' };
    default:
      return { label: lang === 'en' ? 'Warm-up & Games' : 'Khởi động & Game', color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50' };
  }
};

export default function ActivityLibraryModal({ isOpen, onClose, onSelectActivity = null }) {
  const { toast, confirm } = useToast();
  const { t, lang } = useThemeLanguage();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [editingActivity, setEditingActivity] = useState(null);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const data = await activityApi.getAll();
      setActivities(data || []);
    } catch (error) {
      console.error('Lỗi khi tải thư viện hoạt động:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchActivities();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingActivity) {
        await activityApi.update(editingActivity.id, formData);
        toast.success(lang === 'en' ? `Updated activity "${formData.name}"` : `Đã cập nhật hoạt động "${formData.name}"`);
      } else {
        await activityApi.create(formData);
        toast.success(lang === 'en' ? `Added activity "${formData.name}" to library` : `Đã thêm hoạt động "${formData.name}" vào thư viện`);
      }
      await fetchActivities();
      setFormData({ name: '', description: '' });
      setEditingActivity(null);
      setIsFormOpen(false);
    } catch (error) {
      toast.error(lang === 'en' ? ('Error saving activity: ' + (error.response?.data?.message || error.message)) : ('Lỗi lưu hoạt động: ' + (error.response?.data?.message || error.message)));
    }
  };

  const handleEdit = (act) => {
    setEditingActivity(act);
    setFormData({ name: act.name, description: act.description || '' });
    setIsFormOpen(true);
  };

  const handleDelete = async (id, actName) => {
    const ok = await confirm({
      title: lang === 'en' ? 'Delete activity' : 'Xóa hoạt động',
      message: lang === 'en'
        ? `Are you sure you want to delete activity ${actName ? `"${actName}"` : ''} from the shared library?`
        : `Bạn có chắc chắn muốn xóa hoạt động ${actName ? `"${actName}"` : ''} khỏi thư viện chung?`,
      confirmText: lang === 'en' ? 'Delete activity' : 'Xóa hoạt động',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await activityApi.delete(id);
      toast.success(lang === 'en' ? 'Activity deleted from library!' : 'Đã xóa hoạt động khỏi thư viện!');
      await fetchActivities();
    } catch (error) {
      toast.error(lang === 'en' ? ('Error deleting activity: ' + (error.response?.data?.message || error.message)) : ('Lỗi khi xóa hoạt động: ' + (error.response?.data?.message || error.message)));
    }
  };

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const matchSearch =
        act.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (act.description && act.description.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;
      if (selectedCategory === 'ALL') return true;

      const actCat = categorizeActivity(act.name, act.description);
      return actCat === selectedCategory;
    });
  }, [activities, searchTerm, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[70] p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 dark:bg-slate-950 text-white flex justify-between items-center border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-900/50 px-2 py-0.5 rounded border border-blue-700/50">
                {lang === 'en' ? 'Pedagogy, IELTS & TESOL' : 'Sư phạm, IELTS & TESOL'}
              </span>
              <span className="text-xs text-slate-400">({activities.length} {lang === 'en' ? 'sample activities' : 'hoạt động mẫu'})</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mt-1">
              {lang === 'en' ? 'Teaching & Interactive Activity Library' : 'Thư Viện Hoạt Động Giảng Dạy & Tương Tác'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'en' ? 'Easy interactive, low-tech/no-tech activities with step-by-step instructions' : 'Hoạt động tương tác dễ làm, ít công nghệ (low-tech/no-tech), kèm hướng dẫn chi tiết từng bước'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl font-bold p-1 cursor-pointer leading-none"
          >
            &times;
          </button>
        </div>

        {/* Action & Filter Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={lang === 'en' ? 'Search by activity name, skill, purpose...' : 'Tìm kiếm theo tên hoạt động, kỹ năng, mục đích...'}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg pl-3 pr-8 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Button Thêm Hoạt Động */}
            <button
              type="button"
              onClick={() => {
                if (isFormOpen && !editingActivity) {
                  setIsFormOpen(false);
                } else {
                  setEditingActivity(null);
                  setFormData({ name: '', description: '' });
                  setIsFormOpen(true);
                }
              }}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer shadow-sm whitespace-nowrap self-start sm:self-auto"
            >
              {isFormOpen && !editingActivity
                ? (lang === 'en' ? 'Close form' : 'Đóng form thêm')
                : (lang === 'en' ? '+ Add new activity' : '+ Tự thêm hoạt động mới')}
            </button>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {lang === 'en' && cat.labelEn ? cat.labelEn : cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Form Thêm/Sửa */}
          {isFormOpen && (
            <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 sm:p-5 rounded-xl border border-blue-200 dark:border-blue-900/40 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {editingActivity
                    ? (lang === 'en' ? 'Edit Sample Activity' : 'Chỉnh Sửa Hoạt Động Mẫu')
                    : (lang === 'en' ? 'Add New Activity to Library' : 'Thêm Hoạt Động Mới Vào Thư Viện')}
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingActivity(null);
                  }}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  {t('cancel') || (lang === 'en' ? 'Cancel' : 'Hủy')}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Activity Name' : 'Tên hoạt động'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={lang === 'en' ? 'Enter activity name...' : 'Nhập tên hoạt động...'}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'en' ? 'Detailed Description (Purpose, Step-by-step instructions, Timing, Materials)' : 'Mô tả chi tiết (Mục đích, Cách tổ chức từng bước, Thời lượng, Dụng cụ)'}
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={lang === 'en' ? 'Purpose: Practice...\\nProcedure:\\n1. Group students...\\n2. Students conduct...\\nDuration: 15 mins. Materials: Paper, pen...' : 'Mục đích: Rèn luyện...\\nCách tổ chức:\\n1. Chia nhóm...\\n2. Học sinh thực hiện...\\nThời lượng: 15 phút. Dụng cụ: Giấy, bút...'}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg p-3 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingActivity(null);
                    }}
                    className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    {t('cancel') || (lang === 'en' ? 'Cancel' : 'Hủy')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer shadow-xs"
                  >
                    {editingActivity
                      ? (lang === 'en' ? 'Save changes' : 'Lưu thay đổi')
                      : (lang === 'en' ? 'Save to library' : 'Lưu vào thư viện')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Danh Sách Hoạt Động (Dạng Cards) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                {lang === 'en' ? `Results (${filteredActivities.length} activities)` : `Kết quả hiển thị (${filteredActivities.length} hoạt động)`}
              </h4>
              {loading && <span className="text-xs text-slate-500 dark:text-slate-400">{lang === 'en' ? 'Loading...' : 'Đang tải...'}</span>}
            </div>

            {filteredActivities.length === 0 && !loading ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{lang === 'en' ? 'No matching activities found' : 'Không tìm thấy hoạt động nào phù hợp'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{lang === 'en' ? 'Try searching with another keyword or click the add button above.' : 'Hãy thử tìm với từ khóa khác hoặc bấm nút thêm mới ở trên.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredActivities.map((act) => {
                  const cat = categorizeActivity(act.name, act.description);
                  const meta = getCategoryMeta(cat, lang);

                  return (
                    <div
                      key={act.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        {/* Tags & Actions */}
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${meta.color}`}>
                            {meta.label}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(act)}
                              title={lang === 'en' ? 'Edit activity' : 'Sửa nội dung hoạt động'}
                              className="px-2 py-0.5 text-[11px] text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition cursor-pointer"
                            >
                              {lang === 'en' ? 'Edit' : 'Sửa'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(act.id, act.name)}
                              title={lang === 'en' ? 'Delete activity from library' : 'Xóa hoạt động khỏi thư viện'}
                              className="px-2 py-0.5 text-[11px] text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition cursor-pointer"
                            >
                              {lang === 'en' ? 'Delete' : 'Xóa'}
                            </button>
                          </div>
                        </div>

                        {/* Activity Name */}
                        <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                          {act.name}
                        </h5>

                        {/* Description */}
                        {act.description && (
                          <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-h-48 overflow-y-auto pr-1 bg-slate-50/70 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 whitespace-pre-line">
                            {act.description}
                          </div>
                        )}
                      </div>

                      {/* Footer: Select Button or Copy Name Button */}
                      {onSelectActivity ? (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectActivity(act);
                              onClose();
                            }}
                            className="w-full sm:w-auto px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition cursor-pointer shadow-xs"
                          >
                            {lang === 'en' ? 'Select this activity' : 'Chọn hoạt động này'}
                          </button>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(act.name);
                              toast.success(lang === 'en' ? `Copied name: "${act.name}"` : `Đã sao chép tên: "${act.name}"`);
                            }}
                            className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1 rounded transition cursor-pointer border border-slate-200 dark:border-slate-700"
                            title={lang === 'en' ? 'Copy activity name to clipboard' : 'Sao chép tên hoạt động vào clipboard'}
                          >
                            {lang === 'en' ? 'Copy name' : 'Sao chép tên'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{lang === 'en' ? `Total: ${activities.length} sample activities available in system` : `Tổng cộng: ${activities.length} hoạt động mẫu có sẵn trong hệ thống`}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition shadow-sm"
          >
            {t('close') || (lang === 'en' ? 'Close' : 'Đóng')}
          </button>
        </div>
      </div>
    </div>
  );
}
