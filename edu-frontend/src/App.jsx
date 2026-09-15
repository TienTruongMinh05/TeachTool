// File: src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Login from './pages/Login';
import RoleSelectionModal from './Components/RoleSelectionModal';
import ClassList from './pages/ClassList';
import ClassDashboard from './pages/ClassDashboard';
import StudentPortal from './pages/StudentPortal';

function AppContent() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-300 text-sm">
        Đang khởi động hệ thống TeachTool...
      </div>
    );
  }

  // 1. Nếu chưa đăng nhập: Hiển thị trang đăng nhập Gmail
  if (!user) {
    return <Login />;
  }

  // 2. Nếu đã đăng nhập nhưng chưa chọn vai trò: Hiện modal chọn vai trò 1 lần duy nhất
  if (!role) {
    return <RoleSelectionModal />;
  }

  // 3. Nếu là HỌC SINH: Hiển thị Student Portal
  if (role === 'STUDENT') {
    return <StudentPortal />;
  }

  // 4. Nếu là GIÁO VIÊN: Hiển thị giao diện quản lý lớp học của giáo viên (với bố cục thống nhất)
  return (
    <Routes>
      <Route path="/" element={<ClassDashboard initialView="classes" />} />
      <Route path="/class/:id" element={<ClassDashboard initialView="class_detail" />} />
      <Route path="/students" element={<ClassDashboard initialView="all_students" />} />
      <Route path="/timetable" element={<ClassDashboard initialView="timetable" />} />
      <Route path="/guide" element={<ClassDashboard initialView="guide" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;