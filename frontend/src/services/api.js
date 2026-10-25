import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-clear if viewing public demo
      // localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

// Authentication APIs
export const authAPI = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (email, password, full_name) => {
    const res = await api.post('/auth/register', { email, password, full_name });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

// Contracts APIs
export const contractsAPI = {
  upload: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/contracts/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return res.data;
  },
  list: async (params = {}) => {
    const res = await api.get('/contracts', { params });
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/contracts/${id}`);
    return res.data;
  },
  reanalyze: async (id) => {
    const res = await api.post(`/contracts/${id}/reanalyze`);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/contracts/${id}`);
    return res.data;
  },
};

// Policies APIs
export const policiesAPI = {
  list: async () => {
    const res = await api.get('/policies');
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/policies', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/policies/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/policies/${id}`);
    return res.data;
  },
  resetDefaults: async () => {
    const res = await api.post('/policies/reset-defaults');
    return res.data;
  },
};

// Risks APIs
export const risksAPI = {
  getByContract: async (contractId) => {
    const res = await api.get(`/risks/contract/${contractId}`);
    return res.data;
  },
  analyzeContract: async (contractId) => {
    const res = await api.post(`/risks/contract/${contractId}/analyze`);
    return res.data;
  },
};

// Chatbot APIs
export const chatAPI = {
  ask: async (contractId, message) => {
    const res = await api.post(`/chat/contract/${contractId}`, { message });
    return res.data;
  },
  getHistory: async (contractId) => {
    const res = await api.get(`/chat/contract/${contractId}/history`);
    return res.data;
  },
  clearHistory: async (contractId) => {
    const res = await api.delete(`/chat/contract/${contractId}/history`);
    return res.data;
  },
};

// Compare APIs
export const compareAPI = {
  compare: async (contractAId, contractBId) => {
    const res = await api.post('/compare', {
      contract_a_id: contractAId,
      contract_b_id: contractBId,
    });
    return res.data;
  },
};

// Reports APIs
// NOTE: window.open() cannot send the login token, so downloads go through axios (blob) instead.
const saveBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const downloadReportFile = async (contractId, kind, ext) => {
  const res = await api.get(`/reports/${contractId}/${kind}`, { responseType: 'blob', timeout: 120000 });
  // Try to use the server's file name, otherwise a simple default
  const cd = res.headers['content-disposition'] || '';
  const match = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  saveBlob(res.data, match ? decodeURIComponent(match[1]) : `contract-${kind}-${contractId}.${ext}`);
};

export const reportsAPI = {
  getData: async (contractId) => {
    const res = await api.get(`/reports/${contractId}/data`);
    return res.data;
  },
  downloadPDF: (contractId) => downloadReportFile(contractId, 'pdf', 'pdf'),
  downloadCSV: (contractId) => downloadReportFile(contractId, 'csv', 'csv'),
};

// Dashboard APIs
export const dashboardAPI = {
  getStats: async () => {
    const res = await api.get('/dashboard/stats');
    return res.data;
  },
};

export default api;
