import { useState } from 'react';

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
          <div className="flex items-center gap-2 truncate">
            <span className="text-base">📖</span>
            <div className="truncate">
              <h3 className="font-bold text-xs sm:text-sm truncate text-white" title={material.title}>
                {material.title}
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                Lật đến trang cần dạy rồi bấm nút 'Chọn trang này'
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Lật trang */}
            <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 p-1 text-xs">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
                className="px-2 py-0.5 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Trang trước"
              >
                ◀
              </button>
              <div className="flex items-center gap-1 px-1">
                <span className="text-slate-400 text-[11px]">Trang</span>
                <input
                  type="number"
                  min="1"
                  max={material.totalPages || 999}
                  value={currentPage}
                  onChange={(e) => setCurrentPage(Math.max(1, Number(e.target.value) || 1))}
                  className="w-12 bg-slate-800 border border-slate-600 rounded text-center text-xs py-0.5 text-white font-mono focus:outline-none"
                />
                <span className="text-slate-400 text-[11px]">/ {material.totalPages || '?'}</span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-2 py-0.5 text-slate-300 hover:text-white cursor-pointer"
                title="Trang sau"
              >
                ▶
              </button>
            </div>

            {/* Nút Chọn Trang Này */}
            <button
              type="button"
              onClick={handleConfirmPick}
              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1"
            >
              <span>✅</span>
              <span>Chọn Trang {currentPage}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold text-slate-300 bg-slate-700 hover:bg-slate-600 hover:text-white rounded-lg transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* PDF Frame */}
        <div className="flex-1 bg-slate-950 overflow-hidden relative">
          {material.fileUrl ? (
            <iframe
              title={material.title}
              src={`${material.fileUrl}#page=${currentPage}`}
              className="w-full h-full border-0 bg-white"
            />
          ) : (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <div className="text-3xl">⚠️</div>
              <p className="text-xs">Tài liệu này không có tệp PDF đính kèm hoặc URL không hợp lệ.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
