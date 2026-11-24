import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401) {
      const isInactive =
        error.response?.data?.code === 'USER_INACTIVE' ||
        String(error.response?.data?.message || '').toLowerCase().includes('dinonaktifkan');

      if (isInactive) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_info');
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login?reason=inactive';
          }
        }
        return Promise.reject(error);
      }

      if (!originalRequest._retry) {
        originalRequest._retry = true;
        if (typeof window !== 'undefined') {
          const refreshToken = localStorage.getItem('refresh_token');
          if (refreshToken) {
            try {
              const res = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/auth/refresh`,
                { refresh_token: refreshToken }
              );
              const newToken = res.data.data.access_token;
              localStorage.setItem('access_token', newToken);
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return api(originalRequest);
            } catch (refreshErr) {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('user_info');
              if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/login')) {
                window.location.href = '/login';
              }
            }
          } else {
            localStorage.removeItem('access_token');
            if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/login')) {
              window.location.href = '/login';
            }
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

// Backend mengirim alamat file tanpa nama server (contoh: "/api/v1/settings/logo/x.png").
// Tanpa nama server, browser mencarinya di frontend (port 3000) dan gambar gagal dimuat.
export function resolveServerUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  if (!path.startsWith('/api/')) return path;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  return `${apiUrl.replace(/\/api\/v\d+\/?$/, '')}${path}`;
}

export function getVisitorPhotoUrl(idVisitor: number): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return `${baseUrl}/visitors/${idVisitor}/photo${token ? `?token=${encodeURIComponent(token)}` : ''}`;
}

export function getUserAvatarUrl(userId: number): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return `${baseUrl}/auth/users/${userId}/avatar${token ? `?token=${encodeURIComponent(token)}` : ''}`;
}

export default api;
