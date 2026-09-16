// File: src/api/fileApi.js
import axiosClient from './axiosClient';

export const fileApi = {
    upload: (file, onProgress) => {
        const formData = new FormData();
        formData.append('file', file);
        return axiosClient.post('/files/upload', formData, {
            timeout: 180000, // 3 phút cho tệp tài liệu và sách lớn
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percent);
                }
            },
        });
    },
};
