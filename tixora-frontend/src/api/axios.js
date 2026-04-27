// src/api/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// ── Request interceptor: attach access token ──────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle auth & rate limiting ───────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // ── Handle 429 Rate Limit ──────────────────────────────────────────
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 60;
      console.warn(`[Tixora] Rate limited. Retry after ${retryAfter}s`);
      return Promise.reject({
        ...error,
        message: `Too many requests. Please wait ${retryAfter} seconds.`
      });
    }

    // ── Handle 401 — Token Refresh ─────────────────────────────────────
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');

      if (refresh) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL}/auth/token/refresh/`,
            { refresh }
          );
          localStorage.setItem('access_token', data.access);
          if (data.refresh) {
            localStorage.setItem('refresh_token', data.refresh);
          }
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch (refreshError) {
          // Refresh token also expired — force logout
          localStorage.clear();
          window.location.href = '/login?expired=true';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;