import { useState, useEffect } from 'react';
import { assignmentApi } from '../api/assignmentApi';
import { submissionApi } from '../api/submissionApi';
import { sessionApi } from '../api/sessionApi';
import { studentApi } from '../api/studentApi';
import { fileApi } from '../api/fileApi';
import { useToast } from '../context/ToastContext';

export default function AssignmentManager({ classId }) {
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
    attachmentFileName: '',
    attachmentFileUrl: ''
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

  const handleOpenCreateModal = () => {
    setEditingAssignment(null);
    setFormData({
      sessionId: '',
      title: '',
      description: '',
      dueDate: '',
      allowText: true,
      allowDocx: false,
      allowAudio: false,
      allowRecording: false,
      allowImage: false,
      attachmentFileName: '',
      attachmentFileUrl: ''
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

    setFormData({
      sessionId: assignment.sessionId ? String(assignment.sessionId) : '',
      title: assignment.title || '',
      description: assignment.description || '',
      dueDate: localDueDate,
      allowText: allowed.includes('TEXT'),
      allowDocx: allowed.includes('DOCX'),
      allowAudio: allowed.includes('AUDIO'),
      allowRecording: allowed.includes('DIRECT_RECORD'),
      allowImage: allowed.includes('IMAGE'),
      attachmentFileName: assignment.attachmentFileName || '',
      attachmentFileUrl: assignment.attachmentFileUrl || ''
    });
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploadingAttachment(true);
      const res = await fileApi.upload(file);
      setFormData(prev => ({
        ...prev,
        attachmentFileName: res.fileName,
        attachmentFileUrl: res.fileUrl
      }));
      toast.success(`Đã tải lên tệp đính kèm "${res.fileName}"`);
    } catch (err) {
      toast.error('Lỗi tải tệp: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingAttachment(false);
    }
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

      const payload = {
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate ? formData.dueDate + ':00' : null,
        allowedSubmissionTypes: allowedTypes.join(','),
        attachmentFileName: formData.attachmentFileName,
        attachmentFileUrl: formData.attachmentFileUrl
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

  // Mở danh sách bài nộp của 1 bài tập
  const openSubmissionsView = async (assignment) => {
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
      await submissionApi.grade(selectedSubmissionToGrade.id, {
        score: gradingForm.score,
        feedback: gradingForm.feedback
      });

      // Làm mới danh sách bài nộp
      const subs = await submissionApi.getByAssignment(activeAssignmentForSubmissions.id);
      setSubmissions(subs || []);
      setSelectedSubmissionToGrade(null);
      setSelectedStudentForGrading(null);
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
            {sessions.map((s, idx) => (
              <option key={s.id} value={s.id}>
                Buổi {idx + 1}: {s.topic}
              </option>
            ))}
          </select>

          <button
            onClick={openCreateModal}
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
              className={`bg-white border rounded-xl shadow-xs transition overflow-hidden ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-gray-200'}`}>
              <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-gray-50/60 border-b border-gray-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 rounded">
                      {matchedSession ? `Buổi ${sessions.indexOf(matchedSession) + 1}` : 'Chung'}
                    </span>
                    <h4 className="font-bold text-gray-800 text-base">{assignment.title}</h4>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>Hạn nộp: <b>{formatDateTime(assignment.dueDate)}</b></span>
                    <span>Buổi liên kết: <b>{matchedSession ? matchedSession.topic : 'Không gán'}</b></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openSubmissionsView(assignment)}
                    className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition cursor-pointer shadow-xs">
                    {isSelected ? 'Đang xem bài nộp' : 'Xem danh sách nộp'}
                  </button>
                  <button
                    onClick={() => openEditModal(assignment)}
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
                {assignment.description && (
                  <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {assignment.description}
                  </p>
                )}

                {assignment.attachmentFileUrl && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-gray-500">Tệp đề bài đính kèm:</span>
                    <a
                      href={assignment.attachmentFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-blue-600 hover:underline">
                      {assignment.attachmentFileName || 'Tải file đề bài'}
                    </a>
                  </div>
                )}

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
              onClick={openCreateModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-xs font-medium cursor-pointer transition shadow-xs">
              Giao Bài Đầu Tiên
            </button>
          </div>
        )}
      </div>

      {/* DANH SÁCH BÀI NỘP VÀ CHẤM ĐIỂM (Khi bấm xem bài nộp của 1 bài tập) */}
      {activeAssignmentForSubmissions && (
        <div className="mt-8 bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
            <div>
              <h4 className="font-bold text-base">
                Danh Sách Bài Nộp: {activeAssignmentForSubmissions.title}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Tổng số học viên trong lớp: {students.length} | Đã nộp: {submissions.length}
              </p>
            </div>
            <button
              onClick={() => setActiveAssignmentForSubmissions(null)}
              className="text-slate-400 hover:text-white text-sm font-semibold cursor-pointer">
              Đóng danh sách
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs font-semibold uppercase">
                <tr>
                  <th className="px-5 py-3.5">Học viên</th>
                  <th className="px-5 py-3.5">Trạng thái</th>
                  <th className="px-5 py-3.5">Hình thức nộp</th>
                  <th className="px-5 py-3.5">Thời gian nộp</th>
                  <th className="px-5 py-3.5">Điểm số</th>
                  <th className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.map((st) => {
                  const sub = submissions.find(s => s.studentId === st.studentId);
                  const isSubmitted = !!sub;

                  return (
                    <tr key={st.studentId} className="hover:bg-gray-50/70 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-gray-800">{st.studentName}</div>
                        <div className="text-xs text-gray-500">{st.studentEmail}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        {isSubmitted ? (
                          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                            Đã nộp bài
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            Chưa nộp
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-700">
                        {sub?.submissionType ? (
                          <span className="font-medium">
                            {sub.submissionType === 'TEXT' && 'Văn bản trực tiếp'}
                            {sub.submissionType === 'DOCX' && 'File Word'}
                            {sub.submissionType === 'AUDIO' && 'File Audio'}
                            {sub.submissionType === 'DIRECT_RECORD' && 'Ghi âm trực tiếp'}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">
                        {sub ? formatDateTime(sub.submittedAt) : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        {sub?.score ? (
                          <span className="px-2 py-0.5 text-xs font-bold bg-purple-100 text-purple-700 rounded">
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
        </div>
      )}

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

                {/* Nếu nộp File Audio hoặc Ghi âm trực tiếp */}
                {(selectedSubmissionToGrade.submissionType === 'AUDIO' || selectedSubmissionToGrade.submissionType === 'DIRECT_RECORD') && (
                  <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-800">
                        {selectedSubmissionToGrade.submissionType === 'DIRECT_RECORD' ? 'Bản ghi âm trực tiếp của học sinh' : 'Tệp âm thanh đính kèm'}
                      </div>
                      {selectedSubmissionToGrade.fileUrl && (
                        <a
                          href={selectedSubmissionToGrade.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-blue-600 hover:underline">
                          Tải audio về
                        </a>
                      )}
                    </div>
                    {selectedSubmissionToGrade.fileUrl ? (
                      <audio controls src={selectedSubmissionToGrade.fileUrl} className="w-full h-11" />
                    ) : (
                      <p className="text-xs text-red-500">Không tìm thấy đường dẫn tệp âm thanh.</p>
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
                  {sessions.map((s, idx) => (
                    <option key={s.id} value={s.id}>
                      Buổi {idx + 1}: {s.topic}
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

              {/* Tệp đề bài đính kèm */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Đính kèm tệp đề bài (Tùy chọn)
                </label>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                {uploadingAttachment && <p className="text-xs text-blue-600 mt-1">Đang tải tệp lên...</p>}
                {formData.attachmentFileName && (
                  <p className="text-xs text-emerald-700 font-medium mt-1">
                    Đã đính kèm: {formData.attachmentFileName}
                  </p>
                )}
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
