import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { fileApi } from '../api/fileApi';
import { useToast } from '../context/ToastContext';
import PdfCanvasViewer from './PdfCanvasViewer';

// Cấu hình CDN worker cho pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export const getStoredClassMaterials = (classId) => {
  if (!classId) return [];
  try {
    const saved = localStorage.getItem('class_materials_' + classId);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [
    {
      id: 'default-book-1',
      title: 'Giáo trình Tiếng Anh Chuẩn (Student Book)',
      category: 'Sách giáo khoa',
      fileUrl: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf',
      fileName: 'English_Student_Book.pdf',
      totalPages: 120,
      description: 'Giáo trình giảng dạy chính khóa trên lớp',
      createdAt: new Date().toISOString()
    }
  ];
};

export const saveStoredClassMaterials = (classId, materials) => {
  if (!classId) return;
  try {
    localStorage.setItem('class_materials_' + classId, JSON.stringify(materials));
  } catch {}
};

export default function ClassMaterialsManager({ classId, classInfo }) {
  const { toast, confirm } = useToast();
  const [materials, setMaterials] = useState(() => getStoredClassMaterials(classId));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Sách giáo khoa',
    fileUrl: '',
    fileName: '',
    totalPages: 1,
    description: ''
  });

  // PDF Viewer Modal State
  const [viewingMaterial, setViewingMaterial] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setMaterials(getStoredClassMaterials(classId));
  }, [classId]);

  const handleSaveMaterials = (newMaterials) => {
    setMaterials(newMaterials);
    saveStoredClassMaterials(classId, newMaterials);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.pdf') && file.type !== 'application/pdf') {
      toast.warning('Chỉ hỗ trợ tệp tài liệu định dạng PDF (.pdf)!');
      e.target.value = '';
      return;
    }

    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_FILE_SIZE) {
      toast.warning(`Dung lượng tệp (${(file.size / (1024 * 1024)).toFixed(1)} MB) vượt quá giới hạn tối đa cho phép là 100 MB! Vui lòng chọn tệp nhỏ hơn.`);
      e.target.value = '';
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Tự động giải mã và đọc tổng số trang của file PDF
      let detectedPages = 1;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        detectedPages = pdfDoc.numPages || 1;
      } catch (pdfErr) {
        console.warn('Không thể đọc trước số trang PDF:', pdfErr);
      }

      const res = await fileApi.upload(file, (percent) => {
        setUploadProgress(percent);
      });

      setFormData(prev => ({
        ...prev,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
        fileName: res.fileName,
        fileUrl: res.fileUrl,
        totalPages: detectedPages
      }));
      toast.success(`Đã tải lên tệp "${res.fileName}" (tự động nhận diện ${detectedPages} trang)`);
    } catch (err) {
      toast.error('Lỗi tải tệp: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.warning('Vui lòng nhập tên tài liệu/sách.');
      return;
    }

    const newMat = {
      id: 'mat-' + Date.now(),
      title: formData.title.trim(),
      category: formData.category,
      fileUrl: formData.fileUrl || '',
      fileName: formData.fileName || '',
      totalPages: Number(formData.totalPages) || 1,
      description: formData.description.trim(),
      createdAt: new Date().toISOString()
    };

    const updated = [newMat, ...materials];
    handleSaveMaterials(updated);
    toast.success('Đã thêm tài liệu "' + newMat.title + '" vào lớp!');
    setIsAddModalOpen(false);
    setFormData({
      title: '',
      category: 'Sách giáo khoa',
      fileUrl: '',
      fileName: '',
      totalPages: 1,
      description: ''
    });
  };

  const handleDelete = async (mat) => {
    const ok = await confirm({
      title: 'Xóa tài liệu',
      message: 'Bạn có chắc chắn muốn xóa tài liệu "' + mat.title + '" khỏi lớp không?',
      confirmText: 'Xác nhận xóa',
      cancelText: 'Hủy'
    });
    if (!ok) return;

    const updated = materials.filter(m => m.id !== mat.id);
    handleSaveMaterials(updated);
    toast.success('Đã xóa tài liệu!');
  };

  const openPdfViewer = (mat, initialPage = 1) => {
    setViewingMaterial(mat);
    setCurrentPage(initialPage);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Tài Liệu & Sách Giáo Khoa Của Lớp</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý giáo trình PDF, sách bài tập và tài liệu giảng dạy riêng cho lớp {classInfo?.name || ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs cursor-pointer"
        >
          + Thêm Sách / Tài Liệu
        </button>
      </div>

      {/* Grid danh sách sách / tài liệu */}
      {materials.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <h3 className="font-bold text-slate-700 text-base">Chưa có tài liệu hoặc sách nào</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Hãy tải lên sách giáo trình định dạng PDF để tra cứu trực tiếp và chọn trang khi soạn kế hoạch bài học.
          </p>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition cursor-pointer"
          >
            + Tải lên sách đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map(mat => (
            <div
              key={mat.id}
              className="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-4 shadow-xs transition hover:shadow-md flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-50 text-blue-700 rounded border border-blue-200">
                    {mat.category || 'Tài liệu'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(mat)}
                    className="text-slate-400 hover:text-rose-600 text-xs px-1.5 py-0.5 rounded cursor-pointer transition hover:bg-rose-50"
                    title="Xóa tài liệu"
                  >
                    Xóa
                  </button>
                </div>

                <h4 className="font-bold text-slate-800 text-sm line-clamp-2" title={mat.title}>
                  {mat.title}
                </h4>

                {mat.description && (
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {mat.description}
                  </p>
                )}

                <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5 pt-1">
                  {mat.totalPages && (
                    <span>Quy mô: <b>{mat.totalPages} trang</b></span>
                  )}
                  {mat.fileName && (
                    <span className="truncate max-w-[140px]" title={mat.fileName}>Tệp: {mat.fileName}</span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => openPdfViewer(mat, 1)}
                  className="flex-1 py-1.5 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition cursor-pointer text-center"
                >
                  Mở Sách / Đọc
                </button>
                {mat.fileUrl && (
                  <a
                    href={mat.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 px-2.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition cursor-pointer"
                    title="Mở liên kết gốc"
                  >
                    Mở link ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Thêm Sách / Tài liệu */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Thêm Sách / Giáo Trình Cho Lớp</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1 cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên sách / Tên tài liệu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="VD: Destination B1 / Cambridge English Grammar..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Phân loại tài liệu
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Sách giáo khoa">Sách giáo khoa (Student Book)</option>
                  <option value="Sách bài tập">Sách bài tập (Workbook)</option>
                  <option value="Sách giáo viên">Sách giáo viên (Teacher's Guide)</option>
                  <option value="Tài liệu tham khảo">Tài liệu tham khảo</option>
                  <option value="Đề thi / Kiểm tra">Đề thi / Kiểm tra</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tải lên tệp PDF sách hoặc giáo trình (Chỉ chấp nhận .pdf)
                </label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                {uploading && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[11px] text-blue-600 font-medium">
                      <span>Đang tải lên máy chủ...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                {formData.fileName && !uploading && (
                  <p className="text-[11px] text-emerald-700 font-medium mt-1">
                    ✓ Đã tải lên: {formData.fileName} ({formData.totalPages} trang)
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Hoặc dán Link tài liệu PDF trực tuyến
                </label>
                <input
                  type="url"
                  value={formData.fileUrl}
                  onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ghi chú sử dụng (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ghi chú về mục đích sử dụng sách cho giáo viên..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition cursor-pointer shadow-xs"
                >
                  Lưu Sách / Tài Liệu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TRÌNH ĐỌC PDF TRỰC QUAN (CANVAS VIEWER) */}
      {viewingMaterial && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-slate-900 text-white rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl border border-slate-700 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header Toolbar */}
            <div className="p-3 bg-slate-800 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div className="truncate">
                <h3 className="font-bold text-xs sm:text-sm truncate text-white" title={viewingMaterial.title}>
                  {viewingMaterial.title}
                </h3>
                <span className="text-[11px] text-slate-400">
                  {viewingMaterial.category} • Tổng: {viewingMaterial.totalPages || '?'} trang
                </span>
              </div>

              <button
                type="button"
                onClick={() => setViewingMaterial(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-700 hover:bg-slate-600 hover:text-white rounded-lg transition cursor-pointer"
              >
                Đóng
              </button>
            </div>

            {/* Vùng hiển thị tài liệu PDF Canvas */}
            <div className="flex-1 bg-slate-950 overflow-hidden relative flex flex-col">
              {viewingMaterial.fileUrl ? (
                <PdfCanvasViewer
                  fileUrl={viewingMaterial.fileUrl}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  onTotalPagesLoaded={(total) => {
                    if (total && total !== viewingMaterial.totalPages) {
                      setViewingMaterial(prev => ({ ...prev, totalPages: total }));
                    }
                  }}
                />
              ) : (
                <div className="p-8 text-center text-slate-400 space-y-2 m-auto">
                  <p className="text-xs">Tài liệu này không có tệp PDF đính kèm hoặc URL không hợp lệ.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
