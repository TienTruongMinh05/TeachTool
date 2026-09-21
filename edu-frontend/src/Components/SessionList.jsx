import { useState, useEffect, useMemo } from 'react';
import { sessionApi } from '../api/sessionApi';
import { teachingPlanApi } from '../api/teachingPlanApi';
import { activityApi } from '../api/activityApi';
import { fileApi } from '../api/fileApi';
import { attendanceApi } from '../api/attendanceApi';
import ActivityLibraryModal from './ActivityLibraryModal';
import BookPagePickerModal from './BookPagePickerModal';
import { getStoredClassMaterials, saveStoredClassMaterials } from './ClassMaterialsManager';
import { materialApi } from '../api/materialApi';
import { useToast } from '../context/ToastContext';
import { MegaphoneIcon, BookOpenIcon, GlobeIcon } from './Icons';

export default function SessionList({ classId, classInfo, onSelectSessionForAttendance, targetSessionId = null }) {
  const { toast, confirm } = useToast();
  const [sessions, setSessions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [activities, setActivities] = useState([]);
  const [allAttendances, setAllAttendances] = useState([]);
  const [loading, setLoading] = useState(true);

  // Accordion mở xem kế hoạch của buổi học (mặc định đóng hết)
  const [expandedSessionIds, setExpandedSessionIds] = useState(new Set());

  // Batch selection states
  const [selectedSessionIds, setSelectedSessionIds] = useState(new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Dropdown menu state per session card
  const [openMenuSessionId, setOpenMenuSessionId] = useState(null);
  const [menuPlacement, setMenuPlacement] = useState('down'); // 'down' | 'up'

  // Thư viện hoạt động modal
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activitySelectCallback, setActivitySelectCallback] = useState(null);

  // Modal THÊM BUỔI HỌC (Tích hợp nhập Kế hoạch giảng dạy luôn)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sessionFormData, setSessionFormData] = useState({
    topic: '',
    startTime: '',
    durationMinutes: 90
  });
  const [enablePlanInCreate, setEnablePlanInCreate] = useState(true);
  const [draftSections, setDraftSections] = useState([
    {
      timeAllocation: '30 phút',
      content: '',
      activity: '',
      studentPreparation: '',
      handoutType: 'NONE',
      handoutText: '',
      handoutFileName: '',
      handoutFilePath: ''
    }
  ]);
  const [creating, setCreating] = useState(false);

  // Modal SỬA BUỔI HỌC
  const [editingSession, setEditingSession] = useState(null);
  const [editFormData, setEditFormData] = useState({ topic: '', startTime: '', durationMinutes: 90 });

  // Modal COPY BUỔI HỌC
  const [copyingSession, setCopyingSession] = useState(null);
  const [copyFormData, setCopyFormData] = useState({
    topic: '',
    startTime: '',
    durationMinutes: 90,
    includePlan: true
  });

  // Modal XÓA BUỔI HỌC
  const [deletingSession, setDeletingSession] = useState(null);

  // Modal THÊM / SỬA HỌC PHẦN (trực tiếp cho 1 buổi học cụ thể)
  const [activeSessionForSection, setActiveSessionForSection] = useState(null);
  const [activePlanForSection, setActivePlanForSection] = useState(null);
  const [editingSectionIndex, setEditingSectionIndex] = useState(null); // null: thêm mới, số: đang sửa
  const [sectionFormData, setSectionFormData] = useState({
    timeAllocation: '15 phút',
    content: '',
    activity: '',
    studentPreparation: '',
    handoutType: 'NONE',
    handoutText: '',
    handoutFileName: '',
    handoutFilePath: '',
    bookId: '',
    bookTitle: '',
    bookPage: ''
  });
  const [uploadingHandoutFile, setUploadingHandoutFile] = useState(false);

  // Sách giáo khoa & Trình chọn trang
  const [classMaterials, setClassMaterials] = useState(() => getStoredClassMaterials(classId));
  const [pickingMaterial, setPickingMaterial] = useState(null);

  // Modal SAO CHÉP KẾ HOẠCH SANG BUỔI KHÁC
  const [copyingPlanSource, setCopyingPlanSource] = useState(null);
  const [copyTargetSessionId, setCopyTargetSessionId] = useState('');

  // Modal XEM VĂN BẢN HANDOUT ĐÃ DÁN
  const [viewingHandoutText, setViewingHandoutText] = useState(null);

  // Modal THÔNG BÁO ĐỘT XUẤT CHO BUỔI HỌC
  const [announcementModalSession, setAnnouncementModalSession] = useState(null);
  const [announcementInput, setAnnouncementInput] = useState('');
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, plansRes, activitiesRes, materialsRes, attendanceRes] = await Promise.allSettled([
        sessionApi.getByClass(classId),
        teachingPlanApi.getByClass(classId),
        activityApi.getAll(),
        materialApi.getByClass(classId),
        attendanceApi.getByClass(classId)
      ]);

      let sessionList = [];
      if (sessionsRes.status === 'fulfilled' && Array.isArray(sessionsRes.value)) {
        sessionList = [...sessionsRes.value].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        setSessions(sessionList);
      } else {
        setSessions([]);
      }

      if (plansRes.status === 'fulfilled' && Array.isArray(plansRes.value)) {
        setPlans(plansRes.value);
      } else {
        setPlans([]);
      }

      if (activitiesRes.status === 'fulfilled' && Array.isArray(activitiesRes.value)) {
        setActivities(activitiesRes.value);
      } else {
        setActivities([]);
      }

      if (materialsRes.status === 'fulfilled' && Array.isArray(materialsRes.value)) {
        setClassMaterials(materialsRes.value);
        saveStoredClassMaterials(classId, materialsRes.value);
      }

      if (attendanceRes.status === 'fulfilled' && Array.isArray(attendanceRes.value)) {
        setAllAttendances(attendanceRes.value);
      } else {
        setAllAttendances([]);
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu buổi học:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setSelectedSessionIds(new Set());
    setExpandedSessionIds(new Set()); // Mặc định không bung ra
  }, [classId]);

  // Tự động mở rộng & cuộn tới buổi học khi được điều hướng từ thời khóa biểu
  useEffect(() => {
    if (targetSessionId && !loading && sessions.length > 0) {
      const numTargetId = typeof targetSessionId === 'string' ? parseInt(targetSessionId, 10) : targetSessionId;
      setExpandedSessionIds(prev => {
        const next = new Set(prev);
        next.add(targetSessionId);
        if (!isNaN(numTargetId)) next.add(numTargetId);
        return next;
      });
      setTimeout(() => {
        const el = document.getElementById(`session-card-${targetSessionId}`) || document.getElementById(`session-card-${numTargetId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350);
    }
  }, [targetSessionId, loading, sessions]);

  // Phân chia buổi học thành: Buổi sắp tới và Buổi đã xong
  const { upcomingSessions, pastSessions } = useMemo(() => {
    const now = new Date();
    const upcoming = [];
    const past = [];
    sessions.forEach(s => {
      const end = s.endTime ? new Date(s.endTime) : (s.startTime ? new Date(new Date(s.startTime).getTime() + (s.durationMinutes || 90) * 60000) : null);
      if (end && end < now) {
        past.push(s);
      } else {
        upcoming.push(s);
      }
    });
    return { upcomingSessions: upcoming, pastSessions: past };
  }, [sessions]);

  // Đóng / mở accordion của buổi học
  const toggleSessionExpand = (sessionId) => {
    setExpandedSessionIds(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  // Chọn hoặc bỏ chọn 1 buổi học
  const toggleSelectSession = (sessionId) => {
    setSelectedSessionIds(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  // Chọn / Bỏ chọn tất cả
  const toggleSelectAll = (sessionList) => {
    const allSelected = sessionList.every(s => selectedSessionIds.has(s.id));
    setSelectedSessionIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        sessionList.forEach(s => next.delete(s.id));
      } else {
        sessionList.forEach(s => next.add(s.id));
      }
      return next;
    });
  };

  // Sao chép nhanh 1 buổi học sang tuần sau (+7 ngày)
  const handleQuickCopyNextWeek = async (session) => {
    if (!session || !session.startTime) return;
    try {
      setLoading(true);
      const oldStart = new Date(session.startTime);
      const newStart = new Date(oldStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      const newStartLocal = new Date(newStart.getTime() - newStart.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

      const createdSession = await sessionApi.create(classId, {
        topic: `${session.topic || 'Buổi học'} (Tuần sau)`,
        startTime: newStartLocal,
        durationMinutes: session.durationMinutes || 90
      });

      const matchedPlan = plans.find(p => (p.sessionId === session.id) || (p.session && p.session.id === session.id));
      if (matchedPlan && matchedPlan.sections && matchedPlan.sections.length > 0) {
        await teachingPlanApi.copy(matchedPlan.id, createdSession.id);
      }

      await loadData();
      toast.success(`Đã nhân bản buổi học sang tuần sau (${newStart.toLocaleDateString('vi-VN')}) thành công!`);
    } catch (err) {
      toast.error('Lỗi sao chép sang tuần sau: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
      setOpenMenuSessionId(null);
    }
  };

  // Thao tác hàng loạt (Batch): Sao chép sang tuần sau (+7 ngày) cho tất cả buổi đã chọn
  const handleBatchCopyNextWeek = async () => {
    if (selectedSessionIds.size === 0) return;
    const ok = await confirm({
      title: 'Sao chép hàng loạt',
      message: `Bạn có chắc muốn sao chép ${selectedSessionIds.size} buổi học đã chọn sang tuần sau (+7 ngày)?`,
      confirmText: 'Sao chép ngay',
      type: 'info'
    });
    if (!ok) return;

    try {
      setIsBatchProcessing(true);
      const selectedList = sessions.filter(s => selectedSessionIds.has(s.id));

      for (const session of selectedList) {
        if (!session.startTime) continue;
        const oldStart = new Date(session.startTime);
        const newStart = new Date(oldStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        const newStartLocal = new Date(newStart.getTime() - newStart.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

        const createdSession = await sessionApi.create(classId, {
          topic: `${session.topic || 'Buổi học'} (Tuần sau)`,
          startTime: newStartLocal,
          durationMinutes: session.durationMinutes || 90
        });

        const matchedPlan = plans.find(p => (p.sessionId === session.id) || (p.session && p.session.id === session.id));
        if (matchedPlan && matchedPlan.sections && matchedPlan.sections.length > 0) {
          await teachingPlanApi.copy(matchedPlan.id, createdSession.id);
        }
      }

      await loadData();
      setSelectedSessionIds(new Set());
      toast.success(`Đã sao chép thành công ${selectedList.length} buổi học sang tuần sau!`);
    } catch (err) {
      toast.error('Lỗi sao chép hàng loạt: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Thao tác hàng loạt (Batch): Xóa tất cả các buổi đã chọn
  const handleBatchDelete = async () => {
    if (selectedSessionIds.size === 0) return;
    const ok = await confirm({
      title: 'Xóa hàng loạt buổi học',
      message: `CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN ${selectedSessionIds.size} buổi học đã chọn kèm toàn bộ kế hoạch giảng dạy?`,
      confirmText: 'Xóa vĩnh viễn',
      type: 'danger'
    });
    if (!ok) return;

    try {
      setIsBatchProcessing(true);
      const idsToDelete = Array.from(selectedSessionIds);
      for (const sId of idsToDelete) {
        await sessionApi.delete(classId, sId);
      }
      await loadData();
      setSelectedSessionIds(new Set());
      toast.success(`Đã xóa thành công ${idsToDelete.length} buổi học!`);
    } catch (err) {
      toast.error('Lỗi xóa hàng loạt: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Mở modal Thêm buổi học mới (có sẵn khung Kế hoạch giảng dạy)
  const openCreateModal = () => {
    setSessionFormData({
      topic: '',
      startTime: '',
      durationMinutes: 90
    });
    setEnablePlanInCreate(true);
    setDraftSections([
      {
        timeAllocation: '30 phút',
        content: '',
        activity: '',
        studentPreparation: '',
        handoutType: 'NONE',
        handoutText: '',
        handoutFileName: '',
        handoutFilePath: ''
      }
    ]);
    setIsCreateModalOpen(true);
  };

  // Xử lý thêm 1 học phần nháp trong form Thêm buổi học
  const handleAddDraftSection = () => {
    setDraftSections(prev => [
      ...prev,
      {
        timeAllocation: '15 phút',
        content: '',
        activity: '',
        studentPreparation: '',
        handoutType: 'NONE',
        handoutText: '',
        handoutFileName: '',
        handoutFilePath: ''
      }
    ]);
  };

  // Cập nhật giá trị học phần nháp
  const handleUpdateDraftSection = (index, field, value) => {
    setDraftSections(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Xóa 1 học phần nháp
  const handleRemoveDraftSection = (index) => {
    setDraftSections(prev => prev.filter((_, idx) => idx !== index));
  };

  // Chọn hoạt động từ Thư viện vào học phần nháp
  const handlePickActivityForDraft = (index) => {
    setActivitySelectCallback(() => (pickedActivity) => {
      const actName = typeof pickedActivity === 'string' ? pickedActivity : (pickedActivity?.name || '');
      handleUpdateDraftSection(index, 'activity', actName);
      if (pickedActivity && typeof pickedActivity === 'object') {
        if (pickedActivity.timeAllocation) {
          handleUpdateDraftSection(index, 'timeAllocation', pickedActivity.timeAllocation);
        }
        if (pickedActivity.studentPreparation && !draftSections[index]?.studentPreparation) {
          handleUpdateDraftSection(index, 'studentPreparation', pickedActivity.studentPreparation);
        }
      }
      toast.success(`Đã chọn hoạt động: "${actName}"`);
    });
    setIsActivityModalOpen(true);
  };

  // Upload file handout cho học phần nháp
  const handleDraftFileUpload = async (index, file) => {
    if (!file) return;
    try {
      setUploadingHandoutFile(true);
      const res = await fileApi.upload(file);
      setDraftSections(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          handoutType: 'FILE',
          handoutFileName: res.fileName,
          handoutFilePath: res.fileUrl
        };
        return updated;
      });
      toast.success(`Đã tải lên tệp "${res.fileName}"`);
    } catch (err) {
      toast.error('Lỗi tải file: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingHandoutFile(false);
    }
  };

  // Xử lý lưu Tạo buổi học mới (+ Kế hoạch giảng dạy nếu có)
  const handleCreateSessionSubmit = async (e) => {
    e.preventDefault();
    if (!sessionFormData.topic.trim() || !sessionFormData.startTime) {
      toast.warning('Vui lòng nhập đầy đủ Chủ đề và Thời gian bắt đầu buổi học.');
      return;
    }

    try {
      setCreating(true);
      const createdSession = await sessionApi.create(classId, {
        topic: sessionFormData.topic.trim(),
        startTime: sessionFormData.startTime,
        durationMinutes: parseInt(sessionFormData.durationMinutes) || 90
      });

      if (enablePlanInCreate && draftSections.length > 0) {
        const validSections = draftSections
          .filter(sec => sec.content.trim() !== '')
          .map((sec, idx) => ({
            durationMinutes: parseInt(sec.timeAllocation) || 15,
            timeAllocation: sec.timeAllocation || '15 phút',
            content: sec.content.trim(),
            activity: sec.activity?.trim() || null,
            studentPreparation: sec.studentPreparation?.trim() || null,
            handoutType: sec.handoutType === 'NONE' ? null : sec.handoutType,
            handoutText: sec.handoutType === 'TEXT' ? sec.handoutText : null,
            handoutFileName: sec.handoutType === 'FILE' ? sec.handoutFileName : null,
            handoutFilePath: sec.handoutType === 'FILE' ? sec.handoutFilePath : null,
            orderIndex: idx + 1
          }));

        if (validSections.length > 0) {
          await teachingPlanApi.create(classId, createdSession.id, {
            title: `Kế hoạch: ${createdSession.topic}`,
            sections: validSections
          });
        }
      }

      await loadData();
      setIsCreateModalOpen(false);
      toast.success(`Đã tạo buổi học "${createdSession.topic}"`);
    } catch (error) {
      toast.error('Lỗi khi tạo buổi học: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreating(false);
    }
  };

  // Mở modal Sửa buổi học
  const openEditModal = (session) => {
    setEditingSession(session);
    let startLocal = '';
    if (session.startTime) {
      const d = new Date(session.startTime);
      startLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
    setEditFormData({
      topic: session.topic || '',
      startTime: startLocal,
      durationMinutes: session.durationMinutes || 90
    });
    setOpenMenuSessionId(null);
  };

  // Lưu Sửa buổi học
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingSession) return;
    try {
      await sessionApi.update(classId, editingSession.id, {
        topic: editFormData.topic.trim(),
        startTime: editFormData.startTime,
        durationMinutes: parseInt(editFormData.durationMinutes) || 90
      });
      await loadData();
      toast.success(`Đã cập nhật buổi học "${editFormData.topic}"`);
      setEditingSession(null);
    } catch (error) {
      toast.error('Lỗi cập nhật buổi học: ' + (error.response?.data?.message || error.message));
    }
  };

  // Mở modal Nhân bản / Copy buổi học (Tự động điền ngày giờ cũ để sửa nhanh)
  const openCopyModal = (session) => {
    setCopyingSession(session);
    let startLocal = '';
    if (session.startTime) {
      const d = new Date(session.startTime);
      startLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
    setCopyFormData({
      topic: `${session.topic || 'Buổi học'} (Bản sao)`,
      startTime: startLocal,
      durationMinutes: session.durationMinutes || 90,
      includePlan: true
    });
    setOpenMenuSessionId(null);
  };

  // Lưu Nhân bản buổi học
  const handleCopySubmit = async (e) => {
    e.preventDefault();
    if (!copyingSession) return;
    try {
      const created = await sessionApi.create(classId, {
        topic: copyFormData.topic.trim(),
        startTime: copyFormData.startTime,
        durationMinutes: parseInt(copyFormData.durationMinutes) || 90
      });

      if (copyFormData.includePlan) {
        const sourcePlan = plans.find(p => (p.sessionId === copyingSession.id) || (p.session && p.session.id === copyingSession.id));
        if (sourcePlan) {
          await teachingPlanApi.copy(sourcePlan.id, created.id);
        }
      }

      await loadData();
      toast.success(`Đã nhân bản buổi học "${created.topic}"`);
      setCopyingSession(null);
    } catch (error) {
      toast.error('Lỗi nhân bản buổi học: ' + (error.response?.data?.message || error.message));
    }
  };

  // Xóa buổi học đơn lẻ
  const handleDeleteSession = async () => {
    if (!deletingSession) return;
    try {
      await sessionApi.delete(classId, deletingSession.id);
      toast.success(`Đã xóa buổi học "${deletingSession.topic || ''}"`);
      setDeletingSession(null);
      await loadData();
    } catch (error) {
      toast.error('Lỗi khi xóa buổi học: ' + (error.response?.data?.message || error.message));
    }
  };

  // =================== THAO TÁC THÔNG BÁO ĐỘT XUẤT CHO BUỔI HỌC ===================
  const openAnnouncementModal = (session, initialText = null) => {
    setAnnouncementModalSession(session);
    if (initialText !== null) {
      setAnnouncementInput(initialText);
    } else {
      setAnnouncementInput(session.announcement || '');
    }
  };

  const openOnlineLinkAnnouncementModal = (session) => {
    const template = 'Link học online hôm nay (Google Meet / Zoom): ';
    let targetText = template;
    if (session.announcement && session.announcement.trim()) {
      if (!session.announcement.includes('Link học online')) {
        targetText = `${session.announcement}\n\n${template}`;
      } else {
        targetText = session.announcement;
      }
    }
    openAnnouncementModal(session, targetText);
  };

  const handleSaveAnnouncement = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!announcementModalSession) return;
    try {
      setSavingAnnouncement(true);
      await sessionApi.updateAnnouncement(classId, announcementModalSession.id, announcementInput.trim());
      toast.success('Đã lưu thông báo cho buổi học thành công!');
      setAnnouncementModalSession(null);
      await loadData();
    } catch (err) {
      toast.error('Lỗi lưu thông báo: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!announcementModalSession) return;
    const ok = await confirm({
      title: 'Xóa thông báo',
      message: 'Bạn có chắc chắn muốn xóa thông báo này khỏi buổi học?',
      confirmText: 'Xóa thông báo',
      type: 'danger'
    });
    if (!ok) return;
    try {
      setSavingAnnouncement(true);
      await sessionApi.updateAnnouncement(classId, announcementModalSession.id, '');
      toast.success('Đã xóa thông báo của buổi học!');
      setAnnouncementModalSession(null);
      await loadData();
    } catch (err) {
      toast.error('Lỗi xóa thông báo: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingAnnouncement(false);
    }
  };

  // =================== THAO TÁC KẾ HOẠCH & HỌC PHẦN TRỰC TIẾP ===================

  // Mở modal Thêm học phần mới vào buổi học
  const openAddSectionModal = (session, existingPlan) => {
    setActiveSessionForSection(session);
    setActivePlanForSection(existingPlan);
    setEditingSectionIndex(null);

    // Đọc thông tin sách & trang vừa nhớ của lớp
    const currentMats = getStoredClassMaterials(classId);
    setClassMaterials(currentMats);
    let rememberedBookId = '';
    let rememberedBookTitle = '';
    let rememberedPage = '';
    try {
      const saved = localStorage.getItem('last_picked_book_' + classId);
      if (saved) {
        const parsed = JSON.parse(saved);
        rememberedBookId = parsed.bookId || '';
        rememberedBookTitle = parsed.bookTitle || '';
        const prevPageNum = parseInt(parsed.bookPage, 10);
        rememberedPage = !isNaN(prevPageNum) ? String(prevPageNum + 1) : (parsed.bookPage || '');
      } else if (currentMats.length > 0) {
        rememberedBookId = currentMats[0].id;
        rememberedBookTitle = currentMats[0].title;
        rememberedPage = '1';
      }
    } catch {}

    setSectionFormData({
      timeAllocation: '15 phút',
      content: '',
      activity: '',
      studentPreparation: '',
      bookId: rememberedBookId,
      bookTitle: rememberedBookTitle,
      bookPage: rememberedPage,
      handoutType: 'NONE',
      handoutText: '',
      handoutFileName: '',
      handoutFilePath: ''
    });
  };

  // Mở modal Sửa học phần đã có
  const openEditSectionModal = (session, plan, section, index) => {
    setActiveSessionForSection(session);
    setActivePlanForSection(plan);
    setEditingSectionIndex(index);
    const currentMats = getStoredClassMaterials(classId);
    setClassMaterials(currentMats);

    setSectionFormData({
      timeAllocation: section.timeAllocation || `${section.durationMinutes || 15} phút`,
      content: section.content || '',
      activity: section.activity || '',
      studentPreparation: section.studentPreparation || '',
      bookId: section.bookId || '',
      bookTitle: section.bookTitle || '',
      bookPage: section.bookPage || '',
      handoutType: section.handoutType || 'NONE',
      handoutText: section.handoutText || '',
      handoutFileName: section.handoutFileName || '',
      handoutFilePath: section.handoutFilePath || ''
    });
  };

  // Xử lý Upload file handout khi thêm/sửa học phần đơn lẻ
  const handleSingleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploadingHandoutFile(true);
      const res = await fileApi.upload(file);
      setSectionFormData(prev => ({
        ...prev,
        handoutType: 'FILE',
        handoutFileName: res.fileName,
        handoutFilePath: res.fileUrl
      }));
      toast.success(`Đã tải lên tệp "${res.fileName}"`);
    } catch (err) {
      toast.error('Lỗi tải tệp lên: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingHandoutFile(false);
    }
  };

  // Lưu Học Phần (Thêm mới hoặc Cập nhật)
  const handleSaveSection = async (e) => {
    e.preventDefault();
    if (!activeSessionForSection) return;

    // Ghi nhớ cuốn sách & trang vừa chọn cho các học phần sau
    if (sectionFormData.bookId || sectionFormData.bookPage) {
      try {
        localStorage.setItem('last_picked_book_' + classId, JSON.stringify({
          bookId: sectionFormData.bookId,
          bookTitle: sectionFormData.bookTitle,
          bookPage: sectionFormData.bookPage
        }));
      } catch {}
    }

    try {
      let currentPlan = activePlanForSection;

      // Nếu buổi học này chưa có bản ghi TeachingPlan, tạo mới plan trước
      if (!currentPlan) {
        currentPlan = await teachingPlanApi.create(classId, activeSessionForSection.id, {
          title: `Kế hoạch: ${activeSessionForSection.topic || 'Buổi học'}`,
          sections: []
        });
      }

      const currentSections = [...(currentPlan.sections || [])];
      const newSectionData = {
        durationMinutes: parseInt(sectionFormData.timeAllocation) || 15,
        timeAllocation: sectionFormData.timeAllocation,
        content: sectionFormData.content,
        activity: sectionFormData.activity || null,
        studentPreparation: sectionFormData.studentPreparation || null,
        bookId: sectionFormData.bookId || null,
        bookTitle: sectionFormData.bookTitle || null,
        bookPage: sectionFormData.bookPage || null,
        handoutType: sectionFormData.handoutType === 'NONE' ? null : sectionFormData.handoutType,
        handoutText: sectionFormData.handoutType === 'TEXT' ? sectionFormData.handoutText : null,
        handoutFileName: sectionFormData.handoutType === 'FILE' ? sectionFormData.handoutFileName : null,
        handoutFilePath: sectionFormData.handoutType === 'FILE' ? sectionFormData.handoutFilePath : null,
        orderIndex: editingSectionIndex !== null ? editingSectionIndex + 1 : currentSections.length + 1
      };

      if (editingSectionIndex !== null) {
        currentSections[editingSectionIndex] = newSectionData;
      } else {
        currentSections.push(newSectionData);
      }

      await teachingPlanApi.update(currentPlan.id, {
        title: currentPlan.title,
        sections: currentSections
      });

      await loadData();
      toast.success(editingSectionIndex !== null ? 'Đã cập nhật học phần!' : 'Đã thêm học phần mới!');
      setActiveSessionForSection(null);
      setActivePlanForSection(null);
      setEditingSectionIndex(null);
    } catch (error) {
      toast.error('Lỗi lưu học phần: ' + (error.response?.data?.message || error.message));
    }
  };

  // Xóa 1 học phần
  const handleDeleteSection = async (plan, sectionIndex) => {
    const ok = await confirm({
      title: 'Xóa học phần',
      message: 'Bạn có chắc chắn muốn xóa học phần này khỏi kế hoạch giảng dạy?',
      confirmText: 'Xóa học phần',
      type: 'danger'
    });
    if (!ok) return;

    try {
      const updatedSections = plan.sections.filter((_, idx) => idx !== sectionIndex);
      await teachingPlanApi.update(plan.id, {
        title: plan.title,
        sections: updatedSections
      });
      await loadData();
      toast.success('Đã xóa học phần thành công!');
    } catch (error) {
      toast.error('Lỗi xóa học phần: ' + (error.response?.data?.message || error.message));
    }
  };

  // Nhân bản 1 học phần trong buổi
  const handleCopySection = async (plan, section) => {
    try {
      const currentSections = [...(plan.sections || [])];
      const copied = {
        ...section,
        id: undefined,
        content: `${section.content} (Bản sao)`,
        orderIndex: currentSections.length + 1
      };
      currentSections.push(copied);
      await teachingPlanApi.update(plan.id, {
        title: plan.title,
        sections: currentSections
      });
      await loadData();
      toast.success('Đã nhân bản học phần!');
    } catch (error) {
      toast.error('Lỗi nhân bản học phần: ' + (error.response?.data?.message || error.message));
    }
  };

  // Sao chép toàn bộ Kế hoạch sang 1 buổi học khác
  const handleExecuteCopyPlan = async () => {
    if (!copyingPlanSource || !copyTargetSessionId) {
      toast.warning('Vui lòng chọn buổi học đích để dán kế hoạch.');
      return;
    }

    try {
      await teachingPlanApi.copy(copyingPlanSource.id, copyTargetSessionId);
      await loadData();
      setCopyingPlanSource(null);
      setCopyTargetSessionId('');
      toast.success('Đã sao chép kế hoạch giảng dạy sang buổi học đích thành công!');
    } catch (error) {
      toast.error('Lỗi khi sao chép kế hoạch: ' + (error.response?.data?.message || error.message));
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '00:00 SA, 00/00/0000';
    const date = new Date(isoString);
    if (isNaN(date.getTime()) || date.getFullYear() <= 1970) return '00:00 SA, 00/00/0000';
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Render thẻ 1 buổi học
  const renderSessionCard = (session, index, isPast = false) => {
    const plan = plans.find(p => (p.sessionId === session.id) || (p.session && p.session.id === session.id));
    const sections = plan?.sections || [];
    const isExpanded = expandedSessionIds.has(session.id);
    const isSelected = selectedSessionIds.has(session.id);
    const isMenuOpen = openMenuSessionId === session.id;
    const isTarget = targetSessionId && (String(targetSessionId) === String(session.id));
    const onlineStudents = allAttendances.filter(
      a => (a.sessionId === session.id || a.session?.id === session.id) && a.status === 'ONLINE'
    );

    return (
      <div
        id={`session-card-${session.id}`}
        key={session.id}
        className={`bg-white border rounded-xl shadow-xs transition-all duration-300 ${
          isMenuOpen ? 'relative z-30' : 'relative z-1'
        } ${
          isTarget
            ? 'border-blue-500 ring-4 ring-blue-300/80 shadow-lg'
            : isSelected
            ? 'border-blue-500 ring-2 ring-blue-200'
            : isPast
            ? 'border-slate-200 opacity-90'
            : 'border-gray-200'
        }`}>
        {/* THANH TIÊU ĐỀ BUỔI HỌC (CARD HEADER) */}
        <div className={`p-4 sm:p-4.5 border-b border-gray-200 rounded-t-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 ${
          isTarget ? 'bg-blue-50/80' : isPast ? 'bg-slate-100/70' : 'bg-slate-50'
        }`}>
          <div className="flex items-start gap-3 w-full lg:w-auto">
            {/* Checkbox chọn buổi học */}
            <div className="pt-0.5">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelectSession(session.id)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                title="Chọn buổi học này để thao tác hàng loạt"
              />
            </div>

            <div className="space-y-1 w-full lg:w-auto">
              <div className="flex flex-wrap items-center gap-2">
                {/* Badge Tên lớp thay thế cho Buổi 1, Buổi 2 */}
                <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-600 text-white rounded">
                  {classInfo?.name || 'Lớp học'}
                </span>
                <h4 className="font-bold text-gray-800 text-base">{session.topic || 'Chưa đặt tên'}</h4>
                {sections.length > 0 ? (
                  <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                    {sections.length} học phần
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                    Chưa có học phần
                  </span>
                )}
                {isPast && (
                  <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-200 text-slate-700 rounded">
                    Đã hoàn thành
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                <span>Bắt đầu: <b className="text-gray-700">{formatDateTime(session.startTime)}</b></span>
                <span>Thời lượng: <b className="text-gray-700">{session.durationMinutes || 90} phút</b></span>
                <span>Dự kiến kết thúc: <b className="text-gray-700">{formatDateTime(session.endTime)}</b></span>
              </div>

              {/* DANH SÁCH HỌC VIÊN XIN HỌC ONLINE (NẾU CÓ) */}
              {onlineStudents.length > 0 && (
                <div className="mt-2.5 p-3 bg-sky-50 border border-sky-300 rounded-lg text-xs text-sky-950 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-xs">
                  <div className="space-y-0.5 flex-1">
                    <div className="font-bold text-sky-700 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                      <GlobeIcon className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>Có {onlineStudents.length} bạn xin học Online:</span>
                    </div>
                    <p className="text-slate-800 font-semibold">
                      {onlineStudents.map(s => s.studentName).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openOnlineLinkAnnouncementModal(session)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-md cursor-pointer transition shadow-xs flex items-center gap-1.5">
                      <MegaphoneIcon className="w-3.5 h-3.5" />
                      <span>Gửi link phòng học</span>
                    </button>
                  </div>
                </div>
              )}

              {/* THÔNG BÁO ĐỘT XUẤT CHO HỌC SINH (NẾU CÓ) */}
              {session.announcement && (
                <div className="mt-2.5 p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="space-y-0.5 flex-1">
                    <div className="font-bold text-red-600 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                      <MegaphoneIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>Thông báo đột xuất cho học sinh:</span>
                    </div>
                    <p className="whitespace-pre-line text-slate-800 font-medium leading-relaxed">
                      {session.announcement}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openAnnouncementModal(session)}
                      className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded cursor-pointer transition">
                      Sửa thông báo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* NÚT THAO TÁC: GIỮ XEM KẾ HOẠCH, THÊM HỌC PHẦN, ĐIỂM DANH, THÔNG BÁO + GOM COPY/SỬA/XÓA VÀO DROPDOWN */}
          <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto justify-start lg:justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-200 relative">
            <button
              onClick={() => toggleSessionExpand(session.id)}
              className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer">
              {isExpanded ? 'Ẩn kế hoạch ▲' : `Xem kế hoạch (${sections.length}) ▼`}
            </button>
            <button
              onClick={() => openAddSectionModal(session, plan)}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer">
              + Thêm học phần
            </button>
            <button
              onClick={() => onSelectSessionForAttendance && onSelectSessionForAttendance(session.id)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition cursor-pointer">
              Điểm danh
            </button>
            <button
              type="button"
              onClick={() => openAnnouncementModal(session)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                session.announcement
                  ? 'text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300'
                  : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300'
              }`}>
              <MegaphoneIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{session.announcement ? 'Sửa thông báo' : 'Thông báo'}</span>
            </button>

            {/* NÚT DROPDOWN GOM COPY, SỬA, XÓA, COPY TUẦN SAU */}
            <div className="relative z-50">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isMenuOpen) {
                    setOpenMenuSessionId(null);
                  } else {
                    const btnRect = e.currentTarget.getBoundingClientRect();
                    const spaceBelow = window.innerHeight - btnRect.bottom;
                    const scrollContainer = e.currentTarget.closest('.overflow-y-auto');
                    let effectiveSpaceBelow = spaceBelow;
                    if (scrollContainer) {
                      const contRect = scrollContainer.getBoundingClientRect();
                      effectiveSpaceBelow = Math.min(spaceBelow, contRect.bottom - btnRect.bottom);
                    }
                    setMenuPlacement(effectiveSpaceBelow < 220 ? 'up' : 'down');
                    setOpenMenuSessionId(session.id);
                  }
                }}
                className="p-1.5 px-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition cursor-pointer flex items-center gap-1"
                title="Tùy chọn khác">
                <span>⋮</span>
              </button>

              {/* Backdrop toàn màn hình để chạm bất cứ đâu ngoài menu là tự đóng */}
              {isMenuOpen && (
                <div
                  className="fixed inset-0 z-40 bg-transparent cursor-default"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuSessionId(null);
                  }}
                />
              )}

              {/* Menu dropdown - Tự động mở lên trên nếu ở sát đáy màn hình */}
              {isMenuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute right-0 ${
                    menuPlacement === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                  } w-56 max-w-[85vw] bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100 text-xs font-medium`}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenuSessionId(null);
                      handleQuickCopyNextWeek(session);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 text-blue-700 font-semibold flex items-center justify-between cursor-pointer">
                    <span>Copy sang tuần sau (+7 ngày)</span>
                    <span className="text-[10px] bg-blue-100 px-1.5 py-0.5 rounded font-mono">+7d</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenuSessionId(null);
                      openCopyModal(session);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-purple-50 text-purple-700 flex items-center justify-between cursor-pointer">
                    <span>Tùy chỉnh sao chép (Copy)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenuSessionId(null);
                      openAnnouncementModal(session);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-amber-50 text-amber-800 font-semibold flex items-center justify-between cursor-pointer">
                    <span className="flex items-center gap-1.5">
                      <MegaphoneIcon className="w-4 h-4 text-amber-700" />
                      <span>{session.announcement ? 'Sửa thông báo đột xuất' : 'Thêm thông báo đột xuất'}</span>
                    </span>
                    {session.announcement && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenuSessionId(null);
                      openEditModal(session);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 text-slate-700 cursor-pointer">
                    Chỉnh sửa thông tin
                  </button>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenuSessionId(null);
                      setDeletingSession(session);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-rose-50 text-rose-700 font-semibold cursor-pointer">
                    Xóa buổi học này
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* VÙNG CHI TIẾT KẾ HOẠCH GIẢNG DẠY (ACCORDION EXPAND) */}
        {isExpanded && (
          <div className="p-4 sm:p-5 bg-white space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-gray-100">
              <div>
                <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Kế Hoạch Giảng Dạy Chi Tiết ({session.topic})
                </h5>
                <p className="text-[11px] text-gray-400">
                  Học sinh sẽ xem được nội dung sách, dặn dò chuẩn bị và tài liệu này trong thời khóa biểu
                </p>
              </div>

              <div className="flex items-center gap-2">
                {plan && sections.length > 0 && (
                  <button
                    onClick={() => {
                      setCopyingPlanSource(plan);
                      setCopyTargetSessionId('');
                    }}
                    className="text-xs font-medium text-purple-700 hover:underline cursor-pointer">
                    Sao chép kế hoạch sang buổi khác
                  </button>
                )}
                <button
                  onClick={() => openAddSectionModal(session, plan)}
                  className="px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition cursor-pointer shadow-xs">
                  + Thêm Học Phần Mới
                </button>
              </div>
            </div>

            {sections.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-dashed border-gray-300 rounded-lg text-center">
                <p className="text-xs text-gray-500 mb-3">Buổi học này chưa có học phần chi tiết nào.</p>
                <button
                  onClick={() => openAddSectionModal(session, plan)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition cursor-pointer shadow-xs">
                  + Nhập Học Phần Đầu Tiên
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sections.map((sec, secIdx) => (
                  <div
                    key={sec.id || secIdx}
                    className="p-3.5 bg-slate-50/60 border border-gray-200 rounded-lg space-y-2 hover:bg-slate-50 transition">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded">
                          Phần {secIdx + 1}
                        </span>
                        <span className="font-bold text-sm text-gray-800">{sec.content}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 px-2.5 py-0.5 rounded">
                          {sec.timeAllocation || `${sec.durationMinutes || 15} phút`}
                        </span>
                        <button
                          onClick={() => handleCopySection(plan, sec)}
                          title="Nhân bản học phần"
                          className="px-2 py-0.5 text-xs text-purple-700 hover:bg-purple-100 rounded cursor-pointer transition">
                          Copy
                        </button>
                        <button
                          onClick={() => openEditSectionModal(session, plan, sec, secIdx)}
                          className="px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-200 rounded cursor-pointer transition">
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteSection(plan, secIdx)}
                          className="px-2 py-0.5 text-xs text-red-600 hover:bg-red-100 rounded cursor-pointer transition">
                          Xóa
                        </button>
                      </div>
                    </div>

                    {sec.activity && (
                      <div className="text-xs text-purple-700 font-medium">
                        Hoạt động: <span className="font-semibold">{sec.activity}</span>
                      </div>
                    )}

                    {(sec.bookTitle || sec.bookPage) && (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded flex items-center gap-1.5">
                          <BookOpenIcon className="w-3.5 h-3.5" />
                          <span>{sec.bookTitle || 'Sách giáo khoa'}</span>
                          {sec.bookPage && <span>- Trang {sec.bookPage}</span>}
                        </span>
                        {sec.bookId && (
                          <button
                            type="button"
                            onClick={() => {
                              const mat = classMaterials.find(m => String(m.id) === String(sec.bookId));
                              if (mat) setPickingMaterial(mat);
                            }}
                            className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer"
                          >
                            Mở xem sách ↗
                          </button>
                        )}
                      </div>
                    )}

                    {sec.studentPreparation && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 leading-relaxed">
                        <span className="font-bold text-amber-800 block mb-0.5">Dặn dò học sinh chuẩn bị:</span>
                        {sec.studentPreparation}
                      </div>
                    )}

                    {sec.handoutType === 'TEXT' && sec.handoutText && (
                      <div>
                        <button
                          onClick={() => setViewingHandoutText(sec.handoutText)}
                          className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer">
                          Xem văn bản đã dán
                        </button>
                      </div>
                    )}
                    {sec.handoutType === 'FILE' && sec.handoutFilePath && (
                      <div>
                        <a
                          href={sec.handoutFilePath}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded hover:bg-emerald-100">
                          Tải tài liệu: {sec.handoutFileName || 'Tệp đính kèm'}
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-28">
      {/* HEADER & THANH CÔNG CỤ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h3 className="text-xl font-bold text-gray-800">Buổi Học & Kế Hoạch Giảng Dạy</h3>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
              {sessions.length} buổi học
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setIsActivityModalOpen(true)}
            className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition cursor-pointer shadow-xs text-center">
            Thư Viện Hoạt Động
          </button>
          <button
            onClick={openCreateModal}
            className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer shadow-xs text-center">
            + Thêm Buổi Học Mới
          </button>
        </div>
      </div>

      {/* THANH THAO TÁC HÀNG LOẠT (BATCH BAR - HIỆN KHI CÓ BUỔI ĐƯỢC CHỌN) */}
      {selectedSessionIds.size > 0 && (
        <div className="p-3.5 bg-blue-900 text-white rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">
              {selectedSessionIds.size}
            </span>
            <span className="text-xs font-bold">Buổi học đang được chọn</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isBatchProcessing}
              onClick={handleBatchCopyNextWeek}
              className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition cursor-pointer shadow-xs">
              {isBatchProcessing ? 'Đang xử lý...' : 'Sao chép sang tuần sau (+7 ngày)'}
            </button>
            <button
              type="button"
              disabled={isBatchProcessing}
              onClick={handleBatchDelete}
              className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition cursor-pointer shadow-xs">
              {isBatchProcessing ? 'Đang xóa...' : 'Xóa các buổi đã chọn'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedSessionIds(new Set())}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer border border-slate-700">
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* DANH SÁCH BUỔI HỌC VỚI KẾ HOẠCH GIẢNG DẠY TRỰC TIẾP */}
      {sessions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 sm:p-12 text-center shadow-xs">
          <h4 className="font-bold text-gray-700 text-base mb-1">Chưa có buổi học nào trong lớp</h4>
          <p className="text-xs text-gray-500 mb-5 max-w-md mx-auto">
            Bấm nút bên dưới để tạo buổi học đầu tiên kèm kế hoạch giảng dạy chi tiết cho học sinh.
          </p>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs">
            + Thêm Buổi Học & Kế Hoạch Ngay
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* PHẦN 1: BUỔI HỌC SẮP TỚI */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Buổi học sắp tới ({upcomingSessions.length})
                </h4>
                {upcomingSessions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(upcomingSessions)}
                    className="text-xs text-blue-600 hover:underline cursor-pointer font-medium">
                    {upcomingSessions.every(s => selectedSessionIds.has(s.id)) ? 'Bỏ chọn nhóm này' : 'Chọn tất cả nhóm này'}
                  </button>
                )}
              </div>
            </div>

            {upcomingSessions.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                Không có buổi học sắp tới nào.
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map((session, index) => renderSessionCard(session, index, false))}
              </div>
            )}
          </div>

          {/* PHẦN 2: BUỔI HỌC ĐÃ XONG */}
          {pastSessions.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                    Buổi học đã xong ({pastSessions.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(pastSessions)}
                    className="text-xs text-slate-500 hover:underline cursor-pointer font-medium">
                    {pastSessions.every(s => selectedSessionIds.has(s.id)) ? 'Bỏ chọn nhóm này' : 'Chọn tất cả nhóm này'}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {pastSessions.map((session, index) => renderSessionCard(session, upcomingSessions.length + index, true))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL THÊM BUỔI HỌC MỚI (+ KẾ HOẠCH CHI TIẾT) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Thêm Buổi Học Mới</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Lên lịch học và nhập trước kế hoạch giảng dạy chi tiết
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSessionSubmit} className="space-y-4">
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  1. Thông tin buổi học
                </h4>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Chủ đề / Tên buổi học <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={sessionFormData.topic}
                    onChange={(e) => setSessionFormData({ ...sessionFormData, topic: e.target.value })}
                    placeholder="Ví dụ: Unit 1 - Introduction & Ice Breaking"
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Thời gian bắt đầu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={sessionFormData.startTime}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, startTime: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Thời lượng (Phút)
                    </label>
                    <input
                      type="number"
                      min={15}
                      step={15}
                      value={sessionFormData.durationMinutes}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, durationMinutes: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* KHUNG KẾ HOẠCH GIẢNG DẠY KÈM THEO */}
              <div className="space-y-3 bg-blue-50/40 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enablePlan"
                      checked={enablePlanInCreate}
                      onChange={(e) => setEnablePlanInCreate(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="enablePlan" className="text-xs font-bold text-blue-900 cursor-pointer">
                      2. Nhập Kế hoạch giảng dạy chi tiết luôn cho buổi này
                    </label>
                  </div>

                  {enablePlanInCreate && (
                    <button
                      type="button"
                      onClick={handleAddDraftSection}
                      className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded transition cursor-pointer">
                      + Thêm học phần
                    </button>
                  )}
                </div>

                {enablePlanInCreate && (
                  <div className="space-y-3 pt-2">
                    {draftSections.map((sec, idx) => (
                      <div key={idx} className="bg-white p-3.5 rounded-lg border border-blue-200 space-y-2.5 shadow-2xs">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-blue-800">
                            Học phần {idx + 1}
                          </span>
                          {draftSections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDraftSection(idx)}
                              className="text-xs text-red-500 hover:text-red-700">
                              Xóa phần này
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              value={sec.content}
                              onChange={(e) => handleUpdateDraftSection(idx, 'content', e.target.value)}
                              placeholder="Nội dung bài dạy / Sách trang bao nhiêu..."
                              className="w-full border border-gray-300 rounded p-1.5 text-xs"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={sec.timeAllocation}
                              onChange={(e) => handleUpdateDraftSection(idx, 'timeAllocation', e.target.value)}
                              placeholder="Thời lượng (vd: 20 phút)"
                              className="w-full border border-gray-300 rounded p-1.5 text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={sec.activity || ''}
                                onChange={(e) => handleUpdateDraftSection(idx, 'activity', e.target.value)}
                                placeholder="Hoạt động trên lớp (tùy chọn)"
                                className="flex-1 border border-gray-300 rounded p-1.5 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handlePickActivityForDraft(idx)}
                                title="Chọn từ kho hoạt động"
                                className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded text-xs whitespace-nowrap cursor-pointer shadow-xs transition">
                                Chọn từ kho
                              </button>
                            </div>
                            {sec.activity && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded font-medium truncate max-w-[220px]">
                                  {sec.activity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDraftSection(idx, 'activity', '')}
                                  className="text-[10px] text-red-500 hover:underline cursor-pointer">
                                  Bỏ chọn
                                </button>
                              </div>
                            )}
                          </div>

                          <div>
                            <input
                              type="text"
                              value={sec.studentPreparation}
                              onChange={(e) => handleUpdateDraftSection(idx, 'studentPreparation', e.target.value)}
                              placeholder="Dặn dò học sinh chuẩn bị gì..."
                              className="w-full border border-amber-300 bg-amber-50/50 rounded p-1.5 text-xs"
                            />
                          </div>
                        </div>

                        {/* Handout trong phần nháp */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <select
                            value={sec.handoutType}
                            onChange={(e) => handleUpdateDraftSection(idx, 'handoutType', e.target.value)}
                            className="text-xs border border-gray-300 rounded p-1 bg-white">
                            <option value="NONE">Không đính kèm Handout</option>
                            <option value="TEXT">Dán văn bản bài học</option>
                            <option value="FILE">Tải tệp đính kèm (.pdf, .docx, .png...)</option>
                          </select>

                          {sec.handoutType === 'TEXT' && (
                            <textarea
                              rows={2}
                              value={sec.handoutText}
                              onChange={(e) => handleUpdateDraftSection(idx, 'handoutText', e.target.value)}
                              placeholder="Dán toàn bộ văn bản hoặc bài đọc vào đây..."
                              className="w-full border border-gray-300 rounded p-1.5 text-xs font-mono"
                            />
                          )}

                          {sec.handoutType === 'FILE' && (
                            <div className="flex items-center gap-2 w-full">
                              <input
                                type="file"
                                onChange={(e) => handleDraftFileUpload(idx, e.target.files[0])}
                                className="text-xs"
                              />
                              {sec.handoutFileName && (
                                <span className="text-xs text-emerald-700 font-semibold truncate">
                                  ✓ {sec.handoutFileName}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={creating || uploadingHandoutFile}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition cursor-pointer shadow-xs">
                  {creating ? 'Đang tạo...' : 'Tạo Buổi Học & Kế Hoạch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SỬA BUỔI HỌC */}
      {editingSession && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-gray-800">Chỉnh Sửa Thông Tin Buổi Học</h3>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Chủ đề buổi học</label>
                <input
                  type="text"
                  required
                  value={editFormData.topic}
                  onChange={(e) => setEditFormData({ ...editFormData, topic: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Thời gian bắt đầu</label>
                <input
                  type="datetime-local"
                  required
                  value={editFormData.startTime}
                  onChange={(e) => setEditFormData({ ...editFormData, startTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Thời lượng (Phút)</label>
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={editFormData.durationMinutes}
                  onChange={(e) => setEditFormData({ ...editFormData, durationMinutes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg">
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg">
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NHÂN BẢN / COPY BUỔI HỌC (TỰ ĐỘNG ĐIỀN THỜI GIAN CŨ ĐỂ SỬA NHANH) */}
      {copyingSession && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-gray-800">Tùy Chỉnh Sao Chép Buổi Học</h3>
            <p className="text-xs text-gray-500">
              Nhân bản buổi học này và tùy chỉnh lại thời gian hoặc tên theo ý bạn.
            </p>
            <form onSubmit={handleCopySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Chủ đề buổi học mới</label>
                <input
                  type="text"
                  required
                  value={copyFormData.topic}
                  onChange={(e) => setCopyFormData({ ...copyFormData, topic: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Thời gian bắt đầu</label>
                <input
                  type="datetime-local"
                  required
                  value={copyFormData.startTime}
                  onChange={(e) => setCopyFormData({ ...copyFormData, startTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Thời lượng (Phút)</label>
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={copyFormData.durationMinutes}
                  onChange={(e) => setCopyFormData({ ...copyFormData, durationMinutes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="includePlan"
                  checked={copyFormData.includePlan}
                  onChange={(e) => setCopyFormData({ ...copyFormData, includePlan: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="includePlan" className="text-xs text-gray-700 font-medium cursor-pointer">
                  Sao chép toàn bộ Kế hoạch & Học phần sang buổi mới
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCopyingSession(null)}
                  className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg">
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg">
                  Xác nhận nhân bản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA BUỔI HỌC */}
      {deletingSession && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-rose-700">Xác Nhận Xóa Buổi Học</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Bạn có chắc muốn xóa buổi học <b>{deletingSession.topic}</b>? Kế hoạch giảng dạy và dữ liệu điểm danh của buổi học này cũng sẽ bị xóa.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSession(null)}
                className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg">
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteSession}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg">
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM / SỬA HỌC PHẦN TRỰC TIẾP CHO 1 BUỔI HỌC */}
      {activeSessionForSection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-gray-800">
                {editingSectionIndex !== null ? 'Chỉnh Sửa Học Phần' : 'Thêm Học Phần Vào Buổi Học'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setActiveSessionForSection(null);
                  setActivePlanForSection(null);
                  setEditingSectionIndex(null);
                }}
                className="text-gray-400 hover:text-gray-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSection} className="space-y-3">
              {/* Chọn Sách giáo khoa & Trang (Tự động ghi nhớ trang trước) */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-900">
                    Sách giáo khoa & Số trang (Tùy chọn)
                  </label>
                  {sectionFormData.bookId && (
                    <button
                      type="button"
                      onClick={() => {
                        const mat = classMaterials.find(m => String(m.id) === String(sectionFormData.bookId));
                        if (mat) setPickingMaterial(mat);
                      }}
                      className="text-[11px] font-bold text-blue-700 bg-white border border-blue-300 hover:bg-blue-100 px-2.5 py-1 rounded cursor-pointer transition shadow-2xs"
                    >
                      Mở sách & Chọn trang
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <select
                      value={sectionFormData.bookId || ''}
                      onChange={(e) => {
                        const bId = e.target.value;
                        const selectedMat = classMaterials.find(m => String(m.id) === String(bId));
                        setSectionFormData(prev => ({
                          ...prev,
                          bookId: bId,
                          bookTitle: selectedMat ? selectedMat.title : ''
                        }));
                      }}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- Chọn sách giáo khoa của lớp --</option>
                      {classMaterials.map(m => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={sectionFormData.bookPage || ''}
                      onChange={(e) => setSectionFormData({ ...sectionFormData, bookPage: e.target.value })}
                      placeholder="Trang (VD: 45)"
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
                {sectionFormData.bookPage && (
                  <p className="text-[10px] text-blue-700">
                    Tự động ghi nhớ trang {sectionFormData.bookPage} cho các học phần tiếp theo.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nội dung học phần (Tên bài học / kiến thức) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={sectionFormData.content}
                  onChange={(e) => setSectionFormData({ ...sectionFormData, content: e.target.value })}
                  placeholder="Ví dụ: Unit 2 Grammar: Present Perfect / Speaking Part 1"
                  className="w-full border border-gray-300 rounded p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Thời lượng phân bổ</label>
                  <input
                    type="text"
                    value={sectionFormData.timeAllocation}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, timeAllocation: e.target.value })}
                    placeholder="Ví dụ: 15 phút"
                    className="w-full border border-gray-300 rounded p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Hoạt động lớp học</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={sectionFormData.activity || ''}
                      onChange={(e) => setSectionFormData({ ...sectionFormData, activity: e.target.value })}
                      placeholder="Nhập hoặc bấm 'Chọn từ kho'..."
                      className="flex-1 border border-gray-300 rounded p-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setActivitySelectCallback(() => (picked) => {
                          const actName = typeof picked === 'string' ? picked : (picked?.name || '');
                          setSectionFormData(prev => ({
                            ...prev,
                            activity: actName,
                            timeAllocation: (picked && typeof picked === 'object' && picked.timeAllocation) || prev.timeAllocation,
                            studentPreparation: (picked && typeof picked === 'object' && picked.studentPreparation) || prev.studentPreparation
                          }));
                          toast.success(`Đã chọn hoạt động: "${actName}"`);
                        });
                        setIsActivityModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded shadow-xs cursor-pointer transition whitespace-nowrap">
                      Chọn từ kho
                    </button>
                  </div>
                  {sectionFormData.activity && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-md">
                        Đã chọn: {sectionFormData.activity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSectionFormData(prev => ({ ...prev, activity: '' }))}
                        className="text-[11px] text-red-500 hover:underline cursor-pointer">
                        Bỏ chọn
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-800 mb-1">
                  Dặn dò học sinh chuẩn bị bài ở nhà:
                </label>
                <textarea
                  rows={2}
                  value={sectionFormData.studentPreparation}
                  onChange={(e) => setSectionFormData({ ...sectionFormData, studentPreparation: e.target.value })}
                  placeholder="Học sinh đọc trước trang 24, làm bài tập khởi động..."
                  className="w-full border border-amber-300 bg-amber-50/50 rounded p-2 text-xs"
                />
              </div>

              {/* Handout */}
              <div className="space-y-2 pt-1 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-700">Tài liệu đính kèm (Handout)</label>
                <select
                  value={sectionFormData.handoutType}
                  onChange={(e) => setSectionFormData({ ...sectionFormData, handoutType: e.target.value })}
                  className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white">
                  <option value="NONE">Không đính kèm</option>
                  <option value="TEXT">Dán văn bản bài học</option>
                  <option value="FILE">Tải tệp đính kèm (.docx, .pdf, .png...)</option>
                </select>

                {sectionFormData.handoutType === 'TEXT' && (
                  <textarea
                    rows={3}
                    value={sectionFormData.handoutText}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, handoutText: e.target.value })}
                    placeholder="Dán toàn bộ văn bản hoặc bài đọc vào đây..."
                    className="w-full border border-gray-300 rounded p-2 text-xs font-mono"
                  />
                )}

                {sectionFormData.handoutType === 'FILE' && (
                  <div className="space-y-1">
                    <input
                      type="file"
                      onChange={handleSingleFileUpload}
                      className="text-xs"
                    />
                    {uploadingHandoutFile && <div className="text-xs text-blue-600">Đang tải file lên...</div>}
                    {sectionFormData.handoutFileName && (
                      <div className="text-xs text-emerald-700 font-semibold">
                        ✓ Đã đính kèm: {sectionFormData.handoutFileName}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSessionForSection(null);
                    setActivePlanForSection(null);
                    setEditingSectionIndex(null);
                  }}
                  className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={uploadingHandoutFile}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                  Lưu học phần
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SAO CHÉP KẾ HOẠCH SANG BUỔI KHÁC */}
      {copyingPlanSource && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-gray-800">Sao Chép Kế Hoạch Sang Buổi Học Khác</h3>
            <p className="text-xs text-gray-500">
              Chọn buổi học đích trong lớp này để dán toàn bộ các học phần của kế hoạch hiện tại.
            </p>
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-700">Buổi học đích:</label>
              <select
                value={copyTargetSessionId}
                onChange={(e) => setCopyTargetSessionId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white">
                <option value="">-- Chọn buổi học --</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.topic || 'Buổi học'} ({formatDateTime(s.startTime)})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCopyingPlanSource(null)}
                className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg">
                Hủy
              </button>
              <button
                type="button"
                onClick={handleExecuteCopyPlan}
                disabled={!copyTargetSessionId}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg">
                Dán kế hoạch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM HANDOUT TEXT */}
      {viewingHandoutText && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-5">
            <h4 className="text-sm font-bold text-gray-800 mb-2">Nội Dung Văn Bản Đã Dán</h4>
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

      {/* MODAL THƯ VIỆN HOẠT ĐỘNG */}
      <ActivityLibraryModal
        isOpen={isActivityModalOpen}
        onClose={() => {
          setIsActivityModalOpen(false);
          setActivitySelectCallback(null);
          activityApi.getAll().then(res => setActivities(res || []));
        }}
        onSelectActivity={activitySelectCallback ? (picked) => {
          activitySelectCallback(picked);
          setIsActivityModalOpen(false);
          setActivitySelectCallback(null);
          activityApi.getAll().then(res => setActivities(res || []));
        } : null}
      />

      {/* MODAL MỞ SÁCH VÀ CHỌN TRANG */}
      {pickingMaterial && (
        <BookPagePickerModal
          material={pickingMaterial}
          initialPage={Number(sectionFormData.bookPage) || 1}
          onSelectPage={(page) => {
            setSectionFormData(prev => ({
              ...prev,
              bookPage: String(page)
            }));
            toast.success(`Đã chọn trang ${page} của sách "${pickingMaterial.title}"`);
          }}
          onClose={() => setPickingMaterial(null)}
        />
      )}

      {/* MODAL THÊM / SỬA THÔNG BÁO ĐỘT XUẤT CHO BUỔI HỌC */}
      {announcementModalSession && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-1.5 text-red-600 font-bold text-xs uppercase tracking-wider">
                  <MegaphoneIcon className="w-4 h-4 shrink-0" />
                  <span>Thông báo đột xuất cho buổi học</span>
                </div>
                <h3 className="text-base font-bold text-gray-800 mt-1">
                  {announcementModalSession.topic || 'Buổi học'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAnnouncementModalSession(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Nội dung thông báo cho học sinh:
                </label>
                <textarea
                  rows={4}
                  value={announcementInput}
                  onChange={(e) => setAnnouncementInput(e.target.value)}
                  placeholder="Ví dụ: Hôm nay trời mưa to, lớp chuyển sang học online qua Zoom: https://zoom.us/j/... hoặc Mang theo giấy kiểm tra A4..."
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 leading-relaxed"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Thông báo này sẽ hiển thị nổi bật với <b>viền đỏ nhấp nháy</b> và <b>nền vàng</b> ở trên cùng khi học sinh mở xem buổi học.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                {announcementModalSession.announcement ? (
                  <button
                    type="button"
                    disabled={savingAnnouncement}
                    onClick={handleDeleteAnnouncement}
                    className="px-3.5 py-2 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition cursor-pointer">
                    Xóa thông báo
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAnnouncementModalSession(null)}
                    className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition cursor-pointer">
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={savingAnnouncement}
                    className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition cursor-pointer shadow-xs">
                    {savingAnnouncement ? 'Đang lưu...' : 'Lưu thông báo'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
