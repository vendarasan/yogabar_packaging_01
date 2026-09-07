import axios from 'axios';

const api = axios.create({ baseURL: '/api', withCredentials: true });

// Auth
export const getMe = () => api.get('/auth/me');
export const login = (email, password) => api.post('/auth/login', { email, password });
export const signup = (name, email, password, confirmPassword) => api.post('/auth/signup', { name, email, password, confirmPassword });
export const logout = () => api.post('/auth/logout');
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const changePassword = (password, confirmPassword) => api.post('/auth/change-password', { password, confirmPassword });

// Projects
export const getProjects = () => api.get('/projects');
export const createProject = (data) => api.post('/projects', data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);
export const updateFGCode = (id, fgCode) => api.put(`/projects/${id}/fgcode`, { fgCode });
export const updateSupplier = (id, supplier) => api.put(`/projects/${id}/supplier`, { supplier });
export const advanceProject = (id) => api.post(`/projects/${id}/advance`);
export const revokeProject = (id) => api.post(`/projects/${id}/revoke`);
export const launchProject = (id, date) => api.post(`/projects/${id}/launch`, { date });
export const changeBriefDate = (id, briefDate) => api.post(`/projects/${id}/brief-date`, { briefDate });
export const advanceMaterial = (id, mIdx) => api.post(`/projects/${id}/materials/${mIdx}/advance`);
export const revokeMaterial = (id, mIdx) => api.post(`/projects/${id}/materials/${mIdx}/revoke`);
export const saveSpecs = (id, mIdx, specs) => api.put(`/projects/${id}/materials/${mIdx}/specs`, { specs });

// Logs
export const getLogs = () => api.get('/logs');
export const getSeenAt = () => api.get('/logs/seen-at');
export const markSeen = () => api.post('/logs/mark-seen');

export default api;
