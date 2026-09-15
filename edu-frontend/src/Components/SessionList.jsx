import { useState, useEffect } from 'react';
import { sessionApi } from '../api/sessionApi';
import { teachingPlanApi } from '../api/teachingPlanApi';
import { activityApi } from '../api/activityApi';
import { fileApi } from '../api/fileApi';
import ActivityLibraryModal from './ActivityLibraryModal';

export default function SessionList({ classId, onSelectSessionForAttendance }) {
  const [sessions, setSessions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Accordion mở xem kế hoạch của buổi học (lưu danh sách ID các buổi đang mở)
  const [expandedSessionIds, setExpandedSessionIds] = useState(new Set());

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
    handoutFilePath: ''
  });
  const [uploadingHandoutFile, setUploadingHandoutFile] = useState(false);

  // Modal SAO CHÉP KẾ HOẠCH SANG BUỔI KHÁC
  const [copyingPlanSource, setCopyingPlanSource] = useState(null);
  const [copyTargetSessionId, setCopyTargetSessionId] = useState('');

  // Modal XEM VĂN BẢN HANDOUT ĐÃ DÁN
  const [viewingHandoutText, setViewingHandoutText] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, plansRes, activitiesRes] = await Promise.allSettled([
        sessionApi.getByClass(classId),
        teachingPlanApi.getByClass(classId),
        activityApi.getAll()
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

      // Mặc định mở accordion buổi học đầu tiên nếu có
      if (sessionList.length > 0 && expandedSessionIds.size === 0) {
        setExpandedSessionIds(new Set([sessionList[0].id]));
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu buổi học:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [classId]);

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
        activity: activities.length > 0 ? activities[0].name : '',
        studentPreparation: '',
        handoutType: 'NONE',
        handoutText: '',
        handoutFileName: '',
        handoutFilePath: ''
      }
    ]);
    setIsCreateModalOpen(true);
  };

  // Thêm 1 dòng học phần nháp trong modal tạo buổi học
  const addDraftSectionRow = () => {
    setDraftSections(prev => [
      ...prev,
      {
        timeAllocation: '30 phút',
        content: '',
        activity: activities.length > 0 ? activities[0].name : '',
        studentPreparation: '',
        handoutType: 'NONE',
        handoutText: '',
        handoutFileName: '',
        handoutFilePath: ''
      }
    ]);
  };

  // Xóa 1 dòng học phần nháp
  const removeDraftSectionRow = (idx) => {
    setDraftSections(prev => prev.filter((_, i) => i !== idx));
  };

  // Cập nhật thông tin học phần nháp
  const updateDraftSection = (idx, field, value) => {
    setDraftSections(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  // Upload file handout cho học phần nháp
  const handleDraftFileUpload = async (idx, file) => {
    if (!file) return;
    try {
      const res = await fileApi.upload(file);
      updateDraftSection(idx, 'handoutType', 'FILE');
      updateDraftSection(idx, 'handoutFileName', res.fileName);
      updateDraftSection(idx, 'handoutFilePath', res.fileUrl);
    } catch (err) {
      alert('Lỗi tải tệp lên: ' + (err.response?.data?.message || err.message));
    }
  };

  // XỬ LÝ LƯU BUỔI HỌC MỚI & KẾ HOẠCH GIẢNG DẠY
  const handleCreateSessionWithPlan = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      // 1. Tạo buổi học
      const newSession = await sessionApi.create(classId, {
        topic: sessionFormData.topic,
        startTime: sessionFormData.startTime,
        durationMinutes: parseInt(sessionFormData.durationMinutes, 10)
      });

      // 2. Tạo Kế hoạch giảng dạy nếu có nhập học phần
      const validSections = draftSections.filter(sec => sec.content.trim() !== '');
      if (enablePlanInCreate && validSections.length > 0) {
        const sectionsPayload = validSections.map((sec, i) => ({
          durationMinutes: parseInt(sec.timeAllocation) || 30,
          timeAllocation: sec.timeAllocation,
          content: sec.content,
          activity: sec.activity || null,
          studentPreparation: sec.studentPreparation || null,
          handoutType: sec.handoutType === 'NONE' ? null : sec.handoutType,
          handoutText: sec.handoutType === 'TEXT' ? sec.handoutText : null,
          handoutFileName: sec.handoutType === 'FILE' ? sec.handoutFileName : null,
          handoutFilePath: sec.handoutType === 'FILE' ? sec.handoutFilePath : null,
          orderIndex: i + 1
        }));

        await teachingPlanApi.create(classId, newSession.id, {
          title: `Kế hoạch: ${newSession.topic}`,
          sections: sectionsPayload
        });
      }

      await loadData();
      // Tự động mở xem buổi học vừa tạo
      setExpandedSessionIds(prev => new Set([...prev, newSession.id]));
      setIsCreateModalOpen(false);
    } catch (error) {
      alert('Lỗi khi tạo buổi học và kế hoạch: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreating(false);
    }
  };

  // Mở modal Sửa buổi học
  const openEditModal = (session) => {
    setEditingSession(session);
    setEditFormData({
      topic: session.topic || '',
      startTime: session.startTime ? session.startTime.substring(0, 16) : '',
      durationMinutes: session.durationMinutes || 90
    });
  };

  // Xử lý Cập nhật Buổi học
  const handleEditSessionSubmit = async (e) => {
    e.preventDefault();
    try {
      await sessionApi.update(classId, editingSession.id, {
        topic: editFormData.topic,
        startTime: editFormData.startTime,
        durationMinutes: parseInt(editFormData.durationMinutes, 10)
      });
      await loadData();
      setEditingSession(null);
    } catch (error) {
      alert('Lỗi cập nhật buổi học: ' + (error.response?.data?.message || error.message));
    }
  };

  // Mở modal Nhân bản buổi học
  const openCopyModal = (session) => {
    setCopyingSession(session);
    setCopyFormData({
      topic: `${session.topic || 'Buổi học'} (Bản sao)`,
      startTime: '',
      durationMinutes: session.durationMinutes || 90,
      includePlan: true
    });
  };

  // Xử lý Nhân bản buổi học (+ Kế hoạch nếu tích chọn)
  const handleCopySessionSubmit = async (e) => {
    e.preventDefault();
    try {
      const created = await sessionApi.create(classId, {
        topic: copyFormData.topic,
        startTime: copyFormData.startTime,
        durationMinutes: parseInt(copyFormData.durationMinutes, 10)
      });

      // Nếu có kế hoạch ở buổi gốc và giáo viên muốn sao chép cả kế hoạch
      if (copyFormData.includePlan) {
        const sourcePlan = plans.find(p => (p.sessionId === copyingSession.id) || (p.session && p.session.id === copyingSession.id));
        if (sourcePlan) {
          await teachingPlanApi.copy(sourcePlan.id, created.id);
        }
      }

      await loadData();
      setCopyingSession(null);
      setExpandedSessionIds(prev => new Set([...prev, created.id]));
    } catch (error) {
      alert('Lỗi nhân bản buổi học: ' + (error.response?.data?.message || error.message));
    }
  };

  // Xóa buổi học
  const handleDeleteSession = async () => {
    if (!deletingSession) return;
    try {
      await sessionApi.delete(classId, deletingSession.id);
      setDeletingSession(null);
      await loadData();
    } catch (error) {
      alert('Lỗi khi xóa buổi học: ' + (error.response?.data?.message || error.message));
    }
  };

  // =================== THAO TÁC KẾ HOẠCH & HỌC PHẦN TRỰC TIẾP ===================

  // Mở modal Thêm học phần mới vào buổi học
  const openAddSectionModal = (session, existingPlan) => {
    setActiveSessionForSection(session);
    setActivePlanForSection(existingPlan);
    setEditingSectionIndex(null);
    setSectionFormData({
      timeAllocation: '15 phút',
      content: '',
      activity: activities.length > 0 ? activities[0].name : '',
      studentPreparation: '',
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
    setSectionFormData({
      timeAllocation: section.timeAllocation || `${section.durationMinutes || 15} phút`,
      content: section.content || '',
      activity: section.activity || '',
      studentPreparation: section.studentPreparation || '',
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
    } catch (err) {
      alert('Lỗi tải tệp lên: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingHandoutFile(false);
    }
  };

  // Lưu Học Phần (Thêm mới hoặc Cập nhật)
  const handleSaveSection = async (e) => {
    e.preventDefault();
    if (!activeSessionForSection) return;

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
      setActiveSessionForSection(null);
      setActivePlanForSection(null);
      setEditingSectionIndex(null);
    } catch (error) {
      alert('Lỗi lưu học phần: ' + (error.response?.data?.message || error.message));
    }
  };

  // Xóa 1 học phần
  const handleDeleteSection = async (plan, sectionIndex) => {
    if (!window.confirm('Bạn có chắc muốn xóa học phần này khỏi kế hoạch?')) return;
    try {
      const updatedSections = plan.sections.filter((_, idx) => idx !== sectionIndex);
      await teachingPlanApi.update(plan.id, {
        title: plan.title,
        sections: updatedSections
      });
      await loadData();
    } catch (error) {
      alert('Lỗi xóa học phần: ' + (error.response?.data?.message || error.message));
    }
  };

  // Nhân bản 1 học phần trong buổi
  const handleCopySection = async (plan, section) => {
    try {
      const currentSections = [...(plan.sections || [])];
      const copiedSection = {
        ...section,
        content: `${section.content} (Bản sao)`,
        orderIndex: currentSections.length + 1
      };
      currentSections.push(copiedSection);

      await teachingPlanApi.update(plan.id, {
        title: plan.title,
        sections: currentSections
      });
      await loadData();
    } catch (error) {
      alert('Lỗi nhân bản học phần: ' + (error.response?.data?.message || error.message));
    }
  };

  // Sao chép kế hoạch sang buổi học khác
  const handleCopyPlanToOtherSession = async (e) => {
    e.preventDefault();
    if (!copyTargetSessionId) {
      alert('Vui lòng chọn buổi học đích!');
      return;
    }
    try {
      await teachingPlanApi.copy(copyingPlanSource.id, copyTargetSessionId);
      await loadData();
      setCopyingPlanSource(null);
      setCopyTargetSessionId('');
    } catch (error) {
      alert('Lỗi khi sao chép kế hoạch: ' + (error.response?.data?.message || error.message));
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

  if (loading) return <div className="text-gray-500 py-6 text-sm">Đang tải lịch buổi học & kế hoạch giảng dạy...</div>;

  return (
    <div className="space-y-6">
      {/* HEADER & THANH CÔNG CỤ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h3 className="text-xl font-bold text-gray-800">Buổi Học & Kế Hoạch Giảng Dạy</h3>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
              {sessions.length} buổi học
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Quản lý lịch học, chi tiết từng học phần, hoạt động và dặn dò học sinh chuẩn bị bài
          </p>
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
        <div className="space-y-4">
          {sessions.map((session, index) => {
            const plan = plans.find(p => (p.sessionId === session.id) || (p.session && p.session.id === session.id));
            const sections = plan?.sections || [];
            const isExpanded = expandedSessionIds.has(session.id);

            return (
              <div
                key={session.id}
                className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden transition-all duration-150">
                {/* THANH TIÊU ĐỀ BUỔI HỌC (CARD HEADER) */}
                <div className="p-4 sm:p-5 bg-slate-50 border-b border-gray-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                  <div className="space-y-1 w-full lg:w-auto">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-800 text-white rounded">
                        Buổi {index + 1}
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
                    </div>
                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                      <span>Bắt đầu: <b className="text-gray-700">{formatDateTime(session.startTime)}</b></span>
                      <span>Thời lượng: <b className="text-gray-700">{session.durationMinutes || 90} phút</b></span>
                      <span>Dự kiến kết thúc: <b className="text-gray-700">{formatDateTime(session.endTime)}</b></span>
                    </div>
                  </div>

                  {/* NÚT THAO TÁC NHANH CHO BUỔI HỌC */}
                  <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto justify-start lg:justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-200">
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
                      onClick={() => openCopyModal(session)}
                      title="Nhân bản buổi học này"
                      className="px-2.5 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition cursor-pointer">
                      Copy
                    </button>
                    <button
                      onClick={() => openEditModal(session)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition cursor-pointer">
                      Sửa
                    </button>
                    <button
                      onClick={() => setDeletingSession(session)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition cursor-pointer">
                      Xóa
                    </button>
                  </div>
                </div>

                {/* VÙNG CHI TIẾT KẾ HOẠCH GIẢNG DẠY (ACCORDION EXPAND) */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 bg-white space-y-4 animate-fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-gray-100">
                      <div>
                        <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Kế Hoạch Giảng Dạy Chi Tiết Buổi {index + 1}
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
                                  className="px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100 rounded cursor-pointer transition font-medium">
                                  Sửa
                                </button>
                                <button
                                  onClick={() => handleDeleteSection(plan, secIdx)}
                                  className="px-2 py-0.5 text-xs text-red-600 hover:bg-red-100 rounded cursor-pointer transition font-medium">
                                  Xóa
                                </button>
                              </div>
                            </div>

                            {/* Hoạt động trên lớp */}
                            {sec.activity && (
                              <div className="text-xs text-purple-700 font-medium">
                                Hoạt động: <span className="font-semibold">{sec.activity}</span>
                              </div>
                            )}

                            {/* Dặn dò học sinh cần chuẩn bị gì */}
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
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL 1: TẠO BUỔI HỌC KÈM KẾ HOẠCH GIẢNG DẠY ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-6 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Thêm Buổi Học & Lập Kế Hoạch Giảng Dạy</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Nhập thông tin buổi học và lên kế hoạch các học phần ngay trong cùng một bước
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white text-xl font-bold p-1 cursor-pointer">
                ✕
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <form onSubmit={handleCreateSessionWithPlan} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* PHẦN 1: THÔNG TIN BUỔI HỌC */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  1. Thông tin Buổi Học
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Chủ đề bài học <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={sessionFormData.topic}
                    onChange={(e) => setSessionFormData({ ...sessionFormData, topic: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="VD: Lesson 1: Introduction to Writing Task 1"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Thời gian bắt đầu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={sessionFormData.startTime}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, startTime: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Thời lượng buổi học (phút) <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-1.5 mb-1.5">
                      {[45, 60, 90, 120].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setSessionFormData({ ...sessionFormData, durationMinutes: mins })}
                          className={`flex-1 py-1 text-xs font-semibold rounded border cursor-pointer transition ${Number(sessionFormData.durationMinutes) === mins ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}`}>
                          {mins}p
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      required
                      min="15"
                      max="480"
                      value={sessionFormData.durationMinutes}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, durationMinutes: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Số phút"
                    />
                  </div>
                </div>
              </div>

              {/* PHẦN 2: KẾ HOẠCH GIẢNG DẠY (HỌC PHẦN) */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enablePlanCheck"
                      checked={enablePlanInCreate}
                      onChange={(e) => setEnablePlanInCreate(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded cursor-pointer"
                    />
                    <label htmlFor="enablePlanCheck" className="text-xs font-bold text-gray-800 uppercase tracking-wider cursor-pointer">
                      2. Nhập Kế Hoạch Giảng Dạy Chi Tiết Cho Buổi Này
                    </label>
                  </div>

                  {enablePlanInCreate && (
                    <button
                      type="button"
                      onClick={addDraftSectionRow}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer self-start sm:self-auto">
                      + Thêm học phần tiếp theo
                    </button>
                  )}
                </div>

                {enablePlanInCreate && (
                  <div className="space-y-4">
                    {draftSections.map((sec, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3 relative">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded">
                            Học phần {idx + 1}
                          </span>
                          {draftSections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeDraftSectionRow(idx)}
                              className="text-xs text-red-600 hover:underline cursor-pointer font-medium">
                              Xóa học phần này
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Nội dung (Tên sách, chương, bài) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={sec.content}
                              onChange={(e) => updateDraftSection(idx, 'content', e.target.value)}
                              placeholder="VD: English File Beginner - Unit 1A: Hello!"
                              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Thời gian phân bổ
                            </label>
                            <input
                              type="text"
                              value={sec.timeAllocation}
                              onChange={(e) => updateDraftSection(idx, 'timeAllocation', e.target.value)}
                              placeholder="VD: 30 phút"
                              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-semibold text-gray-700">
                                Hoạt động trong lớp
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  setActivitySelectCallback(() => (actName) => updateDraftSection(idx, 'activity', actName));
                                  setIsActivityModalOpen(true);
                                }}
                                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline">
                                Tra cứu & chọn
                              </button>
                            </div>
                            <select
                              value={sec.activity}
                              onChange={(e) => updateDraftSection(idx, 'activity', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 bg-white">
                              <option value="">-- Chọn hoạt động từ thư viện --</option>
                              {activities.map(act => (
                                <option key={act.id} value={act.name}>
                                  {act.name} {act.category ? `(${act.category})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-amber-800 mb-1">
                              Học sinh cần chuẩn bị gì?
                            </label>
                            <input
                              type="text"
                              value={sec.studentPreparation}
                              onChange={(e) => updateDraftSection(idx, 'studentPreparation', e.target.value)}
                              placeholder="VD: Xem trước trang 4-6, chuẩn bị tai nghe & micro..."
                              className="w-full border border-amber-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-amber-500 bg-amber-50/40 text-amber-900"
                            />
                          </div>
                        </div>

                        {/* Tài liệu đính kèm Handout */}
                        <div className="pt-2 border-t border-gray-200">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Tài liệu học tập (Handout cho học sinh)
                          </label>
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                              <input
                                type="radio"
                                name={`handoutType_${idx}`}
                                checked={sec.handoutType === 'NONE'}
                                onChange={() => updateDraftSection(idx, 'handoutType', 'NONE')}
                              />
                              Không có
                            </label>
                            <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                              <input
                                type="radio"
                                name={`handoutType_${idx}`}
                                checked={sec.handoutType === 'TEXT'}
                                onChange={() => updateDraftSection(idx, 'handoutType', 'TEXT')}
                              />
                              Dán văn bản trực tiếp
                            </label>
                            <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                              <input
                                type="radio"
                                name={`handoutType_${idx}`}
                                checked={sec.handoutType === 'FILE'}
                                onChange={() => updateDraftSection(idx, 'handoutType', 'FILE')}
                              />
                              Đính kèm tệp (.docx, .pdf)
                            </label>
                          </div>

                          {sec.handoutType === 'TEXT' && (
                            <textarea
                              rows={2}
                              value={sec.handoutText}
                              onChange={(e) => updateDraftSection(idx, 'handoutText', e.target.value)}
                              placeholder="Nhập hoặc dán nội dung văn bản handout tại đây..."
                              className="w-full mt-2 border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                          )}

                          {sec.handoutType === 'FILE' && (
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                type="file"
                                onChange={(e) => handleDraftFileUpload(idx, e.target.files[0])}
                                className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                              />
                              {sec.handoutFileName && (
                                <span className="text-xs text-emerald-700 font-medium truncate max-w-xs">
                                  ✓ Đã chọn: {sec.handoutFileName}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addDraftSectionRow}
                      className="w-full py-2 border-2 border-dashed border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-semibold transition cursor-pointer">
                      + Thêm Một Học Phần Khác Vào Buổi Học Này
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white pb-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition cursor-pointer shadow-xs">
                  {creating ? 'Đang lưu...' : 'Lưu Buổi Học & Kế Hoạch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: THÊM / SỬA HỌC PHẦN ĐƠN LẺ ================= */}
      {activeSessionForSection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg my-6 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold">
                  {editingSectionIndex !== null ? 'Chỉnh Sửa Học Phần' : 'Thêm Học Phần Mới'}
                </h4>
                <p className="text-xs text-slate-300 truncate max-w-sm">
                  Buổi: {activeSessionForSection.topic}
                </p>
              </div>
              <button
                onClick={() => setActiveSessionForSection(null)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSection} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nội dung (Tên sách, chương, chủ đề) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={sectionFormData.content}
                  onChange={(e) => setSectionFormData({ ...sectionFormData, content: e.target.value })}
                  placeholder="VD: English File Beginner - Unit 1A: Hello!"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Khoảng thời gian
                  </label>
                  <input
                    type="text"
                    value={sectionFormData.timeAllocation}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, timeAllocation: e.target.value })}
                    placeholder="VD: 15 phút, 30 phút"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      Hoạt động
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setActivitySelectCallback(() => (actName) => setSectionFormData(prev => ({ ...prev, activity: actName })));
                        setIsActivityModalOpen(true);
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline">
                      Tra cứu & chọn
                    </button>
                  </div>
                  <select
                    value={sectionFormData.activity}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, activity: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">-- Không chọn --</option>
                    {activities.map(act => (
                      <option key={act.id} value={act.name}>
                        {act.name} {act.category ? `(${act.category})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-800 mb-1">
                  Học sinh cần chuẩn bị gì? (Sẽ hiện trên Thời khóa biểu học sinh)
                </label>
                <textarea
                  rows={2}
                  value={sectionFormData.studentPreparation}
                  onChange={(e) => setSectionFormData({ ...sectionFormData, studentPreparation: e.target.value })}
                  placeholder="VD: Xem trước trang 4-6 trong giáo trình, chuẩn bị micro để luyện đọc..."
                  className="w-full border border-amber-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-amber-500 bg-amber-50/40 text-amber-900"
                />
              </div>

              <div className="pt-2 border-t border-gray-200">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tài liệu Handout phát cho học sinh
                </label>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="singleHandoutType"
                      checked={sectionFormData.handoutType === 'NONE'}
                      onChange={() => setSectionFormData({ ...sectionFormData, handoutType: 'NONE' })}
                    />
                    Không
                  </label>
                  <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="singleHandoutType"
                      checked={sectionFormData.handoutType === 'TEXT'}
                      onChange={() => setSectionFormData({ ...sectionFormData, handoutType: 'TEXT' })}
                    />
                    Dán văn bản
                  </label>
                  <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="singleHandoutType"
                      checked={sectionFormData.handoutType === 'FILE'}
                      onChange={() => setSectionFormData({ ...sectionFormData, handoutType: 'FILE' })}
                    />
                    Tải tệp (.docx, .pdf)
                  </label>
                </div>

                {sectionFormData.handoutType === 'TEXT' && (
                  <textarea
                    rows={3}
                    value={sectionFormData.handoutText}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, handoutText: e.target.value })}
                    placeholder="Dán nội dung bài học..."
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                )}

                {sectionFormData.handoutType === 'FILE' && (
                  <div className="space-y-2">
                    <input
                      type="file"
                      onChange={handleSingleFileUpload}
                      className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700"
                    />
                    {uploadingHandoutFile && (
                      <span className="text-xs text-blue-600 block">Đang tải file lên...</span>
                    )}
                    {sectionFormData.handoutFileName && (
                      <div className="text-xs text-emerald-700 font-medium">
                        ✓ Tệp hiện tại: {sectionFormData.handoutFileName}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setActiveSessionForSection(null)}
                  className="px-4 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer shadow-xs">
                  {editingSectionIndex !== null ? 'Lưu thay đổi' : 'Thêm học phần'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: SỬA BUỔI HỌC ================= */}
      {editingSession && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5">
            <h4 className="text-base font-bold text-gray-800 mb-4">Chỉnh Sửa Buổi Học</h4>
            <form onSubmit={handleEditSessionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Chủ đề bài học <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.topic}
                  onChange={(e) => setEditFormData({ ...editFormData, topic: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Thời gian bắt đầu <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={editFormData.startTime}
                  onChange={(e) => setEditFormData({ ...editFormData, startTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Thời lượng (phút) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="15"
                  max="480"
                  value={editFormData.durationMinutes}
                  onChange={(e) => setEditFormData({ ...editFormData, durationMinutes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="px-4 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer">
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: NHÂN BẢN BUỔI HỌC ================= */}
      {copyingSession && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5">
            <h4 className="text-base font-bold text-gray-800 mb-2">Nhân Bản Buổi Học</h4>
            <p className="text-xs text-gray-500 mb-4">
              Tạo một buổi học mới dựa trên buổi "{copyingSession.topic}"
            </p>

            <form onSubmit={handleCopySessionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Chủ đề bài học mới <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={copyFormData.topic}
                  onChange={(e) => setCopyFormData({ ...copyFormData, topic: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Thời gian bắt đầu mới <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={copyFormData.startTime}
                  onChange={(e) => setCopyFormData({ ...copyFormData, startTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Thời lượng (phút)
                </label>
                <input
                  type="number"
                  required
                  value={copyFormData.durationMinutes}
                  onChange={(e) => setCopyFormData({ ...copyFormData, durationMinutes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-purple-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={copyFormData.includePlan}
                    onChange={(e) => setCopyFormData({ ...copyFormData, includePlan: e.target.checked })}
                    className="h-4 w-4 text-purple-600 rounded"
                  />
                  Sao chép kèm toàn bộ Kế hoạch giảng dạy (học phần, dặn dò, tài liệu)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setCopyingSession(null)}
                  className="px-4 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg cursor-pointer">
                  Xác nhận nhân bản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 5: XÁC NHẬN XÓA BUỔI HỌC ================= */}
      {deletingSession && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 text-center">
            <h4 className="text-base font-bold text-gray-800 mb-2">Xác Nhận Xóa Buổi Học</h4>
            <p className="text-xs text-gray-600 mb-5">
              Bạn có chắc muốn xóa buổi học <b>"{deletingSession.topic}"</b>?<br />
              Kế hoạch giảng dạy của buổi này cũng sẽ bị xóa.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeletingSession(null)}
                className="px-4 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteSession}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer shadow-xs">
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 6: SAO CHÉP KẾ HOẠCH SANG BUỔI KHÁC ================= */}
      {copyingPlanSource && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5">
            <h4 className="text-base font-bold text-gray-800 mb-2">Sao Chép Kế Hoạch Sang Buổi Khác</h4>
            <p className="text-xs text-gray-500 mb-4">
              Kế hoạch nguồn: <b>{copyingPlanSource.title}</b> ({copyingPlanSource.sections?.length || 0} học phần)
            </p>

            <form onSubmit={handleCopyPlanToOtherSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Chọn buổi học đích <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={copyTargetSessionId}
                  onChange={(e) => setCopyTargetSessionId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">-- Chọn buổi học muốn áp dụng kế hoạch này --</option>
                  {sessions
                    .filter(s => (s.id !== copyingPlanSource.sessionId) && (!copyingPlanSource.session || s.id !== copyingPlanSource.session.id))
                    .map((s, idx) => (
                      <option key={s.id} value={s.id}>
                        Buổi {idx + 1}: {s.topic || 'Buổi học'} ({formatDateTime(s.startTime)})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setCopyingPlanSource(null)}
                  className="px-4 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg cursor-pointer">
                  Sao chép ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 7: XEM HANDOUT TEXT ================= */}
      {viewingHandoutText && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-5">
            <h4 className="text-sm font-bold text-gray-800 mb-2">Văn Bản Bài Học Đã Dán</h4>
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
      {isActivityModalOpen && (
        <ActivityLibraryModal
          isOpen={isActivityModalOpen}
          onClose={() => {
            setIsActivityModalOpen(false);
            setActivitySelectCallback(null);
            loadData();
          }}
          onSelectActivity={activitySelectCallback}
        />
      )}
    </div>
  );
}
