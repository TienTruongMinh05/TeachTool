// File: src/api/axiosClient.js
import axios from 'axios';

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8081/api',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// Interceptor: Tự động đính kèm JWT Bearer Token vào mỗi request nếu có
axiosClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    // Nếu gửi FormData (tải file), xóa Content-Type để Axios và browser tự động thiết lập multipart boundary chuẩn
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Interceptor: Xử lý response & tự động retry khi server đang khởi động (502, 503, 504, Network Error)
axiosClient.interceptors.response.use(
    (response) => response.data,
    async (error) => {
        const config = error.config;

        // Tự động retry tối đa 3 lần khi Render đang đánh thức máy chủ (Cold start 502/503/504)
        if (config && (!config._retryCount || config._retryCount < 3)) {
            const isColdStartStatus = error.response && [502, 503, 504].includes(error.response.status);
            const isNetworkError = !error.response && error.code !== 'ECONNABORTED';

            if (isColdStartStatus || isNetworkError) {
                config._retryCount = (config._retryCount || 0) + 1;
                const delayMs = config._retryCount * 1500;
                await new Promise((resolve) => setTimeout(resolve, delayMs));
                return axiosClient(config);
            }
        }

        if (error.response && error.response.status === 401) {
            // Nếu không phải là request đăng nhập/đăng ký đang kiểm tra mật khẩu
            const requestUrl = error.config?.url || '';
            if (!requestUrl.includes('/auth/login') && !requestUrl.includes('/auth/register')) {
                console.warn("Phiên đăng nhập hết hạn hoặc không hợp lệ. Đăng xuất...");
                localStorage.removeItem('currentUser');
                localStorage.removeItem('authToken');
                if (window.location.pathname !== '/') {
                    window.location.href = '/';
                }
            }
        }
        console.error("API Error:", error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export default axiosClient;