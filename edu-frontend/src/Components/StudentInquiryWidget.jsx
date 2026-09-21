// File: src/Components/StudentInquiryWidget.jsx
import { useState, useEffect, useRef } from 'react';
import { inquiryApi } from '../api/inquiryApi';
import { fileApi } from '../api/fileApi';
import { useToast } from '../context/ToastContext';

// Danh sách các emoji phổ biến để chọn nhanh
const COMMON_EMOJIS = ['😊', '🙏', '🙋‍♂️', '🙋‍♀️', '❓', '💡', '👍', '❤️', '📝', '📚', '🎯', '✨', '👏', '🤔', '🙌', '💯'];

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

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
        console.error('Lỗi lấy hội thoại thắc mắc:', err);
        toast.error('Không thể kết nối kênh thắc mắc: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoadingThread(false);
      }
    };

    fetchThread();
  }, [isOpen, selectedClassId]);

  // Lấy lịch sử tin nhắn
  const fetchMessages = async (threadId) => {
    try {
      setLoadingMessages(true);
      const msgs = await inquiryApi.getThreadMessages(threadId);
      setMessages(msgs || []);
      scrollToBottom();
    } catch (err) {
      console.error('Lỗi lấy tin nhắn:', err);
    } finally {
      setLoadingMessages(false);
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
    e.target.value = ''; // Reset file input
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Chèn emoji
  const handleSelectEmoji = (emoji) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Gửi tin nhắn
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!activeThread?.id) return;

    const textToSend = inputText.trim();
    if (!textToSend && selectedFiles.length === 0) return;

    try {
      setSending(true);
      let uploadedAttachments = [];

      // Upload tệp đính kèm nếu có
      if (selectedFiles.length > 0) {
        setUploadingFiles(true);
        for (const file of selectedFiles) {
          try {
            const uploadRes = await fileApi.upload(file);
            if (uploadRes?.fileUrl) {
              uploadedAttachments.push({
                fileName: file.name,
                fileUrl: uploadRes.fileUrl,
                fileSize: file.size
              });
            }
          } catch (uploadErr) {
            console.error('Lỗi tải tệp:', file.name, uploadErr);
            toast.error(`Không thể tải lên tệp: ${file.name}`);
          }
        }
        setUploadingFiles(false);
      }

      const payload = {
        content: textToSend,
        attachments: uploadedAttachments
      };

      const newMsg = await inquiryApi.sendMessage(activeThread.id, payload);

      // Cập nhật giao diện tin nhắn
      setInputText('');
      setSelectedFiles([]);
      setShowEmojiPicker(false);

      // Cập nhật lại thread và nạp lại tin nhắn (để nhận cả auto-reply nếu là tin đầu)
      await fetchMessages(activeThread.id);

      // Cập nhật lại số lượng tệp của thread
      setActiveThread(prev => prev ? {
        ...prev,
        totalFilesCount: prev.totalFilesCount + uploadedAttachments.length,
        status: 'UNANSWERED'
      } : null);

      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      console.error('Lỗi khi gửi tin nhắn:', err);
      toast.error(err.response?.data?.message || err.message || 'Lỗi gửi tin nhắn');
    } finally {
      setSending(false);
      setUploadingFiles(false);
    }
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const remainingFilesQuota = Math.max(0, 15 - (activeThread?.totalFilesCount || 0));

  return (
    <>
      {/* 1. NÚT TRÒN NỔI GÓC DƯỚI BÊN PHẢI (FLOATING CHAT BUTTON) */}
      {!isOpen && (
        <button
          type="button"
          onClick={handleOpenWidget}
          aria-label="Mở kênh Thắc mắc"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer group"
          title="Thắc mắc & Hỏi đáp với Giáo viên"
        >
          {/* Biểu tượng chat */}
          <svg className="w-7 h-7 transform group-hover:rotate-6 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          {/* Hiệu ứng pulse sóng lan */}
          <span className="absolute inset-0 rounded-full bg-blue-400 opacity-20 animate-ping -z-10" />
        </button>
      )}

      {/* 2. KHUNG CHAT NỔI (MESSENGER STYLE) */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[92vw] sm:w-[400px] h-[560px] max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-scale-up font-sans">
          
          {/* HEADER KHUNG CHAT */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-3.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-blue-600/80 border border-blue-400/40 flex items-center justify-center text-white font-bold text-sm shrink-0">
                💬
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm leading-tight flex items-center gap-1.5 truncate">
                  <span>Kênh Thắc Mắc</span>
                </div>
                {/* Chọn lớp học */}
                {classes && classes.length > 1 ? (
                  <select
                    value={selectedClassId || ''}
                    onChange={(e) => setSelectedClassId(Number(e.target.value))}
                    className="mt-0.5 text-[11px] bg-white/10 hover:bg-white/20 text-blue-100 rounded px-1.5 py-0.5 border border-white/15 focus:outline-none cursor-pointer max-w-[190px] truncate"
                  >
                    {classes.map(c => (
                      <option key={c.id || c.classId} value={c.id || c.classId} className="text-slate-800">
                        {c.name || c.className}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-[11px] text-blue-200 truncate">
                    {classes[0]?.name || classes[0]?.className || 'Lớp học của bạn'}
                  </div>
                )}
              </div>
            </div>

            {/* Nút đóng */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
              title="Đóng khung chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* DÒNG TRẠNG THÁI HẠN MỨC TỆP */}
          <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 text-[11px] text-slate-500 flex justify-between items-center">
            <span>Giáo viên & Chủ nhiệm sẽ nhận câu hỏi</span>
            <span className={`font-medium ${remainingFilesQuota <= 3 ? 'text-amber-600' : 'text-slate-400'}`}>
              Tệp: {activeThread?.totalFilesCount || 0}/15
            </span>
          </div>

          {/* DANH SÁCH TIN NHẮN (MESSAGES CONTAINER) */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#f8fafc] text-xs">
            {loadingThread || loadingMessages ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-[11px]">Đang tải cuộc trò chuyện...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <div className="text-3xl">🙋</div>
                <p className="font-semibold text-slate-600 text-xs">Chưa có câu hỏi nào</p>
                <p className="text-[11px] text-slate-400 max-w-[260px] mx-auto leading-relaxed">
                  Em có bất kỳ thắc mắc nào về bài tập, lịch học hay kiến thức, hãy nhắn tin ngay cho thầy cô nhé!
                </p>
              </div>
            ) : (
              messages.map(msg => {
                const isStudent = msg.senderRole === 'STUDENT';
                const isSystem = msg.senderRole === 'SYSTEM' || msg.isAutoReply;

                let attachments = [];
                if (msg.attachmentsJson) {
                  try {
                    attachments = JSON.parse(msg.attachmentsJson);
                  } catch {}
                }

                // Tin nhắn tự động của Hệ thống (Auto-Reply)
                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className="max-w-[85%] bg-amber-50/90 border border-amber-200 text-amber-900 rounded-xl px-3 py-2 text-[11px] text-center shadow-2xs">
                        <div className="font-bold flex items-center justify-center gap-1 mb-0.5 text-amber-800">
                          <span>🤖 Phản hồi tự động</span>
                        </div>
                        <p className="leading-relaxed">{msg.content}</p>
                        <div className="text-[9px] text-amber-600/80 mt-1 font-mono">{formatTime(msg.createdAt)}</div>
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
                      <span className="text-[10px] font-semibold text-blue-700 mb-1 ml-1">
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
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
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
                              <span className="shrink-0">📎</span>
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
                  <span className="truncate max-w-[110px]">📎 {f.name}</span>
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

          {/* KHAY CHỌN EMOJI NHANH */}
          {showEmojiPicker && (
            <div className="p-2 bg-white border-t border-slate-200 flex flex-wrap gap-1 justify-center animate-fade-in shadow-inner">
              {COMMON_EMOJIS.map(em => (
                <button
                  key={em}
                  type="button"
                  onClick={() => handleSelectEmoji(em)}
                  className="w-7 h-7 flex items-center justify-center text-base hover:bg-slate-100 rounded cursor-pointer transition"
                >
                  {em}
                </button>
              ))}
            </div>
          )}

          {/* FORM NHẬP TIN NHẮN (FOOTER INPUT) */}
          <form onSubmit={handleSendMessage} className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-1.5">
            {/* Nút Emoji */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(prev => !prev)}
              className={`p-2 rounded-full transition cursor-pointer text-slate-500 hover:text-blue-600 hover:bg-slate-100 ${
                showEmojiPicker ? 'bg-blue-50 text-blue-600' : ''
              }`}
              title="Chèn biểu tượng cảm xúc"
            >
              😊
            </button>

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
              className="p-2 rounded-full text-slate-500 hover:text-blue-600 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
              title={`Đính kèm tệp (Tối đa 3 tệp/tin, còn lại ${remainingFilesQuota} tệp)`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
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
              className="flex-1 px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-full focus:outline-none transition"
            />

            {/* Nút Gửi */}
            <button
              type="submit"
              disabled={(!inputText.trim() && selectedFiles.length === 0) || sending}
              className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white flex items-center justify-center transition cursor-pointer shadow-xs shrink-0"
              title="Gửi tin nhắn"
            >
              {sending || uploadingFiles ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 translate-x-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
