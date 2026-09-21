// File: src/Components/StudentInquiriesManager.jsx
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { inquiryApi } from '../api/inquiryApi';
import { fileApi } from '../api/fileApi';
import { classApi } from '../api/classApi';
import { useToast } from '../context/ToastContext';

// Emoji phổ biến để chọn nhanh
const COMMON_EMOJIS = ['😊', '👍', '❤️', '👏', '🙏', '💡', '✅', '📝', '📚', '🎯', '✨', '🙋‍♂️', '🙋‍♀️', '🤔', '💪', '💯'];

export default function StudentInquiriesManager({ onNavigateToClass }) {
  const { toast } = useToast();

  // Danh sách threads & filter
  const [threads, setThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [selectedThread, setSelectedThread] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'UNANSWERED' | 'ANSWERED'
  const [classFilter, setClassFilter] = useState('ALL'); // 'ALL' | classId
  const [searchQuery, setSearchQuery] = useState('');
  const [classes, setClasses] = useState([]);

  // Chi tiết tin nhắn trong thread đang chọn
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // Input chat
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]); // Tối đa 3 files/lần
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Mobile navigation: khi chọn thread trên màn hình nhỏ, chuyển sang view chat
  const [mobileChatView, setMobileChatView] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Tải danh sách lớp học của giáo viên để làm dropdown lọc
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const data = await classApi.getAll();
        setClasses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Lỗi khi tải danh sách lớp:', err);
      }
    };
    fetchClasses();
  }, []);

  // Tải danh sách các cuộc hội thoại thắc mắc từ học viên
  const fetchThreads = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoadingThreads(true);
      const data = await inquiryApi.getTeacherThreads(classFilter !== 'ALL' ? classFilter : null);
      const safeData = Array.isArray(data) ? data : [];
      setThreads(safeData);

      // Nếu đang chọn một thread, cập nhật lại dữ liệu của thread đó
      if (selectedThread) {
        const updatedCurrent = safeData.find((t) => t.id === selectedThread.id);
        if (updatedCurrent) {
          setSelectedThread(updatedCurrent);
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách câu hỏi thắc mắc:', err);
      if (!quiet) toast.error('Không thể tải danh sách câu hỏi: ' + (err.response?.data?.message || err.message));
    } finally {
      if (!quiet) setLoadingThreads(false);
    }
  }, [classFilter, selectedThread, toast]);

  // Load threads khi đổi bộ lọc lớp
  useEffect(() => {
    fetchThreads();
  }, [classFilter]);

  // Tự động polling cập nhật tin nhắn mới mỗi 15 giây
  useEffect(() => {
    const interval = setInterval(() => {
      fetchThreads(true);
      if (selectedThread && selectedThread.id) {
        fetchMessages(selectedThread.id, true);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchThreads, selectedThread]);

  // Tải tin nhắn của thread được chọn
  const fetchMessages = async (threadId, quiet = false) => {
    try {
      if (!quiet) setLoadingMessages(true);
      const msgs = await inquiryApi.getThreadMessages(threadId);
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (err) {
      console.error('Lỗi tải tin nhắn:', err);
      if (!quiet) toast.error('Không thể tải nội dung tin nhắn.');
    } finally {
      if (!quiet) setLoadingMessages(false);
    }
  };

  // Khi bấm chọn một thread từ danh sách
  const handleSelectThread = (thread) => {
    setSelectedThread(thread);
    setMobileChatView(true);
    fetchMessages(thread.id);
    // Tự động focus ô nhập tin nhắn
    setTimeout(() => {
      inputRef.current?.focus();
    }, 200);
  };

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Lọc danh sách threads theo trạng thái và từ khóa tìm kiếm
  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      // Lọc theo trạng thái
      if (filterStatus === 'UNANSWERED' && t.status !== 'UNANSWERED') return false;
      if (filterStatus === 'ANSWERED' && t.status !== 'ANSWERED') return false;

      // Lọc theo từ khóa tìm kiếm
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = t.studentName?.toLowerCase().includes(q);
        const matchEmail = t.studentEmail?.toLowerCase().includes(q);
        const matchClass = t.className?.toLowerCase().includes(q);
        const matchPreview = t.lastMessagePreview?.toLowerCase().includes(q);
        return matchName || matchEmail || matchClass || matchPreview;
      }

      return true;
    });
  }, [threads, filterStatus, searchQuery]);

  // Đếm số lượng chưa trả lời
  const unansweredCount = useMemo(() => {
    return threads.filter((t) => t.status === 'UNANSWERED').length;
  }, [threads]);

  // Xử lý chọn tệp đính kèm
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (selectedFiles.length + files.length > 3) {
      toast.warning('Mỗi lần gửi tối đa 3 tệp đính kèm!');
      return;
    }

    const currentTotalFiles = selectedThread?.totalFilesCount || 0;
    if (currentTotalFiles + selectedFiles.length + files.length > 15) {
      toast.warning(
        `Cuộc hội thoại này đã có ${currentTotalFiles} tệp. Giới hạn tối đa là 15 tệp/cuộc hội thoại.`
      );
      return;
    }

    setSelectedFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  // Xóa tệp đã chọn trước khi gửi
  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Thêm emoji vào vị trí con trỏ
  const handleAddEmoji = (emoji) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Gửi tin nhắn phản hồi của giáo viên
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && selectedFiles.length === 0) || sending || !selectedThread) return;

    try {
      setSending(true);
      let uploadedAttachments = [];

      // Upload file nếu có
      if (selectedFiles.length > 0) {
        setUploadingFiles(true);
        for (const file of selectedFiles) {
          const res = await fileApi.upload(file);
          uploadedAttachments.push({
            url: res.fileUrl || res.url,
            name: res.fileName || file.name,
            size: file.size,
          });
        }
      }

      const payload = {
        content: inputText.trim(),
        attachments: uploadedAttachments,
      };

      const newMsg = await inquiryApi.sendMessage(selectedThread.id, payload);

      // Cập nhật giao diện tức thì
      setMessages((prev) => [...prev, newMsg]);
      setInputText('');
      setSelectedFiles([]);

      // Cập nhật trạng thái thread thành ANSWERED (viền xanh lá)
      setSelectedThread((prev) =>
        prev
          ? {
              ...prev,
              status: 'ANSWERED',
              lastMessagePreview: payload.content || '[Tệp đính kèm]',
              lastMessageAt: new Date().toISOString(),
              totalFilesCount: prev.totalFilesCount + uploadedAttachments.length,
            }
          : null
      );

      // Cập nhật lại thread trong danh sách tổng
      setThreads((prev) =>
        prev.map((t) =>
          t.id === selectedThread.id
            ? {
                ...t,
                status: 'ANSWERED',
                lastMessagePreview: payload.content || '[Tệp đính kèm]',
                lastMessageAt: new Date().toISOString(),
                totalFilesCount: t.totalFilesCount + uploadedAttachments.length,
              }
            : t
        )
      );

      toast.success('Đã gửi phản hồi cho học viên.');
    } catch (err) {
      console.error('Lỗi khi gửi phản hồi:', err);
      toast.error('Không thể gửi tin nhắn: ' + (err.response?.data?.message || err.message));
    } finally {
      setSending(false);
      setUploadingFiles(false);
    }
  };

  // Parse attachments JSON an toàn
  const parseAttachments = (json) => {
    if (!json) return [];
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Định dạng ngày giờ
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');

      if (isToday) {
        return `${hours}:${mins} hôm nay`;
      }
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${hours}:${mins} ${day}/${month}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
      {/* HEADER: TIÊU ĐỀ & BỘ LỌC */}
      <div className="p-4 bg-slate-900 text-white border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-lg font-bold text-white shadow-xs">
            💬
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Câu hỏi từ học viên</h2>
              {unansweredCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold bg-rose-500 text-white rounded-full shadow-xs animate-pulse">
                  {unansweredCount} chưa trả lời
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Kênh giải đáp thắc mắc trực tiếp — tin nhắn được mã hóa bảo mật
            </p>
          </div>
        </div>

        {/* CÁC NÚT BỘ LỌC NHANH */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Lọc theo lớp học */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Tất cả lớp học</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.classCode ? `(${c.classCode})` : ''}
              </option>
            ))}
          </select>

          {/* Lọc theo trạng thái: Tất cả / Chưa trả lời / Đã trả lời */}
          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                filterStatus === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tất cả ({threads.length})
            </button>
            <button
              onClick={() => setFilterStatus('UNANSWERED')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                filterStatus === 'UNANSWERED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              <span>Chưa trả lời</span>
              {unansweredCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-[10px] flex items-center justify-center text-white font-bold">
                  {unansweredCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilterStatus('ANSWERED')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                filterStatus === 'ANSWERED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              Đã trả lời ({threads.length - unansweredCount})
            </button>
          </div>

          <button
            onClick={() => fetchThreads()}
            title="Làm mới danh sách"
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition cursor-pointer text-xs"
          >
            🔄
          </button>
        </div>
      </div>

      {/* THÂN COMPONENT: 2 CỘT (LIST BÊN TRÁI, CHAT BÊN PHẢI) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ================= CỘT TRÁI: DANH SÁCH CUỘC HỘI THOẠI ================= */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-slate-50/50 shrink-0 ${
            mobileChatView ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Ô TÌM KIẾM HỌC VIÊN */}
          <div className="p-2.5 border-b border-slate-200 bg-white">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên học sinh, email, nội dung..."
                className="w-full text-xs pl-8 pr-7 py-2 bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
              <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs p-0.5 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* DANH SÁCH CÁC THREADS */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingThreads ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                <p>Đang tải danh sách câu hỏi...</p>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <span className="text-3xl block">📭</span>
                <p className="font-medium text-slate-600">Không có cuộc hội thoại nào</p>
                <p className="text-[11px] text-slate-400">
                  {searchQuery
                    ? 'Không tìm thấy kết quả phù hợp với từ khóa.'
                    : filterStatus === 'UNANSWERED'
                    ? 'Tuyệt vời! Bạn đã trả lời tất cả thắc mắc của học sinh.'
                    : 'Chưa có học sinh nào đặt câu hỏi thắc mắc.'}
                </p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = selectedThread?.id === thread.id;
                const isUnanswered = thread.status === 'UNANSWERED';

                return (
                  <div
                    key={thread.id}
                    onClick={() => handleSelectThread(thread)}
                    className={`p-3 transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'bg-blue-50/80 shadow-xs'
                        : 'hover:bg-white bg-transparent'
                    } ${
                      /* Quy định viền: Chưa trả lời viền đỏ, Đã trả lời viền xanh lá */
                      isUnanswered
                        ? 'border-l-4 border-l-rose-500 bg-rose-50/15'
                        : 'border-l-4 border-l-emerald-500 bg-emerald-50/10'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Avatar học sinh */}
                      <div className="relative shrink-0">
                        {thread.studentAvatar ? (
                          <img
                            src={thread.studentAvatar}
                            alt={thread.studentName}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm border border-slate-300">
                            {thread.studentName
                              ? thread.studentName.trim().charAt(0).toUpperCase()
                              : 'HS'}
                          </div>
                        )}

                        {/* Chấm trạng thái nhỏ ở góc avatar */}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                            isUnanswered ? 'bg-rose-500 ring-1 ring-rose-300' : 'bg-emerald-500'
                          }`}
                          title={isUnanswered ? 'Chưa trả lời' : 'Đã trả lời'}
                        />
                      </div>

                      {/* Thông tin học sinh & 1 dòng nội dung tin nhắn giống messenger */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-1 mb-0.5">
                          <h4 className="text-xs font-bold text-slate-800 truncate" title={thread.studentName}>
                            {thread.studentName || 'Học sinh'}
                          </h4>
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                            {formatTime(thread.lastMessageAt || thread.createdAt)}
                          </span>
                        </div>

                        {/* Gmail học sinh */}
                        <p className="text-[11px] text-slate-500 truncate mb-1">
                          {thread.studentEmail}
                        </p>

                        {/* Tên lớp học */}
                        <div className="mb-1">
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {thread.className || 'Lớp học'}
                          </span>
                        </div>

                        {/* 1 tin nhắn xem trước (preview) giống messenger */}
                        <p
                          className={`text-xs truncate ${
                            isUnanswered
                              ? 'font-bold text-slate-900'
                              : 'text-slate-500'
                          }`}
                        >
                          {thread.lastMessagePreview || 'Chưa có tin nhắn'}
                        </p>

                        {/* Nhãn viền trạng thái rõ ràng */}
                        <div className="mt-1.5 flex items-center justify-between">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${
                              isUnanswered
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isUnanswered ? 'bg-rose-600 animate-ping' : 'bg-emerald-600'
                              }`}
                            />
                            {isUnanswered ? 'Chưa trả lời' : 'Đã trả lời'}
                          </span>

                          {thread.totalFilesCount > 0 && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              📎 {thread.totalFilesCount}/15
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= CỘT PHẢI: GIAO DIỆN CHAT TRỰC TIẾP ================= */}
        <div
          className={`flex-1 flex flex-col bg-slate-100/60 ${
            mobileChatView ? 'flex' : 'hidden md:flex'
          }`}
        >
          {selectedThread ? (
            <>
              {/* HEADER KHUNG CHAT */}
              <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2.5">
                  {/* Nút quay lại trên Mobile */}
                  <button
                    onClick={() => setMobileChatView(false)}
                    className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                    title="Quay lại danh sách"
                  >
                    ←
                  </button>

                  <div className="relative">
                    {selectedThread.studentAvatar ? (
                      <img
                        src={selectedThread.studentAvatar}
                        alt={selectedThread.studentName}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-300">
                        {selectedThread.studentName
                          ? selectedThread.studentName.trim().charAt(0).toUpperCase()
                          : 'HS'}
                      </div>
                    )}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        selectedThread.status === 'UNANSWERED' ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-800">
                        {selectedThread.studentName}
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          selectedThread.status === 'UNANSWERED'
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {selectedThread.status === 'UNANSWERED' ? 'Chưa trả lời' : 'Đã trả lời'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>{selectedThread.studentEmail}</span>
                      <span>•</span>
                      <span className="font-medium text-slate-700">
                        {selectedThread.className}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onNavigateToClass && selectedThread.classId && (
                    <button
                      onClick={() => onNavigateToClass(selectedThread.classId)}
                      className="hidden sm:inline-flex items-center gap-1 text-xs px-2.5 py-1 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 font-medium transition cursor-pointer"
                    >
                      <span>Xem lớp học</span>
                      <span>→</span>
                    </button>
                  )}
                  <span className="text-[11px] text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                    📎 {selectedThread.totalFilesCount}/15 tệp
                  </span>
                </div>
              </div>

              {/* VÙNG TIN NHẮN (GIAO DIỆN CHAT MESSENGER: HỌC SINH BÊN PHẢI, GIÁO VIÊN BÊN TRÁI) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                    <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                    <p>Đang tải tin nhắn...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-600">Chưa có tin nhắn nào</p>
                    <p>Hãy gửi câu trả lời đầu tiên cho học viên này.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isStudent = msg.senderRole === 'STUDENT';
                    const isSystem = msg.isAutoReply || msg.senderRole === 'SYSTEM';
                    const attachments = parseAttachments(msg.attachmentsJson);

                    // ================= TIN NHẮN TỰ ĐỘNG CỦA HỆ THỐNG =================
                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-start my-2">
                          <div className="max-w-[85%] sm:max-w-[70%] bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 shadow-2xs text-xs">
                            <div className="flex items-center gap-1.5 font-bold mb-1 text-[11px] text-amber-800">
                              <span>🤖</span>
                              <span>Tin nhắn trả lời tự động của hệ thống</span>
                            </div>
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            <span className="block text-[10px] text-amber-600/80 mt-1 text-right">
                              {formatTime(msg.createdAt)}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // ================= TIN NHẮN THEO QUY CHUẨN: HỌC SINH BÊN PHẢI, GIÁO VIÊN BÊN TRÁI =================
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-2xs text-xs space-y-1.5 ${
                            isStudent
                              ? 'bg-blue-600 text-white rounded-tr-xs' // Học sinh bên phải (màu xanh dương)
                              : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs' // Giáo viên bên trái (màu trắng viền xám)
                          }`}
                        >
                          {/* Tiêu đề người gửi */}
                          <div
                            className={`flex items-center justify-between gap-2 text-[10px] font-semibold pb-0.5 border-b ${
                              isStudent
                                ? 'text-blue-100 border-blue-500/40'
                                : 'text-slate-500 border-slate-100'
                            }`}
                          >
                            <span>{isStudent ? `Học sinh: ${msg.senderName}` : 'Giáo viên (Bạn)'}</span>
                            <span className="opacity-75 font-mono">{formatTime(msg.createdAt)}</span>
                          </div>

                          {/* Nội dung tin nhắn */}
                          {msg.content && (
                            <p className="whitespace-pre-wrap break-words leading-relaxed text-xs">
                              {msg.content}
                            </p>
                          )}

                          {/* Tệp đính kèm nếu có */}
                          {attachments.length > 0 && (
                            <div className="space-y-1 pt-1">
                              {attachments.map((file, idx) => {
                                const isImg =
                                  file.url &&
                                  (file.url.endsWith('.png') ||
                                    file.url.endsWith('.jpg') ||
                                    file.url.endsWith('.jpeg') ||
                                    file.url.endsWith('.webp'));

                                return (
                                  <div
                                    key={idx}
                                    className={`p-2 rounded-lg flex items-center justify-between gap-2 text-xs ${
                                      isStudent
                                        ? 'bg-blue-700/50 text-white'
                                        : 'bg-slate-50 text-slate-700 border border-slate-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <span>{isImg ? '🖼️' : '📎'}</span>
                                      <span className="truncate font-medium">
                                        {file.name || 'Tệp đính kèm'}
                                      </span>
                                    </div>
                                    <a
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`text-[11px] font-bold px-2 py-0.5 rounded transition shrink-0 ${
                                        isStudent
                                          ? 'bg-white text-blue-700 hover:bg-blue-50'
                                          : 'bg-blue-600 text-white hover:bg-blue-700'
                                      }`}
                                    >
                                      Xem / Tải
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* VÙNG SOẠN THẢO VÀ GỬI PHẢN HỒI (GIÁO VIÊN TRẢ LỜI HỌC VIÊN) */}
              <div className="p-3 bg-white border-t border-slate-200 relative">
                {/* POPUP CHỌN EMOJI */}
                {showEmojiPicker && (
                  <div className="absolute bottom-16 left-4 bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 z-20 grid grid-cols-8 gap-1.5 animate-fade-in">
                    {COMMON_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleAddEmoji(emoji)}
                        className="text-lg p-1 hover:bg-slate-100 rounded cursor-pointer transition"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* DANH SÁCH TỆP ĐÃ CHỌN TRƯỚC KHI GỬI */}
                {selectedFiles.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs"
                      >
                        <span className="truncate max-w-[150px]">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="text-blue-500 hover:text-blue-800 font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                  {/* Nút chọn emoji */}
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 text-slate-500 hover:text-amber-500 hover:bg-slate-100 rounded-lg transition cursor-pointer text-base shrink-0"
                    title="Chèn biểu tượng cảm xúc (Emoji)"
                  >
                    😊
                  </button>

                  {/* Nút đính kèm tệp */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={selectedFiles.length >= 3 || selectedThread.totalFilesCount >= 15}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition cursor-pointer text-base shrink-0 disabled:opacity-40"
                    title="Đính kèm tệp (Tối đa 3 tệp/lần, tối đa 15 tệp/hội thoại)"
                  >
                    📎
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {/* Ô nhập tin nhắn hỗ trợ gõ bàn phím ảo điện thoại */}
                  <div className="flex-1">
                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Nhập câu trả lời cho học sinh... (Nhấn Enter để gửi, Shift+Enter xuống dòng)"
                      className="w-full text-xs p-2.5 max-h-32 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none transition"
                    />
                  </div>

                  {/* Nút gửi tin nhắn */}
                  <button
                    type="submit"
                    disabled={(!inputText.trim() && selectedFiles.length === 0) || sending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs disabled:opacity-40 transition cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                  >
                    {sending ? (
                      <span className="inline-block animate-spin">⏳</span>
                    ) : (
                      <>
                        <span>Gửi</span>
                        <span>➤</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 px-1">
                  <span>Mã hóa AES-256 nội dung tin nhắn</span>
                  <span>Tối đa 3 tệp/lần gửi • Giới hạn 15 tệp/hội thoại</span>
                </div>
              </div>
            </>
          ) : (
            // TRẠNG THÁI CHƯA CHỌN THREAD NÀO
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-200/80 flex items-center justify-center text-3xl">
                💬
              </div>
              <h3 className="text-base font-bold text-slate-700">Chưa chọn cuộc hội thoại</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Hãy bấm chọn một học sinh từ danh sách bên trái để đọc thắc mắc và gửi phản hồi giải đáp.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
