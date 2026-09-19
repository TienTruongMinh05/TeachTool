import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { loadBookWithCache, clearBookCache } from '../utils/bookCacheService';

// Cấu hình CDN worker cho pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

function PdfPageItem({
  pdfDoc,
  pageNum,
  scale,
  isVisible
}) {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [rendered, setRendered] = useState(false);
  const [pageDimensions, setPageDimensions] = useState({ width: 600, height: 850 });

  // Lấy kích thước trang để tạo placeholder không bị giật khung khi cuộn
  useEffect(() => {
    if (!pdfDoc) return;
    let isMounted = true;
    pdfDoc.getPage(pageNum).then(p => {
      if (!isMounted) return;
      const vp = p.getViewport({ scale });
      setPageDimensions({ width: vp.width, height: vp.height });
    });
    return () => { isMounted = false; };
  }, [pdfDoc, pageNum, scale]);

  // Render trang khi xuất hiện trong vùng nhìn (isVisible)
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;

    if (!isVisible) {
      // Hủy render nếu trang cuộn ra khỏi vùng đệm
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
      }
      return;
    }

    pdfDoc.getPage(pageNum).then(p => {
      if (isCancelled || !canvasRef.current) return;

      const viewport = p.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport
      };

      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
      }

      const task = p.render(renderContext);
      renderTaskRef.current = task;

      task.promise
        .then(() => {
          if (!isCancelled) setRendered(true);
        })
        .catch(err => {
          if (err?.name !== 'RenderingCancelledException') {
            console.error(`Lỗi render trang ${pageNum}:`, err);
          }
        });
    });

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
      }
    };
  }, [pdfDoc, pageNum, scale, isVisible]);

  return (
    <div
      id={`pdf-page-${pageNum}`}
      data-page-number={pageNum}
      className="pdf-page-container relative flex flex-col items-center my-3.5 transition-all"
      style={{ minHeight: pageDimensions.height }}
    >
      <div
        className="relative shadow-2xl rounded-sm bg-white overflow-hidden border border-slate-800"
        style={{ width: pageDimensions.width, height: pageDimensions.height }}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />

        {!rendered && isVisible && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/10 backdrop-blur-2xs">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Nhãn số trang tinh gọn góc dưới */}
        <div className="absolute bottom-2.5 right-2.5 bg-slate-900/80 backdrop-blur-xs text-[11px] font-mono text-slate-200 px-2 py-0.5 rounded shadow">
          {pageNum}
        </div>
      </div>
    </div>
  );
}

