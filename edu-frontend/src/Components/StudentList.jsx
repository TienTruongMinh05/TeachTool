import { useState, useEffect } from 'react';
import { studentApi } from '../api/studentApi';
import { classApi } from '../api/classApi';
import { useToast } from '../context/ToastContext';

export default function StudentList({ classId }) {
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', email: '' });

  // State cho việc sửa học sinh
  const [editingStudent, setEditingStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({ fullName: '', email: '' });

  // State cho việc xóa học sinh khỏi lớp
  const [deletingStudent, setDeletingStudent] = useState(null);

  // State cho việc Copy học sinh sang lớp khác
  const [copyingStudent, setCopyingStudent] = useState(null);
  const [otherClasses, setOtherClasses] = useState([]);
  const [selectedTargetClassId, setSelectedTargetClassId] = useState('');

  // Toast thông báo
  const [toastMessage, setToastMessage] = useState('');

  // State tìm kiếm học sinh
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStudents = async () => {
    try {
      const data = await studentApi.getByClass(classId);
      setStudents(data);
    } catch (error) {
      console.error("Lỗi lấy danh sách học sinh:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [classId]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Sao chép nhanh thông tin học sinh vào clipboard
  const handleCopyInfo = (student) => {
    const text = `${student.studentName} - ${student.studentEmail}`;
    navigator.clipboard.writeText(text).then(() => {
      showToast(`✓ Đã sao chép: "${text}" vào bộ nhớ tạm!`);
    }).catch(() => {
      showToast(`✓ Học sinh: ${text}`);
    });
  };

  // Mở modal sao chép học sinh sang lớp khác
  const openCopyToClassModal = async (student) => {
    setCopyingStudent(student);
    try {
      const allClasses = await classApi.getAll();
      const availableClasses = allClasses.filter(c => c.id !== Number(classId));
      setOtherClasses(availableClasses);
      if (availableClasses.length > 0) {
        setSelectedTargetClassId(availableClasses[0].id);
      }
    } catch (error) {
      toast.error("Lỗi khi tải danh sách lớp học!");
    }
  };

  // Thực hiện ghi danh học sinh sang lớp khác
  const handleConfirmCopyToClass = async (e) => {
    e.preventDefault();
    if (!selectedTargetClassId) {
      toast.warning("Vui lòng chọn một lớp học!");
      return;
    }
    try {
      await studentApi.enroll(selectedTargetClassId, copyingStudent.studentId);
      setCopyingStudent(null);
      toast.success(`Đã sao chép học sinh "${copyingStudent.studentName}" sang lớp đích thành công!`);
    } catch (error) {
      toast.error("Lỗi khi sao chép học sinh sang lớp khác: " + (error.response?.data?.message || error.message));
    }
  };

  // Thêm học sinh mới và ghi danh vào lớp
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newUser = await studentApi.create(formData);
      await studentApi.enroll(classId, newUser.id);
      fetchStudents();
      setIsModalOpen(false);
      setFormData({ fullName: '', email: '' });
      toast.success(`Đã thêm học sinh "${newUser.fullName}" vào lớp!`);
    } catch (error) {
      toast.error("Lỗi khi thêm học sinh. Vui lòng kiểm tra lại thông tin.");
    }
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setEditFormData({
      fullName: student.studentName || '',
      email: student.studentEmail || ''
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      await studentApi.update(editingStudent.studentId, editFormData);
      fetchStudents();
      setEditingStudent(null);
      toast.success("Đã cập nhật thông tin học sinh thành công!");
    } catch (error) {
      toast.error("Lỗi khi cập nhật học sinh: " + (error.response?.data?.message || error.message));
    }
  };

  const handleRemoveFromClass = async () => {
    if (!deletingStudent) return;
    try {
      await studentApi.removeFromClass(classId, deletingStudent.studentId);
      setDeletingStudent(null);
      fetchStudents();
      toast.success("Đã hủy ghi danh học sinh khỏi lớp!");
    } catch (error) {
      toast.error("Lỗi khi xóa học sinh khỏi lớp: " + (error.response?.data?.message || error.message));
    }
  };

  const filteredStudents = students.filter(s => 
    (s.studentName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.studentEmail?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div className="text-gray-500 py-6">Đang tải danh sách học sinh...</div>;

  return (
    <div>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm rounded-lg font-medium shadow-xs animate-fade-in">
          {toastMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-gray-800">Danh Sách Học Sinh</h3>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
              {students.length} học viên
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý học viên đăng ký tham gia lớp học này</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên hoặc email..."
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
          />
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-3.5 py-1.5 rounded-md text-sm transition cursor-pointer font-medium whitespace-nowrap shadow-sm">
            Thêm học sinh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5">Mã HV</th>
              <th className="px-5 py-3.5">Họ và tên</th>
              <th className="px-5 py-3.5">Email tài khoản</th>
              <th className="px-5 py-3.5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredStudents.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50/70 transition">
                <td className="px-5 py-3.5 font-medium text-gray-900">#{row.studentId}</td>
                <td className="px-5 py-3.5 text-gray-800 font-semibold">{row.studentName}</td>
                <td className="px-5 py-3.5 text-gray-600">{row.studentEmail}</td>
                <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                  <button 
                    onClick={() => handleCopyInfo(row)}
                    title="Sao chép tên và email vào bộ nhớ tạm"
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded hover:bg-slate-200 transition cursor-pointer">
                    Copy Thông Tin
                  </button>
                  <button 
                    onClick={() => openCopyToClassModal(row)}
                    title="Sao chép/Gán học sinh này sang lớp học khác"
                    className="px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 transition cursor-pointer">
                    Sang lớp khác
                  </button>
                  <button 
                    onClick={() => openEditModal(row)}
                    className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition cursor-pointer">
                    Sửa
                  </button>
                  <button 
                    onClick={() => setDeletingStudent(row)}
                    className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition cursor-pointer">
                    Xóa khỏi lớp
                  </button>
                </td>
              </tr>
            ))}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan="4" className="px-5 py-8 text-center text-gray-500">
                  {searchTerm ? 'Không tìm thấy học sinh phù hợp với từ khóa.' : 'Lớp học hiện chưa có học sinh nào. Hãy bấm nút "Thêm học sinh".'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm Học Sinh Mới */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Thêm học sinh vào lớp</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên học sinh <span className="text-red-500">*</span></label>
                <input 
                  type="text" required
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="VD: Nguyễn Văn A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (Định danh) <span className="text-red-500">*</span></label>
                <input 
                  type="email" required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="VD: nguyenvana@gmail.com"
                />
                <p className="text-xs text-gray-500 mt-1">Nếu email đã tồn tại trong hệ thống, học sinh sẽ tự động được ghi danh vào lớp này.</p>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 cursor-pointer">
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700 cursor-pointer font-medium">
                  Xác nhận thêm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chỉnh Sửa Thông Tin Học Sinh */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Cập nhật thông tin học sinh</h3>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
                <input 
                  type="text" required
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({...editFormData, fullName: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input 
                  type="email" required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button 
                  type="button" 
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 cursor-pointer">
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer font-medium">
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sao Chép Học Sinh Sang Lớp Khác */}
      {copyingStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Sao Chép Học Sinh Sang Lớp Khác</h3>
            <p className="text-xs text-gray-600 mb-4">
              Ghi danh học sinh <b>{copyingStudent.studentName}</b> ({copyingStudent.studentEmail}) vào một lớp học khác.
            </p>
            {otherClasses.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                Không có lớp học nào khác trong hệ thống để sao chép đến.
              </p>
            ) : (
              <form onSubmit={handleConfirmCopyToClass} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Chọn lớp học đích <span className="text-red-500">*</span>
                  </label>
                  <select 
                    required
                    value={selectedTargetClassId}
                    onChange={(e) => setSelectedTargetClassId(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    {otherClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.startDate ? `(${c.startDate})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setCopyingStudent(null)}
                    className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 cursor-pointer">
                    Hủy
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded transition cursor-pointer">
                    Xác nhận sao chép
                  </button>
                </div>
              </form>
            )}
            {otherClasses.length === 0 && (
              <div className="flex justify-end mt-4">
                <button 
                  onClick={() => setCopyingStudent(null)}
                  className="px-4 py-2 text-xs bg-gray-200 rounded font-medium cursor-pointer">
                  Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa Học Sinh Khỏi Lớp */}
      {deletingStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-red-600 mb-2">Xóa học sinh khỏi lớp</h3>
            <p className="text-sm text-gray-600 mb-4">
              Bạn có chắc chắn muốn hủy ghi danh học sinh <b>{deletingStudent.studentName}</b> khỏi lớp này?
            </p>
            <div className="flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setDeletingStudent(null)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 cursor-pointer">
                Hủy
              </button>
              <button 
                type="button" 
                onClick={handleRemoveFromClass}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 cursor-pointer font-medium">
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
