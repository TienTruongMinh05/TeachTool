// File: src/api/fileApi.js
import axiosClient from './axiosClient';

export const fileApi = {
    upload: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return axiosClient.post('/files/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
};
