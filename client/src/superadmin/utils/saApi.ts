import { useSuperAdminStore } from '../stores/superAdminStore';

const API_BASE = '/api/sa';

async function saFetch(endpoint: string, options: RequestInit = {}) {
  const token = useSuperAdminStore.getState().token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    useSuperAdminStore.getState().logout();
    window.location.href = '/system-health';
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Auth
export const saApi = {
  // Authentication
  login: (email: string, password: string) =>
    saFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  verify: () => saFetch('/auth/verify'),

  // Dashboard
  getDashboardStats: () => saFetch('/dashboard/stats'),

  // Admin Management
  getAdmins: () => saFetch('/admins'),
  suspendAdmin: (id: string, reason?: string) =>
    saFetch(`/admins/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  activateAdmin: (id: string) =>
    saFetch(`/admins/${id}/activate`, { method: 'POST' }),
  deleteAdmin: (id: string) =>
    saFetch(`/admins/${id}`, { method: 'DELETE' }),
  resetAdminPassword: (id: string, newPassword: string) =>
    saFetch(`/admins/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),

  // Users
  getUsers: () => saFetch('/users'),

  // Tournaments
  getTournaments: () => saFetch('/tournaments'),
  getTournament: (id: string) => saFetch(`/tournaments/${id}`),

  // Financial
  getFinancialRecords: () => saFetch('/financial/records'),
  getFinancialSummary: () => saFetch('/financial/summary'),
  addFinancialRecord: (record: object) =>
    saFetch('/financial/records', {
      method: 'POST',
      body: JSON.stringify(record),
    }),

  // Audit Logs
  getAdminLogs: (limit = 100, offset = 0) =>
    saFetch(`/audit/admin-logs?limit=${limit}&offset=${offset}`),
  getSuperLogs: (limit = 100, offset = 0) =>
    saFetch(`/audit/super-logs?limit=${limit}&offset=${offset}`),
  getAuthLogs: (limit = 100, offset = 0) =>
    saFetch(`/audit/auth-logs?limit=${limit}&offset=${offset}`),

  // Export
  exportAll: () => saFetch('/export/all'),

  // Settings
  changePassword: (currentPassword: string, newPassword: string) =>
    saFetch('/settings/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};
