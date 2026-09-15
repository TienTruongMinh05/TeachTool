import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Cấu hình CDN worker cho pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export default function PdfCanvasViewer({
  fileUrl,
  currentPage = 1,
  onPageChange = null,
  onTotalPagesLoaded = null,
  className = ""
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const renderTaskRef = useRef(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(currentPage || 1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rendering, setRendering] = useState(false);

  // Đồng bộ trang từ bên ngoài truyền vào
  useEffect(() => {
    if (currentPage && currentPage !== page) {
      setPage(currentPage);
    }
  }, [currentPage]);

  // Tải tài liệu PDF
  useEffect(() => {
    if (!fileUrl) {
      setError('Không có liên kết tài liệu PDF.');
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError('');

    const loadingTask = pdfjsLib.getDocument({
      url: fileUrl,
      cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
      cMapPacked: true
    });

    loadingTask.promise
      .then(doc => {
        if (!isMounted) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        if (onTotalPagesLoaded) {
          onTotalPagesLoaded(doc.numPages);
        }
        setLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('Lỗi tải PDF:', err);
        setError('Không thể mở tệp PDF trực tiếp: ' + (err.message || 'Lỗi kết nối tệp'));
        setLoading(false);
      });

    return () => {
      isMounted = false;
      if (loadingTask && loadingTask.destroy) {
        loadingTask.destroy();
      }
    };
  }, [fileUrl]);

  // Render trang hiện tại lên Canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;
    const targetPageNum = Math.max(1, Math.min(page, numPages || 1));

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {}
    }

    setRendering(true);

    pdfDoc.getPage(targetPageNum).then(pageObj => {
      if (isCancelled || !canvasRef.current) return;

      const viewport = pageObj.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      const renderTask = pageObj.render(renderContext);
      renderTaskRef.current = renderTask;

      renderTask.promise
        .then(() => {
          if (!isCancelled) setRendering(false);
        })
        .catch(err => {
          if (err?.name !== 'RenderingCancelledException') {
            console.error('Lỗi render trang PDF:', err);
          }
        });
    });

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, page, scale, numPages]);

  const handlePrevPage = () => {
    if (page > 1) {
      const nextP = page - 1;
      setPage(nextP);
      if (onPageChange) onPageChange(nextP);
    }
  };

  const handleNextPage = () => {
    if (page < numPages) {
      const nextP = page + 1;
      setPage(nextP);
      if (onPageChange) onPageChange(nextP);
    }
  };

  const handlePageInput = (e) => {
    const val = Number(e.target.value);
    if (!val) return;
    const p = Math.max(1, Math.min(val, numPages));
    setPage(p);
    if (onPageChange) onPageChange(p);
  };

  return (
    <div className={`flex flex-col h-full bg-slate-950 text-white select-none ${className}`}>
      {/* Thanh điều khiển Toolbar */}
      <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Bộ điều khiển Trang */}
        <div className="flex items-center gap-1.5 bg-slate-800/90 px-2 py-1 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={page <= 1 || loading}
            className="px-2 py-1 text-slate-300 hover:text-white disabled:opacity-30 rounded hover:bg-slate-700 transition cursor-pointer font-semibold"
            title="Trang trước"
          >
            ← Trước
          </button>

          <div className="flex items-center gap-1 px-1 font-mono">
            <span className="text-slate-400 text-[11px]">Trang</span>
            <input
              type="number"
              min="1"
              max={numPages || 1}
              value={page}
              onChange={handlePageInput}
              disabled={loading}
              className="w-12 bg-slate-900 border border-slate-600 rounded text-center text-xs py-0.5 text-white font-bold focus:outline-none focus:border-blue-500"
            />
            <span className="text-slate-400 text-[11px]">/ {numPages || '...'}</span>
          </div>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={page >= numPages || loading}
            className="px-2 py-1 text-slate-300 hover:text-white disabled:opacity-30 rounded hover:bg-slate-700 transition cursor-pointer font-semibold"
            title="Trang sau"
          >
            Sau →
          </button>
        </div>

        {/* Bộ điều khiển Zoom */}
        <div className="flex items-center gap-1 bg-slate-800/90 px-2 py-1 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => setScale(prev => Math.max(0.6, prev - 0.2))}
            disabled={loading}
            className="px-2 py-0.5 text-slate-300 hover:text-white rounded hover:bg-slate-700 cursor-pointer font-bold"
            title="Thu nhỏ"
          >
            -
          </button>
          <span className="text-[11px] font-mono text-slate-300 px-1 min-w-[40px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale(prev => Math.min(2.5, prev + 0.2))}
            disabled={loading}
            className="px-2 py-0.5 text-slate-300 hover:text-white rounded hover:bg-slate-700 cursor-pointer font-bold"
            title="Phóng to"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setScale(1.0)}
            className="ml-1 text-[11px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-700 cursor-pointer"
          >
            100%
          </button>
        </div>
      </div>

      {/* Vùng Canvas hiển thị PDF */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex items-center justify-center relative bg-slate-950/90"
      >
        {loading && (
          <div className="flex flex-col items-center gap-2 text-slate-400 py-12">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs">Đang tải và xử lý tài liệu PDF...</span>
          </div>
        )}

        {error && (
          <div className="p-6 bg-rose-950/40 border border-rose-500/40 rounded-xl text-center max-w-md space-y-2">
            <p className="text-xs text-rose-300 font-semibold">{error}</p>
            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs text-blue-400 hover:underline pt-2"
              >
                Mở bằng liên kết trực tiếp ↗
              </a>
            )}
          </div>
        )}

        {/* Khung Canvas render */}
        <div className={`relative transition-opacity duration-150 ${loading || error ? 'hidden' : 'block'}`}>
          {rendering && (
            <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-xs text-[10px] text-slate-300 px-2 py-1 rounded shadow-md border border-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
              Đang vẽ trang...
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="shadow-2xl rounded-sm bg-white mx-auto max-w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
}