export default function PdfCanvasViewer({
  fileUrl,
  currentPage = 1,
  onPageChange = null,
  onTotalPagesLoaded = null,
  className = ""
}) {
  const containerRef = useRef(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [activePage, setActivePage] = useState(currentPage || 1);
  const [scale, setScale] = useState(1.15);
  const [loading, setLoading] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isCached, setIsCached] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState('');

  // Tập hợp các trang đang trong tầm nhìn để kích hoạt render Canvas
  const [visiblePages, setVisiblePages] = useState(new Set([currentPage || 1]));

  // Tải tài liệu PDF với bộ nhớ đệm CacheStorage
  useEffect(() => {
    if (!fileUrl) {
      setError('Không có liên kết tài liệu PDF.');
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setDownloadProgress(0);
    setError('');

    // Chuẩn hóa fileUrl: Nếu là relative URL (/api/files/download/...), ghép với API base URL
    let resolvedUrl = fileUrl;
    if (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://') && !resolvedUrl.startsWith('blob:')) {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';
      const serverOrigin = apiBase.replace(/\/api\/?$/, '');
      resolvedUrl = `${serverOrigin}${resolvedUrl.startsWith('/') ? '' : '/'}${resolvedUrl}`;
    }

    let loadingTask = null;

    async function fetchAndRenderPdf() {
      try {
        // Tải từ CacheStorage hoặc tải mạng với thanh tiến trình
        const bookData = await loadBookWithCache(resolvedUrl, (percent) => {
          if (isMounted) setDownloadProgress(percent);
        });

        if (!isMounted) return;
        setIsCached(bookData.fromCache);

        loadingTask = pdfjsLib.getDocument({
          data: bookData.data,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true
        });

        const doc = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        if (onTotalPagesLoaded) {
          onTotalPagesLoaded(doc.numPages);
        }
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error('Lỗi tải PDF:', err);
        const isMissing = err?.message?.includes('Missing PDF') || err?.name === 'MissingPDFException';
        if (isMissing) {
          setError('Tệp PDF không tìm thấy trên máy chủ (HTTP 404). Tệp có thể đã bị mất do máy chủ khởi động lại trước khi kích hoạt cơ sở dữ liệu vĩnh viễn. Vui lòng tải lại tệp tin.');
        } else {
          setError('Không thể mở tệp PDF trực tiếp: ' + (err.message || 'Lỗi kết nối tệp'));
        }
        setLoading(false);
      }
    }

    fetchAndRenderPdf();

    return () => {
      isMounted = false;
      if (loadingTask && loadingTask.destroy) {
        loadingTask.destroy();
      }
    };
  }, [fileUrl, reloadKey]);

  // Cuộn đến trang khi được truyền từ bên ngoài vào lần đầu
  useEffect(() => {
    if (currentPage && currentPage !== activePage) {
      scrollToPage(currentPage);
    }
  }, [currentPage]);

  const scrollToPage = useCallback((pageNum) => {
    const p = Math.max(1, Math.min(pageNum, numPages || 1));
    const targetEl = document.getElementById(`pdf-page-${p}`);
    if (targetEl && containerRef.current) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActivePage(p);
      if (onPageChange) onPageChange(p);
    }
  }, [numPages, onPageChange]);

  // IntersectionObserver phát hiện trang đang hiển thị khi người dùng cuộn chuột / vuốt màn hình
  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;

    const container = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        let maxVisibleEntry = null;
        let maxRatio = 0;

        const currentVisible = new Set();

        entries.forEach(entry => {
          const pageNum = Number(entry.target.getAttribute('data-page-number'));
          if (entry.isIntersecting) {
            // Thêm trang hiện tại và các trang lân cận (+-1) vào bộ đệm render
            currentVisible.add(pageNum);
            if (pageNum > 1) currentVisible.add(pageNum - 1);
            if (pageNum < numPages) currentVisible.add(pageNum + 1);

            if (entry.intersectionRatio > maxRatio) {
              maxRatio = entry.intersectionRatio;
              maxVisibleEntry = entry;
            }
          }
        });

        if (currentVisible.size > 0) {
          setVisiblePages(prev => {
            const nextSet = new Set(prev);
            currentVisible.forEach(p => nextSet.add(p));
            return nextSet;
          });
        }

        if (maxVisibleEntry) {
          const targetNum = Number(maxVisibleEntry.target.getAttribute('data-page-number'));
          if (targetNum && targetNum !== activePage) {
            setActivePage(targetNum);
            if (onPageChange) onPageChange(targetNum);
          }
        }
      },
      {
        root: container,
        rootMargin: '200px 0px 200px 0px',
        threshold: [0.1, 0.3, 0.5, 0.7, 0.9]
      }
    );

    const pageElements = container.querySelectorAll('.pdf-page-container');
    pageElements.forEach(el => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [pdfDoc, numPages, activePage, onPageChange]);

  const handlePrev = () => {
    if (activePage > 1) {
      scrollToPage(activePage - 1);
    }
  };

  const handleNext = () => {
    if (activePage < numPages) {
      scrollToPage(activePage + 1);
    }
  };

  const handlePageInput = (e) => {
    const val = Number(e.target.value);
    if (!val) return;
    const p = Math.max(1, Math.min(val, numPages));
    setActivePage(p);
    scrollToPage(p);
  };

  const handleClearAndReload = async () => {
    let resolvedUrl = fileUrl;
    if (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://') && !resolvedUrl.startsWith('blob:')) {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';
      const serverOrigin = apiBase.replace(/\/api\/?$/, '');
      resolvedUrl = `${serverOrigin}${resolvedUrl.startsWith('/') ? '' : '/'}${resolvedUrl}`;
    }
    await clearBookCache(resolvedUrl);
    setIsCached(false);
    setReloadKey(k => k + 1);
  };

  return (
    <div className={`flex flex-col h-full bg-slate-950 text-white select-none ${className}`}>
      {/* Thanh điều khiển Toolbar */}
      <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs sticky top-0 z-30 shadow-md">
        {/* Bộ điều khiển & Chỉ báo số trang */}
        <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={handlePrev}
            disabled={activePage <= 1 || loading}
            className="px-2 py-1 text-slate-300 hover:text-white disabled:opacity-30 rounded hover:bg-slate-700 transition cursor-pointer font-semibold"
            title="Cuộn đến trang trước"
          >
            ← Trước
          </button>

          <div className="flex items-center gap-1 px-1 font-mono">
            <span className="text-slate-400 text-[11px]">Trang</span>
            <input
              type="number"
              min="1"
              max={numPages || 1}
              value={activePage}
              onChange={handlePageInput}
              disabled={loading}
              className="w-12 bg-slate-900 border border-slate-600 rounded text-center text-xs py-0.5 text-white font-bold focus:outline-none focus:border-blue-500"
            />
            <span className="text-slate-400 text-[11px]">/ {numPages || '...'}</span>
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={activePage >= numPages || loading}
            className="px-2 py-1 text-slate-300 hover:text-white disabled:opacity-30 rounded hover:bg-slate-700 transition cursor-pointer font-semibold"
            title="Cuộn đến trang sau"
          >
            Sau →
          </button>
        </div>

        {/* Chỉ báo trạng thái Bộ nhớ đệm Sách số */}
        <div className="flex items-center gap-2">
          {isCached ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-700/60 px-2.5 py-1 rounded-md shadow-xs">
              ⚡ Bộ nhớ đệm (Mở tức thì)
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center text-[11px] text-slate-400">
              Cuộn chuột hoặc vuốt để xem liên tục các trang
            </span>
          )}

          <button
            type="button"
            onClick={handleClearAndReload}
            disabled={loading}
            className="text-[11px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 transition cursor-pointer"
            title="Tải lại sách và cập nhật bộ nhớ đệm"
          >
            Làm mới sách
          </button>
        </div>

        {/* Bộ điều khiển Zoom */}
        <div className="flex items-center gap-1 bg-slate-800/90 px-2 py-1 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => setScale(prev => Math.max(0.6, prev - 0.15))}
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
            onClick={() => setScale(prev => Math.min(2.2, prev + 0.15))}
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

      {/* Vùng cuộn dọc hiển thị danh sách trang liên tục */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-auto p-4 flex flex-col items-center bg-slate-950/95 scroll-smooth"
      >
        {loading && (
          <div className="flex flex-col items-center gap-3 text-slate-300 py-16 m-auto">
            <div className="w-9 h-9 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center space-y-1">
              <span className="text-xs font-semibold block">
                {downloadProgress > 0 && downloadProgress < 100
                  ? `Đang tải sách số vào bộ nhớ đệm: ${downloadProgress}%`
                  : 'Đang mở và kết xuất tài liệu...'}
              </span>
              <span className="text-[11px] text-slate-500 block">
                Lần sau mở sẽ tức thì nhờ bộ nhớ đệm trình duyệt
              </span>
            </div>
            {downloadProgress > 0 && downloadProgress < 100 && (
              <div className="w-48 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-150"
                  style={{ width: `${downloadProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-6 bg-rose-950/40 border border-rose-500/40 rounded-xl text-center max-w-md space-y-2 m-auto">
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

        {/* Danh sách trang cuộn liên tiếp */}
        {!loading && !error && numPages > 0 && (
          <div className="w-full flex flex-col items-center pb-12">
            {Array.from({ length: numPages }, (_, i) => i + 1).map(pNum => (
              <PdfPageItem
                key={pNum}
                pdfDoc={pdfDoc}
                pageNum={pNum}
                scale={scale}
                isVisible={visiblePages.has(pNum)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
