// src/api/authApi.js
import API from './axios';

export const registerUser    = (data) => API.post('/auth/register', data);
export const loginUser       = (data) => API.post('/auth/login', data);
export const forgotPasswordApi = (data) => API.post('/auth/forgot-password', data);
export const resetPasswordApi  = (data) => API.post('/auth/reset-password', data);
export const getMe           = ()     => API.get('/auth/me');
