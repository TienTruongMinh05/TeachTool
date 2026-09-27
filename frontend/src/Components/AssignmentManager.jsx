import { useState, useEffect } from 'react';
import { assignmentApi } from '../api/assignmentApi';
import { submissionApi } from '../api/submissionApi';
import { sessionApi } from '../api/sessionApi';
import { studentApi } from '../api/studentApi';
import { fileApi } from '../api/fileApi';
import AudioGradingWorkbench from './AudioGradingWorkbench';
import CollapsibleDescription from './CollapsibleDescription';
import SubmissionFeedbackThread from './SubmissionFeedbackThread';
import { useToast } from '../context/ToastContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { PaperclipIcon, XIcon } from './Icons';

export default function AssignmentManager({ classId, initialAssignmentId = null }) {
  const { toast, confirm } = useToast();
  const { t, lang } = useThemeLanguage();
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

  // Danh sách các học sinh đã nộp bài của assignment hiện tại
  const submittedStudentsList = students.filter(st => submissions.some(s => s.studentId === st.studentId));

  const currentGradingIndex = selectedStudentForGrading
    ? submittedStudentsList.findIndex(st => st.studentId === selectedStudentForGrading.studentId)
    : -1;

  const navigateGradingStudent = (direction) => {
    if (currentGradingIndex === -1) return;
    const targetIndex = currentGradingIndex + direction;
    if (targetIndex >= 0 && targetIndex < submittedStudentsList.length) {
      const targetStudent = submittedStudentsList[targetIndex];
      const targetSub = submissions.find(s => s.studentId === targetStudent.studentId);
      openGradingModal(targetStudent, targetSub);
    }
  };

  // Keyboard shortcut listener cho SpeedGrader ([ và ])
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedSubmissionToGrade) return;
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === '[') {
        navigateGradingStudent(-1);
      } else if (e.key === ']') {
        navigateGradingStudent(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSubmissionToGrade, currentGradingIndex, submittedStudentsList]);

  const handleRemindUnsubmitted = async (assignmentId) => {
    try {
      const res = await assignmentApi.remind(assignmentId);
      toast.success(res?.message || 'Đã gửi nhắc nhở thành công.');
    } catch (err) {
      toast.error('Lỗi khi gửi nhắc nhở: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleToggleSkipReminder = async (assignment) => {
    try {
      const res = await assignmentApi.toggleReminder(assignment.id);
      setAssignments(prev => prev.map(a => a.id === assignment.id ? { ...a, skipReminder: res.skipReminder } : a));
      if (activeAssignmentForSubmissions?.id === assignment.id) {
        setActiveAssignmentForSubmissions(prev => ({ ...prev, skipReminder: res.skipReminder }));
      }
      toast.success(res.skipReminder ? 'Đã tắt nhắc nhở cho bài này.' : 'Đã bật lại nhắc nhở.');
    } catch (err) {
      toast.error('Lỗi cập nhật cài đặt: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleExportZip = async (assignment) => {
    try {
      toast.info('Đang nén file ZIP bài nộp...');
      const response = await assignmentApi.exportZip(assignment.id);
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Bai_Nop_${assignment.title.replaceAll(' ', '_')}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Đã tải file ZIP bài nộp về máy.');
    } catch (err) {
      toast.error('Lỗi khi tải file ZIP: ' + (err.response?.data?.message || err.message));
    }
  };

  const addRubricChip = (chipText) => {
    setGradingForm(prev => ({
      ...prev,
      feedback: prev.feedback ? `${prev.feedback}; ${chipText}` : chipText
    }));
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
    if (!iso) return t('unlimitedDue');
    const d = new Date(iso);
    return d.toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN', {
      hour: '2-digit', minute: '2-digit',
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  if (loading) return <div className="text-gray-500 dark:text-slate-400 py-6">{t('loadingAssignmentsList')}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('assignmentManagementTitle')}</h3>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-full">
              {assignments.length} {t('assignmentsUnit')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Lọc theo buổi học */}
          <select
            value={selectedSessionFilter}
            onChange={(e) => setSelectedSessionFilter(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="ALL">{t('allSessionsOption')}</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.topic} ({formatDateTime(s.startTime)})
              </option>
            ))}
          </select>

          <button
            onClick={handleOpenCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-md text-sm transition cursor-pointer font-medium shadow-xs">
            {t('newAssignmentBtn')}
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
              className={`bg-white dark:bg-slate-900 border rounded-xl shadow-xs transition overflow-hidden ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-gray-200 dark:border-slate-800'}`}>
              <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-gray-50/60 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {matchedSession && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded shrink-0">
                        {matchedSession.topic}
                      </span>
                    )}
                    <h4 className="font-bold text-gray-800 dark:text-slate-100 text-base">{assignment.title}</h4>
                    {assignment.scheduledPublishAt && new Date(assignment.scheduledPublishAt) > new Date() && (
                      <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800 shrink-0">
                        {t('scheduledPublishPrefix')} {formatDateTime(assignment.scheduledPublishAt)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>{t('dueDatePrefix')} <b className="text-gray-700 dark:text-slate-200">{formatDateTime(assignment.dueDate)}</b></span>
                    {matchedSession && <span>{t('sessionTimePrefix')} <b className="text-gray-700 dark:text-slate-200">{formatDateTime(matchedSession.startTime)}</b></span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                  {assignment.scheduledPublishAt && new Date(assignment.scheduledPublishAt) > new Date() && (
                    <button
                      type="button"
                      onClick={() => handlePublishNow(assignment)}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition cursor-pointer"
                      title={t('publishNowBtn')}
                    >
                      {t('publishNowBtn')}
                    </button>
                  )}
                  <button
                    onClick={() => openSubmissionsView(assignment)}
                    className={`px-3 py-1 text-xs font-semibold rounded transition cursor-pointer shadow-xs ${
                      isSelected
                        ? 'bg-slate-800 hover:bg-slate-900 text-white ring-2 ring-blue-400'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}>
                    {isSelected ? t('viewingSubmissions') : t('viewSubmissionsList')}
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(assignment)}
                    className="px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition cursor-pointer">
                    {t('editSectionBtn')}
                  </button>
                  <button
                    onClick={() => handleDeleteAssignment(assignment.id, assignment.title)}
                    className="px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded hover:bg-red-100 dark:hover:bg-red-900/50 transition cursor-pointer">
                    {t('deleteSectionBtn')}
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
                    atts = [{ fileName: assignment.attachmentFileName || (lang === 'en' ? 'Download task file' : 'Tải file đề bài'), fileUrl: assignment.attachmentFileUrl }];
                  }
                  if (!atts || atts.length === 0) return null;
                  return (
                    <div className="pt-1 space-y-1">
                      <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">{t('attachedTaskFiles')} ({atts.length}):</span>
                      <div className="flex flex-wrap gap-2">
                        {atts.map((att, attIdx) => (
                          <a
                            key={attIdx}
                            href={att.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-md transition"
                          >
                            <span className="truncate max-w-[200px]">{att.fileName || `${lang === 'en' ? 'File' : 'Tệp'} ${attIdx + 1}`}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">{t('allowedSubmissionTypes')}</span>
                  {types.map(tType => (
                    <span key={tType} className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                      {tType === 'TEXT' && (lang === 'en' ? 'Text entry' : 'Văn bản')}
                      {tType === 'DOCX' && (lang === 'en' ? 'Word file (.docx)' : 'File Word (.docx)')}
                      {tType === 'AUDIO' && (lang === 'en' ? 'Audio file' : 'File Audio')}
                      {tType === 'DIRECT_RECORD' && (lang === 'en' ? 'Voice recording' : 'Ghi âm trực tiếp')}
                      {tType === 'IMAGE' && (lang === 'en' ? 'Image' : 'Hình ảnh')}
                    </span>
                  ))}
                </div>
              </div>

              {/* BẢNG BÀI NỘP CỦA HỌC VIÊN HIỂN THỊ NGAY DƯỚI BÀI TẬP ĐƯỢC CHỌN */}
              {isSelected && (
                <div className="border-t-2 border-blue-500 bg-slate-50/60 animate-in fade-in duration-200">
                  <div className="p-3.5 bg-slate-900 text-white flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                      <h4 className="font-bold text-sm sm:text-base flex items-center gap-2">
                        <span>{t('studentSubmissionsHeading')}:</span>
                        <span className="text-blue-300 font-semibold">{assignment.title}</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {t('totalStudentsLabel')} <b>{students.length}</b> | {t('submittedCountLabel')} <b>{submissions.length}</b> | {t('unsubmittedCountLabel')} <b>{Math.max(0, students.length - submissions.length)}</b>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {students.length - submissions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemindUnsubmitted(assignment.id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-sm cursor-pointer transition">
                          {t('remindUnsubmitted')} ({students.length - submissions.length})
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleSkipReminder(assignment)}
                        className={`px-2.5 py-1 text-xs font-medium border rounded-sm cursor-pointer transition ${
                          assignment.skipReminder
                            ? 'bg-rose-950/60 border-rose-800 text-rose-300 hover:bg-rose-900'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}>
                        {assignment.skipReminder ? t('remindersDisabled') : t('noReminderForThis')}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportZip(assignment)}
                        className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-white text-slate-900 rounded-sm cursor-pointer transition">
                        {t('downloadZip')}
                      </button>

                      <button
                        onClick={() => setActiveAssignmentForSubmissions(null)}
                        className="text-slate-400 hover:text-white p-1 rounded-sm hover:bg-white/10 transition cursor-pointer"
                        title={lang === 'en' ? 'Close' : 'Đóng'}>
                        ✕
                      </button>
                    </div>
                  </div>

                  {loadingSubmissions ? (
                    <div className="py-8 text-center text-xs text-gray-500 dark:text-slate-400 font-medium">
                      {t('loadingSubmissionsList')}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-100 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 text-xs font-semibold uppercase">
                          <tr>
                            <th className="px-5 py-3">{t('studentCol')}</th>
                            <th className="px-5 py-3">{t('statusCol')}</th>
                            <th className="px-5 py-3">{t('submissionFormatCol')}</th>
                            <th className="px-5 py-3">{t('submissionTimeCol')}</th>
                            <th className="px-5 py-3">{t('scoreCol')}</th>
                            <th className="px-5 py-3 text-right">{t('actionCol')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                          {students.map((st) => {
                            const sub = submissions.find(s => s.studentId === st.studentId);
                            const isSubmitted = !!sub;

                            return (
                              <tr key={st.studentId} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition">
                                <td className="px-5 py-3.5">
                                  <div className="font-semibold text-gray-800 dark:text-slate-100">{st.studentName}</div>
                                  <div className="text-xs text-gray-500 dark:text-slate-400">{st.studentEmail}</div>
                                </td>
                                <td className="px-5 py-3.5">
                                  {isSubmitted ? (
                                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                      {t('statusSubmitted')}
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700">
                                      {t('unsubmittedStatus')}
                                    </span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 text-xs text-gray-700 dark:text-slate-300">
                                  {sub?.submissionType ? (
                                    <span className="font-medium">
                                      {sub.submissionType === 'TEXT' && (lang === 'en' ? 'Text' : 'Văn bản')}
                                      {sub.submissionType === 'DOCX' && (lang === 'en' ? 'Word file' : 'File Word')}
                                      {sub.submissionType === 'AUDIO' && (lang === 'en' ? 'Audio file' : 'File Audio')}
                                      {sub.submissionType === 'DIRECT_RECORD' && (lang === 'en' ? 'Voice recording' : 'Ghi âm trực tiếp')}
                                      {sub.submissionType === 'IMAGE' && (lang === 'en' ? 'Image' : 'Hình ảnh')}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td className="px-5 py-3.5 text-xs text-gray-500 dark:text-slate-400">
                                  {sub ? formatDateTime(sub.submittedAt) : '—'}
                                </td>
                                <td className="px-5 py-3.5">
                                  {sub?.score ? (
                                    <span className="px-2 py-0.5 text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded border border-purple-200 dark:border-purple-800">
                                      {sub.score}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-400 dark:text-slate-500 italic">{t('ungraded')}</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  {isSubmitted ? (
                                    <button
                                      onClick={() => openGradingModal(st, sub)}
                                      className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition cursor-pointer shadow-xs">
                                      {t('viewAndGradeBtn')}
                                    </button>
                                  ) : (
                                    <span className="text-xs text-gray-400 dark:text-slate-500 italic">{t('noSubmissionText')}</span>
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
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
            <h4 className="text-base font-bold text-gray-700 dark:text-slate-100 mb-1">{t('noAssignmentsYet')}</h4>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
              {t('createFirstAssignmentPrompt')}
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-xs font-medium cursor-pointer transition shadow-xs">
              {t('createFirstAssignmentBtn')}
            </button>
          </div>
        )}
      </div>

      {/* MODAL CHẤM ĐIỂM & XEM BÀI CỦA HỌC SINH (SPEEDGRADER) */}
      {selectedSubmissionToGrade && selectedStudentForGrading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-sm shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider">{t('gradeAndFeedbackModalTitle')}</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {t('studentLabel')} <b>{selectedStudentForGrading.studentName}</b> ({selectedStudentForGrading.studentEmail})
                </p>
              </div>

              {/* SpeedGrader controls */}
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1 bg-slate-800 p-1 rounded-sm border border-slate-700">
                  <button
                    type="button"
                    disabled={currentGradingIndex <= 0}
                    onClick={() => navigateGradingStudent(-1)}
                    className="px-2 py-0.5 text-xs font-mono font-medium disabled:opacity-30 text-slate-200 hover:text-white cursor-pointer"
                    title={lang === 'en' ? 'Shortcut: [ (Previous student)' : 'Phím tắt: [ (Học sinh trước)'}>
                    {t('prevStudent')}
                  </button>
                  <span className="text-[11px] font-mono text-slate-400 px-1">
                    {currentGradingIndex >= 0 ? `${currentGradingIndex + 1}/${submittedStudentsList.length}` : ''}
                  </span>
                  <button
                    type="button"
                    disabled={currentGradingIndex >= submittedStudentsList.length - 1}
                    onClick={() => navigateGradingStudent(1)}
                    className="px-2 py-0.5 text-xs font-mono font-medium disabled:opacity-30 text-slate-200 hover:text-white cursor-pointer"
                    title={lang === 'en' ? 'Shortcut: ] (Next student)' : 'Phím tắt: ] (Học sinh sau)'}>
                    {t('nextStudent')}
                  </button>
                </div>

                <button
                  onClick={() => { setSelectedSubmissionToGrade(null); setSelectedStudentForGrading(null); }}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                  title={lang === 'en' ? 'Close' : 'Đóng'}>
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Chi tiết nội dung bài làm của học sinh */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                    {t('submissionContentTitle')}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {t('submittedAtLabel')} {formatDateTime(selectedSubmissionToGrade.submittedAt)}
                  </span>
                </div>

                {/* Nếu nộp Text */}
                {selectedSubmissionToGrade.submissionType === 'TEXT' && (
                  <div className="p-3.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {selectedSubmissionToGrade.textContent || t('emptySubmissionNotice')}
                  </div>
                )}

                {/* Nếu nộp File Word Docx */}
                {selectedSubmissionToGrade.submissionType === 'DOCX' && (
                  <div className="p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                        {selectedSubmissionToGrade.fileName || (lang === 'en' ? 'Submission file .docx' : 'Tệp bài làm .docx')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">{lang === 'en' ? 'Microsoft Word Document' : 'Định dạng Microsoft Word'}</div>
                    </div>
                    {selectedSubmissionToGrade.fileUrl && (
                      <a
                        href={selectedSubmissionToGrade.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded hover:bg-blue-100">
                        {t('downloadDocxBtn')}
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
                        studentName={selectedStudentForGrading?.studentName || selectedStudentForGrading?.name || (lang === 'en' ? 'Student' : 'Học sinh')}
                        onSplicedAudioReady={(blob) => setSplicedAudioBlob(blob)}
                        onUpdateFeedbackSummary={(summary) => setTimelineFeedbackText(summary)}
                      />
                    ) : (
                      <p className="text-xs text-red-500 p-3 bg-red-50 dark:bg-red-950/40 rounded border border-red-200 dark:border-red-800">{t('audioNotFound')}</p>
                    )}
                  </div>
                )}

                {/* Nếu nộp Ảnh chụp hoặc Hình ảnh */}
                {selectedSubmissionToGrade.submissionType === 'IMAGE' && (
                  <div className="p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                        {selectedSubmissionToGrade.fileName || (lang === 'en' ? 'Image / Photo submission' : 'Hình ảnh / Bản chụp bài làm')}
                      </div>
                      {selectedSubmissionToGrade.fileUrl && (
                        <a
                          href={selectedSubmissionToGrade.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded hover:bg-blue-100">
                          {t('openOriginalImage')}
                        </a>
                      )}
                    </div>
                    {selectedSubmissionToGrade.fileUrl ? (
                      <div className="max-h-96 overflow-auto border border-gray-100 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-2">
                        <img
                          src={selectedSubmissionToGrade.fileUrl}
                          alt="Bài làm học sinh"
                          className="max-h-80 max-w-full object-contain rounded shadow-xs"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-red-500">{t('imageNotFound')}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Form chấm điểm & Viết feedback */}
              <form onSubmit={handleSaveGrade} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    {t('scoreInputLabel')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={gradingForm.score}
                    onChange={(e) => setGradingForm({ ...gradingForm, score: e.target.value })}
                    placeholder={t('scoreInputPlaceholder')}
                    className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                      {t('teacherFeedbackLabel')}
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">{t('clickChipToInsert')}</span>
                  </div>

                  {/* Modular Rubric Chips */}
                  <div className="flex flex-wrap gap-1 pb-2">
                    {(lang === 'en' ? [
                      'Past tense conjugation',
                      'Missing ending sound /s/',
                      'Pronounce /ed/ clearly',
                      'Incorrect word stress',
                      'Rich vocabulary',
                      'Fluent expression',
                      'Coherent ideas',
                      'Pay attention to grammar'
                    ] : [
                      'Chia thì quá khứ',
                      'Thiếu âm đuôi /s/',
                      'Phát âm rõ âm /ed/',
                      'Sai trọng âm từ',
                      'Từ vựng phong phú',
                      'Diễn đạt trôi chảy',
                      'Ý tưởng mạch lạc',
                      'Cần chú ý ngữ pháp'
                    ]).map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => addRubricChip(chip)}
                        className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-sm border border-slate-300 dark:border-slate-700 cursor-pointer transition">
                        + {chip}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={4}
                    value={gradingForm.feedback}
                    onChange={(e) => setGradingForm({ ...gradingForm, feedback: e.target.value })}
                    placeholder={t('feedbackPlaceholder')}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-sm px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 dark:focus:ring-slate-400 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setSelectedSubmissionToGrade(null); setSelectedStudentForGrading(null); }}
                    className="px-4 py-1.5 text-xs font-medium text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 rounded-sm hover:bg-gray-200 cursor-pointer">
                    {t('cancelBtn')}
                  </button>
                  <button
                    type="submit"
                    disabled={savingGrade}
                    className="px-5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-50 rounded-sm transition cursor-pointer shadow-xs">
                    {savingGrade ? t('savingGradeStatus') : t('saveGradeAndFeedbackBtn')}
                  </button>
                </div>
              </form>

              {/* Vòng lặp trao đổi phản hồi 2 chiều về bài nộp này */}
              {selectedSubmissionToGrade?.id && (
                <div className="pt-2">
                  <SubmissionFeedbackThread submissionId={selectedSubmissionToGrade.id} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL TẠO / SỬA BÀI TẬP */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-4">
              {editingAssignment ? t('editAssignmentModalTitle') : t('createAssignmentModalTitle')}
            </h3>
            <form onSubmit={handleSaveAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {t('associatedSessionLabel')} <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.sessionId}
                  onChange={(e) => setFormData({ ...formData, sessionId: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="">{t('selectSessionPrompt')}</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.topic} ({formatDateTime(s.startTime)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {t('assignmentTitleLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={lang === 'en' ? 'Enter assignment title...' : 'Nhập tiêu đề bài tập...'}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {t('assignmentDescLabel')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={lang === 'en' ? 'Specific instructions and task details...' : 'Mô tả cụ thể yêu cầu bài tập cho học sinh...'}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Thời điểm phát hành bài tập */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3">
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                  {t('publishTimingLabel')}
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isScheduled: false })}
                    className={`py-2 px-3 rounded-lg border font-medium text-center transition cursor-pointer ${
                      !formData.isScheduled
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {t('publishImmediately')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isScheduled: true })}
                    className={`py-2 px-3 rounded-lg border font-medium text-center transition cursor-pointer ${
                      formData.isScheduled
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {t('schedulePublishBtn')}
                  </button>
                </div>

                {formData.isScheduled && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 animate-fade-in">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t('scheduledPushTime')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required={formData.isScheduled}
                      value={formData.scheduledPublishAt}
                      onChange={(e) => setFormData({ ...formData, scheduledPublishAt: e.target.value })}
                      className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {t('dueDateLabel')}
                </label>
                <input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Tệp đề bài đính kèm (Tối đa 5 tệp) */}
              <div className="space-y-2 p-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                    {t('max5Attachments')}
                  </label>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {t('selectedCount')} {formData.attachments?.length || 0}/5
                  </span>
                </div>

                {/* Danh sách tệp đã đính kèm */}
                {formData.attachments && formData.attachments.length > 0 && (
                  <div className="space-y-1.5">
                    {formData.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 px-2.5 py-1.5 rounded-md text-xs">
                        <div className="flex items-center gap-1.5 truncate max-w-[85%]">
                          <PaperclipIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <a href={att.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 font-medium hover:underline truncate">
                            {att.fileName || (lang === 'en' ? `File ${idx + 1}` : `Tệp ${idx + 1}`)}
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer transition"
                          title={lang === 'en' ? 'Remove this file' : 'Xóa tệp này'}
                        >
                          <XIcon className="w-3.5 h-3.5" />
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
                      className="block w-full text-xs text-gray-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:file:bg-blue-950/60 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>
                )}

                {uploadingAttachment && <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t('uploadingAttachmentStatus')}</p>}
              </div>

              {/* Chọn hình thức nộp cho phép */}
              <div className="p-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                  {t('allowedSubmissionTypesLabel')}
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 dark:text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowText}
                      onChange={(e) => setFormData({ ...formData, allowText: e.target.checked })}
                    />
                    {t('allowTextType')}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowDocx}
                      onChange={(e) => setFormData({ ...formData, allowDocx: e.target.checked })}
                    />
                    {t('allowDocxType')}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowAudio}
                      onChange={(e) => setFormData({ ...formData, allowAudio: e.target.checked })}
                    />
                    {t('allowAudioType')}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowRecording}
                      onChange={(e) => setFormData({ ...formData, allowRecording: e.target.checked })}
                    />
                    {t('allowRecordingType')}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer col-span-2 sm:col-span-1">
                    <input
                      type="checkbox"
                      checked={formData.allowImage}
                      onChange={(e) => setFormData({ ...formData, allowImage: e.target.checked })}
                    />
                    {t('allowImageType')}
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 rounded hover:bg-gray-200 dark:hover:bg-slate-700 cursor-pointer">
                  {t('cancelBtn')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition cursor-pointer shadow-xs">
                  {editingAssignment ? t('saveUpdateBtn') : t('assignHomeworkBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
