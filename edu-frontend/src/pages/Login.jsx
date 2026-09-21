import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircleIcon, XCircleIcon } from '../Components/Icons';

export default function Login() {
  const { login, register, loginWithGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'

  // Form Đăng Nhập
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Form Đăng Ký
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState('TEACHER'); // 'TEACHER' | 'STUDENT'
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Trạng thái chung
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Hỗ trợ Google Identity Services nếu có Client ID
  useEffect(() => {
    /* global google */
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (clientId && window.google) {
      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse
        });
        const container = document.getElementById('googleSignInDiv');
        if (container) {
          google.accounts.id.renderButton(
            container,
            { theme: 'outline', size: 'large', width: '100%', text: 'signin_with' }
          );
        }
      } catch (err) {
        console.warn('GSI init note:', err);
      }
    }
  }, [activeTab]);

  const handleGoogleCredentialResponse = async (response) => {
    try {
      setLoading(true);
      setError('');
      // Gửi token xác thực chính thức của Google lên backend để máy chủ Google xác thực
      await loginWithGoogle({
        idToken: response.credential
      });
    } catch (err) {
      setError('Đăng nhập Google thất bại: ' + (err.response?.data?.message || err.message || 'Vui lòng thử lại'));
    } finally {
      setLoading(false);
    }
  };

  // Đăng nhập bằng Email & Mật khẩu
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setError('Vui lòng điền đầy đủ Email và Mật khẩu.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login({
        email: loginEmail.trim(),
        password: loginPassword
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Đăng nhập không thành công.');
    } finally {
      setLoading(false);
    }
  };

  // Đăng ký tài khoản mới
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!regName.trim()) {
      setError('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (!regEmail.trim()) {
      setError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Mật khẩu phải có độ dài từ 6 ký tự trở lên.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Xác nhận mật khẩu không khớp. Vui lòng nhập lại.');
      return;
    }

    try {
      setLoading(true);
      await register({
        fullName: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole
      });
      setSuccessMessage('Đăng ký tài khoản thành công! Đang chuyển hướng...');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Đăng ký không thành công.');
    } finally {
      setLoading(false);
    }
  };


  // Đánh giá độ mạnh mật khẩu
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, text: 'Chưa nhập', color: 'bg-gray-200' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[A-Z]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, text: 'Yếu (>=6 ký tự)', color: 'bg-red-500' };
    if (score === 2) return { score: 2, text: 'Trung bình', color: 'bg-yellow-500' };
    if (score === 3) return { score: 3, text: 'Tốt', color: 'bg-blue-500' };
    return { score: 4, text: 'Rất mạnh', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(regPassword);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        
        {/* Banner Header */}
        <div className="p-6 text-center bg-slate-950 text-white relative">
          <div className="inline-block px-3 py-1 bg-blue-600/30 text-blue-300 text-xs font-semibold rounded-full mb-2">
            Hệ Thống Quản Lý Đào Tạo & Lớp Học
          </div>
          <h1 className="text-2xl font-bold tracking-tight">TeachTool</h1>
        </div>

        {/* Tab Navigation: Đăng Nhập vs Đăng Ký */}
        <div className="grid grid-cols-2 border-b border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setError(''); setSuccessMessage(''); }}
            className={`py-3.5 text-xs sm:text-sm font-bold transition cursor-pointer text-center ${
              activeTab === 'login'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}>
            Đăng Nhập
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setError(''); setSuccessMessage(''); }}
            className={`py-3.5 text-xs sm:text-sm font-bold transition cursor-pointer text-center ${
              activeTab === 'register'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}>
            Đăng Ký Tài Khoản Mới
          </button>
        </div>

        {/* Body Nội Dung Form */}
        <div className="p-6 sm:p-8 space-y-5">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium animate-in fade-in">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg font-medium animate-in fade-in">
              {successMessage}
            </div>
          )}

          {/* ================= TAB 1: ĐĂNG NHẬP ================= */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email đăng nhập <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="abc@gmail.com"
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer">
                    {showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  </button>
                </div>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Nhập mật khẩu tài khoản"
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer shadow-sm mt-2">
                {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-3 text-gray-400 text-xs uppercase font-medium">Hoặc</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              {/* Đăng nhập chính thức bằng Google Sign-In */}
              <div id="googleSignInDiv" className="w-full flex justify-center"></div>
            </form>
          )}

          {/* ================= TAB 2: ĐĂNG KÝ TÀI KHOẢN MỚI ================= */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              
              {/* Họ và tên */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Họ và tên của bạn <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Họ và tên của bạn"
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Địa chỉ Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="abc@gmail.com"
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Chọn vai trò (Role Selection Card) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Chọn vai trò tài khoản <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">(Khóa cố định sau khi đăng ký)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setRegRole('TEACHER')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      regRole === 'TEACHER'
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-500/20'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}>
                    <div>
                      <div className="text-xs font-bold text-gray-900">Giáo Viên</div>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                        Tạo lớp, soạn kế hoạch giảng dạy, điểm danh, giao bài tập
                      </p>
                    </div>
                    <div className="mt-2 text-[10px] font-bold text-blue-600 flex items-center gap-1">
                      {regRole === 'TEACHER' ? (
                        <>
                          <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>Đã chọn</span>
                        </>
                      ) : (
                        'Chọn vai trò này'
                      )}
                    </div>
                  </div>

                  <div
                    onClick={() => setRegRole('STUDENT')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      regRole === 'STUDENT'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500/20'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}>
                    <div>
                      <div className="text-xs font-bold text-gray-900">Học Sinh</div>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                        Nhập mã tham gia lớp, xem thời khóa biểu, làm bài & báo vắng
                      </p>
                    </div>
                    <div className="mt-2 text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      {regRole === 'STUDENT' ? (
                        <>
                          <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>Đã chọn</span>
                        </>
                      ) : (
                        'Chọn vai trò này'
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mật khẩu */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer">
                    {showRegPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  </button>
                </div>
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                {/* Thanh đo độ mạnh mật khẩu */}
                {regPassword && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: `${(strength.score / 4) * 100}%` }}></div>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-600 whitespace-nowrap">
                      {strength.text}
                    </span>
                  </div>
                )}
              </div>

              {/* Xác nhận mật khẩu */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nhập lại mật khẩu <span className="text-red-500">*</span>
                </label>
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Nhập lại chính xác mật khẩu ở trên"
                  className={`w-full border rounded-lg px-3.5 py-2.5 text-xs sm:text-sm focus:ring-2 focus:outline-none ${
                    regConfirmPassword && regConfirmPassword !== regPassword
                      ? 'border-red-400 focus:ring-red-400 bg-red-50/20'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {regConfirmPassword && (
                  <div className="mt-1 text-[11px]">
                    {regConfirmPassword === regPassword ? (
                      <span className="text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>Mật khẩu hoàn toàn trùng khớp</span>
                      </span>
                    ) : (
                      <span className="text-red-600 font-medium flex items-center gap-1">
                        <XCircleIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>Mật khẩu chưa trùng khớp</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || (regConfirmPassword && regConfirmPassword !== regPassword)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer shadow-sm mt-2">
                {loading ? 'Đang tạo tài khoản...' : 'Tạo Tài Khoản & Bắt Đầu'}
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}
