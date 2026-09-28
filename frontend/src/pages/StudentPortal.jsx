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
import StudentInquiryWidget from '../Components/StudentInquiryWidget';
import ClassAnnouncementBoard from '../Components/ClassAnnouncementBoard';
import SubmissionFeedbackThread from '../Components/SubmissionFeedbackThread';
import MistakeNotebookModal from '../Components/MistakeNotebookModal';
import LinkifiedText from '../Components/LinkifiedText';
import { ThemeLanguageToggle, useThemeLanguage } from '../context/ThemeLanguageContext';
import { MegaphoneIcon, PaperclipIcon, GlobeIcon, XCircleIcon, XIcon, CheckCircleIcon, ClockIcon, AlertTriangleIcon, LockIcon, ExternalLinkIcon } from '../Components/Icons';

export default function StudentPortal() {
  const { user, logout, updateUser } = useAuth();
  const { toast, confirm } = useToast();
  const { t, lang } = useThemeLanguage();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isMistakeNotebookOpen, setIsMistakeNotebookOpen] = useState(false);
  const [selectedAnnouncementClassId, setSelectedAnnouncementClassId] = useState(null);

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

  // Báo vắng & Xin học Online states
  const [selectedSessionForAbsence, setSelectedSessionForAbsence] = useState(null);
  const [absenceType, setAbsenceType] = useState('ONLINE'); // 'ONLINE' | 'ABSENT'
  const [absenceReason, setAbsenceReason] = useState('');
  const [absenceError, setAbsenceError] = useState('');
  const [isSubmittingAbsence, setIsSubmittingAbsence] = useState(false);
  const [commitments, setCommitments] = useState({
    docReviewed: false,
    homeworkCompleted: false,
    learningImpactUnderstood: false
  });

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

  // Theo dõi các buổi học đã được học sinh xem tin tức (thông báo đột xuất hoặc dặn dò)
  const [viewedNewsKeys, setViewedNewsKeys] = useState(() => {
    try {
      const saved = localStorage.getItem('viewed_session_news_keys');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const getSessionNewsKey = (session) => {
    if (!session) return '';
    const sId = session.sessionId || session.id;
    const ann = session.announcement ? session.announcement.trim() : '';
    const annTime = session.announcementUpdatedAt ? new Date(session.announcementUpdatedAt).getTime() : '';
    const hasPrep = Boolean(
      (session.sections && session.sections.some(s => s.studentPreparation && s.studentPreparation.trim())) ||
      (session.studentPreparation && session.studentPreparation.trim())
    );
    const prep = hasPrep ? 'prep' : '';
    return `${sId}_${ann}_${annTime}_${prep}`;
  };

  const markNewsAsViewed = (session) => {
    if (!session) return;
    const key = getSessionNewsKey(session);
    setViewedNewsKeys(prev => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      try {
        localStorage.setItem('viewed_session_news_keys', JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  const isNewsUnviewed = (session) => {
    if (!session) return false;
    const hasAnnouncement = Boolean(session.announcement && session.announcement.trim());
    const hasPrep = Boolean(
      (session.sections && session.sections.some(s => s.studentPreparation && s.studentPreparation.trim())) ||
      (session.studentPreparation && session.studentPreparation.trim())
    );
    if (!hasAnnouncement && !hasPrep) return false;
    const key = getSessionNewsKey(session);
    return !viewedNewsKeys.has(key);
  };

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
      setJoinError(err.response?.data?.message || err.message || (lang === 'en' ? 'Invalid class code or class does not exist.' : 'Mã lớp không hợp lệ hoặc lớp không tồn tại.'));
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
        const isOverdue = !sub && fullAss.dueDate && new Date(fullAss.dueDate) < new Date();
        if (sub) {
          if (sub.status === 'GRADED' || (sub.score !== null && sub.score !== undefined)) {
            asgnStatus = 'GRADED';
            asgnScore = sub.score;
          } else {
            asgnStatus = 'SUBMITTED';
          }
        } else if (isOverdue) {
          asgnStatus = 'OVERDUE';
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
          submissionScore: asgnScore,
          isOverdue
        };
      });

      const isSessionOverdue = enrichedAssignments.some(a => a.isOverdue || a.submissionStatus === 'OVERDUE');

      if (enrichedAssignments.length > 0) {
        const hasOverdue = enrichedAssignments.some(a => a.submissionStatus === 'OVERDUE');
        const hasGraded = enrichedAssignments.some(a => a.submissionStatus === 'GRADED');
        const hasSubmitted = enrichedAssignments.some(a => a.submissionStatus === 'SUBMITTED');
        const hasDraft = enrichedAssignments.some(a => a.submissionStatus === 'DRAFT');

        if (hasOverdue) {
          homeworkStatus = 'OVERDUE';
        } else if (hasGraded) {
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
        homeworkScore,
        isOverdue: isSessionOverdue
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
            setDraftSavedNotice(lang === 'en' ? 'Previously saved draft has been automatically reloaded.' : 'Đã tự động tải lại bản nháp bạn đã lưu trước đó.');
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
      setDraftSavedNotice(lang === 'en' ? 'Draft saved successfully!' : 'Đã lưu bản nháp thành công!');
      setTimeout(() => setDraftSavedNotice(''), 3500);
      // Buộc cập nhật trạng thái thời khóa biểu
      setSchedule(prev => [...prev]);
      toast.success(lang === 'en' ? 'Draft saved!' : 'Đã lưu bản nháp bài làm!');
    } catch {
      toast.error(lang === 'en' ? 'Could not save draft to browser storage.' : 'Không thể lưu bản nháp vào bộ nhớ trình duyệt.');
    }
  };

  // Tự động lưu bản nháp bài tập định kỳ 3 giây khi học sinh đang chỉnh sửa
  useEffect(() => {
    if (!activeAssignmentToSubmit || !user?.id) return;
    if (!submissionText && !uploadedFileData?.fileUrl) return;

    const timer = setTimeout(() => {
      try {
        const draftData = {
          selectedSubmissionMode,
          submissionText,
          uploadedFileData,
          savedAt: new Date().toISOString()
        };
        localStorage.setItem(`draft_asgn_${user.id}_${activeAssignmentToSubmit.id}`, JSON.stringify(draftData));
        setDraftSavedNotice(t('draftSaved') || 'Bản nháp được tự động lưu.');
      } catch {}
    }, 3000);

    return () => clearTimeout(timer);
  }, [activeAssignmentToSubmit, selectedSubmissionMode, submissionText, uploadedFileData, user?.id, t]);

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
        throw new Error(lang === 'en' ? 'Browser does not support direct camera access.' : 'Trình duyệt không hỗ trợ mở camera trực tiếp.');
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
      setCameraError(lang === 'en' ? ('Cannot open camera: ' + (err.message || 'Please grant camera permissions in your browser')) : ('Không thể mở camera: ' + (err.message || 'Vui lòng cấp quyền truy cập camera trong trình duyệt')));
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
        toast.success(lang === 'en' ? 'Photo captured successfully!' : 'Đã chụp ảnh bài làm thành công!');
      } catch (err) {
        toast.error(lang === 'en' ? ('Error uploading photo: ' + (err.response?.data?.message || err.message)) : ('Lỗi tải ảnh chụp lên máy chủ: ' + (err.response?.data?.message || err.message)));
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
        toast.warning(lang === 'en' ? 'Invalid file format! Please upload document files only (.docx, .doc, .pdf)' : 'Định dạng tệp không hợp lệ! Vui lòng chỉ tải lên tệp tài liệu (.docx, .doc, .pdf)');
        e.target.value = '';
        return;
      }
    } else if (type === 'AUDIO') {
      if (!lowerName.endsWith('.mp3') && !lowerName.endsWith('.wav') && !lowerName.endsWith('.m4a') && !lowerName.endsWith('.webm') && !lowerName.endsWith('.ogg')) {
        toast.warning(lang === 'en' ? 'Invalid file format! Please upload audio files only (.mp3, .wav, .m4a, .webm)' : 'Định dạng tệp không hợp lệ! Vui lòng chỉ tải lên tệp âm thanh (.mp3, .wav, .m4a, .webm)');
        e.target.value = '';
        return;
      }
    } else if (type === 'IMAGE') {
      if (!lowerName.endsWith('.jpg') && !lowerName.endsWith('.jpeg') && !lowerName.endsWith('.png') && !lowerName.endsWith('.webp') && !lowerName.endsWith('.gif') && !lowerName.endsWith('.heic')) {
        toast.warning(lang === 'en' ? 'Invalid file format! Please upload image files only (.jpg, .jpeg, .png, .webp)' : 'Định dạng tệp không hợp lệ! Vui lòng chỉ tải lên tệp hình ảnh (.jpg, .jpeg, .png, .webp)');
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
      toast.success(lang === 'en' ? `Uploaded file "${res.fileName || file.name}"` : `Đã tải lên tệp "${res.fileName || file.name}"`);
    } catch (err) {
      toast.error(lang === 'en' ? ('Error uploading file: ' + (err.response?.data?.message || err.message)) : ('Lỗi tải tệp lên: ' + (err.response?.data?.message || err.message)));
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!activeAssignmentToSubmit) return;

    if (activeAssignmentToSubmit.dueDate && new Date(activeAssignmentToSubmit.dueDate) < new Date()) {
      toast.error(lang === 'en' ? 'Submission deadline has passed. You cannot submit or modify this assignment.' : 'Đã quá hạn nộp bài tập. Bạn không thể nộp hoặc chỉnh sửa bài làm sau thời hạn quy định.');
      return;
    }

    try {
      setSubmitting(true);
      const rawAllowed = (activeAssignmentToSubmit.allowedSubmissionTypes || 'TEXT,DOCX,AUDIO,DIRECT_RECORD,IMAGE')
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
      const allowed = rawAllowed.length > 0 ? rawAllowed : ['TEXT', 'DOCX', 'AUDIO', 'DIRECT_RECORD', 'IMAGE'];

      if (!allowed.includes(selectedSubmissionMode)) {
        toast.error(lang === 'en' ? `Submission mode '${selectedSubmissionMode}' is not permitted by teacher! Allowed modes: ${allowed.join(', ')}` : `Hình thức nộp '${selectedSubmissionMode}' không được giáo viên cho phép! Các hình thức được phép: ${allowed.join(', ')}`);
        return;
      }

      const payload = {
        submissionType: selectedSubmissionMode,
        textContent: selectedSubmissionMode === 'TEXT' ? submissionText : null,
        fileUrl: selectedSubmissionMode !== 'TEXT' ? uploadedFileData.fileUrl : null,
        fileName: selectedSubmissionMode !== 'TEXT' ? uploadedFileData.fileName : null
      };

      if (selectedSubmissionMode === 'TEXT' && !submissionText.trim()) {
        toast.warning(lang === 'en' ? 'Please enter text content for your submission!' : 'Vui lòng nhập nội dung văn bản bài làm!');
        return;
      }
      if (selectedSubmissionMode !== 'TEXT' && !uploadedFileData.fileUrl) {
        toast.warning(lang === 'en' ? 'Please upload, capture, or record your submission file before submitting!' : 'Vui lòng tải lên hoặc chụp ảnh/thu âm tệp bài làm trước khi nộp!');
        return;
      }

      await submissionApi.submit(activeAssignmentToSubmit.id, user.id, payload);
      // Xóa bản nháp sau khi đã nộp thành công
      try {
        localStorage.removeItem(`draft_asgn_${user.id}_${activeAssignmentToSubmit.id}`);
      } catch {}

      toast.success(lang === 'en' ? 'Assignment submitted successfully!' : 'Đã nộp bài tập thành công!');
      setSubmissionSuccessMsg(lang === 'en' ? 'Assignment submitted successfully!' : 'Đã nộp bài tập thành công!');
      await loadData();
      setTimeout(() => {
        closeSubmitModal();
      }, 1200);
    } catch (err) {
      toast.error(lang === 'en' ? ('Error submitting assignment: ' + (err.response?.data?.message || err.message)) : ('Lỗi khi nộp bài tập: ' + (err.response?.data?.message || err.message)));
    } finally {
      setSubmitting(false);
    }
  };

  const canReportAbsence = (session) => {
    if (!session || !session.startTime) return false;
    const start = new Date(session.startTime);
    const now = new Date();
    const diffMinutes = (start.getTime() - now.getTime()) / (1000 * 60);
    return diffMinutes >= 240; // 4 tiếng
  };

  const getAbsenceRemainingNotice = (session) => {
    if (!session || !session.startTime) return '';
    const start = new Date(session.startTime);
    const now = new Date();
    const diffMinutes = Math.floor((start.getTime() - now.getTime()) / (1000 * 60));
    if (diffMinutes < 0) return lang === 'en' ? 'Session has passed' : 'Buổi học đã qua';
    if (diffMinutes < 240) {
      const hours = Math.floor(Math.max(0, diffMinutes) / 60);
      const mins = Math.max(0, diffMinutes) % 60;
      return lang === 'en'
        ? `${hours}h ${mins}m until class (past 4-hour advance deadline)`
        : `Còn ${hours} giờ ${mins} phút nữa là vào học (quá hạn báo trước 4 giờ)`;
    }
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return lang === 'en'
      ? `${hours}h ${mins}m before class (eligible to submit request)`
      : `Còn ${hours} giờ ${mins} phút trước giờ học (hợp lệ để gửi yêu cầu)`;
  };

  const handleOpenAbsenceModal = (session) => {
    setSelectedSessionForAbsence(session);
    setAbsenceReason('');
    setAbsenceError('');
    setAbsenceType('ONLINE');
    setCommitments({
      docReviewed: false,
      homeworkCompleted: false,
      learningImpactUnderstood: false
    });
  };

  // Tính số buổi đã báo vắng trong tháng của buổi học đang chọn (tối đa 2 buổi/tháng)
  const monthlyAbsenceCount = useMemo(() => {
    if (!selectedSessionForAbsence || !schedule) return 0;
    const sDate = new Date(selectedSessionForAbsence.startTime);
    const targetYear = sDate.getFullYear();
    const targetMonth = sDate.getMonth();
    const currentSessionId = selectedSessionForAbsence.sessionId || selectedSessionForAbsence.id;

    return schedule.filter(s => {
      const id = s.sessionId || s.id;
      if (id === currentSessionId) return false;
      if (s.attendanceStatus !== 'ABSENT') return false;
      if (!s.startTime) return false;
      const d = new Date(s.startTime);
      return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
    }).length;
  }, [selectedSessionForAbsence, schedule]);

  const handleSubmitAbsence = async (e) => {
    e.preventDefault();
    if (!selectedSessionForAbsence || !user?.id) return;
    if (!canReportAbsence(selectedSessionForAbsence)) {
      setAbsenceError(lang === 'en' ? 'Absence notice or online request must be submitted at least 4 hours before class!' : 'Chỉ được phép báo vắng hoặc xin học online trước giờ học ít nhất 4 tiếng!');
      return;
    }

    const isOnline = absenceType === 'ONLINE';
    const allCommitmentsConfirmed = commitments.docReviewed && commitments.homeworkCompleted && commitments.learningImpactUnderstood;

    if (!isOnline && !allCommitmentsConfirmed) {
      setAbsenceError(lang === 'en' ? 'Please check all 3 make-up commitments before submitting absence notice!' : 'Vui lòng tick xác nhận đầy đủ 3 cam kết bù bài trước khi gửi báo vắng!');
      return;
    }

    if (!isOnline && monthlyAbsenceCount >= 2) {
      setAbsenceError(lang === 'en' ? 'You have used up your 2 permitted absences for this month! Please contact your teacher directly.' : 'Bạn đã sử dụng hết hạn mức 2 buổi nghỉ có phép trong tháng này! Vui lòng liên hệ trực tiếp với Thầy/Cô để xin phép.');
      return;
    }

    try {
      setIsSubmittingAbsence(true);
      setAbsenceError('');
      const res = await studentPortalApi.reportAbsence(
        user.id,
        selectedSessionForAbsence.sessionId || selectedSessionForAbsence.id,
        {
          reason: absenceReason,
          isOnline: isOnline,
          status: isOnline ? 'ONLINE' : 'ABSENT',
          absenceType: absenceType,
          commitmentsConfirmed: allCommitmentsConfirmed
        }
      );
      toast.success(res.data?.message || (isOnline ? (lang === 'en' ? 'Online study request submitted successfully!' : 'Đã gửi yêu cầu học Online thành công!') : (lang === 'en' ? 'Absence notice submitted successfully!' : 'Đã gửi báo vắng thành công!')));
      setSelectedSessionForAbsence(null);
      setAbsenceReason('');
      await loadData();
    } catch (err) {
      setAbsenceError(err.response?.data?.message || err.message || (lang === 'en' ? 'Error submitting request.' : 'Lỗi khi gửi yêu cầu.'));
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
    const isOnline = session.attendanceStatus === 'ONLINE';
    const ok = await confirm({
      title: lang === 'en' ? 'Cancel Request' : 'Hủy yêu cầu',
      message: isOnline
        ? (lang === 'en' ? 'Are you sure you want to cancel your online attendance request to attend in-person?' : 'Bạn có chắc chắn muốn hủy đăng ký học Online để đi học trực tiếp tại lớp không?')
        : (lang === 'en' ? 'Are you sure you want to cancel this absence notice to attend this class?' : 'Bạn có chắc chắn muốn hủy báo vắng để đi học lại buổi học này không?'),
      confirmText: lang === 'en' ? 'Confirm In-Person Attendance' : 'Xác nhận đi học trực tiếp',
      cancelText: lang === 'en' ? 'Keep As Is' : 'Giữ nguyên',
      type: 'info'
    });
    if (!ok) return;

    const sId = session.sessionId || session.id;
    try {
      setCancellingAbsenceId(sId);
      await studentPortalApi.cancelAbsence(user.id, sId);
      toast.success(lang === 'en' ? 'Request cancelled successfully! You may attend the class.' : 'Đã hủy yêu cầu thành công! Bạn có thể tham gia buổi học.');
      await loadData();
    } catch (err) {
      toast.error(lang === 'en' ? ('Error cancelling request: ' + (err.response?.data?.message || err.message)) : ('Lỗi khi hủy yêu cầu: ' + (err.response?.data?.message || err.message)));
    } finally {
      setCancellingAbsenceId(null);
    }
  };

  const handleDeleteSubmission = async (submissionId) => {
    if (!submissionId) return;
    const ok = await confirm({
      title: lang === 'en' ? 'Confirm Submission Deletion' : 'Xác nhận xóa bài nộp',
      message: lang === 'en' ? 'Are you sure you want to delete this submission?\n\nAfter deletion, you can submit a new one anytime before the deadline.' : 'Bạn có chắc chắn muốn xóa bài đã nộp này không?\n\nSau khi xóa, bạn có thể nộp lại bài mới bất cứ lúc nào trước hạn chót.',
      confirmText: lang === 'en' ? 'Confirm Delete' : 'Xác nhận xóa bài',
      cancelText: lang === 'en' ? 'Keep' : 'Giữ lại',
      type: 'danger'
    });
    if (!ok) return;

    try {
      setIsDeletingSubmission(true);
      await submissionApi.delete(submissionId);
      toast.success(lang === 'en' ? 'Submission deleted successfully! You can re-attempt and submit a new one.' : 'Đã xóa bài nộp thành công! Bạn có thể làm lại và nộp bài mới.');
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
      toast.error(err.response?.data?.message || err.message || (lang === 'en' ? 'Error deleting submission.' : 'Lỗi khi xóa bài nộp.'));
    } finally {
      setIsDeletingSubmission(false);
    }
  };

  const handleGoToAssignment = (session, specificAssignment = null) => {
    if (session) {
      markNewsAsViewed(session);
    }
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-12 transition-colors">
      {/* HEADER BAR (RESPONSIVE CHO CẢ PC & ĐIỆN THOẠI) */}
      <header className="bg-slate-900 dark:bg-slate-950 text-white shadow-md sticky top-0 z-40 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap justify-between items-center gap-3">
          <div className="flex flex-col">
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">TeachTool</span>
            <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">
              {t('studentSubtitle')}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-100">{user?.fullName || t('studentSubtitle')}</div>
              <div className="text-[11px] text-slate-400">{user?.email}</div>
            </div>
            <button
              onClick={() => { setIsJoinModalOpen(true); setJoinError(''); }}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-sm transition cursor-pointer shadow-xs whitespace-nowrap">
              {t('joinClassByCode')}
            </button>
            <button
              onClick={() => setIsMistakeNotebookOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-amber-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-sm transition cursor-pointer border border-amber-500/40 whitespace-nowrap shadow-xs">
              {t('mistakeNotebook')}
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition cursor-pointer border whitespace-nowrap ${
                activeTab === 'guide'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-xs font-semibold'
                  : 'text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700'
              }`}>
              {t('guide')}
            </button>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-sm transition cursor-pointer border border-slate-700 whitespace-nowrap">
              {t('settings')}
            </button>
            <ThemeLanguageToggle />
          </div>
        </div>
      </header>

      {/* NỘI DUNG CHÍNH */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-5 sm:pt-7">
        {/* THANH ĐIỀU HƯỚNG TAB (BẢNG TIN, THỜI KHÓA BIỂU, LỚP CỦA TÔI & HƯỚNG DẪN) */}
        <div className="overflow-x-auto flex items-center gap-1 bg-slate-200/80 dark:bg-slate-900 p-1 rounded-sm max-w-xl mb-6 shadow-xs border border-slate-300 dark:border-slate-800 no-scrollbar">
          <button
            onClick={() => setActiveTab('announcements')}
            className={`py-2 px-3 text-center text-xs font-semibold rounded-xs transition cursor-pointer whitespace-nowrap shrink-0 flex-1 sm:flex-initial ${
              activeTab === 'announcements'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}>
            <span>{t('tabAnnouncements')}</span>
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-2 px-3 text-center text-xs font-semibold rounded-xs transition cursor-pointer whitespace-nowrap shrink-0 flex-1 sm:flex-initial ${
              activeTab === 'schedule'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}>
            <span>{t('tabTimetable')}</span> {upcomingSessionsCount > 0 ? `(${upcomingSessionsCount})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('classes')}
            className={`py-2 px-3 text-center text-xs font-semibold rounded-xs transition cursor-pointer whitespace-nowrap shrink-0 flex-1 sm:flex-initial ${
              activeTab === 'classes'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}>
            <span>{t('myClasses')}</span> {enrolledClasses.length > 0 ? `(${enrolledClasses.length})` : ''}
          </button>
        </div>

        {loading && (
          <div className="text-gray-500 py-12 text-center text-sm">
            {t('loadingData')}
          </div>
        )}

        {/* TAB 1: THỜI KHÓA BIỂU */}
        {!loading && activeTab === 'schedule' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">{t('timetableTitle')}</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  {t('timetableSubtitle')}
                </p>
              </div>

              {/* Toggle dạng hiển thị: Bảng tuần vs Danh sách chi tiết */}
              <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-lg self-start sm:self-auto text-xs font-semibold border border-slate-300 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setScheduleViewMode('grid')}
                  className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                    scheduleViewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('weeklyTimetableToggle')}
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleViewMode('list')}
                  className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                    scheduleViewMode === 'list' ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('sessionListToggle')}
                </button>
              </div>
            </div>

            {enrichedSchedule.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-8 sm:p-12 text-center shadow-xs">
                <h4 className="font-bold text-gray-700 dark:text-slate-200 text-sm mb-1">{t('noScheduleAvailable')}</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-4 max-w-sm mx-auto">
                  {t('askTeacherForSchedule')}
                </p>
                <button
                  onClick={() => setIsJoinModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs">
                  {t('joinClassByCode')}
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
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {t('upcomingSessions')} ({upcomingStudentSessions.length})
                  </h3>

                  {upcomingStudentSessions.length === 0 ? (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-500 dark:text-slate-400">
                      {t('noUpcomingSessions')}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {upcomingStudentSessions.map((item, idx) => {
                        const isOnline = item.attendanceStatus === 'ONLINE' || (item.attendanceNote && item.attendanceNote.includes('[Xin học Online]'));
                        const isAbsent = item.attendanceStatus === 'ABSENT' && !isOnline;
                        const canAbsent = canReportAbsence(item);
                        const isOverdue = item.isOverdue || item.homeworkStatus === 'OVERDUE';

                        return (
                          <div
                            key={item.sessionId || idx}
                            onClick={() => markNewsAsViewed(item)}
                            className={`bg-white dark:bg-slate-900 rounded-xl shadow-xs overflow-hidden ${
                              isOverdue
                                ? 'border-2 border-black dark:border-white ring-1 ring-black dark:ring-white shadow-black/20'
                                : 'border border-gray-200 dark:border-slate-800'
                            }`}
                          >
                            {/* Header của Buổi học */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-600 text-white rounded">
                                    {item.className}
                                  </span>
                                  {item.classCode && (
                                    <span className="text-[11px] font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                      {t('codeLabel')} {item.classCode}
                                    </span>
                                  )}
                                  <h3 className="font-bold text-gray-800 dark:text-slate-100 text-base">
                                    {item.topic || t('sessionLabel')}
                                  </h3>
                                  {isOverdue && (
                                    <span className="text-xs font-bold px-2 py-0.5 bg-black text-white dark:bg-white dark:text-black rounded border border-black dark:border-white flex items-center gap-1">
                                      <AlertTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                                      <span>{lang === 'en' ? 'OVERDUE' : 'QUÁ HẠN'}</span>
                                    </span>
                                  )}
                                  {isNewsUnviewed(item) && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-700 animate-[pulse_2.5s_ease-in-out_infinite] shadow-2xs">
                                      {t('news')}
                                    </span>
                                  )}
                                  {isAbsent && (
                                    <span className="text-xs font-bold px-2 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded">
                                      {t('reportedAbsence')}
                                    </span>
                                  )}
                                  {isOnline && (
                                    <span className="text-xs font-bold px-2 py-0.5 bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded flex items-center gap-1">
                                      <GlobeIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                                      <span>{t('onlineRequest')}</span>
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-slate-400 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                  <span>{t('startsAt')} <b className="text-gray-700 dark:text-slate-200">{formatDateTime(item.startTime)}</b></span>
                                  <span>{t('durationMinutesLabel')} <b className="text-gray-700 dark:text-slate-200">{item.durationMinutes ? `${item.durationMinutes} ${t('mins')}` : `90 ${t('mins')}`}</b></span>
                                </div>
                                {item.attendanceNote && (
                                  <div className={`text-xs mt-1 ${isOnline ? 'text-sky-700 dark:text-sky-300' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {t('reason')} {item.attendanceNote}
                                  </div>
                                )}
                              </div>

                              {/* Nút thao tác nhanh của buổi học: Làm bài tập & Báo vắng */}
                              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                                {item.assignments && item.assignments.length === 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleGoToAssignment(item, item.assignments[0])}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs ${
                                      item.homeworkStatus === 'OVERDUE'
                                        ? 'bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200'
                                        : 'text-white bg-blue-600 hover:bg-blue-700'
                                    }`}>
                                    {item.homeworkStatus === 'OVERDUE'
                                      ? (lang === 'en' ? 'Overdue (View)' : 'Quá hạn (Xem)')
                                      : (isSessionEnded(item)
                                        ? (item.homeworkStatus === 'SUBMITTED' || item.homeworkStatus === 'GRADED' ? t('reviewSubmission') : t('viewHomework'))
                                        : (item.homeworkStatus === 'DRAFT' ? t('continueDraft') : item.homeworkStatus === 'SUBMITTED' || item.homeworkStatus === 'GRADED' ? t('reviewSubmission') : t('doHomework')))}
                                  </button>
                                )}
                                {item.assignments && item.assignments.length > 1 && (
                                  <span className="px-2.5 py-1 text-xs font-semibold text-blue-800 bg-blue-50 rounded-lg border border-blue-200">
                                    {item.assignments.length} {t('multipleAssignmentsNotice')}
                                  </span>
                                )}

                                {isAbsent || isOnline ? (
                                  !isSessionEnded(item) ? (
                                    <button
                                      type="button"
                                      onClick={() => handleCancelAbsence(item)}
                                      disabled={cancellingAbsenceId === (item.sessionId || item.id)}
                                      className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition cursor-pointer shadow-xs">
                                      {cancellingAbsenceId === (item.sessionId || item.id) ? t('saving') : t('cancelRequest')}
                                    </button>
                                  ) : (
                                    <span className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 rounded-lg border border-slate-200">
                                      {isOnline ? t('attendedOnline') : t('wasAbsent')}
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
                                    {canAbsent ? t('requestAbsenceOrOnline') : t('reportAbsenceBtn')}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Chi tiết học phần (Nội dung, Sách, Chuẩn bị gì) */}
                            <div className="p-4 space-y-4">
                              {/* THÔNG BÁO TỪ GIÁO VIÊN (NẾU CÓ) */}
                              {item.announcement && (
                                <div className="p-3.5 sm:p-4 bg-amber-50 dark:bg-amber-950/30 border-2 border-red-500 rounded-xl shadow-xs space-y-1.5 animate-pulse">
                                  <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
                                    <MegaphoneIcon className="w-4 h-4 shrink-0" />
                                    <span>{t('teacherAnnouncement')}</span>
                                    {item.announcementUpdatedAt && (
                                      <span className="text-[10px] font-normal text-amber-700 dark:text-amber-400 ml-auto">
                                        {formatDateTime(item.announcementUpdatedAt)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm font-medium text-amber-950 dark:text-amber-100 leading-relaxed">
                                    <LinkifiedText text={item.announcement} />
                                  </div>
                                </div>
                              )}
                              {item.sections && item.sections.length > 0 ? (
                                <div className="space-y-3">
                                  <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                                    {t('sessionDetailsAndPrep')}
                                  </h4>
                                  <div className="grid grid-cols-1 gap-3">
                                    {item.sections.map((sec, sIdx) => (
                                      <div key={sec.id || sIdx} className="p-3.5 bg-gray-50/70 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700 rounded-lg space-y-2">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5">
                                          <div className="font-bold text-gray-800 dark:text-slate-100 text-sm">
                                            {t('part')} {sIdx + 1}: {sec.content}
                                          </div>
                                          <div className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                                            {t('timeAllocation')} {sec.timeAllocation || `${sec.durationMinutes || 15} ${t('mins')}`}
                                          </div>
                                        </div>

                                        {sec.activity && (
                                          <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                                            {t('classActivity')} <span className="font-semibold">{sec.activity}</span>
                                          </div>
                                        )}

                                        {/* DẶN DÒ HỌC SINH CẦN CHUẨN BỊ GÌ */}
                                        {sec.studentPreparation ? (
                                          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-md text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                                            <span className="font-bold text-amber-800 dark:text-amber-300 block mb-0.5">{t('studentPrepRequired')}</span>
                                            <LinkifiedText text={sec.studentPreparation} />
                                          </div>
                                        ) : (
                                          <div className="text-xs text-gray-400 dark:text-slate-500 italic">
                                            {t('noSpecialPrep')}
                                          </div>
                                        )}

                                        {/* Tài liệu Handout */}
                                        {sec.handoutType === 'TEXT' && sec.handoutText && (
                                          <div>
                                            <button
                                              onClick={() => setViewingHandoutText(sec.handoutText)}
                                              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                                              {t('viewPastedText')}
                                            </button>
                                          </div>
                                        )}
                                        {sec.handoutType === 'FILE' && sec.handoutFilePath && (
                                          <div>
                                            <a
                                              href={sec.handoutFilePath}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded hover:bg-emerald-100">
                                              {t('downloadHandout')} {sec.handoutFileName || t('attachmentsCount')}
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400 dark:text-slate-500 italic py-2">
                                  {t('noDetailedPlanYet')}
                                </div>
                              )}

                              {/* BÀI TẬP CỦA BUỔI HỌC */}
                              {item.assignments && item.assignments.length > 0 && (
                                <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-2">
                                  <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                                    {t('linkedAssignments')} ({item.assignments.length})
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
                                        atts = [{ fileName: ass.attachmentFileName || t('attachmentsCount'), fileUrl: ass.attachmentFileUrl }];
                                      }

                                      return (
                                        <div key={ass.id} className="p-3.5 bg-blue-50/50 dark:bg-slate-800/60 border border-blue-200 dark:border-slate-700 rounded-lg space-y-2">
                                          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                                            <div className="space-y-1">
                                              <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-gray-800 dark:text-slate-100">{ass.title}</span>
                                                {status === 'OVERDUE' && (
                                                  <span className="px-2 py-0.5 text-[10px] font-extrabold bg-black text-white dark:bg-white dark:text-black rounded border border-black dark:border-white flex items-center gap-1">
                                                    <AlertTriangleIcon className="w-3 h-3 shrink-0" />
                                                    <span>{lang === 'en' ? 'OVERDUE' : 'QUÁ HẠN'}</span>
                                                  </span>
                                                )}
                                                {status === 'GRADED' && (
                                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-300 dark:border-emerald-700">
                                                    {t('gradedBadge')} {ass.submissionScore != null ? ass.submissionScore : sub?.score} {t('pts')}
                                                  </span>
                                                )}
                                                {status === 'SUBMITTED' && (
                                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 rounded border border-blue-300 dark:border-blue-700">
                                                    {t('submittedBadge')}
                                                  </span>
                                                )}
                                                {status === 'DRAFT' && (
                                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-700">
                                                    {t('draftBadge')}
                                                  </span>
                                                )}
                                                {status === 'NOT_SUBMITTED' && (
                                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 rounded border border-red-300 dark:border-red-700">
                                                    {t('notSubmittedBadge')}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-xs text-gray-500 dark:text-slate-400">
                                                {t('dueDate')}: <b>{formatDateTime(ass.dueDate)}</b>
                                              </div>
                                            </div>

                                            <button
                                              onClick={() => openSubmitModal(ass)}
                                              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs self-start sm:self-auto ${
                                                status === 'OVERDUE'
                                                  ? 'bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200'
                                                  : status === 'DRAFT'
                                                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                                  : (status === 'SUBMITTED' || status === 'GRADED')
                                                  ? 'bg-slate-700 dark:bg-slate-800 hover:bg-slate-800 text-white'
                                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                                              }`}>
                                              {status === 'OVERDUE'
                                                ? (lang === 'en' ? 'Overdue (View)' : 'Quá hạn (Xem)')
                                                : status === 'DRAFT'
                                                ? t('continueDraft')
                                                : (status === 'SUBMITTED' || status === 'GRADED')
                                                ? t('reviewSubmission')
                                                : t('doThisAssignment')}
                                            </button>
                                          </div>

                                          <CollapsibleDescription text={ass.description} textClassName="text-xs text-gray-600 dark:text-slate-300" />

                                          {atts && atts.length > 0 && (
                                            <div className="pt-1 flex flex-wrap items-center gap-1.5">
                                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{t('attachmentsCount')} ({atts.length}):</span>
                                              {atts.map((att, aIdx) => (
                                                <a
                                                  key={aIdx}
                                                  href={att.fileUrl}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 border border-blue-200 dark:border-slate-700 px-2 py-0.5 rounded transition"
                                                >
                                                  <PaperclipIcon className="w-3.5 h-3.5 shrink-0" />
                                                  <span className="truncate max-w-[180px]">{att.fileName || (lang === 'en' ? `File ${aIdx + 1}` : `Tệp ${aIdx + 1}`)}</span>
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
                      {t('pastSessions')} ({pastStudentSessions.length})
                    </h3>

                    <div className="space-y-4">
                      {pastStudentSessions.map((item, idx) => {
                        const isOnline = item.attendanceStatus === 'ONLINE' || (item.attendanceNote && item.attendanceNote.includes('[Xin học Online]'));
                        const isAbsent = item.attendanceStatus === 'ABSENT' && !isOnline;
                        const isOverdue = item.isOverdue || item.homeworkStatus === 'OVERDUE';

                        return (
                          <div
                            key={item.sessionId || idx}
                            onClick={() => markNewsAsViewed(item)}
                            className={`bg-white dark:bg-slate-900 rounded-xl shadow-xs overflow-hidden opacity-90 ${
                              isOverdue
                                ? 'border-2 border-black dark:border-white ring-1 ring-black dark:ring-white shadow-black/20'
                                : 'border border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            {/* Header của Buổi học */}
                            <div className="p-4 bg-slate-100/70 dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-600 text-white rounded">
                                    {item.className}
                                  </span>
                                  {item.classCode && (
                                    <span className="text-[11px] font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                      {t('codeLabel')} {item.classCode}
                                    </span>
                                  )}
                                  <h3 className="font-bold text-gray-800 dark:text-slate-100 text-base">
                                    {item.topic || t('sessionLabel')}
                                  </h3>
                                  {isOverdue && (
                                    <span className="text-xs font-bold px-2 py-0.5 bg-black text-white dark:bg-white dark:text-black rounded border border-black dark:border-white flex items-center gap-1">
                                      <AlertTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                                      <span>{lang === 'en' ? 'OVERDUE' : 'QUÁ HẠN'}</span>
                                    </span>
                                  )}
                                  {isNewsUnviewed(item) && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-700 animate-[pulse_2.5s_ease-in-out_infinite] shadow-2xs">
                                      {t('news')}
                                    </span>
                                  )}
                                  <span className="text-xs font-medium px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700">
                                    {t('completed')}
                                  </span>
                                  {isAbsent && (
                                    <span className="text-xs font-bold px-2 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded">
                                      {t('reportedAbsence')}
                                    </span>
                                  )}
                                  {isOnline && (
                                    <span className="text-xs font-bold px-2 py-0.5 bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded flex items-center gap-1">
                                      <GlobeIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                                      <span>{t('attendedOnline')}</span>
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-slate-400 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                  <span>{t('startsAt')} <b className="text-gray-700 dark:text-slate-200">{formatDateTime(item.startTime)}</b></span>
                                  <span>{t('durationMinutesLabel')} <b className="text-gray-700 dark:text-slate-200">{item.durationMinutes ? `${item.durationMinutes} ${t('mins')}` : `90 ${t('mins')}`}</b></span>
                                </div>
                                {item.attendanceNote && (
                                  <div className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                                    {t('reason')} {item.attendanceNote}
                                  </div>
                                )}
                              </div>

                              {/* Nút thao tác nhanh của buổi học */}
                              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                                {item.assignments && item.assignments.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleGoToAssignment(item)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs ${
                                      item.homeworkStatus === 'OVERDUE'
                                        ? 'bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200'
                                        : 'text-white bg-blue-600 hover:bg-blue-700'
                                    }`}>
                                    {item.homeworkStatus === 'OVERDUE'
                                      ? (lang === 'en' ? 'Overdue (View)' : 'Quá hạn (Xem)')
                                      : item.homeworkStatus === 'DRAFT'
                                      ? t('continueDraft')
                                      : item.homeworkStatus === 'SUBMITTED' || item.homeworkStatus === 'GRADED'
                                      ? t('reviewSubmission')
                                      : t('doHomework')}
                                  </button>
                                )}

                                {isAbsent && (
                                  <span className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    {t('wasAbsent')}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Chi tiết học phần (Nội dung, Sách, Chuẩn bị gì) */}
                            <div className="p-4 space-y-4">
                              {/* THÔNG BÁO TỪ GIÁO VIÊN (NẾU CÓ) */}
                              {item.announcement && (
                                <div className="p-3.5 sm:p-4 bg-amber-50 dark:bg-amber-950/30 border-2 border-red-500 rounded-xl shadow-xs space-y-1.5 animate-pulse">
                                  <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
                                    <MegaphoneIcon className="w-4 h-4 shrink-0" />
                                    <span>{t('teacherAnnouncement')}</span>
                                    {item.announcementUpdatedAt && (
                                      <span className="text-[10px] font-normal text-amber-700 dark:text-amber-400 ml-auto">
                                        {formatDateTime(item.announcementUpdatedAt)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm font-medium text-amber-950 dark:text-amber-100 leading-relaxed">
                                    <LinkifiedText text={item.announcement} />
                                  </div>
                                </div>
                              )}
                              {item.sections && item.sections.length > 0 ? (
                                <div className="space-y-3">
                                  <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                                    {t('sessionDetailsAndPrep')}
                                  </h4>
                                  <div className="grid grid-cols-1 gap-3">
                                    {item.sections.map((sec, sIdx) => (
                                      <div key={sec.id || sIdx} className="p-3.5 bg-gray-50/70 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700 rounded-lg space-y-2">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5">
                                          <div className="font-bold text-gray-800 dark:text-slate-100 text-sm">
                                            {t('part')} {sIdx + 1}: {sec.content}
                                          </div>
                                          <div className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                                            {t('timeAllocation')} {sec.timeAllocation || `${sec.durationMinutes || 15} ${t('mins')}`}
                                          </div>
                                        </div>

                                        {sec.activity && (
                                          <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                                            {t('classActivity')} <span className="font-semibold">{sec.activity}</span>
                                          </div>
                                        )}

                                        {/* DẶN DÒ HỌC SINH CẦN CHUẨN BỊ GÌ */}
                                        {sec.studentPreparation && (
                                          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-md text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                                            <span className="font-bold text-amber-800 dark:text-amber-300 block mb-0.5">{t('studentPrepRequired')}</span>
                                            <LinkifiedText text={sec.studentPreparation} />
                                          </div>
                                        )}

                                        {/* Tài liệu Handout */}
                                        {sec.handoutType === 'TEXT' && sec.handoutText && (
                                          <div>
                                            <button
                                              onClick={() => setViewingHandoutText(sec.handoutText)}
                                              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                                              {t('viewPastedText')}
                                            </button>
                                          </div>
                                        )}
                                        {sec.handoutType === 'FILE' && sec.handoutFilePath && (
                                          <div>
                                            <a
                                              href={sec.handoutFilePath}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded hover:bg-emerald-100">
                                              {t('downloadHandout')} {sec.handoutFileName || t('attachmentsCount')}
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400 dark:text-slate-500 italic py-2">
                                  {t('noDetailedPlanYet')}
                                </div>
                              )}

                              {/* BÀI TẬP CỦA BUỔI HỌC */}
                              {item.assignments && item.assignments.length > 0 && (
                                <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-2">
                                  <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                                    {t('linkedAssignments')} ({item.assignments.length})
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
                                        atts = [{ fileName: ass.attachmentFileName || t('attachmentsCount'), fileUrl: ass.attachmentFileUrl }];
                                      }

                                      return (
                                        <div key={ass.id} className="p-3.5 bg-blue-50/50 dark:bg-slate-800/60 border border-blue-200 dark:border-slate-700 rounded-lg space-y-2">
                                          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                                            <div className="space-y-1">
                                              <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-gray-800 dark:text-slate-100">{ass.title}</span>
                                                {status === 'OVERDUE' && (
                                                  <span className="px-2 py-0.5 text-[10px] font-extrabold bg-black text-white dark:bg-white dark:text-black rounded border border-black dark:border-white flex items-center gap-1">
                                                    <AlertTriangleIcon className="w-3 h-3 shrink-0" />
                                                    <span>{lang === 'en' ? 'OVERDUE' : 'QUÁ HẠN'}</span>
                                                  </span>
                                                )}
                                                {status === 'GRADED' && (
                                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-300 dark:border-emerald-700">
                                                    {t('gradedBadge')} {ass.submissionScore != null ? ass.submissionScore : sub?.score} {t('pts')}
                                                  </span>
                                                )}
                                                {status === 'SUBMITTED' && (
                                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 rounded border border-blue-300 dark:border-blue-700">
                                                    {t('submittedBadge')}
                                                  </span>
                                                )}
                                                {status === 'DRAFT' && (
                                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-700">
                                                    {t('draftBadge')}
                                                  </span>
                                                )}
                                                {status === 'NOT_SUBMITTED' && (
                                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 rounded border border-red-300 dark:border-red-700">
                                                    {t('notSubmittedBadge')}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-xs text-gray-500 dark:text-slate-400">
                                                {t('dueDate')}: <b>{formatDateTime(ass.dueDate)}</b>
                                              </div>
                                            </div>

                                            <button
                                              onClick={() => openSubmitModal(ass)}
                                              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs self-start sm:self-auto ${
                                                status === 'OVERDUE'
                                                  ? 'bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200'
                                                  : status === 'DRAFT'
                                                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                                  : (status === 'SUBMITTED' || status === 'GRADED')
                                                  ? 'bg-slate-700 dark:bg-slate-800 hover:bg-slate-800 text-white'
                                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                                              }`}>
                                              {status === 'OVERDUE'
                                                ? (lang === 'en' ? 'Overdue (View)' : 'Quá hạn (Xem)')
                                                : status === 'DRAFT'
                                                ? t('continueDraft')
                                                : (status === 'SUBMITTED' || status === 'GRADED')
                                                ? t('reviewSubmission')
                                                : t('doThisAssignment')}
                                            </button>
                                          </div>

                                          <CollapsibleDescription text={ass.description} textClassName="text-xs text-gray-600 dark:text-slate-300" />

                                          {atts && atts.length > 0 && (
                                            <div className="pt-1 flex flex-wrap items-center gap-1.5">
                                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{t('attachmentsCount')} ({atts.length}):</span>
                                              {atts.map((att, aIdx) => (
                                                <a
                                                  key={aIdx}
                                                  href={att.fileUrl}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 border border-blue-200 dark:border-slate-700 px-2 py-0.5 rounded transition"
                                                >
                                                  <PaperclipIcon className="w-3.5 h-3.5 shrink-0" />
                                                  <span className="truncate max-w-[180px]">{att.fileName || (lang === 'en' ? `File ${aIdx + 1}` : `Tệp ${aIdx + 1}`)}</span>
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
                <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">{t('enrolledClassesTitle')}</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t('enrolledClassesSubtitle')}</p>
              </div>
              <button
                onClick={() => { setIsJoinModalOpen(true); setJoinError(''); }}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition cursor-pointer shadow-xs text-center">
                {t('joinMoreClasses')}
              </button>
            </div>

            {enrolledClasses.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-8 sm:p-12 text-center shadow-xs">
                <h4 className="font-bold text-gray-700 dark:text-slate-200 text-sm mb-1">{t('noEnrolledClassesYet')}</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-4 max-w-sm mx-auto">
                  {t('askTeacherForCode')}
                </p>
                <button
                  onClick={() => setIsJoinModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs">
                  {t('enterClassCode')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {enrolledClasses.map((cls) => (
                  <div key={cls.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded">
                        {t('codeLabel')} {cls.classCode || `#${cls.id}`}
                      </span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{t('inProgress')}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 dark:text-slate-100 text-base">{cls.name}</h3>
                      <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        {t('period')} {cls.startDate || '—'} → {cls.endDate || '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: BẢNG TIN LỚP HỌC */}
        {activeTab === 'announcements' && (
          <div className="space-y-4">
            {enrolledClasses.length > 1 && (
              <div className="flex items-center justify-end gap-2 pb-1">
                <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{t('classLabel')}</span>
                <select
                  value={selectedAnnouncementClassId || enrolledClasses[0]?.id}
                  onChange={(e) => setSelectedAnnouncementClassId(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-sm font-medium text-slate-800 dark:text-slate-200">
                  {enrolledClasses.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
            )}

            {enrolledClasses.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-sm border border-gray-200 dark:border-slate-800 p-8 text-center text-sm text-gray-500 dark:text-slate-400">
                {t('announcementsEmptyStudent')}
              </div>
            ) : (
              <ClassAnnouncementBoard
                classId={selectedAnnouncementClassId || enrolledClasses[0]?.id}
                isTeacher={false}
                classInfo={enrolledClasses.find(c => String(c.id) === String(selectedAnnouncementClassId || enrolledClasses[0]?.id))}
              />
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl shadow-2xl w-full max-w-md p-5 sm:p-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-2">{t('joinClassByCode')}</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
              {t('askTeacherForCode')}
            </p>

            {joinError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-xs font-medium mb-4">
                {joinError}
              </div>
            )}

            <form onSubmit={handleJoinClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {t('classCode')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={classCodeInput}
                  onChange={(e) => setClassCodeInput(e.target.value.toUpperCase())}
                  placeholder="VD: ABC123"
                  maxLength={10}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm uppercase tracking-widest font-mono font-bold text-center focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="px-4 py-2 text-xs text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer">
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={joining}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg cursor-pointer shadow-xs">
                  {joining ? t('saving') : t('joinClassByCode')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NỘP BÀI TẬP (VĂN BẢN, DOCX, AUDIO, GHI ÂM TRỰC TIẾP) */}
      {activeAssignmentToSubmit && (() => {
        const isAssignmentOverdue = activeAssignmentToSubmit.dueDate && new Date(activeAssignmentToSubmit.dueDate) < new Date();
        const existingSubmission = submissions.find(s => s.assignmentId === activeAssignmentToSubmit.id);
        const isGraded = existingSubmission && (existingSubmission.status === 'GRADED' || (existingSubmission.score !== null && existingSubmission.score !== undefined));

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg my-6 max-h-[90vh] flex flex-col overflow-hidden">
              <div className="p-4 sm:p-5 bg-[#0f172b] text-white flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold truncate max-w-sm">
                      {activeAssignmentToSubmit.title}
                    </h4>
                    {isAssignmentOverdue && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-black text-white dark:bg-white dark:text-black rounded border border-black dark:border-white shrink-0 flex items-center gap-1">
                        <ClockIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{lang === 'en' ? 'OVERDUE' : 'QUÁ HẠN'}</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    {t('dueDate')}: {formatDateTime(activeAssignmentToSubmit.dueDate)}
                  </div>
                </div>
                <button
                  onClick={() => setActiveAssignmentToSubmit(null)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitAssignment} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                {isAssignmentOverdue && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500 rounded-xl text-xs text-rose-900 dark:text-rose-200 font-semibold flex items-center gap-2">
                    <AlertTriangleIcon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>{lang === 'en'
                      ? `Submission deadline has passed (${formatDateTime(activeAssignmentToSubmit.dueDate)}). Submissions are closed for this assignment.`
                      : `Đã hết hạn nộp bài tập (${formatDateTime(activeAssignmentToSubmit.dueDate)}). Hệ thống đã đóng cổng nộp bài cho bài tập này.`}</span>
                  </div>
                )}
                {submissionSuccessMsg && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                    {submissionSuccessMsg}
                  </div>
                )}

              {/* Mô tả đề bài */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs space-y-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">{t('assignmentInstructions')}</span>
                <CollapsibleDescription text={activeAssignmentToSubmit.description || t('noDetailedInstructions')} textClassName="text-slate-600 dark:text-slate-300 text-xs" />
                {(() => {
                  let atts = [];
                  if (activeAssignmentToSubmit.attachmentsJson) {
                    try { atts = JSON.parse(activeAssignmentToSubmit.attachmentsJson); } catch {}
                  }
                  if ((!atts || atts.length === 0) && activeAssignmentToSubmit.attachmentFileUrl) {
                    atts = [{
                      fileName: activeAssignmentToSubmit.attachmentFileName || t('attachmentsCount'),
                      fileUrl: activeAssignmentToSubmit.attachmentFileUrl
                    }];
                  }
                  if (!atts || atts.length === 0) return null;
                  return (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                      <span className="font-bold text-slate-700 dark:text-slate-300 block">
                        {t('teacherAttachments')} ({atts.length}):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {atts.map((att, idx) => (
                          <a
                            key={idx}
                            href={att.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-blue-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition shadow-2xs"
                          >
                            <span className="truncate max-w-[240px]">{att.fileName || (lang === 'en' ? `File ${idx + 1}` : `Tệp ${idx + 1}`)}</span>
                            <ExternalLinkIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
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
                  <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-900 dark:to-slate-800/40 border border-blue-200 dark:border-slate-700 rounded-xl space-y-3.5 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 dark:border-slate-700 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div>
                          <h5 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                            {isGraded ? t('assessmentResultTitle') : t('submissionStatusTitle')}
                          </h5>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {isGraded ? t('teacherGradedDetailedNotice') : t('submittedAwaitingGradeNotice')}
                          </span>
                        </div>
                      </div>

                      {isGraded ? (
                        <span className="px-3 py-1 bg-emerald-600 text-white font-bold text-xs rounded-full shadow-2xs">
                          {t('scoreLabel')} {existingSubmission.score} / 10
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold text-[11px] rounded-full border border-amber-200 dark:border-amber-700">
                          {t('awaitingGrade')}
                        </span>
                      )}
                    </div>

                    {/* Bản sửa âm thanh & Nhận xét timestamp từ giáo viên */}
                    {existingSubmission.feedback && (
                      <StudentFeedbackAudioPlayer rawFeedback={existingSubmission.feedback} />
                    )}

                    {/* Luồng trao đổi và phản hồi 2 chiều giữa Giáo viên & Học sinh */}
                    <div className="pt-2">
                      <SubmissionFeedbackThread
                        submissionId={existingSubmission.id}
                        isTeacher={false}
                      />
                    </div>

                    {/* Xem lại nội dung học sinh đã nộp */}
                    <div className="pt-1 space-y-1 text-xs">
                      <span className="font-bold text-slate-600 dark:text-slate-300 block">{t('yourSubmittedContent')}</span>
                      {existingSubmission.textContent && (
                        <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-mono text-[11px]">
                          {existingSubmission.textContent}
                        </div>
                      )}
                      {existingSubmission.fileUrl && (
                        <div className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">{t('attachedFileLabel')} {existingSubmission.fileName || t('attachmentsCount')}</span>
                            <a href={existingSubmission.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                              {t('downloadOrOpenFile')}
                            </a>
                          </div>
                          {(existingSubmission.submissionType === 'AUDIO' || existingSubmission.submissionType === 'DIRECT_RECORD' || (existingSubmission.fileUrl && /\.(mp3|wav|m4a|webm|ogg)$/i.test(existingSubmission.fileUrl))) && (
                            <audio controls src={existingSubmission.fileUrl} className="w-full h-8" />
                          )}
                          {existingSubmission.submissionType === 'IMAGE' && (
                            <img src={existingSubmission.fileUrl} alt={lang === 'en' ? 'Submitted assignment' : 'Bài làm đã nộp'} className="max-h-48 rounded object-contain border border-slate-100 mx-auto" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Nút hủy / xóa bài đã nộp dành cho học sinh nếu chưa chấm điểm và chưa quá hạn */}
                    {!isGraded && (
                      <div className="pt-2.5 border-t border-blue-100 dark:border-blue-900/40 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                          {isAssignmentOverdue
                            ? (lang === 'en' ? 'Assignment is overdue. Submissions cannot be deleted.' : 'Bài tập đã quá hạn, không thể xóa bài làm.')
                            : t('deleteSubmissionNotice')}
                        </span>
                        {!isAssignmentOverdue && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSubmission(existingSubmission.id)}
                            disabled={isDeletingSubmission}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/60 rounded-lg transition cursor-pointer disabled:opacity-50 shadow-2xs shrink-0">
                            <span>{isDeletingSubmission ? t('deletingSubmission') : t('deleteSubmissionBtn')}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {isAssignmentOverdue ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <LockIcon className="w-4 h-4 shrink-0 text-slate-500" />
                    <span>{lang === 'en' ? 'Submission portal is closed because the deadline has passed.' : 'Cổng nộp bài đã đóng do đã quá hạn nộp.'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {lang === 'en' ? 'You cannot submit, resubmit, or edit your work after the deadline.' : 'Bạn không thể nộp, nộp lại hoặc chỉnh sửa bài làm sau hạn chót quy định.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Thông báo chính sách lưu trữ bài làm 1 tháng */}
                  <div className="p-2 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-lg text-xs text-amber-900 dark:text-amber-200">
                    {t('storageNotice30Days')}
                  </div>

                  {/* Chọn phương thức nộp bài (chỉ hiện các phương thức được giáo viên cho phép) */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200">
                        {submissions.some(s => s.assignmentId === activeAssignmentToSubmit.id) ? t('resubmitOrUpdate') : t('selectSubmissionFormat')}
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
                                selectedSubmissionMode === 'TEXT'
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
                              }`}>
                              {t('modeText')}
                            </button>
                          )}
                          {allowedModes.includes('DOCX') && (
                            <button
                              type="button"
                              onClick={() => setSelectedSubmissionMode('DOCX')}
                              className={`py-2 px-1 text-center rounded-lg text-xs font-semibold border cursor-pointer transition ${
                                selectedSubmissionMode === 'DOCX'
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
                              }`}>
                              {t('modeDocx')}
                            </button>
                          )}
                          {allowedModes.includes('AUDIO') && (
                            <button
                              type="button"
                              onClick={() => setSelectedSubmissionMode('AUDIO')}
                              className={`py-2 px-1 text-center rounded-lg text-xs font-semibold border cursor-pointer transition ${
                                selectedSubmissionMode === 'AUDIO'
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
                              }`}>
                              {t('modeAudio')}
                            </button>
                          )}
                          {allowedModes.includes('DIRECT_RECORD') && (
                            <button
                              type="button"
                              onClick={() => setSelectedSubmissionMode('DIRECT_RECORD')}
                              className={`py-2 px-1 text-center rounded-lg text-xs font-semibold border cursor-pointer transition ${
                                selectedSubmissionMode === 'DIRECT_RECORD'
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
                              }`}>
                              {t('modeRecord')}
                            </button>
                          )}
                          {allowedModes.includes('IMAGE') && (
                            <button
                              type="button"
                              onClick={() => setSelectedSubmissionMode('IMAGE')}
                              className={`py-2 px-1 text-center rounded-lg text-xs font-semibold border cursor-pointer transition ${
                                selectedSubmissionMode === 'IMAGE'
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
                              }`}>
                              {t('modeImage')}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* PHƯƠNG THỨC 1: VĂN BẢN TRỰC TIẾP */}
                  {selectedSubmissionMode === 'TEXT' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
                        {t('enterSubmissionTextLabel')}
                      </label>
                      <textarea
                        rows={5}
                        required
                        value={submissionText}
                        onChange={(e) => setSubmissionText(e.target.value)}
                        placeholder={t('enterSubmissionTextPlaceholder')}
                        className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-500 placeholder-slate-400 dark:placeholder-slate-500"
                      />
                    </div>
                  )}

                  {/* PHƯƠNG THỨC 2: TẢI TỆP WORD (DOCX) */}
                  {selectedSubmissionMode === 'DOCX' && (
                    <div className="space-y-2 p-3 bg-gray-50 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-800 rounded-lg">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
                        {t('uploadDocxLabel')}
                      </label>
                      <input
                        type="file"
                        accept=".docx,.doc,.pdf"
                        onChange={(e) => handleFileUpload(e, 'DOCX')}
                        className="text-xs text-gray-500 dark:text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:file:bg-blue-950/60 file:text-blue-700 dark:file:text-blue-300 cursor-pointer"
                      />
                      {uploadingFile && <div className="text-xs text-blue-600 dark:text-blue-400">{t('uploadingFile')}</div>}
                      {uploadedFileData.fileName && (
                        <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                          <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>{t('attachedLabel')} {uploadedFileData.fileName}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PHƯƠNG THỨC 3: TẢI FILE ÂM THANH (AUDIO) */}
                  {selectedSubmissionMode === 'AUDIO' && (
                    <div className="space-y-2 p-3 bg-gray-50 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-800 rounded-lg">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
                        {t('uploadAudioLabel')}
                      </label>
                      <input
                        type="file"
                        accept="audio/*,.mp3,.wav,.m4a,.webm"
                        onChange={(e) => handleFileUpload(e, 'AUDIO')}
                        className="text-xs text-gray-500 dark:text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:file:bg-blue-950/60 file:text-blue-700 dark:file:text-blue-300 cursor-pointer"
                      />
                      {uploadingFile && <div className="text-xs text-blue-600 dark:text-blue-400">{t('uploadingAudio')}</div>}
                      {uploadedFileData.fileUrl && (
                        <div className="pt-2 space-y-1">
                          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>{t('attachedLabel')} {uploadedFileData.fileName}</span>
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
                    <div className="space-y-3 p-3.5 bg-gray-50 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-800 rounded-lg">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200">
                        {t('submitWithPhotosLabel')}
                      </label>

                      <div className="flex flex-wrap items-center gap-2">
                        <label className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-slate-200 cursor-pointer shadow-2xs flex items-center transition">
                          {t('uploadFromDevice')}
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
                          {t('takePhoto')}
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
                        <div className="p-3 bg-[#0f172b] dark:bg-slate-950 rounded-xl space-y-2 text-center animate-fade-in border border-slate-800">
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
                              {t('captureThisPhoto')}
                            </button>
                            <button
                              type="button"
                              onClick={stopCamera}
                              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg cursor-pointer">
                              {t('stopCamera')}
                            </button>
                          </div>
                        </div>
                      )}

                      {cameraError && (
                        <div className="p-2 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded text-rose-700 dark:text-rose-300 text-xs">
                          {cameraError}
                        </div>
                      )}

                      {uploadingFile && <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{t('uploadingPhoto')}</div>}

                      {uploadedFileData.fileUrl && (
                        <div className="pt-2 space-y-2">
                          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>{t('attachedLabel')} {uploadedFileData.fileName}</span>
                            </span>
                            <a
                              href={uploadedFileData.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline">
                              {t('downloadOrOpenFile')}
                            </a>
                          </div>
                          <div className="p-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-center">
                            <img
                              src={uploadedFileData.fileUrl}
                              alt={lang === 'en' ? 'Submission photo' : 'Bản chụp bài nộp'}
                              className="max-h-60 max-w-full rounded object-contain mx-auto border border-gray-100 dark:border-slate-800 shadow-2xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {draftSavedNotice && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 rounded-lg text-xs font-semibold text-center animate-in fade-in">
                      {draftSavedNotice}
                    </div>
                  )}
                </>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-200 dark:border-slate-800">
                {!isAssignmentOverdue && (
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="px-3.5 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 rounded-lg cursor-pointer transition shadow-2xs">
                    {t('saveDraftBtn')}
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={closeSubmitModal}
                    className="px-4 py-2 text-xs text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer">
                    {t('close')}
                  </button>
                  {!isAssignmentOverdue && (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg cursor-pointer shadow-xs">
                      {submitting ? t('submittingHomework') : t('confirmSubmitHomework')}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      );
    })()}

      {/* MODAL XEM HANDOUT TEXT */}
      {viewingHandoutText && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-5">
            <h4 className="text-sm font-bold text-gray-800 dark:text-slate-100 mb-2">{t('lessonHandoutModalTitle')}</h4>
            <div className="max-h-80 overflow-y-auto p-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-mono whitespace-pre-wrap text-gray-800 dark:text-slate-200 leading-relaxed">
              {viewingHandoutText}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setViewingHandoutText(null)}
                className="px-4 py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer">
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BÁO VẮNG / XIN HỌC ONLINE */}
      {selectedSessionForAbsence && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              absenceType === 'ONLINE' ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900/60' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
            }`}>
              <div>
                <h3 className={`text-base font-bold flex items-center gap-1.5 ${absenceType === 'ONLINE' ? 'text-sky-900 dark:text-sky-200' : 'text-rose-900 dark:text-rose-200'}`}>
                  {absenceType === 'ONLINE' ? (
                    <>
                      <GlobeIcon className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                      <span>{t('registerOnlineTitle')}</span>
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span>{t('confirmAbsenceTitle')}</span>
                    </>
                  )}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {selectedSessionForAbsence.className} - {selectedSessionForAbsence.topic}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSessionForAbsence(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitAbsence} className="p-5 space-y-4">
              {/* Lựa chọn hình thức: Học Online vs Nghỉ hẳn */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  {t('selectParticipationMode')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAbsenceType('ONLINE')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      absenceType === 'ONLINE'
                        ? 'bg-sky-50/80 dark:bg-sky-950/50 border-sky-400 dark:border-sky-600 ring-2 ring-sky-300 dark:ring-sky-800'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-500'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-sky-800 dark:text-sky-300">
                      <GlobeIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                      <span>{t('requestOnlineOption')}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {t('onlineOptionDesc')}
                    </span>
                    <span className="mt-2 text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/80 px-2 py-0.5 rounded-full self-start">
                      {t('recommendedBadge')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAbsenceType('ABSENT')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      absenceType === 'ABSENT'
                        ? 'bg-rose-50/80 dark:bg-rose-950/50 border-rose-400 dark:border-rose-600 ring-2 ring-rose-300 dark:ring-rose-800'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-500'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-rose-800 dark:text-rose-300">
                      <XCircleIcon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span>{t('fullAbsenceOption')}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {t('fullAbsenceDesc')}
                    </span>
                    <span className="mt-2 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 rounded-full self-start">
                      {t('absenceQuotaBadge')}
                    </span>
                  </button>
                </div>
              </div>

              {/* Thông tin quy định & Hạn mức */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold">{t('timePolicyLabel')}</span>
                  <span className="font-semibold text-amber-800 dark:text-amber-300">{t('atLeast4HoursNotice')}</span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">{getAbsenceRemainingNotice(selectedSessionForAbsence)}</p>

                {absenceType === 'ABSENT' && (
                  <div className="pt-2 border-t border-amber-200/80 dark:border-amber-900/50 flex items-center justify-between text-xs">
                    <span>{t('monthlyQuotaLabel')}</span>
                    <span className={`font-bold px-2 py-0.5 rounded-full ${
                      monthlyAbsenceCount >= 2 ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300' : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                    }`}>
                      {t('usedQuotaNotice')} {monthlyAbsenceCount}/2 {t('classesCount')}
                    </span>
                  </div>
                )}
              </div>

              {/* Hướng dẫn khi xin học Online */}
              {absenceType === 'ONLINE' && (
                <div className="p-3 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 rounded-xl text-xs text-sky-800 dark:text-sky-200 space-y-1">
                  <p className="font-semibold">{t('howToGetLinkTitle')}</p>
                  <p className="text-[11px] text-sky-700 dark:text-sky-300">
                    {t('howToGetLinkDesc')}
                  </p>
                </div>
              )}

              {/* 3 Cam kết bù bài bắt buộc khi Nghỉ hẳn */}
              {absenceType === 'ABSENT' && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2.5">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {t('mandatoryCommitmentsTitle')} <span className="text-rose-500">*</span>:
                  </label>
                  <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    <label className="flex items-start gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={commitments.docReviewed}
                        onChange={(e) => setCommitments(prev => ({ ...prev, docReviewed: e.target.checked }))}
                        className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                      <span>{t('commitmentDoc')}</span>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={commitments.homeworkCompleted}
                        onChange={(e) => setCommitments(prev => ({ ...prev, homeworkCompleted: e.target.checked }))}
                        className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                      <span>{t('commitmentHomework')}</span>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={commitments.learningImpactUnderstood}
                        onChange={(e) => setCommitments(prev => ({ ...prev, learningImpactUnderstood: e.target.checked }))}
                        className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                      <span>{t('commitmentImpact')}</span>
                    </label>
                  </div>
                </div>
              )}

              {absenceError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-semibold">
                  {absenceError}
                </div>
              )}

              {/* Lý do */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('reasonLabel')} {absenceType === 'ONLINE' ? t('requestOnlineOption') : t('reportAbsenceBtn')} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  placeholder={
                    absenceType === 'ONLINE'
                      ? t('reasonOnlinePlaceholder')
                      : t('reasonAbsencePlaceholder')
                  }
                  className="w-full text-xs p-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedSessionForAbsence(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmittingAbsence ||
                    (absenceType === 'ABSENT' && (
                      !commitments.docReviewed ||
                      !commitments.homeworkCompleted ||
                      !commitments.learningImpactUnderstood ||
                      monthlyAbsenceCount >= 2
                    ))
                  }
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    absenceType === 'ONLINE'
                      ? 'bg-sky-600 hover:bg-sky-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSubmittingAbsence
                    ? t('saving')
                    : absenceType === 'ONLINE'
                    ? t('confirmOnlineBtn')
                    : t('confirmAbsenceBtn')}
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

      {/* SỔ TAY ÔN TẬP LỖI SAI CỦA HỌC SINH */}
      <MistakeNotebookModal
        isOpen={isMistakeNotebookOpen}
        onClose={() => setIsMistakeNotebookOpen(false)}
      />

      {/* Nút tròn & Hội thoại Thắc mắc học viên */}
      <StudentInquiryWidget user={user} classes={enrolledClasses} />

      {/* THANH ĐIỀU HƯỚNG DƯỚI ĐÁY DÀNH CHO MOBILE (COMMERCIAL CRISP TEXT-FIRST) */}
      <nav aria-label="Mobile Navigation" className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900 border-t border-slate-800 flex items-center justify-around py-2 px-1 text-slate-300 shadow-xl">
        <button
          type="button"
          onClick={() => setActiveTab('announcements')}
          className={`px-2 py-1 text-xs font-semibold rounded-xs transition cursor-pointer ${
            activeTab === 'announcements' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}>
          {t('mobileNavAnnouncements')}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`px-2 py-1 text-xs font-semibold rounded-xs transition cursor-pointer ${
            activeTab === 'schedule' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}>
          {t('mobileNavSchedule')}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('classes')}
          className={`px-2 py-1 text-xs font-semibold rounded-xs transition cursor-pointer ${
            activeTab === 'classes' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}>
          {t('mobileNavClasses')}
        </button>

        <button
          type="button"
          onClick={() => setIsMistakeNotebookOpen(true)}
          className="px-2 py-1 text-xs font-semibold text-amber-300 hover:text-white rounded-xs transition cursor-pointer border border-amber-500/30">
          {t('mobileNavMistakes')}
        </button>

        <button
          type="button"
          onClick={() => setIsSettingsModalOpen(true)}
          className="px-2 py-1 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xs transition cursor-pointer">
          {t('mobileNavSettings')}
        </button>
      </nav>
    </div>
  );
}
