import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем токен к каждому запросу
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && !config.skipAuth) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Обновляем токен если истёк
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.skipAuth) {
      originalRequest._retry = true;
      
      try {
        const refresh = localStorage.getItem('refresh_token');
        if (refresh) {
          const response = await axios.post(
            `${API_BASE_URL}/auth/refresh/`,
            {
              refresh: refresh,
            },
            { withCredentials: true }
          );
          
          const { access } = response.data;
          localStorage.setItem('access_token', access);
          
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Tasks API
export const tasksApi = {
  getAll: (params) => api.get('/v1/tasks/', { params }),
  getById: (id) => api.get(`/v1/tasks/${id}/`),
  create: (data) => api.post('/v1/tasks/', data),
  update: (id, data) => api.patch(`/v1/tasks/${id}/`, data),
  delete: (id) => api.delete(`/v1/tasks/${id}/`),
  complete: (id) => api.post(`/v1/tasks/${id}/complete/`),
  reopen: (id) => api.post(`/v1/tasks/${id}/reopen/`),
};

// Projects API
export const projectsApi = {
  getAll: (params) => api.get('/v1/projects/', { params }),
  getById: (id) => api.get(`/v1/projects/${id}/`),
  create: (data) => api.post('/v1/projects/', data),
  update: (id, data) => api.patch(`/v1/projects/${id}/`, data),
  delete: (id) => api.delete(`/v1/projects/${id}/`),
  start: (id) => api.post(`/v1/projects/${id}/start/`),
  addTask: (id, taskId) => api.post(`/v1/projects/${id}/add_task/`, { task_id: taskId }),
  removeTask: (id, taskId) => api.post(`/v1/projects/${id}/remove_task/`, { task_id: taskId }),
};

// Teams API
export const teamsApi = {
  getAll: (params) => api.get('/v1/teams/', { params }),
  getById: (id) => api.get(`/v1/teams/${id}/`),
  create: (data) => api.post('/v1/teams/', data),
  update: (id, data) => api.patch(`/v1/teams/${id}/`, data),
  delete: (id) => api.delete(`/v1/teams/${id}/`),
  getInviteInfo: (id) => api.get(`/v1/teams/${id}/invite/`, { skipAuth: true }),
  getInviteInfoByCode: (inviteCode) => api.get(`/v1/teams/invite-by-code/${inviteCode}/`, { skipAuth: true }),
  join: (id) => api.post(`/v1/teams/${id}/join/`),
  joinByCode: (inviteCode) => api.post(`/v1/teams/join-by-code/${inviteCode}/`),
};

// Categories API
export const categoriesApi = {
  getAll: () => api.get('/v1/categories/'),
  create: (data) => api.post('/v1/categories/', data),
  update: (id, data) => api.patch(`/v1/categories/${id}/`, data),
  delete: (id) => api.delete(`/v1/categories/${id}/`),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => api.get('/v1/dashboard/'),
};

// Calendar Events API
export const calendarEventsApi = {
  getAll: (params) => api.get('/v1/calendar-events/', { params }),
  getById: (id) => api.get(`/v1/calendar-events/${id}/`),
  create: (data) => api.post('/v1/calendar-events/', data),
  update: (id, data) => api.patch(`/v1/calendar-events/${id}/`, data),
  delete: (id) => api.delete(`/v1/calendar-events/${id}/`),
};

export default api;
