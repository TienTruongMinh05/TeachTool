import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { studentPortalApi } from '../api/studentPortalApi';
import { assignmentApi } from '../api/assignmentApi';
import { submissionApi } from '../api/submissionApi';
import { fileApi } from '../api/fileApi';
import AudioRecorder from '../Components/AudioRecorder';
import StudentFeedbackAudioPlayer from '../Components/StudentFeedbackAudioPlayer';
import TimetableGrid from '../Components/TimetableGrid';
import AccountSettingsModal from '../Components/AccountSettingsModal';
import CollapsibleDescription from '../Components/CollapsibleDescription';
import StudentGuide from '../Components/StudentGuide';

export default function StudentPortal() {
  const { user, logout, updateUser } = useAuth();
  const { toast, confirm } = useToast();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Camera capture states
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const mobileCameraInputRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // State các tab chính: 'schedule' (Thời khóa biểu), 'assignments' (Bài tập & Điểm số), 'classes' (Lớp học)
  const [activeTab, setActiveTab] = useState('schedule');
  const [scheduleViewMode, setScheduleViewMode] = useState('grid'); // 'grid' | 'list'

  const [schedule, setSchedule] = useState(() => {
    try {
      const saved = localStorage.getItem(`cached_student_schedule_${user?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [enrolledClasses, setEnrolledClasses] = useState(() => {
    try {
      const saved = localStorage.getItem(`cached_student_classes_${user?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const saved = localStorage.getItem(`cached_student_schedule_${user?.id}`);
      return !saved || JSON.parse(saved).length === 0;
    } catch {
      return true;
    }
  });

  // Báo vắng states
  const [selectedSessionForAbsence, setSelectedSessionForAbsence] = useState(null);
  const [absenceReason, setAbsenceReason] = useState('');
  const [absenceError, setAbsenceError] = useState('');
  const [isSubmittingAbsence, setIsSubmittingAbsence] = useState(false);

  // Modal tham gia lớp học bằng mã
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [classCodeInput, setClassCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  // Modal nộp bài tập
  const [activeAssignmentToSubmit, setActiveAssignmentToSubmit] = useState(null);
  const [selectedSubmissionMode, setSelectedSubmissionMode] = useState('TEXT'); // 'TEXT' | 'DOCX' | 'AUDIO' | 'DIRECT_RECORD'
  const [submissionText, setSubmissionText] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileData, setUploadedFileData] = useState({ fileUrl: '', fileName: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccessMsg, setSubmissionSuccessMsg] = useState('');

  // Modal xem nội dung Handout Text
  const [viewingHandoutText, setViewingHandoutText] = useState(null);

  const loadData = async () => {
    if (!user || !user.id) return;
    try {
      const [schedRes, assignRes, subsRes, classesRes] = await Promise.allSettled([
        studentPortalApi.getSchedule(user.id),
        assignmentApi.getForStudent(user.id),
        submissionApi.getByStudent(user.id),
        studentPortalApi.getClasses(user.id)
      ]);

      if (schedRes.status === 'fulfilled') {
        const val = schedRes.value || [];
        setSchedule(val);
        try { localStorage.setItem(`cached_student_schedule_${user.id}`, JSON.stringify(val)); } catch {}
      }
      if (assignRes.status === 'fulfilled') {
        const rawAss = assignRes.value || [];
        const now = new Date();
        const publishedOnly = rawAss.filter(a => {
          if (a.isPublished === false) return false;
          if (a.scheduledPublishAt && new Date(a.scheduledPublishAt) > now) return false;
          return true;
        });
        setAssignments(publishedOnly);
      }
      if (subsRes.status === 'fulfilled') setSubmissions(subsRes.value || []);
      if (classesRes.status === 'fulfilled') {
        const cVal = classesRes.value || [];
        setEnrolledClasses(cVal);
        try { localStorage.setItem(`cached_student_classes_${user.id}`, JSON.stringify(cVal)); } catch {}
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu học sinh:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Tự động kiểm tra và đồng bộ bài tập mới mở / lịch học mỗi 30 giây
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadData();
      }
    }, 30000);

    const handleFocus = () => loadData();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id]);

  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (!classCodeInput.trim()) return;
    try {
      setJoining(true);
      setJoinError('');
      await studentPortalApi.joinClass(classCodeInput.trim(), user.id);
      setIsJoinModalOpen(false);
      setClassCodeInput('');
      await loadData();
    } catch (err) {
      setJoinError(err.response?.data?.message || err.message || 'Mã lớp không hợp lệ hoặc lớp không tồn tại.');
    } finally {
      setJoining(false);
    }
  };

  // Đếm số lượng hiển thị trên tab (chỉ tính buổi chưa học, bài chưa nộp)
  const upcomingSessionsCount = useMemo(() => {
    const now = new Date();
    return schedule.filter(s => {
      const end = s.endTime ? new Date(s.endTime) : (s.startTime ? new Date(s.startTime) : null);
      return end && end > now;
    }).length;
  }, [schedule]);

  const pendingAssignmentsCount = useMemo(() => {
    return assignments.filter(a => !submissions.some(sub => sub.assignmentId === a.id)).length;
  }, [assignments, submissions]);

  const [draftSavedNotice, setDraftSavedNotice] = useState('');

  // Tính toán trạng thái bài tập & kế hoạch chi tiết cho từng buổi học trong thời khóa biểu
  const enrichedSchedule = useMemo(() => {
    return schedule.map(session => {
      const sId = session.sessionId || session.id;
      // Tìm các bài tập gắn với buổi học này
      const sessionAssignments = assignments.filter(a => a.sessionId === sId || (session.assignments && session.assignments.some(sa => sa.id === a.id)));
      const combinedAssignments = sessionAssignments.length > 0 ? sessionAssignments : (session.assignments || []);

      let homeworkStatus = null;
      let homeworkScore = null;

      const enrichedAssignments = combinedAssignments.map(asgn => {
        const fullAss = assignments.find(a => a.id === asgn.id) || asgn;
        const sub = submissions.find(s => s.assignmentId === asgn.id);
        let asgnStatus = 'NOT_SUBMITTED';
        let asgnScore = null;
        if (sub) {
          if (sub.status === 'GRADED' || (sub.score !== null && sub.score !== undefined)) {
            asgnStatus = 'GRADED';
            asgnScore = sub.score;
          } else {
            asgnStatus = 'SUBMITTED';
          }
        } else {
          try {
            const draftKey = `draft_asgn_${user?.id}_${asgn.id}`;
            const draft = localStorage.getItem(draftKey);
            if (draft) {
              const parsed = JSON.parse(draft);
              if (parsed && (parsed.submissionText || parsed.uploadedFileData?.fileUrl)) {
                asgnStatus = 'DRAFT';
              }
            }
          } catch {}
        }
        return {
          ...fullAss,
          submission: sub || null,
          submissionStatus: asgnStatus,
          submissionScore: asgnScore
        };
      });

      if (enrichedAssignments.length > 0) {
        const hasGraded = enrichedAssignments.some(a => a.submissionStatus === 'GRADED');
        const hasSubmitted = enrichedAssignments.some(a => a.submissionStatus === 'SUBMITTED');
        const hasDraft = enrichedAssignments.some(a => a.submissionStatus === 'DRAFT');

        if (hasGraded) {
          homeworkStatus = 'GRADED';
          const gradedAss = enrichedAssignments.find(a => a.submissionScore != null);
          homeworkScore = gradedAss?.submissionScore;
        } else if (hasSubmitted) {
          homeworkStatus = 'SUBMITTED';
        } else if (hasDraft) {
          homeworkStatus = 'DRAFT';
        } else {
          homeworkStatus = 'NOT_SUBMITTED';
        }
      }

      return {
        ...session,
        assignments: enrichedAssignments,
        homeworkStatus,
        homeworkScore
      };
    });
  }, [schedule, assignments, submissions, user?.id]);

  // Phân chia buổi học thành: Buổi sắp tới và Buổi đã học
  const { upcomingStudentSessions, pastStudentSessions } = useMemo(() => {
    const now = new Date();
    const upcoming = [];
    const past = [];
    enrichedSchedule.forEach(s => {
      const end = s.endTime ? new Date(s.endTime) : (s.startTime ? new Date(new Date(s.startTime).getTime() + (s.durationMinutes || 90) * 60000) : null);
      if (end && end < now) {
        past.push(s);
      } else {
        upcoming.push(s);
      }
    });
    return { upcomingStudentSessions: upcoming, pastStudentSessions: past };
  }, [enrichedSchedule]);

  const openSubmitModal = (assignment) => {
    setActiveAssignmentToSubmit(assignment);
    setSubmissionSuccessMsg('');
    setDraftSavedNotice('');
    const rawAllowed = (assignment.allowedSubmissionTypes || 'TEXT,DOCX,AUDIO,DIRECT_RECORD,IMAGE')
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);
    const allowed = rawAllowed.length > 0 ? rawAllowed : ['TEXT', 'DOCX', 'AUDIO', 'DIRECT_RECORD', 'IMAGE'];

    const existing = submissions.find(s => s.assignmentId === assignment.id);
    if (existing) {
      setSelectedSubmissionMode(allowed.includes(existing.submissionType) ? existing.submissionType : (allowed[0] || 'TEXT'));
      setSubmissionText(existing.textContent || '');
      setUploadedFileData({
        fileUrl: existing.fileUrl || '',
        fileName: existing.fileName || ''
      });
    } else {
      // Kiểm tra xem có bản nháp đã lưu không
      let loadedDraft = false;
      try {
        const draftStr = localStorage.getItem(`draft_asgn_${user?.id}_${assignment.id}`);
        if (draftStr) {
          const draft = JSON.parse(draftStr);
          if (draft && (draft.submissionText || draft.uploadedFileData?.fileUrl)) {
            setSelectedSubmissionMode(allowed.includes(draft.selectedSubmissionMode) ? draft.selectedSubmissionMode : (allowed[0] || 'TEXT'));
            setSubmissionText(draft.submissionText || '');
            setUploadedFileData(draft.uploadedFileData || { fileUrl: '', fileName: '' });
            setDraftSavedNotice('Đã tự động tải lại bản nháp bạn đã lưu trước đó.');
            loadedDraft = true;
          }
        }
      } catch {}

      if (!loadedDraft) {
        setSelectedSubmissionMode(allowed[0] || 'TEXT');
        setSubmissionText('');
        setUploadedFileData({ fileUrl: '', fileName: '' });
      }
    }
  };

  const handleSaveDraft = () => {
    if (!activeAssignmentToSubmit || !user?.id) return;
    const draftData = {
      selectedSubmissionMode,
      submissionText,
      uploadedFileData,
      savedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(`draft_asgn_${user.id}_${activeAssignmentToSubmit.id}`, JSON.stringify(draftData));
      setDraftSavedNotice('Đã lưu bản nháp thành công!');
      setTimeout(() => setDraftSavedNotice(''), 3500);
      // Buộc cập nhật trạng thái thời khóa biểu
      setSchedule(prev => [...prev]);
      toast.success('Đã lưu bản nháp bài làm tự động!');
    } catch {
      toast.error('Không thể lưu bản nháp vào bộ nhớ trình duyệt.');
    }
  };

  const closeSubmitModal = () => {
    stopCamera();
    setActiveAssignmentToSubmit(null);
    setSubmissionSuccessMsg('');
    setDraftSavedNotice('');
  };

  const startCamera = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ mở camera trực tiếp.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err) {
      setCameraError('Không thể mở camera: ' + (err.message || 'Vui lòng cấp quyền truy cập camera trong trình duyệt'));
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        setUploadingFile(true);
        const fileName = `chup_anh_bai_nop_${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        const res = await fileApi.upload(file);
        setUploadedFileData({
          fileUrl: res.fileUrl,
          fileName: res.fileName || fileName
        });
        stopCamera();
        toast.success('Đã chụp ảnh bài làm thành công!');
      } catch (err) {
        toast.error('Lỗi tải ảnh chụp lên máy chủ: ' + (err.response?.data?.message || err.message));
      } finally {
        setUploadingFile(false);
      }
    }, 'image/jpeg', 0.85);
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (type === 'DOCX') {
      if (!lowerName.endsWith('.docx') && !lowerName.endsWith('.doc') && !lowerName.endsWith('.pdf')) {
        toast.warning('Định dạng tệp không hợp lệ! Vui lòng chỉ tải lên tệp tài liệu (.docx, .doc, .pdf)');
        e.target.value = '';
        return;
      }
    } else if (type === 'AUDIO') {
      if (!lowerName.endsWith('.mp3') && !lowerName.endsWith('.wav') && !lowerName.endsWith('.m4a') && !lowerName.endsWith('.webm') && !lowerName.endsWith('.ogg')) {
        toast.warning('Định dạng tệp không hợp lệ! Vui lòng chỉ tải lên tệp âm thanh (.mp3, .wav, .m4a, .webm)');
        e.target.value = '';
        return;
      }
    } else if (type === 'IMAGE') {
      if (!lowerName.endsWith('.jpg') && !lowerName.endsWith('.jpeg') && !lowerName.endsWith('.png') && !lowerName.endsWith('.webp') && !lowerName.endsWith('.gif') && !lowerName.endsWith('.heic')) {
        toast.warning('Định dạng tệp không hợp lệ! Vui lòng chỉ tải lên tệp hình ảnh (.jpg, .jpeg, .png, .webp)');
        e.target.value = '';
        return;
      }
    }

    try {
      setUploadingFile(true);
      const res = await fileApi.upload(file);
      setUploadedFileData({
        fileUrl: res.fileUrl,
        fileName: res.fileName || file.name
      });
      toast.success(`Đã tải lên tệp "${res.fileName || file.name}"`);
    } catch (err) {
      toast.error('Lỗi tải tệp lên: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!activeAssignmentToSubmit) return;

    try {
      setSubmitting(true);
      const rawAllowed = (activeAssignmentToSubmit.allowedSubmissionTypes || 'TEXT,DOCX,AUDIO,DIRECT_RECORD,IMAGE')
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
      const allowed = rawAllowed.length > 0 ? rawAllowed : ['TEXT', 'DOCX', 'AUDIO', 'DIRECT_RECORD', 'IMAGE'];

      if (!allowed.includes(selectedSubmissionMode)) {
        toast.error(`Hình thức nộp '${selectedSubmissionMode}' không được giáo viên cho phép! Các hình thức được phép: ${allowed.join(', ')}`);
        return;
      }

      const payload = {
        submissionType: selectedSubmissionMode,
        textContent: selectedSubmissionMode === 'TEXT' ? submissionText : null,
        fileUrl: selectedSubmissionMode !== 'TEXT' ? uploadedFileData.fileUrl : null,
        fileName: selectedSubmissionMode !== 'TEXT' ? uploadedFileData.fileName : null
      };

      if (selectedSubmissionMode === 'TEXT' && !submissionText.trim()) {
        toast.warning('Vui lòng nhập nội dung văn bản bài làm!');
        return;
      }
      if (selectedSubmissionMode !== 'TEXT' && !uploadedFileData.fileUrl) {
        toast.warning('Vui lòng tải lên hoặc chụp ảnh/thu âm tệp bài làm trước khi nộp!');
        return;
      }

      await submissionApi.submit(activeAssignmentToSubmit.id, user.id, payload);
      // Xóa bản nháp sau khi đã nộp thành công
      try {
        localStorage.removeItem(`draft_asgn_${user.id}_${activeAssignmentToSubmit.id}`);
      } catch {}

      toast.success('Đã nộp bài tập thành công!');
      setSubmissionSuccessMsg('Đã nộp bài tập thành công!');
      await loadData();
      setTimeout(() => {
        closeSubmitModal();
      }, 1200);
    } catch (err) {
      toast.error('Lỗi khi nộp bài tập: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const canReportAbsence = (session) => {
    if (!session || !session.startTime) return false;
    const start = new Date(session.startTime);
    const now = new Date();
    const diffMinutes = (start.getTime() - now.getTime()) / (1000 * 60);
    return diffMinutes >= 120;
  };

  const getAbsenceRemainingNotice = (session) => {
    if (!session || !session.startTime) return '';
    const start = new Date(session.startTime);
    const now = new Date();
    const diffMinutes = Math.floor((start.getTime() - now.getTime()) / (1000 * 60));
    if (diffMinutes < 0) return 'Buổi học đã qua';
    if (diffMinutes < 120) return `Còn ${diffMinutes} phút nữa là vào học (quá hạn báo trước 2 giờ)`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `Còn ${hours} giờ ${mins} phút trước giờ học (hợp lệ để báo vắng)`;
  };

  const handleOpenAbsenceModal = (session) => {
    setSelectedSessionForAbsence(session);
    setAbsenceReason('');
    setAbsenceError('');
  };

  const handleSubmitAbsence = async (e) => {
    e.preventDefault();
    if (!selectedSessionForAbsence || !user?.id) return;
    if (!canReportAbsence(selectedSessionForAbsence)) {
      setAbsenceError('Chỉ được phép báo vắng trước giờ học ít nhất 2 tiếng!');
      return;
    }
    try {
      setIsSubmittingAbsence(true);
      setAbsenceError('');
      await studentPortalApi.reportAbsence(user.id, selectedSessionForAbsence.sessionId || selectedSessionForAbsence.id, absenceReason);
      toast.success('Đã gửi báo vắng thành công!');
      setSelectedSessionForAbsence(null);
      setAbsenceReason('');
      await loadData();
    } catch (err) {
      setAbsenceError(err.response?.data?.message || err.message || 'Lỗi khi gửi báo vắng.');
    } finally {
      setIsSubmittingAbsence(false);
    }
  };

  const isSessionEnded = (session) => {
    if (!session || !session.startTime) return false;
    const start = new Date(session.startTime);
    const duration = session.durationMinutes || 90;
    const end = session.endTime ? new Date(session.endTime) : new Date(start.getTime() + duration * 60000);
    return new Date() > end;
  };

  const [cancellingAbsenceId, setCancellingAbsenceId] = useState(null);
  const [isDeletingSubmission, setIsDeletingSubmission] = useState(false);

  const handleCancelAbsence = async (session) => {
    if (!user?.id || !session) return;
    const ok = await confirm({
      title: 'Hủy báo vắng',
      message: 'Bạn có chắc chắn muốn hủy báo vắng để đi học lại buổi học này không?',
      confirmText: 'Xác nhận đi học',
      cancelText: 'Giữ báo vắng',
      type: 'info'
    });
    if (!ok) return;

    const sId = session.sessionId || session.id;
    try {
      setCancellingAbsenceId(sId);
      await studentPortalApi.cancelAbsence(user.id, sId);
      toast.success('Đã hủy báo vắng thành công! Bạn có thể tham gia buổi học.');
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi hủy báo vắng.');
    } finally {
      setCancellingAbsenceId(null);
    }
  };

  const handleDeleteSubmission = async (submissionId) => {
    if (!submissionId) return;
    const ok = await confirm({
      title: 'Xác nhận xóa bài nộp',
      message: 'Bạn có chắc chắn muốn xóa bài đã nộp này không?\n\nSau khi xóa, bạn có thể nộp lại bài mới bất cứ lúc nào trước hạn chót.',
      confirmText: 'Xác nhận xóa bài',
      cancelText: 'Giữ lại',
      type: 'danger'
    });
    if (!ok) return;

    try {
      setIsDeletingSubmission(true);
      await submissionApi.delete(submissionId);
      toast.success('Đã xóa bài nộp thành công! Bạn có thể làm lại và nộp bài mới.');
      setSubmissionPayload({
        submissionType: 'TEXT',
        textContent: '',
        fileUrl: '',
        fileName: ''
      });
      setAudioBlob(null);
      setAudioPreviewUrl(null);
      setSubmissionSuccessMsg('');
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi xóa bài nộp.');
    } finally {
      setIsDeletingSubmission(false);
    }
  };

  const handleGoToAssignment = (session, specificAssignment = null) => {
    if (specificAssignment) {
      const fullAss = assignments.find(a => a.id === specificAssignment.id) || specificAssignment;
      openSubmitModal(fullAss);
      return;
    }
    if (session?.assignments && session.assignments.length > 0) {
      // Ưu tiên mở bài tập chưa nộp hoặc bản nháp trước
      const pendingAss = session.assignments.find(a => a.submissionStatus !== 'SUBMITTED' && a.submissionStatus !== 'GRADED') || session.assignments[0];
      const fullAss = assignments.find(a => a.id === pendingAss.id) || pendingAss;
      openSubmitModal(fullAss);
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 pb-12">
      {/* HEADER BAR (RESPONSIVE CHO CẢ PC & ĐIỆN THOẠI) */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap justify-between items-center gap-3">
          <div className="flex flex-col">
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">TeachTool</span>
            <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">
              Dành cho Học Sinh
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-100">{user?.fullName || 'Học sinh'}</div>
              <div className="text-[11px] text-slate-400">{user?.email}</div>
            </div>
            <button
              onClick={() => { setIsJoinModalOpen(true); setJoinError(''); }}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer shadow-xs whitespace-nowrap">
              + Vào Lớp Bằng Mã
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer border whitespace-nowrap ${
                activeTab === 'guide'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                  : 'text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700'
              }`}>
              Hướng dẫn
            </button>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer border border-slate-700 whitespace-nowrap">
              Cài đặt
            </button>
          </div>
        </div>
      </header>

      {/* NỘI DUNG CHÍNH */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-5 sm:pt-7">
        {/* THANH ĐIỀU HƯỚNG TAB (THỜI KHÓA BIỂU, LỚP CỦA TÔI & HƯỚNG DẪN) */}
        <div className="grid grid-cols-3 gap-1 bg-slate-200/80 p-1 rounded-xl max-w-md mb-6 shadow-xs">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-2 px-1 text-center text-xs font-semibold rounded-lg transition cursor-pointer truncate ${
              activeTab === 'schedule' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}>
            Thời Khóa Biểu ({upcomingSessionsCount})
          </button>
          <button
            onClick={() => setActiveTab('classes')}
            className={`py-2 px-1 text-center text-xs font-semibold rounded-lg transition cursor-pointer truncate ${
              activeTab === 'classes' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}>
            Lớp Của Tôi ({enrolledClasses.length})
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-2 px-1 text-center text-xs font-semibold rounded-lg transition cursor-pointer truncate ${
              activeTab === 'guide' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}>
            Hướng Dẫn
          </button>
        </div>

        {loading && (
          <div className="text-gray-500 py-12 text-center text-sm">
            Đang tải dữ liệu học tập của bạn...
          </div>
        )}

        {/* TAB 1: THỜI KHÓA BIỂU */}
        {!loading && activeTab === 'schedule' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Thời Khóa Biểu</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Xem lịch học tuần (07:00 - 22:00), nội dung bài học, dặn dò chuẩn bị, làm bài tập và báo vắng
                </p>
              </div>

              {/* Toggle dạng hiển thị: Bảng tuần vs Danh sách chi tiết */}
              <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg self-start sm:self-auto text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setScheduleViewMode('grid')}
                  className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                    scheduleViewMode === 'grid' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Thời khóa biểu tuần (07:00 - 22:00)
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleViewMode('list')}
                  className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                    scheduleViewMode === 'list' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Danh sách bài học & Chuẩn bị
                </button>
              </div>
            </div>

            {enrichedSchedule.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 text-center shadow-xs">
                <h4 className="font-bold text-gray-700 text-sm mb-1">Chưa có lịch học nào</h4>
                <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
                  Bạn chưa tham gia lớp nào hoặc giáo viên chưa lên lịch học. Bấm nút bên dưới để nhập mã vào lớp.
                </p>
                <button
                  onClick={() => setIsJoinModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs">
                  Tham Gia Lớp Bằng Mã
                </button>
              </div>
            ) : scheduleViewMode === 'grid' ? (
              /* DẠNG BẢNG THỜI KHÓA BIỂU TUẦN (07:00 - 22:00) */
              <TimetableGrid
                sessions={enrichedSchedule}
                isStudent={true}
                studentId={user?.id}
                onReportAbsenceSuccess={loadData}
                onGoToAssignment={handleGoToAssignment}
              />
            ) : (
              /* DẠNG DANH SÁCH CHI TIẾT TỪNG BUỔI HỌC (CHIA 2 PHẦN: SẮP TỚI & ĐÃ HỌC) */
              <div className="space-y-6">
                {/* PHẦN 1: BUỔI HỌC SẮP TỚI */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Buổi học sắp tới ({upcomingStudentSessions.length})
                  </h3>

                  {upcomingStudentSessions.length === 0 ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                      Không có buổi học sắp tới nào.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {upcomingStudentSessions.map((item, idx) => {
                        const isAbsent = item.attendanceStatus === 'ABSENT';
                        const canAbsent = canReportAbsence(item);

                        return (
                          <div key={item.sessionId || idx} className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
                            {/* Header của Buổi học */}
                            <div className="p-4 bg-slate-50 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-600 text-white rounded">
                                    {item.className}
                                  </span>
                                  {item.classCode && (
                                    <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                      Mã: {item.classCode}
                                    </span>
                                  )}
                                  <h3 className="font-bold text-gray-800 text-base">
                                    {item.topic || 'Buổi học'}
                                  </h3>
                                  {isAbsent && (
                                    <span className="text-xs font-bold px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded">
                                      Đã báo vắng
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                  <span>Bắt đầu: <b className="text-gray-700">{formatDateTime(item.startTime)}</b></span>
                                  <span>Thời lượng: <b className="text-gray-700">{item.durationMinutes ? `${item.durationMinutes} phút` : '90 phút'}</b></span>
                                </div>
                                {item.attendanceNote && (
                                  <div className="text-xs text-rose-600 mt-1">
                                    Lý do: {item.attendanceNote}
                                  </div>
                                )}
                              </div>

                              {/* Nút thao tác nhanh của buổi học: Làm bài tập & Báo vắng */}
                              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                                {item.assignments && item.assignments.length === 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleGoToAssignment(item, item.assignments[0])}
                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer shadow-xs">
                                    {isSessionEnded(item)
                                      ? (item.homeworkStatus === 'SUBMITTED' || item.homeworkStatus === 'GRADED' ? 'Xem lại bài đã nộp' : 'Xem bài tập')
                                      : (item.homeworkStatus === 'DRAFT' ? 'Tiếp tục làm bài (Bản nháp)' : item.homeworkStatus === 'SUBMITTED' || item.homeworkStatus === 'GRADED' ? 'Xem lại bài đã nộp' : 'Làm bài tập')}
                                  </button>
                                )}
                                {item.assignments && item.assignments.length > 1 && (
                                  <span className="px-2.5 py-1 text-xs font-semibold text-blue-800 bg-blue-50 rounded-lg border border-blue-200">
                                    Có {item.assignments.length} bài tập (chọn bên dưới)
                                  </span>
                                )}

                                {isAbsent ? (
                                  !isSessionEnded(item) ? (
                                    <button
                                      type="button"
                                      onClick={() => handleCancelAbsence(item)}
                                      disabled={cancellingAbsenceId === (item.sessionId || item.id)}
                                      className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition cursor-pointer shadow-xs">
                                      {cancellingAbsenceId === (item.sessionId || item.id) ? 'Đang hủy...' : 'Hủy báo vắng (Đi học lại)'}
                                    </button>
                                  ) : (
                                    <span className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 rounded-lg border border-slate-200">
                                      Đã vắng
                                    </span>
                                  )
                                ) : (
                                  <button
                                    type="button"
                                    disabled={!canAbsent}
                                    onClick={() => handleOpenAbsenceModal(item)}
                                    title={getAbsenceRemainingNotice(item)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs ${
                                      canAbsent
                                        ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                                        : 'text-slate-400 bg-slate-100 cursor-not-allowed border border-slate-200'
                                    }`}>
                                    Báo vắng
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Chi tiết học phần (Nội dung, Sách, Chuẩn bị gì) */}
                            <div className="p-4 space-y-4">
                              {item.sections && item.sections.length > 0 ? (
                                <div className="space-y-3">
                                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    Nội dung chi tiết & Dặn dò chuẩn bị
                                  </h4>
                                  <div className="grid grid-cols-1 gap-3">
                                    {item.sections.map((sec, sIdx) => (
                                      <div key={sec.id || sIdx} className="p-3.5 bg-gray-50/70 border border-gray-200 rounded-lg space-y-2">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5">
                                          <div className="font-bold text-gray-800 text-sm">
                                            Phần {sIdx + 1}: {sec.content}
                                          </div>
                                          <div className="text-xs text-gray-500 font-medium">
                                            Thời gian: {sec.timeAllocation || `${sec.durationMinutes || 15} phút`}
                                          </div>
                                        </div>

                                        {sec.activity && (
                                          <div className="text-xs text-purple-700 font-medium">
                                            Hoạt động trên lớp: <span className="font-semibold">{sec.activity}</span>
                                          </div>
                                        )}

                                        {/* DẶN DÒ HỌC SINH CẦN CHUẨN BỊ GÌ */}
                                        {sec.studentPreparation ? (
                                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 leading-relaxed">
                                            <span className="font-bold text-amber-800 block mb-0.5">Học sinh cần chuẩn bị:</span>
                                            {sec.studentPreparation}
                                          </div>
                                        ) : (
                                          <div className="text-xs text-gray-400 italic">
                                            (Không có yêu cầu chuẩn bị đặc biệt)
                                          </div>
                                        )}

                                        {/* Tài liệu Handout */}
                                        {sec.handoutType === 'TEXT' && sec.handoutText && (
                                          <div>
                                            <button
                                              onClick={() => setViewingHandoutText(sec.handoutText)}
                                              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer">
                                              Xem văn bản bài học đã dán
                                            </button>
                                          </div>
                                        )}
                                        {sec.handoutType === 'FILE' && sec.handoutFilePath && (
                                          <div>
                                            <a
                                              href={sec.handoutFilePath}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded hover:bg-emerald-100">
                                              Tải tài liệu: {sec.handoutFileName || 'Tệp đính kèm'}
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400 italic py-2">
                                  Chưa có kế hoạch chi tiết cho buổi học này.
                                </div>
                              )}

                              {/* BÀI TẬP CỦA BUỔI HỌC */}
                              {item.assignments && item.assignments.length > 0 && (
                                <div className="pt-3 border-t border-gray-100 space-y-2">
                                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    Bài tập liên kết với buổi học này ({item.assignments.length})
                                  </h4>
                                  <div className="space-y-2.5">
                                    {item.assignments.map((ass) => {
                                      const sub = ass.submission || submissions.find(s => s.assignmentId === ass.id);
                                      const status = ass.submissionStatus || (sub ? (sub.status === 'GRADED' ? 'GRADED' : 'SUBMITTED') : 'NOT_SUBMITTED');
                                      let atts = [];
                                      if (ass.attachmentsJson) {
                                        try { atts = JSON.parse(ass.attachmentsJson); } catch {}
                                      }
                                      if ((!atts || atts.length === 0) && ass.attachmentFileUrl) {
                                        atts = [{ fileName: ass.attachmentFileName || 'Tệp đính kèm', fileUrl: ass.attachmentFileUrl }];
                                      }

                                      return (
                                        <div key={ass.id} className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-lg space-y-2">
                                          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                                            <div className="space-y-1">
                                              <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-gray-800">{ass.title}</span>
                                                {status === 'GRADED' && (
                                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                                                    Đã chấm: {ass.submissionScore != null ? ass.submissionScore : sub?.score} đ
                                                  </span>
                                                )}
                                                {status === 'SUBMITTED' && (
                                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded border border-blue-300">
                                                    Đã nộp bài
                                                  </span>
                                                )}
                                                {status === 'DRAFT' && (
                                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded border border-amber-300">
                                                    Bản nháp
                                                  </span>
                                                )}
                                                {status === 'NOT_SUBMITTED' && (
                                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 rounded border border-red-300">
                                                    Chưa nộp
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                Hạn nộp: <b>{formatDateTime(ass.dueDate)}</b>
                                              </div>
                                            </div>

                                            <button
                                              onClick={() => openSubmitModal(ass)}
                                              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs self-start sm:self-auto ${
                                                status === 'DRAFT'
                                                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                                  : (status === 'SUBMITTED' || status === 'GRADED')
                                                  ? 'bg-slate-700 hover:bg-slate-800 text-white'
                                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                                              }`}>
                                              {status === 'DRAFT'
                                                ? 'Tiếp tục làm bài (Nháp)'
                                                : (status === 'SUBMITTED' || status === 'GRADED')
                                                ? 'Xem lại bài đã nộp'
                                                : 'Làm bài tập này'}
                                            </button>
                                          </div>

                                          <CollapsibleDescription text={ass.description} textClassName="text-xs text-gray-600" />

                                          {atts && atts.length > 0 && (
                                            <div className="pt-1 flex flex-wrap items-center gap-1.5">
                                              <span className="text-[11px] text-slate-500 font-medium">Tệp đính kèm ({atts.length}):</span>
                                              {atts.map((att, aIdx) => (
                                                <a
                                                  key={aIdx}
                                                  href={att.fileUrl}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-white hover:bg-blue-50 border border-blue-200 px-2 py-0.5 rounded transition"
                                                >
                                                  <span>📎</span>
                                                  <span className="truncate max-w-[180px]">{att.fileName || `Tệp ${aIdx + 1}`}</span>
                                                </a>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* PHẦN 2: BUỔI HỌC ĐÃ HỌC */}
                {pastStudentSessions.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-slate-200">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Buổi học đã học ({pastStudentSessions.length})
                    </h3>

                    <div className="space-y-4">
                      {pastStudentSessions.map((item, idx) => {
                        const isAbsent = item.attendanceStatus === 'ABSENT';

                        return (
                          <div key={item.sessionId || idx} className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden opacity-90">
                            {/* Header của Buổi học */}
                            <div className="p-4 bg-slate-100/70 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-600 text-white rounded">
                                    {item.className}
                                  </span>
                                  {item.classCode && (
                                    <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                      Mã: {item.classCode}
                                    </span>
                                  )}
                                  <h3 className="font-bold text-gray-800 text-base">
                                    {item.topic || 'Buổi học'}
                                  </h3>
                                  <span className="text-xs font-medium px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                                    Đã học
                                  </span>
                                  {isAbsent && (
                                    <span className="text-xs font-bold px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded">
                                      Đã báo vắng
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                  <span>Bắt đầu: <b className="text-gray-700">{formatDateTime(item.startTime)}</b></span>
                                  <span>Thời lượng: <b className="text-gray-700">{item.durationMinutes ? `${item.durationMinutes} phút` : '90 phút'}</b></span>
                                </div>
                                {item.attendanceNote && (
                                  <div className="text-xs text-rose-600 mt-1">
                                    Lý do: {item.attendanceNote}
                                  </div>
                                )}
                              </div>

                              {/* Nút thao tác nhanh của buổi học */}
                              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                                {item.assignments && item.assignments.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleGoToAssignment(item)}
                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer shadow-xs">
                                    {item.homeworkStatus === 'DRAFT' ? 'Tiếp tục làm bài (Bản nháp)' : item.homeworkStatus === 'SUBMITTED' || item.homeworkStatus === 'GRADED' ? 'Xem lại bài đã nộp' : 'Làm bài tập'}
                                  </button>
                                )}

                                {isAbsent && (
                                  <span className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 rounded-lg border border-slate-200">
                                    Đã vắng
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Chi tiết học phần (Nội dung, Sách, Chuẩn bị gì) */}
                            <div className="p-4 space-y-4">
                              {item.sections && item.sections.length > 0 ? (
                                <div className="space-y-3">
                                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    Nội dung chi tiết & Dặn dò chuẩn bị
                                  </h4>
                                  <div className="grid grid-cols-1 gap-3">
                                    {item.sections.map((sec, sIdx) => (
                                      <div key={sec.id || sIdx} className="p-3.5 bg-gray-50/70 border border-gray-200 rounded-lg space-y-2">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5">
                                          <div className="font-bold text-gray-800 text-sm">
                                            Phần {sIdx + 1}: {sec.content}
                                          </div>
                                          <div className="text-xs text-gray-500 font-medium">
                                            Thời gian: {sec.timeAllocation || `${sec.durationMinutes || 15} phút`}
                                          </div>
                                        </div>

                                        {sec.activity && (
                                          <div className="text-xs text-purple-700 font-medium">
                                            Hoạt động trên lớp: <span className="font-semibold">{sec.activity}</span>
                                          </div>
                                        )}

                                        {/* DẶN DÒ HỌC SINH CẦN CHUẨN BỊ GÌ */}
                                        {sec.studentPreparation && (
                                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 leading-relaxed">
                                            <span className="font-bold text-amber-800 block mb-0.5">Học sinh cần chuẩn bị:</span>
                                            {sec.studentPreparation}
                                          </div>
                                        )}

                                        {/* Tài liệu Handout */}
                                        {sec.handoutType === 'TEXT' && sec.handoutText && (
                                          <div>
                                            <button
                                              onClick={() => setViewingHandoutText(sec.handoutText)}
                                              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer">
                                              Xem văn bản bài học đã dán
                                            </button>
                                          </div>
                                        )}
                                        {sec.handoutType === 'FILE' && sec.handoutFilePath && (
                                          <div>
                                            <a
                                              href={sec.handoutFilePath}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded hover:bg-emerald-100">
                                              Tải tài liệu: {sec.handoutFileName || 'Tệp đính kèm'}
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400 italic py-2">
                                  Chưa có kế hoạch chi tiết cho buổi học này.
                                </div>
                              )}

                              {/* BÀI TẬP CỦA BUỔI HỌC */}
                              {item.assignments && item.assignments.length > 0 && (
                                <div className="pt-3 border-t border-gray-100 space-y-2">
                                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    Bài tập liên kết với buổi học này ({item.assignments.length})
                                  </h4>
                                  <div className="space-y-2.5">
                                    {item.assignments.map((ass) => {
                                      const sub = ass.submission || submissions.find(s => s.assignmentId === ass.id);
                                      const status = ass.submissionStatus || (sub ? (sub.status === 'GRADED' ? 'GRADED' : 'SUBMITTED') : 'NOT_SUBMITTED');
                                      let atts = [];
                                      if (ass.attachmentsJson) {
                                        try { atts = JSON.parse(ass.attachmentsJson); } catch {}
                                      }
                                      if ((!atts || atts.length === 0) && ass.attachmentFileUrl) {
                                        atts = [{ fileName: ass.attachmentFileName || 'Tệp đính kèm', fileUrl: ass.attachmentFileUrl }];
                                      }

                                      return (
                                        <div key={ass.id} className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-lg space-y-2">
                                          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                                            <div className="space-y-1">
                                              <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-gray-800">{ass.title}</span>
                                                {status === 'GRADED' && (
                                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                                                    Đã chấm: {ass.submissionScore != null ? ass.submissionScore : sub?.score} đ
                                                  </span>
                                                )}
                                                {status === 'SUBMITTED' && (
                                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded border border-blue-300">
                                                    Đã nộp bài
                                                  </span>
                                                )}
                                                {status === 'DRAFT' && (
                                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded border border-amber-300">
                                                    Bản nháp
                                                  </span>
                                                )}
                                                {status === 'NOT_SUBMITTED' && (
                                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 rounded border border-red-300">
                                                    Chưa nộp
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                Hạn nộp: <b>{formatDateTime(ass.dueDate)}</b>
                                              </div>
                                            </div>

                                            <button
                                              onClick={() => openSubmitModal(ass)}
                                              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs self-start sm:self-auto ${
                                                status === 'DRAFT'
                                                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                                  : (status === 'SUBMITTED' || status === 'GRADED')
                                                  ? 'bg-slate-700 hover:bg-slate-800 text-white'
                                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                                              }`}>
                                              {status === 'DRAFT'
                                                ? 'Tiếp tục làm bài (Nháp)'
                                                : (status === 'SUBMITTED' || status === 'GRADED')
                                                ? 'Xem lại bài đã nộp'
                                                : 'Làm bài tập này'}
                                            </button>
                                          </div>

                                          <CollapsibleDescription text={ass.description} textClassName="text-xs text-gray-600" />

                                          {atts && atts.length > 0 && (
                                            <div className="pt-1 flex flex-wrap items-center gap-1.5">
                                              <span className="text-[11px] text-slate-500 font-medium">Tệp đính kèm ({atts.length}):</span>
                                              {atts.map((att, aIdx) => (
                                                <a
                                                  key={aIdx}
                                                  href={att.fileUrl}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-white hover:bg-blue-50 border border-blue-200 px-2 py-0.5 rounded transition"
                                                >
                                                  <span>📎</span>
                                                  <span className="truncate max-w-[180px]">{att.fileName || `Tệp ${aIdx + 1}`}</span>
                                                </a>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DANH SÁCH LỚP HỌC CỦA TÔI */}
        {!loading && activeTab === 'classes' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Lớp Học Đã Tham Gia</h2>
                <p className="text-xs text-gray-500 mt-0.5">Danh sách các lớp bạn đã ghi danh qua mã lớp</p>
              </div>
              <button
                onClick={() => { setIsJoinModalOpen(true); setJoinError(''); }}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition cursor-pointer shadow-xs text-center">
                + Tham Gia Thêm Lớp Mới
              </button>
            </div>

            {enrolledClasses.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 text-center shadow-xs">
                <h4 className="font-bold text-gray-700 text-sm mb-1">Bạn chưa tham gia lớp học nào</h4>
                <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
                  Hãy hỏi giáo viên Mã Lớp (Class Code) và bấm nút bên dưới để tham gia.
                </p>
                <button
                  onClick={() => setIsJoinModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs">
                  Nhập Mã Lớp Học
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {enrolledClasses.map((cls) => (
                  <div key={cls.id} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded">
                        Mã: {cls.classCode || `#${cls.id}`}
                      </span>
                      <span className="text-xs text-emerald-600 font-semibold">Đang học</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-base">{cls.name}</h3>
                      <div className="text-xs text-gray-500 mt-1">
                        Thời gian: {cls.startDate || '—'} → {cls.endDate || '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CẨM NANG HƯỚNG DẪN DÀNH CHO HỌC SINH */}
        {activeTab === 'guide' && (
          <StudentGuide />
        )}
      </main>

      {/* MODAL THAM GIA LỚP BẰNG MÃ */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 sm:p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Tham Gia Lớp Học</h3>
            <p className="text-xs text-gray-500 mb-4">
              Nhập mã lớp học (6 ký tự viết hoa/số) do giáo viên cung cấp để tham gia vào lớp.
            </p>

            {joinError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium mb-4">
                {joinError}
              </div>
            )}

            <form onSubmit={handleJoinClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mã lớp học <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={classCodeInput}
                  onChange={(e) => setClassCodeInput(e.target.value.toUpperCase())}
                  placeholder="VD: DJ4FHF"
                  maxLength={10}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase tracking-widest font-mono font-bold text-center focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="px-4 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={joining}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg cursor-pointer shadow-xs">
                  {joining ? 'Đang kiểm tra mã...' : 'Vào Lớp Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NỘP BÀI TẬP (VĂN BẢN, DOCX, AUDIO, GHI ÂM TRỰC TIẾP) */}
      {activeAssignmentToSubmit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg my-6 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 bg-[#0f172b] text-white flex justify-between items-start">
              <div>
                <h4 className="text-base font-bold truncate max-w-sm">
                  {activeAssignmentToSubmit.title}
                </h4>
                <div className="text-xs text-slate-300 mt-1">
                  Hạn nộp: {formatDateTime(activeAssignmentToSubmit.dueDate)}
                </div>
              </div>
              <button
                onClick={() => setActiveAssignmentToSubmit(null)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAssignment} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {submissionSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold">
                  {submissionSuccessMsg}
                </div>
              )}

              {/* Mô tả đề bài */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
                <span className="font-bold text-slate-700 block">Yêu cầu bài tập:</span>
                <CollapsibleDescription text={activeAssignmentToSubmit.description || 'Không có mô tả chi tiết'} textClassName="text-slate-600 text-xs" />
                {(() => {
                  let atts = [];
                  if (activeAssignmentToSubmit.attachmentsJson) {
                    try { atts = JSON.parse(activeAssignmentToSubmit.attachmentsJson); } catch {}
                  }
                  if ((!atts || atts.length === 0) && activeAssignmentToSubmit.attachmentFileUrl) {
                    atts = [{
                      fileName: activeAssignmentToSubmit.attachmentFileName || 'Tệp bài giảng',
                      fileUrl: activeAssignmentToSubmit.attachmentFileUrl
                    }];
                  }
                  if (!atts || atts.length === 0) return null;
                  return (
                    <div className="pt-2 border-t border-slate-200 space-y-1.5">
                      <span className="font-bold text-slate-700 block">
                        Tệp đính kèm của giáo viên ({atts.length}):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {atts.map((att, idx) => (
                          <a
                            key={idx}
                            href={att.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-white hover:bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg transition shadow-2xs"
                          >
                            <span className="truncate max-w-[240px]">{att.fileName || `Tệp ${idx + 1}`}</span>
                            <span className="text-[10px] text-blue-400">↗</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* KẾT QUẢ CHẤM BÀI & NHẬN XÉT CỦA GIÁO VIÊN (NẾU ĐÃ NỘP HOẶC ĐÃ ĐƯỢC CHẤM) */}
              {(() => {
                const existingSubmission = submissions.find(s => s.assignmentId === activeAssignmentToSubmit.id);
                if (!existingSubmission) return null;

                const isGraded = existingSubmission.status === 'GRADED' || (existingSubmission.score !== null && existingSubmission.score !== undefined);

                return (
                  <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/40 border border-blue-200 rounded-xl space-y-3.5 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div>
                          <h5 className="font-bold text-xs sm:text-sm text-slate-800">
                            {isGraded ? 'Kết Quả Đánh Giá & Nhận Xét' : 'Trạng Thái Bài Nộp Của Bạn'}
                          </h5>
                          <span className="text-[11px] text-slate-500">
                            {isGraded ? 'Giáo viên đã chấm điểm và nhận xét chi tiết' : 'Đã nộp bài, đang chờ giáo viên chấm điểm'}
                          </span>
                        </div>
                      </div>

                      {isGraded ? (
                        <span className="px-3 py-1 bg-emerald-600 text-white font-bold text-xs rounded-full shadow-2xs">
                          Điểm: {existingSubmission.score} / 10
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-semibold text-[11px] rounded-full border border-amber-200">
                          Chờ chấm điểm
                        </span>
                      )}
                    </div>

                    {/* Bản sửa âm thanh & Nhận xét timestamp từ giáo viên */}
                    {existingSubmission.feedback && (
                      <StudentFeedbackAudioPlayer rawFeedback={existingSubmission.feedback} />
                    )}

                    {/* Xem lại nội dung học sinh đã nộp */}
                    <div className="pt-1 space-y-1 text-xs">
                      <span className="font-bold text-slate-600 block">Nội dung bạn đã nộp:</span>
                      {existingSubmission.textContent && (
                        <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 whitespace-pre-wrap font-mono text-[11px]">
                          {existingSubmission.textContent}
                        </div>
                      )}
                      {existingSubmission.fileUrl && (
                        <div className="p-2 bg-white border border-slate-200 rounded-lg space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-700 truncate max-w-[200px]">Tệp đính kèm: {existingSubmission.fileName || 'Tệp bài làm'}</span>
                            <a href={existingSubmission.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                              Tải về / Mở tệp ↗
                            </a>
                          </div>
                          {(existingSubmission.submissionType === 'AUDIO' || existingSubmission.submissionType === 'DIRECT_RECORD' || (existingSubmission.fileUrl && /\.(mp3|wav|m4a|webm|ogg)$/i.test(existingSubmission.fileUrl))) && (
                            <audio controls src={existingSubmission.fileUrl} className="w-full h-8" />
                          )}
                          {existingSubmission.submissionType === 'IMAGE' && (
                            <img src={existingSubmission.fileUrl} alt="Bài làm đã nộp" className="max-h-48 rounded object-contain border border-slate-100 mx-auto" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Nút hủy / xóa bài đã nộp dành cho học sinh nếu chưa chấm điểm */}
                    {!isGraded && (
                      <div className="pt-2.5 border-t border-blue-100 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500 italic">
                          Bạn có thể xóa bài này để nộp lại bài khác nếu cần chỉnh sửa.
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubmission(existingSubmission.id)}
                          disabled={isDeletingSubmission}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer disabled:opacity-50 shadow-2xs shrink-0">
                          <span>{isDeletingSubmission ? 'Đang xóa...' : 'Xóa bài đã nộp'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Thông báo chính sách lưu trữ bài làm 2 tuần */}
              <div className="p-2 bg-amber-50/90 border border-amber-200/80 rounded-lg text-xs text-amber-900">
                <b>Lưu ý lưu trữ:</b> Bài làm đã nộp được lưu giữ trong <b>2 tuần</b> (tuần trước & tuần này) để tối ưu lưu trữ hệ thống.
              </div>

              {/* Chọn phương thức nộp bài (chỉ hiện các phương thức được giáo viên cho phép) */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700">
                    {submissions.some(s => s.assignmentId === activeAssignmentToSubmit.id) ? 'Nộp lại / Cập nhật bài làm:' : 'Chọn định dạng nộp bài:'}
                  </label>
                </div>
                {(() => {
                  const rawAllowed = (activeAssignmentToSubmit.allowedSubmissionTypes || 'TEXT,DOCX,AUDIO,DIRECT_RECORD,IMAGE')
                    .split(',')
                    .map(s => s.trim().toUpperCase())
                    .filter(Boolean);
                  const allowedModes = rawAllowed.length > 0 ? rawAllowed : ['TEXT', 'DOCX', 'AUDIO', 'DIRECT_RECORD', 'IMAGE'];

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {allowedModes.includes('TEXT') && (
                        <button
                          type="button"
                          onClick={() => setSelectedSubmissionMode('TEXT')}
                          className={`py-2 px-1 text-center rounded-lg text-xs font-semibold border cursor-pointer transition ${
                            selectedSubmissionMode === 'TEXT' ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}>
                          Văn bản
                        </button>
                      )}
                      {allowedModes.includes('DOCX') && (
                        <button
                          type="button"
                          onClick={() => setSelectedSubmissionMode('DOCX')}
                          className={`py-2 px-1 text-center rounded-lg text-xs font-semibold border cursor-pointer transition ${
                            selectedSubmissionMode === 'DOCX' ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}>
                          Tệp Docx
                        </button>
                      )}
                      {allowedModes.includes('AUDIO') && (
                        <button
                          type="button"
                          onClick={() => setSelectedSubmissionMode('AUDIO')}
                          className={`py-2 px-1 text-center rounded-lg text-xs font-semibold border cursor-pointer transition ${
                            selectedSubmissionMode === 'AUDIO' ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}>
                          File Audio
                        </button>
                      )}
                      {allowedModes.includes('DIRECT_RECORD') && (
                        <button
                          type="button"
                          onClick={() => setSelectedSubmissionMode('DIRECT_RECORD')}
                          className={`py-2 px-1 text-center rounded-lg text-xs font-semibold border cursor-pointer transition ${
                            selectedSubmissionMode === 'DIRECT_RECORD' ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}>
                          Thu âm ngay
                        </button>
                      )}
                      {allowedModes.includes('IMAGE') && (
                        <button
                          type="button"
                          onClick={() => setSelectedSubmissionMode('IMAGE')}
                          className={`py-2 px-1 text-center rounded-lg text-xs font-semibold border cursor-pointer transition ${
                            selectedSubmissionMode === 'IMAGE' ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}>
                          Ảnh / Chụp ảnh
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* PHƯƠNG THỨC 1: VĂN BẢN TRỰC TIẾP */}
              {selectedSubmissionMode === 'TEXT' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nhập nội dung bài làm của bạn:
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder="Nhập nội dung trả lời câu hỏi tại đây..."
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* PHƯƠNG THỨC 2: TẢI TỆP WORD (DOCX) */}
              {selectedSubmissionMode === 'DOCX' && (
                <div className="space-y-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tải tệp Word bài làm (.docx, .doc):
                  </label>
                  <input
                    type="file"
                    accept=".docx,.doc,.pdf"
                    onChange={(e) => handleFileUpload(e, 'DOCX')}
                    className="text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 cursor-pointer"
                  />
                  {uploadingFile && <div className="text-xs text-blue-600">Đang tải file lên...</div>}
                  {uploadedFileData.fileName && (
                    <div className="text-xs text-emerald-700 font-semibold mt-1">
                      ✓ Đã đính kèm: {uploadedFileData.fileName}
                    </div>
                  )}
                </div>
              )}

              {/* PHƯƠNG THỨC 3: TẢI FILE ÂM THANH (AUDIO) */}
              {selectedSubmissionMode === 'AUDIO' && (
                <div className="space-y-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tải tệp âm thanh (.mp3, .wav, .m4a):
                  </label>
                  <input
                    type="file"
                    accept="audio/*,.mp3,.wav,.m4a,.webm"
                    onChange={(e) => handleFileUpload(e, 'AUDIO')}
                    className="text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 cursor-pointer"
                  />
                  {uploadingFile && <div className="text-xs text-blue-600">Đang tải file âm thanh lên...</div>}
                  {uploadedFileData.fileUrl && (
                    <div className="pt-2 space-y-1">
                      <span className="text-xs text-emerald-700 font-semibold block">
                        ✓ Đã đính kèm: {uploadedFileData.fileName}
                      </span>
                      <audio controls src={uploadedFileData.fileUrl} className="w-full h-8" />
                    </div>
                  )}
                </div>
              )}

              {/* PHƯƠNG THỨC 4: THU ÂM TRỰC TIẾP TRÊN TRÌNH DUYỆT */}
              {selectedSubmissionMode === 'DIRECT_RECORD' && (
                <AudioRecorder
                  onRecordingUploaded={({ fileUrl, fileName }) => {
                    setUploadedFileData({ fileUrl, fileName });
                  }}
                />
              )}

              {/* PHƯƠNG THỨC 5: HÌNH ẢNH / CHỤP ẢNH NỘP BÀI */}
              {selectedSubmissionMode === 'IMAGE' && (
                <div className="space-y-3 p-3.5 bg-gray-50 border border-gray-200 rounded-lg">
                  <label className="block text-xs font-semibold text-gray-700">
                    Nộp bài bằng Hình ảnh / Bản chụp bài làm:
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-3 py-2 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-700 cursor-pointer shadow-2xs flex items-center transition">
                      Tải ảnh từ máy (.jpg, .png)
                      <input
                        type="file"
                        accept="image/*,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'IMAGE')}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && mobileCameraInputRef.current) {
                          mobileCameraInputRef.current.click();
                        } else {
                          startCamera();
                        }
                      }}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-2xs flex items-center transition">
                      Chụp ảnh nộp bài
                    </button>

                    <input
                      type="file"
                      ref={mobileCameraInputRef}
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'IMAGE')}
                    />
                  </div>

                  {/* Khung chụp ảnh Webcam nếu mở trực tiếp trên máy tính */}
                  {isCameraActive && (
                    <div className="p-3 bg-[#0f172b] rounded-xl space-y-2 text-center animate-fade-in">
                      <div className="relative rounded-lg overflow-hidden max-w-md mx-auto bg-black">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-auto max-h-72 object-contain mx-auto"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                      </div>
                      <div className="flex justify-center items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer flex items-center">
                          Bấm chụp ảnh này
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg cursor-pointer">
                          Tắt camera
                        </button>
                      </div>
                    </div>
                  )}

                  {cameraError && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                      {cameraError}
                    </div>
                  )}

                  {uploadingFile && <div className="text-xs text-blue-600 font-semibold">Đang tải ảnh lên hệ thống...</div>}

                  {uploadedFileData.fileUrl && (
                    <div className="pt-2 space-y-2">
                      <div className="text-xs text-emerald-700 font-semibold flex items-center justify-between">
                        <span>✓ Đã đính kèm ảnh: {uploadedFileData.fileName}</span>
                        <a
                          href={uploadedFileData.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline">
                          Xem ảnh gốc ↗
                        </a>
                      </div>
                      <div className="p-2 bg-white border border-gray-200 rounded-lg text-center">
                        <img
                          src={uploadedFileData.fileUrl}
                          alt="Bản chụp bài nộp"
                          className="max-h-60 max-w-full rounded object-contain mx-auto border border-gray-100 shadow-2xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {draftSavedNotice && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-semibold text-center animate-in fade-in">
                  {draftSavedNotice}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg cursor-pointer transition shadow-2xs">
                  Lưu bản nháp (chưa nộp)
                </button>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={closeSubmitModal}
                    className="px-4 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg cursor-pointer shadow-xs">
                    {submitting ? 'Đang nộp bài...' : 'Xác Nhận Nộp Bài'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XEM HANDOUT TEXT */}
      {viewingHandoutText && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-5">
            <h4 className="text-sm font-bold text-gray-800 mb-2">Nội Dung Văn Bản Bài Học</h4>
            <div className="max-h-80 overflow-y-auto p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono whitespace-pre-wrap text-gray-800 leading-relaxed">
              {viewingHandoutText}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setViewingHandoutText(null)}
                className="px-4 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BÁO VẮNG */}
      {selectedSessionForAbsence && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 bg-rose-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-rose-800">Xác nhận báo vắng buổi học</h3>
                <p className="text-xs text-rose-600 mt-0.5">
                  {selectedSessionForAbsence.className} - {selectedSessionForAbsence.topic}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSessionForAbsence(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitAbsence} className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <p className="font-semibold mb-1">Quy định báo vắng:</p>
                <p>Học sinh phải báo vắng trước giờ bắt đầu buổi học ít nhất 2 tiếng. Lý do xin phép vắng sẽ được tự động chuyển đến giáo viên phụ trách.</p>
                <p className="mt-1.5 font-bold text-amber-900">{getAbsenceRemainingNotice(selectedSessionForAbsence)}</p>
              </div>

              {absenceError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
                  {absenceError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lý do xin phép vắng <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  placeholder="Ví dụ: Em bị ốm, gia đình có việc bận đột xuất..."
                  className="w-full text-sm p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedSessionForAbsence(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAbsence}
                  className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isSubmittingAbsence ? 'Đang gửi...' : 'Xác nhận báo vắng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CÀI ĐẶT TÀI KHOẢN TOÀN DIỆN */}
      <AccountSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        user={user}
        onUserUpdated={(updated) => {
          if (updateUser) updateUser(updated);
        }}
        enrolledClasses={enrolledClasses}
        onLeaveClassSuccess={async () => {
          await loadData();
        }}
        onLogout={logout}
      />
    </div>
  );
}
