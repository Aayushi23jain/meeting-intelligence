import axios from 'axios';
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});
api.interceptors.response.use(
  (r) => r,
  (e) => Promise.reject(new Error(e.response?.data?.error || e.message || 'Request failed')),
);
