import { useState } from 'react';
import PdfCanvasViewer from './PdfCanvasViewer';

export default function BookPagePickerModal({
  material,
  initialPage = 1,
  onSelectPage,
  onClose
}) {
  const [currentPage, setCurrentPage] = useState(initialPage || 1);

  if (!material) return null;

  const handleConfirmPick = () => {
    if (onSelectPage) {
      onSelectPage(currentPage, material);
    }
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-slate-900 text-white rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl border border-slate-700 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header Toolbar */}
        <div className="p-3 bg-slate-800 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="truncate">
            <h3 className="font-bold text-xs sm:text-sm truncate text-white" title={material.title}>
              {material.title}
            </h3>
            <span className="text-[11px] text-slate-400">
              Lật xem đến trang cần dạy rồi bấm nút "Chọn Trang Này"
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirmPick}
              className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs cursor-pointer"
            >
              Chọn Trang {currentPage}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-700 hover:bg-slate-600 hover:text-white rounded-lg transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>

        {/* PDF Canvas View */}
        <div className="flex-1 bg-slate-950 overflow-hidden relative flex flex-col">
          {material.fileUrl ? (
            <PdfCanvasViewer
              fileUrl={material.fileUrl}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          ) : (
            <div className="p-8 text-center text-slate-400 space-y-2 m-auto">
              <p className="text-xs">Tài liệu này không có tệp PDF đính kèm hoặc URL không hợp lệ.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
