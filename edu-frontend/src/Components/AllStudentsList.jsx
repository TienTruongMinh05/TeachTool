import { useState, useEffect } from 'react';
import { studentApi } from '../api/StudentApi';
import { classApi } from '../api/classApi';
import { useNavigate } from 'react-router-dom';

export default function AllStudentsList({ onSelectClass }) {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc & Tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');

  // Modal Thêm học sinh mới
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({ fullName: '', email: '', classId: '' });
  const [addingStudent, setAddingStudent] = useState(false);

  // Modal Gán học sinh vào lớp khác
  const [assigningStudent, setAssigningStudent] = useState(null);
  const [targetClassId, setTargetClassId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Toast thông báo
  const [toastMessage, setToastMessage] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsRes, classesRes] = await Promise.allSettled([
        studentApi.getAll(),
        classApi.getAll()
      ]);

      if (studentsRes.status === 'fulfilled' && Array.isArray(studentsRes.value)) {
        setStudents(studentsRes.value);
      } else {
        setStudents([]);
      }

      if (classesRes.status === 'fulfilled' && Array.isArray(classesRes.value)) {
        setClasses(classesRes.value);
      } else {
        setClasses([]);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách học sinh toàn trường:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleCopyInfo = (st) => {
    const text = `${st.studentName} - ${st.studentEmail}`;
    navigator.clipboard.writeText(text).then(() => {
      showToast(`✓ Đã sao chép: "${text}" vào bộ nhớ tạm!`);
    }).catch(() => {
      showToast(`✓ Học sinh: ${text}`);
    });
  };

  // Thêm học sinh mới vào hệ thống
  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!addFormData.fullName.trim() || !addFormData.email.trim()) return;

    try {
      setAddingStudent(true);
      const createdUser = await studentApi.create({
        fullName: addFormData.fullName.trim(),
        email: addFormData.email.trim()
      });

      // Nếu có chọn lớp, gán luôn vào lớp đó
      if (addFormData.classId) {
        await studentApi.enroll(addFormData.classId, createdUser.id);
      }

      showToast(`✓ Đã thêm học sinh "${createdUser.fullName}" thành công!`);
      setIsAddModalOpen(false);
      setAddFormData({ fullName: '', email: '', classId: '' });
      await loadData();
    } catch (err) {
      alert('Lỗi khi thêm học sinh: ' + (err.response?.data?.message || err.message));
    } finally {
      setAddingStudent(false);
    }
  };

  // Gán học sinh vào lớp học
  const handleAssignToClass = async (e) => {
    e.preventDefault();
    if (!assigningStudent || !targetClassId) return;

    try {
      setAssigning(true);
      await studentApi.enroll(targetClassId, assigningStudent.studentId);
      const targetClass = classes.find(c => c.id === Number(targetClassId));
      showToast(`✓ Đã thêm ${assigningStudent.studentName} vào lớp ${targetClass?.name || ''}!`);
      setAssigningStudent(null);
      setTargetClassId('');
      await loadData();
    } catch (err) {
      alert('Lỗi khi gán học sinh vào lớp: ' + (err.response?.data?.message || err.message));
    } finally {
      setAssigning(false);
    }
  };

  // Xóa tài khoản học sinh
  const handleDeleteStudent = async (st) => {
    if (!window.confirm(`Bạn có chắc muốn xóa tài khoản học sinh "${st.studentName}" (${st.studentEmail})? Toàn bộ dữ liệu điểm danh và bài làm của học sinh sẽ bị xóa.`)) {
      return;
    }

    try {
      await studentApi.delete(st.studentId);
      showToast(`✓ Đã xóa học sinh "${st.studentName}" thành công!`);
      await loadData();
    } catch (err) {
      alert('Lỗi khi xóa học sinh: ' + (err.response?.data?.message || err.message));
    }
  };

  // Lọc danh sách học sinh
  const filteredStudents = students.filter(st => {
    const term = searchTerm.toLowerCase();
    const matchName = (st.studentName || '').toLowerCase().includes(term);
    const matchEmail = (st.studentEmail || '').toLowerCase().includes(term);
    const matchSearch = matchName || matchEmail;

    if (!matchSearch) return false;

    if (selectedClassFilter === 'ALL') return true;
    if (selectedClassFilter === 'NONE') {
      return !st.enrolledClasses || st.enrolledClasses.length === 0;
    }
    return st.enrolledClasses?.some(c => c.classId === Number(selectedClassFilter));
  });

  const totalEnrollments = students.reduce((sum, st) => sum + (st.enrolledClasses?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold animate-fade-in border border-slate-700">
          {toastMessage}
        </div>
      )}

      {/* HEADER & THỐNG KÊ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h3 className="text-xl font-bold text-gray-800">Danh Sách Học Sinh (Tất Cả Các Lớp)</h3>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
              {students.length} học sinh
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Tổng hợp toàn bộ học viên trong hệ thống, các lớp đang theo học và quản lý ghi danh
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer shadow-xs text-center">
          + Thêm Học Sinh Mới
        </button>
      </div>

      {/* THẺ THỐNG KÊ NHANH */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
          <div className="text-2xl font-bold text-slate-800">{students.length}</div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">Tổng số học viên</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl">
          <div className="text-2xl font-bold text-blue-700">{classes.length}</div>
          <div className="text-xs font-medium text-blue-600 mt-0.5">Tổng số lớp học</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl">
          <div className="text-2xl font-bold text-emerald-700">{totalEnrollments}</div>
          <div className="text-xs font-medium text-emerald-600 mt-0.5">Lượt ghi danh</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl">
          <div className="text-2xl font-bold text-amber-700">
            {students.filter(st => !st.enrolledClasses || st.enrolledClasses.length === 0).length}
          </div>
          <div className="text-xs font-medium text-amber-600 mt-0.5">Chưa vào lớp nào</div>
        </div>
      </div>

      {/* THANH TÌM KIẾM & BỘ LỌC */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên học sinh hoặc email..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
            <option value="ALL">-- Tất cả các lớp học ({classes.length}) --</option>
            <option value="NONE">Học viên chưa vào lớp nào</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                Lớp: {cls.name} (Mã: {cls.classCode || `#${cls.id}`})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* BẢNG DANH SÁCH HỌC SINH (RESPONSIVE CHO CẢ PC & ĐIỆN THOẠI) */}
      {loading ? (
        <div className="text-gray-500 py-10 text-center text-xs">Đang tải danh sách học sinh toàn trường...</div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 sm:p-12 text-center shadow-xs">
          <h4 className="font-bold text-gray-700 text-sm mb-1">Không tìm thấy học sinh nào</h4>
          <p className="text-xs text-gray-500 mb-4">
            {searchTerm || selectedClassFilter !== 'ALL'
              ? 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc lớp học.'
              : 'Chưa có học sinh nào trong hệ thống.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl shadow-xs">
          <table className="min-w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Mã HV</th>
                <th className="px-5 py-3.5">Họ và tên</th>
                <th className="px-5 py-3.5">Email tài khoản</th>
                <th className="px-5 py-3.5">Các lớp đang theo học</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {filteredStudents.map((st) => (
                <tr key={st.studentId} className="hover:bg-slate-50/70 transition">
                  <td className="px-5 py-3.5 font-mono font-bold text-slate-700">
                    #{st.studentId}
                  </td>
                  <td className="px-5 py-3.5 font-bold text-gray-800">
                    {st.studentName || 'Chưa đặt tên'}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {st.studentEmail}
                  </td>
                  <td className="px-5 py-3.5">
                    {st.enrolledClasses && st.enrolledClasses.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-w-md">
                        {st.enrolledClasses.map(c => (
                          <button
                            key={c.classId}
                            onClick={() => {
                              if (onSelectClass) onSelectClass(c.classId);
                              else navigate(`/class/${c.classId}`);
                            }}
                            title={`Chuyển đến bảng điều khiển lớp ${c.className}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer">
                            <span>{c.className}</span>
                            {c.classCode && (
                              <span className="font-mono text-[10px] text-blue-500">({c.classCode})</span>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Chưa tham gia lớp nào
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-1.5">
                    <button
                      onClick={() => handleCopyInfo(st)}
                      title="Sao chép tên và email"
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded cursor-pointer transition">
                      Copy
                    </button>
                    <button
                      onClick={() => {
                        setAssigningStudent(st);
                        setTargetClassId(classes[0]?.id ? String(classes[0].id) : '');
                      }}
                      title="Thêm học sinh này vào một lớp học"
                      className="px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded cursor-pointer transition">
                      + Vào lớp
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(st)}
                      title="Xóa tài khoản học sinh"
                      className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded cursor-pointer transition">
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL THÊM HỌC SINH MỚI */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 sm:p-6">
            <h4 className="text-base font-bold text-gray-800 mb-1">Thêm Học Sinh Mới</h4>
            <p className="text-xs text-gray-500 mb-4">
              Tạo tài khoản học sinh và gán trực tiếp vào lớp học (tùy chọn)
            </p>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Họ và tên học sinh <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addFormData.fullName}
                  onChange={(e) => setAddFormData({ ...addFormData, fullName: e.target.value })}
                  placeholder="VD: Nguyễn Văn Nam"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email Gmail tài khoản <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={addFormData.email}
                  onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                  placeholder="VD: student.nam@gmail.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Gán vào lớp học ngay:
                </label>
                <select
                  value={addFormData.classId}
                  onChange={(e) => setAddFormData({ ...addFormData, classId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">-- Chưa gán lớp (Thêm vào hệ thống trước) --</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} (Mã: {cls.classCode || `#${cls.id}`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={addingStudent}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg cursor-pointer shadow-xs">
                  {addingStudent ? 'Đang thêm...' : 'Xác nhận thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GÁN HỌC SINH VÀO LỚP */}
      {assigningStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 sm:p-6">
            <h4 className="text-base font-bold text-gray-800 mb-1">Gán Học Sinh Vào Lớp</h4>
            <p className="text-xs text-gray-500 mb-4">
              Học sinh: <b>{assigningStudent.studentName}</b> ({assigningStudent.studentEmail})
            </p>

            <form onSubmit={handleAssignToClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Chọn lớp muốn thêm học sinh vào: <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">-- Chọn một lớp học --</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} (Mã: {cls.classCode || `#${cls.id}`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setAssigningStudent(null)}
                  className="px-4 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg cursor-pointer shadow-xs">
                  {assigning ? 'Đang ghi danh...' : 'Thêm vào lớp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
