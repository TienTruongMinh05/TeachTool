import { useState, useEffect } from 'react';
import { teachingPlanApi } from '../api/teachingPlanApi';
import { sessionApi } from '../api/sessionApi';
import { activityApi } from '../api/activityApi';
import { fileApi } from '../api/fileApi';
import ActivityLibraryModal from './ActivityLibraryModal';
import { useToast } from '../context/ToastContext';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { CheckCircleIcon } from './Icons';

export default function TeachingPlanManager({ classId }) {
  const { toast, confirm } = useToast();
  const { t, lang } = useThemeLanguage();
  const [plans, setPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Thư viện hoạt động modal
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  // Modal tạo Kế hoạch
  const [isCreatePlanModalOpen, setIsCreatePlanModalOpen] = useState(false);
  const [newPlanData, setNewPlanData] = useState({ sessionId: '', title: '' });

  // Modal Copy Kế hoạch
  const [copyingPlan, setCopyingPlan] = useState(null);
  const [targetSessionId, setTargetSessionId] = useState('');

  // Modal Thêm/Sửa Học Phần
  const [activePlanForSection, setActivePlanForSection] = useState(null);
  const [editingSectionIndex, setEditingSectionIndex] = useState(null); // null = thêm mới, number = đang sửa
  const [sectionFormData, setSectionFormData] = useState({
    timeAllocation: '15 phút',
    content: '',
    activity: '',
    handoutType: 'NONE', // 'NONE' | 'TEXT' | 'FILE'
    handoutText: '',
    handoutFileName: '',
    handoutFilePath: '',
    studentPreparation: ''
  });
  const [uploadingFile, setUploadingFile] = useState(false);

  // Modal Xem Handout Text
  const [viewingHandoutText, setViewingHandoutText] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, sessionsRes, activitiesRes] = await Promise.allSettled([
        teachingPlanApi.getByClass(classId),
        sessionApi.getByClass(classId),
        activityApi.getAll()
      ]);

      if (plansRes.status === 'fulfilled' && Array.isArray(plansRes.value)) {
        setPlans(plansRes.value);
      } else {
        setPlans([]);
      }

      if (sessionsRes.status === 'fulfilled' && Array.isArray(sessionsRes.value)) {
        const sortedSessions = [...sessionsRes.value].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        setSessions(sortedSessions);
      } else {
        setSessions([]);
      }

      if (activitiesRes.status === 'fulfilled' && Array.isArray(activitiesRes.value)) {
        setActivities(activitiesRes.value);
      } else {
        setActivities([]);
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu kế hoạch giảng dạy:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [classId]);

  // Tạo Kế hoạch mới
  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!newPlanData.sessionId) {
      toast.warning(lang === 'en' ? 'Please select a session!' : 'Vui lòng chọn một buổi học!');
      return;
    }
    try {
      const selectedSession = sessions.find(s => s.id === Number(newPlanData.sessionId));
      const title = newPlanData.title || (lang === 'en' ? `Lesson Plan: ${selectedSession?.topic || `Session ${selectedSession?.id}`}` : `Kế hoạch: ${selectedSession?.topic || `Buổi học ${selectedSession?.id}`}`);
      await teachingPlanApi.create(classId, newPlanData.sessionId, {
        title,
        sections: []
      });
      loadData();
      setIsCreatePlanModalOpen(false);
      setNewPlanData({ sessionId: '', title: '' });
      toast.success(lang === 'en' ? `Created lesson plan "${title}"` : `Đã tạo kế hoạch "${title}"`);
    } catch (error) {
      toast.error(lang === 'en' ? ('Error creating plan: ' + (error.response?.data?.message || error.message)) : ('Lỗi tạo kế hoạch: ' + (error.response?.data?.message || error.message)));
    }
  };

  // Copy Kế hoạch sang buổi khác
  const handleCopyPlan = async (e) => {
    e.preventDefault();
    if (!targetSessionId) {
      toast.warning(lang === 'en' ? 'Please select target session!' : 'Vui lòng chọn buổi học đích!');
      return;
    }
    try {
      await teachingPlanApi.copy(copyingPlan.id, targetSessionId);
      loadData();
      setCopyingPlan(null);
      setTargetSessionId('');
      toast.success(lang === 'en' ? 'Copied lesson plan to new session!' : 'Đã sao chép kế hoạch sang buổi học mới!');
    } catch (error) {
      toast.error(lang === 'en' ? ('Error copying plan: ' + (error.response?.data?.message || error.message)) : ('Lỗi nhân bản kế hoạch: ' + (error.response?.data?.message || error.message)));
    }
  };

  // Xóa Kế hoạch
  const handleDeletePlan = async (planId, title) => {
    const ok = await confirm({
      title: lang === 'en' ? 'Delete lesson plan' : 'Xóa kế hoạch',
      message: lang === 'en' ? `Are you sure you want to delete lesson plan "${title}"?` : `Bạn có chắc muốn xóa kế hoạch "${title}"?`,
      confirmText: lang === 'en' ? 'Delete plan' : 'Xóa kế hoạch',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await teachingPlanApi.delete(planId);
      loadData();
      toast.success(lang === 'en' ? `Deleted plan "${title}"` : `Đã xóa kế hoạch "${title}"`);
    } catch (error) {
      toast.error(lang === 'en' ? ('Error deleting plan: ' + (error.response?.data?.message || error.message)) : ('Lỗi khi xóa kế hoạch: ' + (error.response?.data?.message || error.message)));
    }
  };

  // Mở modal thêm học phần
  const openAddSectionModal = (plan) => {
    setActivePlanForSection(plan);
    setEditingSectionIndex(null);
    setSectionFormData({
      timeAllocation: lang === 'en' ? '15 mins' : '15 phút',
      content: '',
      activity: '',
      handoutType: 'NONE',
      handoutText: '',
      handoutFileName: '',
      handoutFilePath: ''
    });
  };

  // Mở modal sửa học phần
  const openEditSectionModal = (plan, section, index) => {
    setActivePlanForSection(plan);
    setEditingSectionIndex(index);
    setSectionFormData({
      timeAllocation: section.timeAllocation || `${section.durationMinutes || 15} ${lang === 'en' ? 'mins' : 'phút'}`,
      content: section.content || '',
      activity: section.activity || '',
      handoutType: section.handoutType || 'NONE',
      handoutText: section.handoutText || '',
      handoutFileName: section.handoutFileName || '',
      handoutFilePath: section.handoutFilePath || ''
    });
  };

  // Xử lý Upload file handout
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      const res = await fileApi.upload(file);
      setSectionFormData(prev => ({
        ...prev,
        handoutType: 'FILE',
        handoutFileName: res.fileName,
        handoutFilePath: res.fileUrl
      }));
      toast.success(lang === 'en' ? `Uploaded file "${res.fileName}"` : `Đã tải lên tệp "${res.fileName}"`);
    } catch (error) {
      toast.error(lang === 'en' ? ('Error uploading file: ' + (error.response?.data?.message || error.message)) : ('Lỗi tải tệp lên: ' + (error.response?.data?.message || error.message)));
    } finally {
      setUploadingFile(false);
    }
  };

  // Lưu học phần (Thêm mới hoặc Cập nhật)
  const handleSaveSection = async (e) => {
    e.preventDefault();
    if (!activePlanForSection) return;

    try {
      const currentSections = [...(activePlanForSection.sections || [])];
      const newSectionData = {
        timeAllocation: sectionFormData.timeAllocation,
        content: sectionFormData.content,
        activity: sectionFormData.activity || null,
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

      await teachingPlanApi.update(activePlanForSection.id, {
        title: activePlanForSection.title,
        sections: currentSections
      });

      loadData();
      toast.success(editingSectionIndex !== null
        ? (lang === 'en' ? 'Section updated!' : 'Đã cập nhật học phần!')
        : (lang === 'en' ? 'New section added!' : 'Đã thêm học phần mới!'));
      setActivePlanForSection(null);
      setEditingSectionIndex(null);
    } catch (error) {
      toast.error(lang === 'en' ? ('Error saving section: ' + (error.response?.data?.message || error.message)) : ('Lỗi lưu học phần: ' + (error.response?.data?.message || error.message)));
    }
  };

  // Xóa học phần
  const handleDeleteSection = async (plan, sectionIndex) => {
    const ok = await confirm({
      title: lang === 'en' ? 'Delete section' : 'Xóa học phần',
      message: lang === 'en' ? 'Are you sure you want to delete this section?' : 'Bạn có chắc muốn xóa học phần này?',
      confirmText: lang === 'en' ? 'Delete section' : 'Xóa học phần',
      type: 'danger'
    });
    if (!ok) return;

    try {
      const updatedSections = plan.sections.filter((_, idx) => idx !== sectionIndex);
      await teachingPlanApi.update(plan.id, {
        title: plan.title,
        sections: updatedSections
      });
      loadData();
      toast.success(lang === 'en' ? 'Section deleted successfully!' : 'Đã xóa học phần thành công!');
    } catch (error) {
      toast.error(lang === 'en' ? ('Error deleting section: ' + (error.response?.data?.message || error.message)) : ('Lỗi xóa học phần: ' + (error.response?.data?.message || error.message)));
    }
  };

  // Copy / Nhân bản học phần trong cùng kế hoạch
  const handleCopySection = async (plan, section) => {
    try {
      const currentSections = [...(plan.sections || [])];
      const copiedSection = {
        ...section,
        content: `${section.content} (${lang === 'en' ? 'Copy' : 'Bản sao'})`,
        orderIndex: currentSections.length + 1
      };
      currentSections.push(copiedSection);

      await teachingPlanApi.update(plan.id, {
        title: plan.title,
        sections: currentSections
      });
      loadData();
      toast.success(lang === 'en' ? 'Section cloned!' : 'Đã nhân bản học phần!');
    } catch (error) {
      toast.error(lang === 'en' ? ('Error cloning section: ' + (error.response?.data?.message || error.message)) : ('Lỗi nhân bản học phần: ' + (error.response?.data?.message || error.message)));
    }
  };

  if (loading) return <div className="text-gray-500 dark:text-slate-400 py-6">{lang === 'en' ? 'Loading lesson plans...' : 'Đang tải kế hoạch giảng dạy...'}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100">{lang === 'en' ? 'Lesson Plans & Curriculum' : 'Kế Hoạch Giảng Dạy'}</h3>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 rounded-full">
              {plans.length} {lang === 'en' ? (plans.length > 1 ? 'plans' : 'plan') : 'kế hoạch'}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{lang === 'en' ? 'Prepare detailed lesson plans for each class session, module, and learning activity' : 'Soạn giáo án chi tiết theo từng buổi học, học phần và hoạt động'}</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsActivityModalOpen(true)}
            className="px-3.5 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-md transition cursor-pointer shadow-xs">
            {lang === 'en' ? 'Activity Library' : 'Thư Viện Hoạt Động'}
          </button>
          <button 
            onClick={() => {
              if (sessions.length === 0) {
                toast.warning(lang === 'en' ? 'The class has no sessions yet! Please create sessions under the "Weekly Sessions" tab first.' : 'Lớp học chưa có buổi học nào! Vui lòng tạo buổi học ở tab "Buổi học trong tuần" trước.');
                return;
              }
              setIsCreatePlanModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-md text-sm transition cursor-pointer font-medium shadow-xs">
            {lang === 'en' ? '+ Add Lesson Plan' : 'Thêm Kế Hoạch'}
          </button>
        </div>
      </div>

      {/* Danh sách Kế hoạch giảng dạy */}
      <div className="space-y-6">
        {plans.map((plan) => {
          const matchedSession = sessions.find(s => s.id === plan.sessionId);

          return (
            <div key={plan.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
              {/* Header của Kế hoạch */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-600 text-white rounded">
                      {plan.sessionTopic || (lang === 'en' ? 'Lesson Plan' : 'Kế hoạch')}
                    </span>
                    <h4 className="font-bold text-gray-800 dark:text-slate-100 text-base">{plan.title}</h4>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    {lang === 'en' ? 'Linked to session:' : 'Gắn với buổi học:'} <b>{plan.sessionTopic || (lang === 'en' ? 'Session' : 'Buổi học')}</b>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => openAddSectionModal(plan)}
                    className="px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition cursor-pointer shadow-xs">
                    {lang === 'en' ? '+ Add Section' : 'Thêm học phần'}
                  </button>
                  <button 
                    onClick={() => { setCopyingPlan(plan); setTargetSessionId(''); }}
                    className="px-2.5 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50 transition cursor-pointer">
                    {lang === 'en' ? 'Copy Plan' : 'Copy Kế Hoạch'}
                  </button>
                  <button 
                    onClick={() => handleDeletePlan(plan.id, plan.title)}
                    className="px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded hover:bg-red-100 dark:hover:bg-red-900/50 transition cursor-pointer">
                    {lang === 'en' ? 'Delete' : 'Xóa'}
                  </button>
                </div>
              </div>

              {/* Bảng danh sách Học phần (Sections) */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50/70 dark:bg-slate-950/60 border-b border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 text-xs font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-3 w-16 text-center">#</th>
                      <th className="px-4 py-3 w-32">{lang === 'en' ? 'Time' : 'Thời gian'}</th>
                      <th className="px-4 py-3">{lang === 'en' ? 'Content (Book / Chapter / Lesson)' : 'Nội dung (Sách / Chương / Bài)'}</th>
                      <th className="px-4 py-3">{lang === 'en' ? 'Teaching Activity' : 'Hoạt động dạy học'}</th>
                      <th className="px-4 py-3">{lang === 'en' ? 'Handout (Materials)' : 'Handout (Tài liệu)'}</th>
                      <th className="px-4 py-3 text-right">{lang === 'en' ? 'Actions' : 'Thao tác'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {(plan.sections || []).map((sec, idx) => (
                      <tr key={sec.id || idx} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3 text-center font-semibold text-gray-400 dark:text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap">
                          {sec.timeAllocation || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-800 dark:text-slate-100">{sec.content}</div>
                          {sec.studentPreparation && (
                            <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded mt-1 border border-amber-200 dark:border-amber-800/50">
                              <b>{lang === 'en' ? 'Preparation:' : 'Chuẩn bị:'}</b> {sec.studentPreparation}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {sec.activity ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 rounded-full">
                              {sec.activity}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-slate-500 text-xs italic">{lang === 'en' ? 'None' : 'Không có'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {sec.handoutType === 'TEXT' && sec.handoutText && (
                            <button 
                              onClick={() => setViewingHandoutText(sec.handoutText)}
                              className="inline-flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                              {lang === 'en' ? 'View pasted text' : 'Xem văn bản đã dán'}
                            </button>
                          )}
                          {sec.handoutType === 'FILE' && sec.handoutFilePath && (
                            <a 
                              href={sec.handoutFilePath}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 px-2 py-0.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50">
                              {sec.handoutFileName || (lang === 'en' ? 'Download .docx file' : 'Tải file .docx')}
                            </a>
                          )}
                          {(!sec.handoutType || sec.handoutType === 'NONE') && (
                            <span className="text-gray-400 dark:text-slate-500 text-xs italic">{lang === 'en' ? 'None' : 'Không có'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                          <button 
                            onClick={() => handleCopySection(plan, sec)}
                            title={lang === 'en' ? 'Clone this section' : 'Nhân bản học phần này'}
                            className="px-2 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50 transition cursor-pointer">
                            {lang === 'en' ? 'Clone' : 'Copy'}
                          </button>
                          <button 
                            onClick={() => openEditSectionModal(plan, sec, idx)}
                            className="px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition cursor-pointer">
                            {lang === 'en' ? 'Edit' : 'Sửa'}
                          </button>
                          <button 
                            onClick={() => handleDeleteSection(plan, idx)}
                            className="px-2 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded hover:bg-red-100 dark:hover:bg-red-900/50 transition cursor-pointer">
                            {lang === 'en' ? 'Delete' : 'Xóa'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!plan.sections || plan.sections.length === 0) && (
                      <tr>
                        <td colSpan="6" className="px-4 py-6 text-center text-gray-400 dark:text-slate-500 text-xs">
                          {lang === 'en' ? <>No sections in this lesson plan yet. Click <b>"+ Add Section"</b> to start.</> : <>Chưa có học phần nào trong kế hoạch này. Bấm <b>"+ Thêm học phần"</b> để bắt đầu soạn bài.</>}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {plans.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
            <h4 className="text-base font-bold text-gray-700 dark:text-slate-200 mb-1">{lang === 'en' ? 'No lesson plans created yet' : 'Chưa có kế hoạch giảng dạy nào'}</h4>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
              {lang === 'en' ? 'Once sessions are created, teachers can build detailed lesson plans for each session here.' : 'Sau khi đã tạo các buổi học, thầy/cô có thể tạo kế hoạch chi tiết cho từng buổi tại đây.'}
            </p>
            <button 
              onClick={() => {
                if (sessions.length === 0) {
                  toast.warning(lang === 'en' ? 'The class has no sessions yet! Please create sessions first.' : 'Lớp học chưa có buổi học nào! Vui lòng tạo buổi học trước.');
                  return;
                }
                setIsCreatePlanModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-xs font-medium cursor-pointer transition shadow-xs">
              {lang === 'en' ? 'Create First Lesson Plan' : 'Tạo Kế Hoạch Đầu Tiên'}
            </button>
          </div>
        )}
      </div>

      {/* Modal Tạo Kế Hoạch Mới */}
      {isCreatePlanModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-4">{lang === 'en' ? 'Create New Lesson Plan' : 'Tạo Kế Hoạch Giảng Dạy Mới'}</h3>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Select Linked Session' : 'Chọn Buổi học liên kết'} <span className="text-red-500">*</span>
                </label>
                <select 
                  required
                  value={newPlanData.sessionId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    const sess = sessions.find(s => s.id === Number(sid));
                    setNewPlanData({
                      sessionId: sid,
                      title: sess ? (lang === 'en' ? `Plan: ${sess.topic}` : `Kế hoạch: ${sess.topic}`) : ''
                    });
                  }}
                  className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="">{lang === 'en' ? '-- Select session --' : '-- Chọn buổi học --'}</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.topic} ({s.startTime ? new Date(s.startTime).toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN') : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Plan Title' : 'Tiêu đề kế hoạch'}
                </label>
                <input 
                  type="text" 
                  value={newPlanData.title}
                  onChange={(e) => setNewPlanData({...newPlanData, title: e.target.value})}
                  placeholder={lang === 'en' ? 'Enter lesson plan title...' : 'Nhập tên kế hoạch giảng dạy...'}
                  className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsCreatePlanModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 rounded hover:bg-gray-200 dark:hover:bg-slate-700 cursor-pointer">
                  {lang === 'en' ? 'Cancel' : 'Hủy'}
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition cursor-pointer shadow-xs">
                  {lang === 'en' ? 'Create Plan' : 'Tạo kế hoạch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Copy Kế Hoạch Sang Buổi Khác */}
      {copyingPlan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-2">{lang === 'en' ? 'Duplicate Lesson Plan' : 'Nhân Bản Kế Hoạch Giảng Dạy'}</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
              {lang === 'en' ? (
                <>All sections, timing, activities, and handouts from <b>"{copyingPlan.title}"</b> will be duplicated to another session.</>
              ) : (
                <>Toàn bộ các học phần, thời gian, hoạt động và tài liệu của kế hoạch <b>"{copyingPlan.title}"</b> sẽ được nhân bản sang một buổi học khác.</>
              )}
            </p>
            <form onSubmit={handleCopyPlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Select Target Session for Duplicate' : 'Chọn Buổi học đích để gán bản sao'} <span className="text-red-500">*</span>
                </label>
                <select 
                  required
                  value={targetSessionId}
                  onChange={(e) => setTargetSessionId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="">{lang === 'en' ? '-- Select target session --' : '-- Chọn buổi học đích --'}</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.topic} ({s.startTime ? new Date(s.startTime).toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN') : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setCopyingPlan(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 rounded hover:bg-gray-200 dark:hover:bg-slate-700 cursor-pointer">
                  {lang === 'en' ? 'Cancel' : 'Hủy'}
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded transition cursor-pointer shadow-xs">
                  {lang === 'en' ? 'Confirm Duplicate' : 'Xác nhận nhân bản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm / Sửa Học Phần */}
      {activePlanForSection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-4">
              {editingSectionIndex !== null ? (lang === 'en' ? 'Edit Section' : 'Chỉnh Sửa Học Phần') : (lang === 'en' ? 'Add New Section' : 'Thêm Học Phần Mới')}
            </h3>
            <form onSubmit={handleSaveSection} className="space-y-4">
              {/* 1. Thời gian */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Time / Duration' : 'Thời gian / Thời lượng'} <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={sectionFormData.timeAllocation}
                  onChange={(e) => setSectionFormData({...sectionFormData, timeAllocation: e.target.value})}
                  placeholder={lang === 'en' ? 'Duration (e.g. 15 mins)...' : 'Thời lượng (VD: 15 phút)...'}
                  className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* 2. Nội dung */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Lesson Content (Book name, chapter, topic)' : 'Nội dung bài dạy (Tên sách, chương, mục kiến thức)'} <span className="text-red-500">*</span>
                </label>
                <textarea 
                  required
                  rows={2}
                  value={sectionFormData.content}
                  onChange={(e) => setSectionFormData({...sectionFormData, content: e.target.value})}
                  placeholder={lang === 'en' ? 'Enter lesson content...' : 'Nhập nội dung bài dạy...'}
                  className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* 3. Hoạt động (Tùy chọn) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Teaching Activity' : 'Hoạt động dạy học'} <span className="text-gray-400 dark:text-slate-500 font-normal">({lang === 'en' ? 'Optional' : 'Không bắt buộc'})</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sectionFormData.activity || ''}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, activity: e.target.value })}
                    placeholder={lang === 'en' ? "Enter or click 'Pick from Library'..." : "Nhập hoặc bấm 'Chọn từ kho'..."}
                    className="flex-1 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button 
                    type="button" 
                    onClick={() => setIsActivityModalOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded shadow-xs cursor-pointer transition whitespace-nowrap">
                    {lang === 'en' ? 'Pick from Library' : 'Chọn từ kho'}
                  </button>
                </div>
                {sectionFormData.activity && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 rounded-md">
                      {lang === 'en' ? 'Selected:' : 'Đã chọn:'} {sectionFormData.activity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSectionFormData(prev => ({ ...prev, activity: '' }))}
                      className="text-[11px] text-red-500 hover:underline cursor-pointer">
                      {lang === 'en' ? 'Deselect' : 'Bỏ chọn'}
                    </button>
                  </div>
                )}
              </div>

              {/* 3.5. Học sinh cần chuẩn bị gì */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Student Preparation' : 'Học sinh cần chuẩn bị gì'} <span className="text-gray-400 dark:text-slate-500 font-normal">({lang === 'en' ? 'Shown in student timetable' : 'Hiện ở thời khóa biểu học sinh'})</span>
                </label>
                <textarea 
                  rows={2}
                  value={sectionFormData.studentPreparation}
                  onChange={(e) => setSectionFormData({...sectionFormData, studentPreparation: e.target.value})}
                  placeholder={lang === 'en' ? 'Enter prep instructions for students...' : 'Nhập dặn dò chuẩn bị cho học sinh...'}
                  className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* 4. Handout (Tùy chọn: Dán text hoặc Đính kèm tệp) */}
              <div className="border border-gray-200 dark:border-slate-800 p-3.5 rounded-lg bg-gray-50 dark:bg-slate-950 space-y-3">
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                  {lang === 'en' ? 'Handout / Materials' : 'Tài liệu Handout'} <span className="text-gray-400 dark:text-slate-500 font-normal">({lang === 'en' ? 'Optional' : 'Không bắt buộc'})</span>
                </label>
                
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-slate-300 cursor-pointer">
                    <input 
                      type="radio" 
                      name="handoutType" 
                      value="NONE"
                      checked={sectionFormData.handoutType === 'NONE'}
                      onChange={() => setSectionFormData({...sectionFormData, handoutType: 'NONE'})}
                    />
                    {lang === 'en' ? 'None' : 'Không đính kèm'}
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-slate-300 cursor-pointer">
                    <input 
                      type="radio" 
                      name="handoutType" 
                      value="TEXT"
                      checked={sectionFormData.handoutType === 'TEXT'}
                      onChange={() => setSectionFormData({...sectionFormData, handoutType: 'TEXT'})}
                    />
                    {lang === 'en' ? 'Paste text directly' : 'Dán văn bản trực tiếp'}
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-slate-300 cursor-pointer">
                    <input 
                      type="radio" 
                      name="handoutType" 
                      value="FILE"
                      checked={sectionFormData.handoutType === 'FILE'}
                      onChange={() => setSectionFormData({...sectionFormData, handoutType: 'FILE'})}
                    />
                    {lang === 'en' ? 'Attach file (.docx)' : 'Đính kèm tệp (.docx)'}
                  </label>
                </div>

                {/* Nếu chọn dán Text */}
                {sectionFormData.handoutType === 'TEXT' && (
                  <div>
                    <textarea 
                      rows={4}
                      value={sectionFormData.handoutText}
                      onChange={(e) => setSectionFormData({...sectionFormData, handoutText: e.target.value})}
                      placeholder={lang === 'en' ? 'Paste homework, discussion questions, or notes here...' : 'Dán nội dung bài tập, câu hỏi thảo luận hoặc ghi chú tại đây...'}
                      className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Nếu chọn đính kèm file */}
                {sectionFormData.handoutType === 'FILE' && (
                  <div className="space-y-2">
                    <input 
                      type="file" 
                      accept=".docx,.doc"
                      onChange={handleFileUpload}
                      className="block w-full text-xs text-gray-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:file:bg-blue-950/60 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 cursor-pointer"
                    />
                    {uploadingFile && <p className="text-xs text-blue-600 dark:text-blue-400">{lang === 'en' ? 'Uploading file...' : 'Đang tải tệp lên...'}</p>}
                    {sectionFormData.handoutFileName && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{lang === 'en' ? 'Attached: ' : 'Đã đính kèm: '}{sectionFormData.handoutFileName}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => { setActivePlanForSection(null); setEditingSectionIndex(null); }}
                  className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 rounded hover:bg-gray-200 dark:hover:bg-slate-700 cursor-pointer">
                  {lang === 'en' ? 'Cancel' : 'Hủy'}
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition cursor-pointer shadow-xs">
                  {editingSectionIndex !== null ? (lang === 'en' ? 'Save Changes' : 'Lưu cập nhật') : (lang === 'en' ? 'Add Section' : 'Thêm học phần')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem Handout Text */}
      {viewingHandoutText && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-6">
            <h4 className="text-base font-bold text-gray-800 dark:text-slate-100 mb-3">{lang === 'en' ? 'Pasted Handout Content' : 'Nội Dung Handout Đã Dán'}</h4>
            <div className="p-4 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg max-h-72 overflow-y-auto text-xs text-gray-800 dark:text-slate-200 whitespace-pre-wrap">
              {viewingHandoutText}
            </div>
            <div className="flex justify-end mt-4">
              <button 
                onClick={() => setViewingHandoutText(null)}
                className="px-4 py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 rounded cursor-pointer">
                {lang === 'en' ? 'Close' : 'Đóng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thư viện hoạt động dùng chung */}
      <ActivityLibraryModal 
        isOpen={isActivityModalOpen} 
        onClose={() => {
          setIsActivityModalOpen(false);
          activityApi.getAll().then(res => setActivities(res || []));
        }}
        onSelectActivity={activePlanForSection ? (picked) => {
          const name = typeof picked === 'string' ? picked : (picked?.name || '');
          setSectionFormData(prev => ({ ...prev, activity: name }));
          toast.success(lang === 'en' ? `Selected activity: "${name}"` : `Đã chọn hoạt động: "${name}"`);
          setIsActivityModalOpen(false);
          activityApi.getAll().then(res => setActivities(res || []));
        } : null}
      />
    </div>
  );
}
