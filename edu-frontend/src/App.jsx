import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Phân tách mã nguồn (Code Splitting): Tải lười các phân hệ theo vai trò người dùng
const Login = lazy(() => import('./pages/Login'));
const RoleSelectionModal = lazy(() => import('./Components/RoleSelectionModal'));
const ClassDashboard = lazy(() => import('./pages/ClassDashboard'));
const StudentPortal = lazy(() => import('./pages/StudentPortal'));

function PageLoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-300 text-sm gap-3">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="font-medium text-xs tracking-wider text-slate-400">Đang tải phân hệ TeachTool...</span>
    </div>
  );
}

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
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <Login />
      </Suspense>
    );
  }

  // 2. Nếu đã đăng nhập nhưng chưa chọn vai trò: Hiện modal chọn vai trò 1 lần duy nhất
  if (!role) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <RoleSelectionModal />
      </Suspense>
    );
  }

  // 3. Nếu là HỌC SINH: Hiển thị Student Portal
  if (role === 'STUDENT') {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <StudentPortal />
      </Suspense>
    );
  }

  // 4. Nếu là GIÁO VIÊN: Hiển thị giao diện quản lý lớp học của giáo viên (với bố cục thống nhất)
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        <Route path="/" element={<ClassDashboard initialView="classes" />} />
        <Route path="/class/:id" element={<ClassDashboard initialView="class_detail" />} />
        <Route path="/students" element={<ClassDashboard initialView="all_students" />} />
        <Route path="/timetable" element={<ClassDashboard initialView="timetable" />} />
        <Route path="/guide" element={<ClassDashboard initialView="guide" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
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