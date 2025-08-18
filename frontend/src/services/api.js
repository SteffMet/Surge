import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  // Updated timeout to align with backend timeout hierarchy: 30s frontend < 25s backend AI < 20s Ollama service
  timeout: parseInt(process.env.REACT_APP_API_TIMEOUT_MS || '30000', 10),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      error.message = 'Network error. Please check your connection.';
    }
    
    return Promise.reject(error);
  }
);

// API methods
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/me'),
  getConfig: () => api.get('/auth/config'),
  forceChangePassword: (passwordData) => api.post('/auth/force-change-password', passwordData),
};

export const usersAPI = {
  getUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  changePassword: (id, passwordData) => api.put(`/users/${id}/password`, passwordData),
  getUserStats: () => api.get('/users/stats/overview'),
};

export const documentsAPI = {
  getDocuments: (params) => api.get('/documents', { params }),
  getDocument: (id) => api.get(`/documents/${id}`),
  uploadDocument: (formData, onUploadProgress) =>
    api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    }),
  uploadZip: (formData, onUploadProgress) =>
    api.post('/documents/upload-zip', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    }),
  updateDocument: (id, data) => api.put(`/documents/${id}`, data),
  deleteDocument: (id) => api.delete(`/documents/${id}`),
  downloadDocument: (id) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  getFolders: () => api.get('/documents/folders/list'),
  reembed: (limit=100) => api.post('/documents/reembed', { limit }),
};

export const searchAPI = {
  search: (query, options = {}) => api.post('/search', { query, ...options }),
  getSuggestions: (query) => api.get('/search/suggestions', { params: { q: query } }),
  getRecentSearches: () => api.get('/search/recent'),
  clearRecentSearches: () => api.delete('/search/recent'),
  getPopularTerms: () => api.get('/search/popular'),
  submitFeedback: (feedback) => api.post('/search/feedback', feedback),
};

export const workspacesAPI = {
  // Workspace CRUD operations
  getWorkspaces: (params) => api.get('/workspaces', { params }),
  getWorkspace: (id) => api.get(`/workspaces/${id}`),
  createWorkspace: (workspaceData) => api.post('/workspaces', workspaceData),
  updateWorkspace: (id, workspaceData) => api.put(`/workspaces/${id}`, workspaceData),
  deleteWorkspace: (id) => api.delete(`/workspaces/${id}`),
  
  // Collaborator management
  addCollaborator: (workspaceId, collaboratorData) =>
    api.post(`/workspaces/${workspaceId}/collaborators`, collaboratorData),
  updateCollaborator: (workspaceId, userId, roleData) =>
    api.put(`/workspaces/${workspaceId}/collaborators/${userId}`, roleData),
  removeCollaborator: (workspaceId, userId) =>
    api.delete(`/workspaces/${workspaceId}/collaborators/${userId}`),
  
  // Bookmark management
  getBookmarks: (workspaceId, params) =>
    api.get(`/workspaces/${workspaceId}/bookmarks`, { params }),
  getBookmark: (workspaceId, bookmarkId) =>
    api.get(`/workspaces/${workspaceId}/bookmarks/${bookmarkId}`),
  createBookmark: (workspaceId, bookmarkData) =>
    api.post(`/workspaces/${workspaceId}/bookmarks`, bookmarkData),
  updateBookmark: (workspaceId, bookmarkId, bookmarkData) =>
    api.put(`/workspaces/${workspaceId}/bookmarks/${bookmarkId}`, bookmarkData),
  deleteBookmark: (workspaceId, bookmarkId) =>
    api.delete(`/workspaces/${workspaceId}/bookmarks/${bookmarkId}`),
  
  // Workspace-specific search
  searchInWorkspace: (workspaceId, query, options = {}) =>
    api.post(`/workspaces/${workspaceId}/search`, { query, ...options }),
};

// Utility functions
export const handleApiError = (error) => {
  if (error.response?.data?.errors) {
    return error.response.data.errors[0].msg;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  return error.message || 'An unexpected error occurred';
};

export const versionsAPI = {
  getDocumentHistory: (documentId, params) => api.get(`/versions/document/${documentId}`, { params }),
  getVersion: (versionId, params) => api.get(`/versions/${versionId}`, { params }),
  createVersion: (documentId, data) => api.post(`/versions/document/${documentId}`, data),
  restoreVersion: (documentId, versionNumber) => api.post(`/versions/document/${documentId}/restore/${versionNumber}`),
  compareVersions: (documentId, fromVersion, toVersion) => api.get(`/versions/compare/${documentId}/${fromVersion}/${toVersion}`),
  getVersionStats: (documentId) => api.get(`/versions/stats/${documentId}`),
  getVersionTree: (documentId) => api.get(`/versions/tree/${documentId}`),
  deleteVersion: (versionId) => api.delete(`/versions/${versionId}`)
};

export const downloadFile = async (id, filename) => {
  try {
    const response = await documentsAPI.downloadDocument(id);
    
    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (error) {
    console.error('Download error:', error);
    return { success: false, error: handleApiError(error) };
  }
};

export default api;