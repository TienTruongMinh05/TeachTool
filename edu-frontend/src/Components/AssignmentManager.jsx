import { useState, useEffect } from 'react';
import { assignmentApi } from '../api/assignmentApi';
import { submissionApi } from '../api/submissionApi';
import { sessionApi } from '../api/sessionApi';
import { studentApi } from '../api/studentApi';
import { fileApi } from '../api/fileApi';
import AudioGradingWorkbench from './AudioGradingWorkbench';
import CollapsibleDescription from './CollapsibleDescription';
import { useToast } from '../context/ToastContext';

export default function AssignmentManager({ classId, initialAssignmentId = null }) {
  const { toast, confirm } = useToast();
  const [assignments, setAssignments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lọc theo buổi học
  const [selectedSessionFilter, setSelectedSessionFilter] = useState('ALL');

  // Modal Tạo / Sửa bài tập
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [formData, setFormData] = useState({
    sessionId: '',
    title: '',
    description: '',
    dueDate: '',
    allowText: true,
    allowDocx: false,
    allowAudio: false,
    allowRecording: false,
    allowImage: false,
    attachments: []
  });
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Bài tập đang mở xem danh sách bài nộp
  const [activeAssignmentForSubmissions, setActiveAssignmentForSubmissions] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Modal Chấm điểm bài nộp của 1 học sinh
  const [selectedSubmissionToGrade, setSelectedSubmissionToGrade] = useState(null);
  const [selectedStudentForGrading, setSelectedStudentForGrading] = useState(null);
  const [gradingForm, setGradingForm] = useState({ score: '', feedback: '' });
  const [savingGrade, setSavingGrade] = useState(false);
  const [splicedAudioBlob, setSplicedAudioBlob] = useState(null);
  const [timelineFeedbackText, setTimelineFeedbackText] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [assRes, sessRes, studRes] = await Promise.all([
        assignmentApi.getByClass(classId),
        sessionApi.getByClass(classId),
        studentApi.getByClass(classId)
      ]);
      setAssignments(assRes || []);
      setSessions(sessRes || []);
      setStudents(studRes || []);
    } catch (err) {
      console.error('Lỗi tải dữ liệu:', err);
      toast.error('Lỗi khi tải dữ liệu bài tập!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [classId]);

  // Khi có initialAssignmentId được truyền từ ma trận điểm số hoặc bên ngoài
  useEffect(() => {
    if (initialAssignmentId && assignments.length > 0) {
      const target = assignments.find(a => String(a.id) === String(initialAssignmentId));
      if (target) {
        openSubmissionsView(target);
        setTimeout(() => {
          const el = document.getElementById(`assignment-card-${target.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 200);
      }
    }
  }, [initialAssignmentId, assignments]);

  const handleOpenCreateModal = () => {
    setEditingAssignment(null);
    setFormData({
      sessionId: '',
      title: '',
      description: '',
      dueDate: '',
      isScheduled: false,
      scheduledPublishAt: '',
      allowText: true,
      allowDocx: false,
      allowAudio: false,
      allowRecording: false,
      allowImage: false,
      attachments: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (assignment) => {
    setEditingAssignment(assignment);
    const allowed = (assignment.allowedSubmissionTypes || 'TEXT').split(',');
    let localDueDate = '';
    if (assignment.dueDate) {
      const d = new Date(assignment.dueDate);
      const tzOffset = d.getTimezoneOffset() * 60000;
      localDueDate = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    }

    let localPublishDate = '';
    let isSched = false;
    if (assignment.scheduledPublishAt) {
      const pDate = new Date(assignment.scheduledPublishAt);
      const pOffset = pDate.getTimezoneOffset() * 60000;
      localPublishDate = new Date(pDate.getTime() - pOffset).toISOString().slice(0, 16);
      isSched = new Date(assignment.scheduledPublishAt) > new Date();
    }

    let initialAttachments = [];
    if (assignment.attachmentsJson) {
      try {
        const parsed = JSON.parse(assignment.attachmentsJson);
        if (Array.isArray(parsed) && parsed.length > 0) initialAttachments = parsed;
      } catch {}
    }
    if (initialAttachments.length === 0 && assignment.attachmentFileUrl) {
      initialAttachments = [{
        fileName: assignment.attachmentFileName || 'Tệp đính kèm',
        fileUrl: assignment.attachmentFileUrl
      }];
    }

    setFormData({
      sessionId: assignment.sessionId ? String(assignment.sessionId) : '',
      title: assignment.title || '',
      description: assignment.description || '',
      dueDate: localDueDate,
      isScheduled: isSched,
      scheduledPublishAt: localPublishDate,
      allowText: allowed.includes('TEXT'),
      allowDocx: allowed.includes('DOCX'),
      allowAudio: allowed.includes('AUDIO'),
      allowRecording: allowed.includes('DIRECT_RECORD'),
      allowImage: allowed.includes('IMAGE'),
      attachments: initialAttachments
    });
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const currentCount = formData.attachments?.length || 0;
    if (currentCount >= 5) {
      toast.warning('Bạn chỉ được đính kèm tối đa 5 tệp cho một bài tập.');
      e.target.value = '';
      return;
    }

    const availableSlots = 5 - currentCount;
    const filesToUpload = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      toast.info(`Chỉ tải lên ${availableSlots} tệp đầu tiên (tối đa 5 tệp).`);
    }

    try {
      setUploadingAttachment(true);
      const uploadPromises = filesToUpload.map(f => fileApi.upload(f));
      const results = await Promise.all(uploadPromises);
      const newAttachments = results.map(res => ({
        fileName: res.fileName,
        fileUrl: res.fileUrl
      }));
      setFormData(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...newAttachments]
      }));
      toast.success(`Đã tải lên ${results.length} tệp đính kèm.`);
    } catch (err) {
      toast.error('Lỗi tải tệp: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    try {
      const allowedTypes = [];
      if (formData.allowText) allowedTypes.push('TEXT');
      if (formData.allowDocx) allowedTypes.push('DOCX');
      if (formData.allowAudio) allowedTypes.push('AUDIO');
      if (formData.allowRecording) allowedTypes.push('DIRECT_RECORD');
      if (formData.allowImage) allowedTypes.push('IMAGE');

      if (formData.isScheduled) {
        if (!formData.scheduledPublishAt) {
          toast.warning('Vui lòng chọn thời gian hẹn giờ phát hành bài tập.');
          return;
        }
        if (formData.dueDate && new Date(formData.dueDate) <= new Date(formData.scheduledPublishAt)) {
          toast.error('Hạn chót nộp bài phải sau thời gian phát hành bài tập.');
          return;
        }
      }

      const attachments = Array.isArray(formData.attachments) ? formData.attachments : [];
      const firstAttachment = attachments[0] || {};

      const formatDateTimeForBackend = (dtStr) => {
        if (!dtStr) return null;
        return dtStr.length === 16 ? dtStr + ':00' : dtStr;
      };

      const payload = {
        title: formData.title,
        description: formData.description,
        dueDate: formatDateTimeForBackend(formData.dueDate),
        scheduledPublishAt: formData.isScheduled ? formatDateTimeForBackend(formData.scheduledPublishAt) : null,
        allowedSubmissionTypes: allowedTypes.join(','),
        attachmentFileName: firstAttachment.fileName || null,
        attachmentFileUrl: firstAttachment.fileUrl || null,
        attachmentsJson: attachments.length > 0 ? JSON.stringify(attachments) : null
      };

      const sid = formData.sessionId ? Number(formData.sessionId) : null;

      if (editingAssignment) {
        await assignmentApi.update(editingAssignment.id, {
          ...payload,
          session: sid ? { id: sid } : null
        });
        toast.success(`Đã cập nhật bài tập "${formData.title}"`);
      } else {
        await assignmentApi.create(classId, sid, payload);
        toast.success(`Đã tạo mới bài tập "${formData.title}"`);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Lỗi lưu bài tập: ' + (err.response?.data?.message || err.message));
    }
  };

  const handlePublishNow = async (assignment) => {
    const ok = await confirm({
      title: 'Phát hành bài tập ngay',
      message: `Bạn có chắc muốn phát hành bài tập "${assignment.title}" ngay bây giờ cho học sinh không?`,
      confirmText: 'Phát hành ngay'
    });
    if (!ok) return;

    try {
      await assignmentApi.publishNow(assignment.id);
      toast.success(`Đã phát hành bài tập "${assignment.title}" cho học sinh.`);
      loadData();
    } catch (err) {
      toast.error('Lỗi phát hành bài tập: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteAssignment = async (id, title) => {
    const ok = await confirm({
      title: 'Xóa bài tập',
      message: `Bạn có chắc chắn muốn xóa bài tập "${title}"? Tất cả bài nộp của học sinh sẽ bị gỡ bỏ.`,
      confirmText: 'Xóa vĩnh viễn',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await assignmentApi.delete(id);
      if (activeAssignmentForSubmissions?.id === id) {
        setActiveAssignmentForSubmissions(null);
      }
      toast.success(`Đã xóa bài tập "${title}"`);
      loadData();
    } catch (err) {
      toast.error('Lỗi xóa bài tập: ' + (err.response?.data?.message || err.message));
    }
  };

  // Mở danh sách bài nộp của 1 bài tập (bấm lại thì đóng)
  const openSubmissionsView = async (assignment) => {
    if (activeAssignmentForSubmissions?.id === assignment.id) {
      setActiveAssignmentForSubmissions(null);
      return;
    }
    setActiveAssignmentForSubmissions(assignment);
    try {
      setLoadingSubmissions(true);
      const subs = await submissionApi.getByAssignment(assignment.id);
      setSubmissions(subs || []);
    } catch (err) {
      console.error('Lỗi tải bài nộp:', err);
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Mở Modal chấm điểm cho học sinh
  const openGradingModal = (student, existingSubmission) => {
    setSelectedStudentForGrading(student);
    setSelectedSubmissionToGrade(existingSubmission);
    setSplicedAudioBlob(null);
    setTimelineFeedbackText('');
    setGradingForm({
      score: existingSubmission?.score || '',
      feedback: existingSubmission?.feedback || ''
    });
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!selectedSubmissionToGrade) return;
    try {
      setSavingGrade(true);
      let finalFeedback = gradingForm.feedback || '';

      // Nếu có audio sửa phát âm được ghép nối -> Tải lên file audio hoàn chỉnh
      if (splicedAudioBlob) {
        try {
          const audioFile = new File([splicedAudioBlob], `Teacher_Correction_${Date.now()}.wav`, { type: 'audio/wav' });
          const audioUploadRes = await fileApi.upload(audioFile);
          if (audioUploadRes?.fileUrl) {
            finalFeedback = `[FEEDBACK_AUDIO: ${audioUploadRes.fileUrl}]\n\n` + finalFeedback;
          }
        } catch (uploadErr) {
          console.error('Lỗi tải file audio ghép:', uploadErr);
        }
      }

      // Đính kèm chi tiết mốc thời gian nếu chưa có
      if (timelineFeedbackText && !finalFeedback.includes('--- CHI TIẾT SỬA BÀI THEO MỐC THỜI GIAN ---')) {
        finalFeedback = finalFeedback ? `${finalFeedback}\n\n${timelineFeedbackText}` : timelineFeedbackText;
      }

      await submissionApi.grade(selectedSubmissionToGrade.id, {
        score: gradingForm.score,
        feedback: finalFeedback
      });

      // Làm mới danh sách bài nộp
      const subs = await submissionApi.getByAssignment(activeAssignmentForSubmissions.id);
      setSubmissions(subs || []);
      setSelectedSubmissionToGrade(null);
      setSelectedStudentForGrading(null);
      setSplicedAudioBlob(null);
      setTimelineFeedbackText('');
      toast.success('Đã lưu điểm và nhận xét thành công!');
    } catch (err) {
      toast.error('Lỗi lưu chấm điểm: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingGrade(false);
    }
  };

  const filteredAssignments = assignments.filter(a => {
    if (selectedSessionFilter === 'ALL') return true;
    return a.sessionId === Number(selectedSessionFilter);
  });

  const formatDateTime = (iso) => {
    if (!iso) return 'Không giới hạn';
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit',
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  if (loading) return <div className="text-gray-500 py-6">Đang tải danh sách bài tập...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-gray-800">Quản Lý Giao Bài Tập</h3>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-purple-100 text-purple-700 rounded-full">
              {assignments.length} bài tập
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Lọc theo buổi học */}
          <select
            value={selectedSessionFilter}
            onChange={(e) => setSelectedSessionFilter(e.target.value)}
            className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="ALL">Tất cả buổi học</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.topic} ({formatDateTime(s.startTime)})
              </option>
            ))}
          </select>

          <button
            onClick={handleOpenCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-md text-sm transition cursor-pointer font-medium shadow-xs">
            Giao Bài Mới
          </button>
        </div>
      </div>

      {/* Danh sách bài tập */}
      <div className="space-y-4">
        {filteredAssignments.map((assignment) => {
          const matchedSession = sessions.find(s => s.id === assignment.sessionId);
          const isSelected = activeAssignmentForSubmissions?.id === assignment.id;
          const types = (assignment.allowedSubmissionTypes || '').split(',');

          return (
            <div 
              key={assignment.id} 
              id={`assignment-card-${assignment.id}`}
              className={`bg-white border rounded-xl shadow-xs transition overflow-hidden ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-gray-200'}`}>
              <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-gray-50/60 border-b border-gray-200">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {matchedSession && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 rounded">
                        {matchedSession.topic}
                      </span>
                    )}
                    <h4 className="font-bold text-gray-800 text-base">{assignment.title}</h4>
                    {assignment.scheduledPublishAt && new Date(assignment.scheduledPublishAt) > new Date() && (
                      <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-800 rounded border border-amber-200">
                        Chờ phát hành: {formatDateTime(assignment.scheduledPublishAt)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>Hạn nộp: <b>{formatDateTime(assignment.dueDate)}</b></span>
                    {matchedSession && <span>Thời gian học: <b>{formatDateTime(matchedSession.startTime)}</b></span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {assignment.scheduledPublishAt && new Date(assignment.scheduledPublishAt) > new Date() && (
                    <button
                      type="button"
                      onClick={() => handlePublishNow(assignment)}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition cursor-pointer"
                      title="Phát hành ngay lập tức cho học sinh"
                    >
                      Phát hành ngay
                    </button>
                  )}
                  <button
                    onClick={() => openSubmissionsView(assignment)}
                    className={`px-3 py-1 text-xs font-semibold rounded transition cursor-pointer shadow-xs ${
                      isSelected
                        ? 'bg-slate-800 hover:bg-slate-900 text-white ring-2 ring-blue-400'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}>
                    {isSelected ? 'Đang xem bài nộp' : 'Xem danh sách nộp'}
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(assignment)}
                    className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition cursor-pointer">
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDeleteAssignment(assignment.id, assignment.title)}
                    className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition cursor-pointer">
                    Xóa
                  </button>
                </div>
              </div>

              {/* Nội dung đề bài & Hình thức nộp */}
              <div className="p-4 space-y-3">
                <CollapsibleDescription text={assignment.description} />

                {(() => {
                  let atts = [];
                  if (assignment.attachmentsJson) {
                    try { atts = JSON.parse(assignment.attachmentsJson); } catch {}
                  }
                  if ((!atts || atts.length === 0) && assignment.attachmentFileUrl) {
                    atts = [{ fileName: assignment.attachmentFileName || 'Tải file đề bài', fileUrl: assignment.attachmentFileUrl }];
                  }
                  if (!atts || atts.length === 0) return null;
                  return (
                    <div className="pt-1 space-y-1">
                      <span className="text-xs text-gray-500 font-medium">Tệp đề bài đính kèm ({atts.length}):</span>
                      <div className="flex flex-wrap gap-2">
                        {atts.map((att, attIdx) => (
                          <a
                            key={attIdx}
                            href={att.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md transition"
                          >
                            <span className="truncate max-w-[200px]">{att.fileName || `Tệp ${attIdx + 1}`}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-400 font-medium">Hình thức nộp cho phép:</span>
                  {types.map(t => (
                    <span key={t} className="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded border border-slate-200">
                      {t === 'TEXT' && 'Văn bản'}
                      {t === 'DOCX' && 'File Word (.docx)'}
                      {t === 'AUDIO' && 'File Audio'}
                      {t === 'DIRECT_RECORD' && 'Ghi âm trực tiếp'}
                    </span>
                  ))}
                </div>
              </div>

              {/* BẢNG BÀI NỘP CỦA HỌC VIÊN HIỂN THỊ NGAY DƯỚI BÀI TẬP ĐƯỢC CHỌN */}
              {isSelected && (
                <div className="border-t-2 border-blue-500 bg-slate-50/60 animate-in fade-in duration-200">
                  <div className="p-3.5 bg-[#0f172b] text-white flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm sm:text-base flex items-center gap-2">
                        <span>Danh Sách Bài Nộp:</span>
                        <span className="text-blue-300 font-semibold">{assignment.title}</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Tổng số học viên trong lớp: <b>{students.length}</b> | Đã nộp: <b>{submissions.length}</b>
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveAssignmentForSubmissions(null)}
                      className="text-slate-400 hover:text-white p-1 text-base font-bold leading-none rounded hover:bg-white/10 transition cursor-pointer"
                      title="Đóng">
                      ✕
                    </button>
                  </div>

                  {loadingSubmissions ? (
                    <div className="py-8 text-center text-xs text-gray-500 font-medium">
                      Đang tải danh sách bài nộp của học sinh...
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-100 border-b border-gray-200 text-gray-600 text-xs font-semibold uppercase">
                          <tr>
                            <th className="px-5 py-3">Học viên</th>
                            <th className="px-5 py-3">Trạng thái</th>
                            <th className="px-5 py-3">Hình thức nộp</th>
                            <th className="px-5 py-3">Thời gian nộp</th>
                            <th className="px-5 py-3">Điểm số</th>
                            <th className="px-5 py-3 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {students.map((st) => {
                            const sub = submissions.find(s => s.studentId === st.studentId);
                            const isSubmitted = !!sub;

                            return (
                              <tr key={st.studentId} className="hover:bg-blue-50/40 transition">
                                <td className="px-5 py-3.5">
                                  <div className="font-semibold text-gray-800">{st.studentName}</div>
                                  <div className="text-xs text-gray-500">{st.studentEmail}</div>
                                </td>
                                <td className="px-5 py-3.5">
                                  {isSubmitted ? (
                                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      Đã nộp bài
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                      Chưa nộp
                                    </span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 text-xs text-gray-700">
                                  {sub?.submissionType ? (
                                    <span className="font-medium">
                                      {sub.submissionType === 'TEXT' && 'Văn bản'}
                                      {sub.submissionType === 'DOCX' && 'File Word'}
                                      {sub.submissionType === 'AUDIO' && 'File Audio'}
                                      {sub.submissionType === 'DIRECT_RECORD' && 'Ghi âm trực tiếp'}
                                      {sub.submissionType === 'IMAGE' && 'Hình ảnh'}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td className="px-5 py-3.5 text-xs text-gray-500">
                                  {sub ? formatDateTime(sub.submittedAt) : '—'}
                                </td>
                                <td className="px-5 py-3.5">
                                  {sub?.score ? (
                                    <span className="px-2 py-0.5 text-xs font-bold bg-purple-100 text-purple-700 rounded border border-purple-200">
                                      {sub.score}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">Chưa chấm</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  {isSubmitted ? (
                                    <button
                                      onClick={() => openGradingModal(st, sub)}
                                      className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition cursor-pointer shadow-xs">
                                      Xem bài & Chấm điểm
                                    </button>
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">Không có bài</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredAssignments.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-xs">
            <h4 className="text-base font-bold text-gray-700 mb-1">Chưa có bài tập nào</h4>
            <p className="text-xs text-gray-500 mb-4">
              Bấm nút "Giao Bài Mới" để tạo bài tập cho học viên trong lớp
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-xs font-medium cursor-pointer transition shadow-xs">
              Giao Bài Đầu Tiên
            </button>
          </div>
        )}
      </div>

      {/* MODAL CHẤM ĐIỂM & XEM BÀI CỦA HỌC SINH */}
      {selectedSubmissionToGrade && selectedStudentForGrading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold">Chấm Điểm & Phản Hồi Bài Nộp</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Học viên: <b>{selectedStudentForGrading.studentName}</b> ({selectedStudentForGrading.studentEmail})
                </p>
              </div>
              <button
                onClick={() => { setSelectedSubmissionToGrade(null); setSelectedStudentForGrading(null); }}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Chi tiết nội dung bài làm của học sinh */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Nội dung bài nộp của học viên
                  </span>
                  <span className="text-xs text-gray-500">
                    Nộp lúc: {formatDateTime(selectedSubmissionToGrade.submittedAt)}
                  </span>
                </div>

                {/* Nếu nộp Text */}
                {selectedSubmissionToGrade.submissionType === 'TEXT' && (
                  <div className="p-3.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {selectedSubmissionToGrade.textContent || '(Bài làm trống)'}
                  </div>
                )}

                {/* Nếu nộp File Word Docx */}
                {selectedSubmissionToGrade.submissionType === 'DOCX' && (
                  <div className="p-4 bg-white border border-gray-200 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">
                        {selectedSubmissionToGrade.fileName || 'Tệp bài làm .docx'}
                      </div>
                      <div className="text-xs text-gray-500">Định dạng Microsoft Word</div>
                    </div>
                    {selectedSubmissionToGrade.fileUrl && (
                      <a
                        href={selectedSubmissionToGrade.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100">
                        Tải tệp về xem
                      </a>
                    )}
                  </div>
                )}

                {/* Nếu nộp File Audio hoặc Ghi âm trực tiếp: Kích hoạt AudioGradingWorkbench */}
                {(selectedSubmissionToGrade.submissionType === 'AUDIO' || selectedSubmissionToGrade.submissionType === 'DIRECT_RECORD') && (
                  <div className="space-y-2">
                    {selectedSubmissionToGrade.fileUrl ? (
                      <AudioGradingWorkbench
                        studentAudioUrl={selectedSubmissionToGrade.fileUrl}
                        studentName={selectedStudentForGrading?.studentName || selectedStudentForGrading?.name || 'Học sinh'}
                        onSplicedAudioReady={(blob) => setSplicedAudioBlob(blob)}
                        onUpdateFeedbackSummary={(summary) => setTimelineFeedbackText(summary)}
                      />
                    ) : (
                      <p className="text-xs text-red-500 p-3 bg-red-50 rounded">Không tìm thấy đường dẫn tệp âm thanh.</p>
                    )}
                  </div>
                )}

                {/* Nếu nộp Ảnh chụp hoặc Hình ảnh */}
                {selectedSubmissionToGrade.submissionType === 'IMAGE' && (
                  <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-800">
                        {selectedSubmissionToGrade.fileName || 'Hình ảnh / Bản chụp bài làm'}
                      </div>
                      {selectedSubmissionToGrade.fileUrl && (
                        <a
                          href={selectedSubmissionToGrade.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100">
                          Mở ảnh gốc ↗
                        </a>
                      )}
                    </div>
                    {selectedSubmissionToGrade.fileUrl ? (
                      <div className="max-h-96 overflow-auto border border-gray-100 rounded-lg bg-slate-100 flex items-center justify-center p-2">
                        <img
                          src={selectedSubmissionToGrade.fileUrl}
                          alt="Bài làm học sinh"
                          className="max-h-80 max-w-full object-contain rounded shadow-xs"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-red-500">Không tìm thấy đường dẫn ảnh.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Form chấm điểm & Viết feedback */}
              <form onSubmit={handleSaveGrade} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Điểm số <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={gradingForm.score}
                    onChange={(e) => setGradingForm({ ...gradingForm, score: e.target.value })}
                    placeholder="VD: 8.5/10, Band 7.0, A+..."
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nhận xét & Lời khuyên của Giáo viên (Feedback)
                  </label>
                  <textarea
                    rows={4}
                    value={gradingForm.feedback}
                    onChange={(e) => setGradingForm({ ...gradingForm, feedback: e.target.value })}
                    placeholder="Nhận xét ưu điểm, điểm cần cải thiện, lỗi phát âm/ngữ pháp..."
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => { setSelectedSubmissionToGrade(null); setSelectedStudentForGrading(null); }}
                    className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 cursor-pointer">
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={savingGrade}
                    className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded transition cursor-pointer shadow-xs">
                    {savingGrade ? 'Đang lưu...' : 'Lưu Điểm & Gửi Nhận Xét'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TẠO / SỬA BÀI TẬP */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {editingAssignment ? 'Chỉnh Sửa Bài Tập' : 'Giao Bài Tập Mới'}
            </h3>
            <form onSubmit={handleSaveAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Liên kết với buổi học <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.sessionId}
                  onChange={(e) => setFormData({ ...formData, sessionId: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="">-- Chọn buổi học --</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.topic} ({formatDateTime(s.startTime)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tiêu đề bài tập <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="VD: Bài tập nói về chủ đề Environment / Bài tập viết Essay 1"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nội dung đề bài / Yêu cầu chi tiết <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả cụ thể yêu cầu bài tập cho học sinh..."
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Thời điểm phát hành bài tập */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <label className="block text-xs font-semibold text-gray-700">
                  Thời điểm mở bài tập cho học sinh
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isScheduled: false })}
                    className={`py-2 px-3 rounded-lg border font-medium text-center transition cursor-pointer ${
                      !formData.isScheduled
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Phát hành ngay
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isScheduled: true })}
                    className={`py-2 px-3 rounded-lg border font-medium text-center transition cursor-pointer ${
                      formData.isScheduled
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Hẹn giờ phát hành
                  </button>
                </div>

                {formData.isScheduled && (
                  <div className="pt-2 border-t border-slate-200 animate-fade-in">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Thời gian mở bài tự động (Push) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required={formData.isScheduled}
                      value={formData.scheduledPublishAt}
                      onChange={(e) => setFormData({ ...formData, scheduledPublishAt: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Hạn chót nộp bài (Deadline)
                </label>
                <input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Tệp đề bài đính kèm (Tối đa 5 tệp) */}
              <div className="space-y-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-700">
                    Đính kèm tệp đề bài (Tối đa 5 tệp)
                  </label>
                  <span className="text-[11px] font-medium text-slate-500">
                    Đã chọn: {formData.attachments?.length || 0}/5
                  </span>
                </div>

                {/* Danh sách tệp đã đính kèm */}
                {formData.attachments && formData.attachments.length > 0 && (
                  <div className="space-y-1.5">
                    {formData.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white border border-gray-200 px-2.5 py-1.5 rounded-md text-xs">
                        <div className="flex items-center gap-1.5 truncate max-w-[85%]">
                          <span className="text-slate-400">📎</span>
                          <a href={att.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 font-medium hover:underline truncate">
                            {att.fileName || `Tệp ${idx + 1}`}
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="text-red-500 hover:text-red-700 p-1 font-bold cursor-pointer transition"
                          title="Xóa tệp này"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {(!formData.attachments || formData.attachments.length < 5) && (
                  <div>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>
                )}

                {uploadingAttachment && <p className="text-xs text-blue-600 font-medium">Đang tải tệp lên...</p>}
              </div>

              {/* Chọn hình thức nộp cho phép */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Hình thức nộp bài cho phép
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowText}
                      onChange={(e) => setFormData({ ...formData, allowText: e.target.checked })}
                    />
                    Nhập văn bản
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowDocx}
                      onChange={(e) => setFormData({ ...formData, allowDocx: e.target.checked })}
                    />
                    Đính kèm Word (.docx)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowAudio}
                      onChange={(e) => setFormData({ ...formData, allowAudio: e.target.checked })}
                    />
                    Đính kèm File Audio
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowRecording}
                      onChange={(e) => setFormData({ ...formData, allowRecording: e.target.checked })}
                    />
                    Ghi âm trực tiếp trên web
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer col-span-2 sm:col-span-1">
                    <input
                      type="checkbox"
                      checked={formData.allowImage}
                      onChange={(e) => setFormData({ ...formData, allowImage: e.target.checked })}
                    />
                    Hình ảnh / Chụp ảnh (IMAGE)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 cursor-pointer">
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition cursor-pointer shadow-xs">
                  {editingAssignment ? 'Lưu cập nhật' : 'Giao bài tập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
