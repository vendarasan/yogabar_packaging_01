import axios from 'axios';

const api = axios.create({ baseURL: '/api', withCredentials: true });

// Auth & User Management
export const getMe = () => api.get('/auth/me');
export const login = (email, password) => api.post('/auth/login', { email, password });
export const signup = (name, email, password, confirmPassword) => api.post('/auth/signup', { name, email, password, confirmPassword });
export const logout = () => api.post('/auth/logout');
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const changePassword = (password, confirmPassword) => api.post('/auth/change-password', { password, confirmPassword });
export const updateMyProfile = (data) => api.put('/auth/profile', data);
export const getUsers = () => api.get('/auth/users');
export const createTeamMember = (data) => api.post('/auth/users', data);
export const updateTeamMember = (email, data) => api.put(`/auth/users/${encodeURIComponent(email)}`, data);
export const deleteTeamMember = (email) => api.delete(`/auth/users/${encodeURIComponent(email)}`);

// Projects
export const getProjects = () => api.get('/projects');
export const createProject = (data) => api.post('/projects', data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);
export const updateFGCode = (id, fgCode) => api.put(`/projects/${id}/fgcode`, { fgCode });
export const updateSupplier = (id, supplier) => api.put(`/projects/${id}/supplier`, { supplier });
export const updateFactory = (id, factory) => api.put(`/projects/${id}/factory`, { factory });
export const updateDescription = (id, description) => api.put(`/projects/${id}/description`, { description });
export const advanceProject = (id, data = {}) => api.post(`/projects/${id}/advance`, data);
export const revokeProject = (id) => api.post(`/projects/${id}/revoke`);
export const launchProject = (id, date) => api.post(`/projects/${id}/launch`, { date });
export const changeBriefDate = (id, briefDate) => api.post(`/projects/${id}/brief-date`, { briefDate });
export const advanceMaterial = (id, mIdx, data = {}) => api.post(`/projects/${id}/materials/${mIdx}/advance`, data);
export const revokeMaterial = (id, mIdx) => api.post(`/projects/${id}/materials/${mIdx}/revoke`);
export const saveSpecs = (id, mIdx, specs) => api.put(`/projects/${id}/materials/${mIdx}/specs`, { specs });
export const updateMaterialPMCode = (id, mIdx, pmCode) => api.put(`/projects/${id}/materials/${mIdx}/pmcode`, { pmCode });
export const updateMaterialSupplier = (id, mIdx, supplier) => api.put(`/projects/${id}/materials/${mIdx}/supplier`, { supplier });
export const updateMaterialPrintType = (id, mIdx, printType) => api.put(`/projects/${id}/materials/${mIdx}/printtype`, { printType });
export const updateMaterialBriefDate = (id, mIdx, briefDate) => api.put(`/projects/${id}/materials/${mIdx}/brief-date`, { briefDate });
export const updateMaterialPO = (id, mIdx, poStatus, poNumber, adminApproval = false) => api.put(`/projects/${id}/materials/${mIdx}/po`, { poStatus, poNumber, adminApproval });
export const updateSpecSignoff = (id, mIdx, signed, notes = '') => api.put(`/projects/${id}/materials/${mIdx}/specsignoff`, { signed, notes });
export const saveSpecSheet = (id, mIdx, specSheet, submitForCheck = false) => api.put(`/projects/${id}/materials/${mIdx}/specsheet`, { specSheet, submitForCheck });
export const updateMaterialArtwork = (id, mIdx, artworkFiles) => api.put(`/projects/${id}/materials/${mIdx}/artwork`, { artworkFiles });
export const checkSpecSheet = (id, mIdx, comments = '') => api.post(`/projects/${id}/materials/${mIdx}/specsheet/check`, { comments });
export const approveSpecSheet = (id, mIdx, comments = '') => api.post(`/projects/${id}/materials/${mIdx}/specsheet/approve`, { comments });
export const rejectSpecSheet = (id, mIdx, reason = '') => api.post(`/projects/${id}/materials/${mIdx}/specsheet/reject`, { reason });
export const getProjectAuditTrail = (id) => api.get(`/projects/${id}/audit-trail`);

// Crunched Timeline & 2-Stage Approvals
export const proposeCrunchTimeline = (id, targetLaunchDate) => api.post(`/projects/${id}/crunch/propose`, { targetLaunchDate });
export const approveCrunchStage1 = (id, comments) => api.post(`/projects/${id}/crunch/approve-stage1`, { comments });
export const approveCrunchStage2 = (id, comments) => api.post(`/projects/${id}/crunch/approve-stage2`, { comments });
export const rejectCrunch = (id, reason) => api.post(`/projects/${id}/crunch/reject`, { reason });

// Logs
export const getLogs = () => api.get('/logs');
export const getSeenAt = () => api.get('/logs/seen-at');
export const markSeen = () => api.post('/logs/mark-seen');

// Spec Converter & Spec Library
export const convertSpecPdf = (payload) => api.post('/specs/convert-pdf', payload);
export const getSpecLibrary = () => api.get('/specs/library');
export const saveSpecToLibrary = (payload) => api.post('/specs/library', payload);
export const updateSpecInLibrary = (id, payload) => api.put(`/specs/library/${id}`, payload);
export const deleteSpecFromLibrary = (id) => api.delete(`/specs/library/${id}`);
export const applySpecToProject = (id, payload) => api.post(`/specs/library/${id}/apply`, payload);

export default api;
