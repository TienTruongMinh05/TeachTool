import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    const savedToken = localStorage.getItem('authToken');

    if (savedToken) {
      setToken(savedToken);
    }

    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        // Tải lại thông tin mới nhất từ backend để đảm bảo vai trò và trạng thái luôn đồng bộ
        if (parsed.id) {
          authApi.getMe(parsed.id)
            .then(freshUser => {
              setUser(freshUser);
              localStorage.setItem('currentUser', JSON.stringify(freshUser));
            })
            .catch(() => {});
        }
      } catch (e) {
        console.error('Lỗi phân tích dữ liệu người dùng từ bộ nhớ:', e);
      }
    }
    setLoading(false);
  }, []);

  const saveAuthSession = (authResponse) => {
    if (!authResponse) return null;
    const userData = authResponse.user || authResponse;
    const tokenData = authResponse.token || null;

    setUser(userData);
    localStorage.setItem('currentUser', JSON.stringify(userData));

    if (tokenData) {
      setToken(tokenData);
      localStorage.setItem('authToken', tokenData);
    }
    return userData;
  };

  const register = async ({ fullName, email, password, role }) => {
    try {
      const response = await authApi.register({ fullName, email, password, role });
      return saveAuthSession(response);
    } catch (error) {
      console.error('Lỗi đăng ký tài khoản:', error);
      throw error;
    }
  };

  const login = async ({ email, password }) => {
    try {
      const response = await authApi.login({ email, password });
      return saveAuthSession(response);
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      throw error;
    }
  };

  const loginWithGoogle = async ({ idToken, email, fullName, avatarUrl }) => {
    try {
      const response = await authApi.googleLogin({ idToken, email, fullName, avatarUrl });
      return saveAuthSession(response);
    } catch (error) {
      console.error('Lỗi đăng nhập Google:', error);
      throw error;
    }
  };

  const selectRole = async (roleName) => {
    if (!user || !user.id) throw new Error('Chưa đăng nhập');
    try {
      const response = await authApi.selectRole({ userId: user.id, role: roleName });
      return saveAuthSession(response);
    } catch (error) {
      console.error('Lỗi gán vai trò:', error);
      throw error;
    }
  };

  const changePassword = async ({ oldPassword, newPassword }) => {
    if (!user || !user.id) throw new Error('Chưa đăng nhập');
    try {
      const response = await authApi.changePassword({
        userId: user.id,
        oldPassword,
        newPassword
      });
      return response;
    } catch (error) {
      console.error('Lỗi đổi mật khẩu:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
  };

  const deleteAccount = async () => {
    if (!user || !user.id) return;
    try {
      await authApi.deleteAccount(user.id);
      logout();
    } catch (error) {
      console.error('Lỗi khi xóa tài khoản:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      role: user?.role || null,
      loading,
      login,
      register,
      loginWithGoogle,
      selectRole,
      changePassword,
      logout,
      deleteAccount
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
