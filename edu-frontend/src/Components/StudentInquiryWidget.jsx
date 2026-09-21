// File: src/Components/StudentInquiryWidget.jsx
import { useState, useEffect, useRef } from 'react';
import { inquiryApi } from '../api/inquiryApi';
import { fileApi } from '../api/fileApi';
import { useToast } from '../context/ToastContext';

export default function StudentInquiryWidget({ user, classes = [] }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // Input states
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]); // Tối đa 3 files
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const isFetchingMessagesRef = useRef(false);

  // Khởi tạo lớp học mặc định khi mở
  useEffect(() => {
    if (classes && classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id || classes[0].classId);
    }
  }, [classes, selectedClassId]);

  // Tải hoặc tạo thread khi chọn lớp
  useEffect(() => {
    if (!isOpen || !selectedClassId) return;

    const fetchThread = async () => {
      try {
        setLoadingThread(true);
        const thread = await inquiryApi.getStudentThread(selectedClassId);
        setActiveThread(thread);
        if (thread && thread.id) {
          fetchMessages(thread.id);
        }
      } catch (err) {
        console.warn('Lỗi kết nối kênh thắc mắc:', err);
        // Tránh thông báo lỗi dồn dập nếu endpoint đang khởi động/deploy (404)
        if (err.response?.status !== 404) {
          toast.error('Không thể kết nối kênh thắc mắc: ' + (err.response?.data?.message || err.message));
        }
      } finally {
        setLoadingThread(false);
      }
    };

    fetchThread();
  }, [isOpen, selectedClassId]);

  // Polling tin nhắn mỗi 1s khi mở bubble hội thoại để cập nhật tin nhắn siêu mượt mà
  useEffect(() => {
    if (!isOpen || !activeThread?.id) return;

    const interval = setInterval(() => {
      fetchMessages(activeThread.id, true);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, activeThread?.id]);

  // Lấy lịch sử tin nhắn
  const fetchMessages = async (threadId, quiet = false) => {
    if (!threadId || isFetchingMessagesRef.current) return;
    try {
      isFetchingMessagesRef.current = true;
      if (!quiet) setLoadingMessages(true);
      const msgs = await inquiryApi.getThreadMessages(threadId);
      const safeMsgs = Array.isArray(msgs) ? msgs : [];
      setMessages(prev => {
        const isChanged =
          prev.length !== safeMsgs.length ||
          (safeMsgs.length > 0 && prev[prev.length - 1]?.id !== safeMsgs[safeMsgs.length - 1]?.id);
        if (isChanged) {
          scrollToBottom();
          return safeMsgs;
        }
        return prev;
      });
    } catch (err) {
      if (!quiet && err.response?.status !== 404) {
        console.warn('Lỗi lấy tin nhắn:', err);
      }
    } finally {
      if (!quiet) setLoadingMessages(false);
      isFetchingMessagesRef.current = false;
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Mở khung chat & tự động focus vào ô nhập
  const handleOpenWidget = () => {
    setIsOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 200);
  };

  // Chọn tệp đính kèm (tối đa 3 tệp / tin nhắn)
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingForThread = Math.max(0, 15 - (activeThread?.totalFilesCount || 0) - selectedFiles.length);
    if (remainingForThread <= 0) {
      toast.warning('Cuộc hội thoại đã đạt giới hạn tối đa 15 tệp đính kèm.');
      return;
    }

    if (selectedFiles.length + files.length > 3) {
      toast.warning('Mỗi tin nhắn chỉ được đính kèm tối đa 3 tệp.');
      return;
    }

    const availableSlots = Math.min(3 - selectedFiles.length, remainingForThread);
    const filesToAdd = files.slice(0, availableSlots);

    setSelectedFiles(prev => [...prev, ...filesToAdd]);
    e.target.value = '';
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Gửi tin nhắn
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && selectedFiles.length === 0) || sending) return;

    if (!activeThread?.id) {
      toast.warning('Đang kết nối tới kênh hỗ trợ của lớp, vui lòng thử lại sau vài giây.');
      return;
    }

    try {
      setSending(true);
      let uploadedAttachments = [];

      // Upload file nếu có đính kèm
      if (selectedFiles.length > 0) {
        setUploadingFiles(true);
        for (const file of selectedFiles) {
          const res = await fileApi.upload(file);
          uploadedAttachments.push({
            url: res.fileUrl || res.url,
            name: res.fileName || file.name,
            size: file.size
          });
        }
      }

      const payload = {
        content: inputText.trim(),
        attachments: uploadedAttachments
      };

      const newMsg = await inquiryApi.sendMessage(activeThread.id, payload);

      // Cập nhật state tin nhắn tức thì
      setMessages(prev => [...prev, newMsg]);
      setInputText('');
      setSelectedFiles([]);

      // Cập nhật lại số lượng file trong thread
      setActiveThread(prev => prev ? {
        ...prev,
        totalFilesCount: (prev.totalFilesCount || 0) + uploadedAttachments.length
      } : null);

      scrollToBottom();

      // Nếu đây là tin nhắn đầu tiên, tự động tải lại sau 1s để nhận tin auto-reply từ hệ thống
      if (messages.length === 0) {
        setTimeout(() => {
          fetchMessages(activeThread.id);
        }, 1200);
      }
    } catch (err) {
      console.error('Lỗi khi gửi tin nhắn:', err);
      toast.error('Không thể gửi tin nhắn: ' + (err.response?.data?.message || err.message));
    } finally {
      setSending(false);
      setUploadingFiles(false);
    }
  };

  // Format thời gian hiển thị
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  const parseAttachments = (json) => {
    if (!json) return [];
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const remainingFilesQuota = Math.max(0, 15 - (activeThread?.totalFilesCount || 0) - selectedFiles.length);

  return (
    <>
      {/* 1. NÚT TRÒN MỞ HỘI THOẠI (GÓC DƯỚI BÊN PHẢI MÀN HÌNH) */}
      {!isOpen && (
        <button
          type="button"
          onClick={handleOpenWidget}
          aria-label="Mở kênh Thắc mắc"
          className="fixed bottom-6 right-6 z-50 w-13 h-13 rounded-full bg-slate-900 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer group border border-slate-700"
          title="Thắc mắc & Hỏi đáp với Giáo viên"
        >
          {/* Biểu tượng chat đơn sắc đơn nét */}
          <svg className="w-6 h-6 transform group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}

      {/* 2. KHUNG CHAT NỔI (MESSENGER STYLE - ĐƠN SẮC CHUYÊN NGHIỆP) */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[92vw] sm:w-[390px] h-[540px] max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scale-up font-sans">
          
          {/* HEADER KHUNG CHAT */}
          <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between shadow-xs border-b border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm leading-tight truncate">
                  Kênh Thắc Mắc
                </div>
                {/* Chọn lớp học */}
                {classes && classes.length > 1 ? (
                  <select
                    value={selectedClassId || ''}
                    onChange={(e) => setSelectedClassId(Number(e.target.value))}
                    className="mt-0.5 text-[11px] bg-slate-800 text-slate-200 rounded px-1.5 py-0.5 border border-slate-700 focus:outline-none cursor-pointer max-w-[190px] truncate"
                  >
                    {classes.map(c => (
                      <option key={c.id || c.classId} value={c.id || c.classId} className="text-slate-800">
                        {c.name || c.className}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-[11px] text-slate-400 truncate">
                    {classes[0]?.name || classes[0]?.className || 'Lớp học của bạn'}
                  </div>
                )}
              </div>
            </div>

            {/* Nút đóng */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Đóng khung chat"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* THANH THÔNG TIN BẢO MẬT & GIỚI HẠN TỆP */}
          <div className="px-3.5 py-1.5 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="truncate flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Giáo viên & Chủ nhiệm phụ trách</span>
            </span>
            <span className="font-mono text-[10px] text-slate-400 shrink-0">
              Tệp: {activeThread?.totalFilesCount || 0}/15
            </span>
          </div>

          {/* VÙNG DANH SÁCH TIN NHẮN */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50/40">
            {loadingThread || loadingMessages ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 space-y-2">
                <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                <span>Đang kết nối hội thoại...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="text-xs font-semibold text-slate-600">Chưa có câu hỏi nào</div>
                <p className="text-[11px] text-slate-400 max-w-[240px]">
                  Em có thắc mắc gì về bài học hoặc bài tập cứ nhắn tại đây, thầy cô sẽ hỗ trợ giải đáp nhé.
                </p>
              </div>
            ) : (
              messages.map(msg => {
                const isStudent = msg.senderRole === 'STUDENT';
                const isSystem = msg.isAutoReply || msg.senderRole === 'SYSTEM';
                const attachments = parseAttachments(msg.attachmentsJson);

                // Tin nhắn tự động của hệ thống
                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className="max-w-[88%] bg-slate-100 border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-[11px] text-center shadow-2xs">
                        <div className="font-semibold text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
                          Thông báo tự động
                        </div>
                        <p className="leading-relaxed">{msg.content}</p>
                        <div className="text-[9px] text-slate-400 mt-1 font-mono">{formatTime(msg.createdAt)}</div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isStudent ? 'items-end' : 'items-start'}`}
                  >
                    {/* Tên người gửi nếu là giáo viên */}
                    {!isStudent && (
                      <span className="text-[10px] font-semibold text-slate-600 mb-1 ml-1">
                        {msg.senderName || 'Giáo viên'}
                      </span>
                    )}

                    {/* Bong bóng tin nhắn */}
                    <div
                      className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-2xs leading-relaxed ${
                        isStudent
                          ? 'bg-blue-600 text-white rounded-br-xs'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                      }`}
                    >
                      {/* Nội dung văn bản */}
                      {msg.content && msg.content !== '[Tệp đính kèm]' && (
                        <p className="whitespace-pre-wrap break-words text-xs">{msg.content}</p>
                      )}

                      {/* Danh sách tệp đính kèm */}
                      {attachments.length > 0 && (
                        <div className={`mt-2 space-y-1.5 ${isStudent ? 'text-blue-100' : 'text-slate-600'}`}>
                          {attachments.map((att, idx) => (
                            <a
                              key={idx}
                              href={att.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={`flex items-center gap-1.5 p-1.5 rounded-lg text-[11px] font-medium transition ${
                                isStudent
                                  ? 'bg-blue-700/60 hover:bg-blue-700 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <span className="truncate">{att.fileName || 'Tệp đính kèm'}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Mốc thời gian */}
                    <span className="text-[9px] text-slate-400 mt-0.5 px-1 font-mono">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* DANH SÁCH TỆP ĐÃ CHỌN CHUẨN BỊ GỬI */}
          {selectedFiles.length > 0 && (
            <div className="p-2 bg-slate-100 border-t border-slate-200 flex flex-wrap gap-1.5">
              {selectedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1 bg-white border border-slate-300 px-2 py-0.5 rounded text-[11px] text-slate-700">
                  <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="truncate max-w-[110px]">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(i)}
                    className="text-slate-400 hover:text-rose-600 font-bold ml-1 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* FORM NHẬP TIN NHẮN (FOOTER INPUT) */}
          <form onSubmit={handleSendMessage} className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-1.5">
            {/* Nút Đính kèm tệp */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="hidden"
              accept=".docx,.doc,.pdf,.txt,.jpg,.jpeg,.png,.webp,.mp3,.wav,.m4a"
            />
            <button
              type="button"
              disabled={selectedFiles.length >= 3 || remainingFilesQuota <= 0 || sending}
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
              title={`Đính kèm tệp (Tối đa 3 tệp/tin, còn lại ${remainingFilesQuota} tệp)`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            {/* Ô nhập tin nhắn */}
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nhập thắc mắc của em..."
              disabled={sending}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-full focus:outline-none transition"
            />

            {/* Nút Gửi */}
            <button
              type="submit"
              disabled={(!inputText.trim() && selectedFiles.length === 0) || sending}
              className="w-9 h-9 rounded-full bg-slate-900 hover:bg-blue-600 disabled:bg-slate-200 text-white flex items-center justify-center transition cursor-pointer shadow-xs shrink-0"
              title="Gửi tin nhắn"
            >
              {sending || uploadingFiles ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
