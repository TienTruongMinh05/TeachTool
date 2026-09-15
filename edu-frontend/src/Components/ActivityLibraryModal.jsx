import React, { useState, useEffect, useMemo } from 'react';
import { activityApi } from '../api/activityApi';

const CATEGORIES = [
  { id: 'ALL', label: 'Tất cả hoạt động' },
  { id: 'TESOL_SPEAKING', label: 'TESOL - Giao tiếp & Nói' },
  { id: 'VOCAB_GRAMMAR', label: 'Từ vựng & Ngữ pháp' },
  { id: 'READING_WRITING', label: 'Đọc & Viết hợp tác' },
  { id: 'WARMUP_GAMES', label: 'Khởi động & Vận động (No-tech)' },
];

const categorizeActivity = (name = '', desc = '') => {
  const text = (name + ' ' + desc).toLowerCase();
  if (text.includes('tìm người') || text.includes('khoảng trống') || text.includes('vòng tròn đối thoại') || text.includes('đóng vai') || text.includes('thám tử') || text.includes('speaking') || text.includes('giao tiếp')) {
    return 'TESOL_SPEAKING';
  }
  if (text.includes('ghế nóng') || text.includes('chính tả') || text.includes('từ cấm') || text.includes('đấu giá') || text.includes('tam sao') || text.includes('từ vựng') || text.includes('ngữ pháp') || text.includes('phát âm')) {
    return 'VOCAB_GRAMMAR';
  }
  if (text.includes('mảnh ghép') || text.includes('câu chuyện') || text.includes('đọc hiểu') || text.includes('viết')) {
    return 'READING_WRITING';
  }
  return 'WARMUP_GAMES';
};

export default function ActivityLibraryModal({ isOpen, onClose, onSelectActivity = null }) {
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
      } else {
        await activityApi.create(formData);
      }
      await fetchActivities();
      setFormData({ name: '', description: '' });
      setEditingActivity(null);
      setIsFormOpen(false);
    } catch (error) {
      alert('Lỗi lưu hoạt động: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEdit = (act) => {
    setEditingActivity(act);
    setFormData({ name: act.name, description: act.description || '' });
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa hoạt động này khỏi thư viện chung?')) return;
    try {
      await activityApi.delete(id);
      await fetchActivities();
    } catch (error) {
      alert('Lỗi khi xóa hoạt động: ' + (error.response?.data?.message || error.message));
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-900/50 px-2 py-0.5 rounded border border-blue-700/50">
                Sư phạm & TESOL
              </span>
              <span className="text-xs text-slate-400">({activities.length} hoạt động mẫu)</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mt-1">
              Thư Viện Hoạt Động Giảng Dạy & Tương Tác
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Hoạt động tương tác dễ làm, ít công nghệ (low-tech/no-tech), kèm hướng dẫn chi tiết từng bước
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
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm theo tên hoạt động, kỹ năng, mục đích..."
                className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
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
              {isFormOpen && !editingActivity ? 'Đóng form thêm' : '+ Tự thêm hoạt động mới'}
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
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Form Thêm/Sửa */}
          {isFormOpen && (
            <div className="bg-blue-50/50 p-4 sm:p-5 rounded-xl border border-blue-200 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800">
                  {editingActivity ? 'Chỉnh Sửa Hoạt Động Mẫu' : 'Thêm Hoạt Động Mới Vào Thư Viện'}
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingActivity(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Hủy
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên hoạt động <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ví dụ: Role-play phỏng vấn, Đấu giá câu ngữ pháp, Slap the board..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mô tả chi tiết (Mục đích, Cách tổ chức từng bước, Thời lượng, Dụng cụ)
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mục đích: Rèn luyện...&#10;Cách tổ chức:&#10;1. Chia nhóm...&#10;2. Học sinh thực hiện...&#10;Thời lượng: 15 phút. Dụng cụ: Giấy, bút..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingActivity(null);
                    }}
                    className="px-3.5 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer shadow-xs"
                  >
                    {editingActivity ? 'Lưu thay đổi' : 'Lưu vào thư viện'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Danh Sách Hoạt Động (Dạng Cards) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Kết quả hiển thị ({filteredActivities.length} hoạt động)
              </h4>
              {loading && <span className="text-xs text-slate-500">Đang tải...</span>}
            </div>

            {filteredActivities.length === 0 && !loading ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-sm font-semibold text-slate-700">Không tìm thấy hoạt động nào phù hợp</p>
                <p className="text-xs text-slate-500 mt-1">Hãy thử tìm với từ khóa khác hoặc bấm nút thêm mới ở trên.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredActivities.map((act) => {
                  const cat = categorizeActivity(act.name, act.description);
                  const catLabel =
                    cat === 'TESOL_SPEAKING'
                      ? 'TESOL Giao tiếp'
                      : cat === 'VOCAB_GRAMMAR'
                      ? 'Từ vựng & Ngữ pháp'
                      : cat === 'READING_WRITING'
                      ? 'Đọc & Viết'
                      : 'Khởi động & Vận động';

                  return (
                    <div
                      key={act.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        {/* Tags & Actions */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {catLabel}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(act)}
                              title="Sửa nội dung hoạt động"
                              className="px-2 py-0.5 text-[11px] text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(act.id)}
                              title="Xóa hoạt động khỏi thư viện"
                              className="px-2 py-0.5 text-[11px] text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>

                        {/* Activity Name */}
                        <h5 className="font-bold text-sm text-slate-900 leading-snug">
                          {act.name}
                        </h5>

                        {/* Description */}
                        {act.description && (
                          <div className="text-xs text-slate-600 leading-relaxed max-h-48 overflow-y-auto pr-1 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100 whitespace-pre-line">
                            {act.description}
                          </div>
                        )}
                      </div>

                      {/* Footer: Select Button */}
                      {onSelectActivity && (
                        <div className="pt-2 border-t border-slate-100 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectActivity(act.name);
                              onClose();
                            }}
                            className="w-full sm:w-auto px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition cursor-pointer shadow-xs"
                          >
                            Chọn hoạt động này
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
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Tổng cộng: {activities.length} hoạt động mẫu có sẵn trong hệ thống</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer transition shadow-sm"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
