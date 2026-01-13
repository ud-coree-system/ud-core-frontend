import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1/';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token) {
            config.headers['bearer'] = token;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/auth/login';
            }
        }
        return Promise.reject(error);
    }
);

// ============ Auth API ============
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    logout: () => api.post('/auth/logout'),
    getMe: () => api.get('/auth/me'),
};

// ============ UD API ============
export const udAPI = {
    getAll: (params) => api.get('/ud', { params }),
    getById: (id) => api.get(`/ud/${id}`),
    create: (data) => api.post('/ud', data),
    update: (id, data) => api.put(`/ud/${id}`, data),
    delete: (id) => api.delete(`/ud/${id}`),
};

// ============ Barang API ============
export const barangAPI = {
    getAll: (params) => api.get('/barang', { params }),
    getById: (id) => api.get(`/barang/${id}`),
    search: (params) => api.get('/barang/search', { params }),
    create: (data) => api.post('/barang', data),
    update: (id, data) => api.put(`/barang/${id}`, data),
    delete: (id) => api.delete(`/barang/${id}`),
};

// ============ Dapur API ============
export const dapurAPI = {
    getAll: (params) => api.get('/dapur', { params }),
    getById: (id) => api.get(`/dapur/${id}`),
    create: (data) => api.post('/dapur', data),
    update: (id, data) => api.put(`/dapur/${id}`, data),
    delete: (id) => api.delete(`/dapur/${id}`),
};

// ============ Periode API ============
export const periodeAPI = {
    getAll: (params) => api.get('/periode', { params }),
    getById: (id) => api.get(`/periode/${id}`),
    create: (data) => api.post('/periode', data),
    update: (id, data) => api.put(`/periode/${id}`, data),
    close: (id) => api.put(`/periode/${id}/close`),
    delete: (id) => api.delete(`/periode/${id}`),
};

// ============ Transaksi API ============
export const transaksiAPI = {
    getAll: (params) => api.get('/transaksi', { params }),
    getById: (id) => api.get(`/transaksi/${id}`),
    create: (data) => api.post('/transaksi', data),
    update: (id, data) => api.put(`/transaksi/${id}`, data),
    complete: (id) => api.post(`/transaksi/${id}/complete`),
    cancel: (id) => api.delete(`/transaksi/${id}`),
};

// ============ Dashboard API ============
export const dashboardAPI = {
    getSummary: (params) => api.get('/dashboard/summary', { params }),
    getRecent: (params) => api.get('/dashboard/recent', { params }),
    getSalesByUD: (params) => api.get('/dashboard/sales-by-ud', { params }),
};

// ============ Activity API ============
export const activityAPI = {
    getAll: (params) => api.get('/activity', { params }),
    getByUser: (userId, params) => api.get(`/activity/user/${userId}`, { params }),
};

// ============ User API ============
export const userAPI = {
    getAll: (params) => api.get('/user', { params }),
    getById: (id) => api.get(`/user/${id}`),
    create: (data) => api.post('/user', data),
    update: (id, data) => api.put(`/user/${id}`, data),
    delete: (id) => api.delete(`/user/${id}`),
};

export default api;
