const API_URL = '/api/admin';

class AdminApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private getToken(): string | null {
    if (this.token) return this.token;

    try {
      const stored = localStorage.getItem('admin-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.token) {
          this.token = parsed.state.token;
          return this.token;
        }
      }
    } catch {
      // Silently fail
    }
    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(data.error || 'Request failed');
    }

    // Handle CSV exports
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/csv')) {
      return response.blob() as Promise<T>;
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{ token: string; admin: { id: string; email: string; name: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async verify() {
    return this.request<{ valid: boolean; admin: { id: string; email: string; name: string } }>('/auth/verify');
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  // Users
  async getUsers(params?: { page?: number; limit?: number; search?: string; status?: string; state?: string; city?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.state) query.set('state', params.state);
    if (params?.city) query.set('city', params.city);

    return this.request<{
      users: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/users?${query.toString()}`);
  }

  async getUser(id: string) {
    return this.request<any>(`/users/${id}`);
  }

  async getUserTournaments(id: string) {
    return this.request<any[]>(`/users/${id}/tournaments`);
  }

  async updateUserStatus(id: string, status: 'active' | 'suspended', reason?: string) {
    return this.request(`/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, reason }),
    });
  }

  async resetUserPassword(id: string, newPassword: string) {
    return this.request(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, { method: 'DELETE' });
  }

  // Tournaments
  async getTournaments(params?: { page?: number; limit?: number; search?: string; status?: string; approval_status?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.approval_status) query.set('approval_status', params.approval_status);

    return this.request<{
      tournaments: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/tournaments?${query.toString()}`);
  }

  async getTournament(id: string) {
    return this.request<any>(`/tournaments/${id}`);
  }

  async approveTournament(id: string, approval_status: 'approved' | 'rejected', admin_notes?: string) {
    return this.request(`/tournaments/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ approval_status, admin_notes }),
    });
  }

  async updateTournamentStatus(id: string, status: string) {
    return this.request(`/tournaments/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async forcePauseTournament(id: string) {
    return this.request(`/tournaments/${id}/force-pause`, { method: 'POST' });
  }

  async deleteTournament(id: string) {
    return this.request(`/tournaments/${id}`, { method: 'DELETE' });
  }

  // Live Auctions
  async getActiveAuctions() {
    return this.request<any[]>('/auctions/active');
  }

  async getAuctionState(tournamentId: string) {
    return this.request<any>(`/auctions/${tournamentId}/state`);
  }

  async forceStopAuction(tournamentId: string) {
    return this.request(`/auctions/${tournamentId}/force-stop`, { method: 'POST' });
  }

  async undoSale(tournamentId: string) {
    return this.request(`/auctions/${tournamentId}/undo-sale`, { method: 'POST' });
  }

  async resetPlayer(tournamentId: string, playerId: string) {
    return this.request(`/auctions/${tournamentId}/reset-player/${playerId}`, { method: 'POST' });
  }

  // Analytics
  async getOverviewStats() {
    return this.request<{
      users: { total: number; today: number; week: number; month: number };
      tournaments: { total: number; pending: number; active: number };
      auctions: { playersSold: number; totalBidValue: number };
    }>('/analytics/overview');
  }

  async getUserTrends(days?: number) {
    const query = days ? `?days=${days}` : '';
    return this.request<Array<{ date: string; count: number }>>(`/analytics/users${query}`);
  }

  async getTournamentStats() {
    return this.request<{
      byStatus: Record<string, number>;
      byApproval: Record<string, number>;
      bySportsType: Record<string, number>;
      total: number;
    }>('/analytics/tournaments');
  }

  async getLocationStats() {
    return this.request<{
      states: Array<{ name: string; count: number }>;
      cities: Array<{ name: string; count: number }>;
    }>('/analytics/locations');
  }

  // Logs
  async getAuthLogs(params?: { page?: number; limit?: number; action?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.action) query.set('action', params.action);

    return this.request<{
      logs: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/logs/auth?${query.toString()}`);
  }

  async getAdminLogs(params?: { page?: number; limit?: number; action?: string; target_type?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.action) query.set('action', params.action);
    if (params?.target_type) query.set('target_type', params.target_type);

    return this.request<{
      logs: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/logs/admin?${query.toString()}`);
  }

  async exportLogs(type: 'admin' | 'auth', days?: number) {
    const query = new URLSearchParams();
    query.set('type', type);
    if (days) query.set('days', days.toString());

    return this.request<Blob>(`/logs/export?${query.toString()}`);
  }

  // Settings
  async getSettings() {
    return this.request<Record<string, Array<{ key: string; value: any; description?: string; updated_at: string }>>>('/settings');
  }

  async updateSetting(key: string, value: any) {
    return this.request(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  }

  async toggleMaintenance(enabled: boolean, message?: string) {
    return this.request('/settings/maintenance', {
      method: 'POST',
      body: JSON.stringify({ enabled, message }),
    });
  }
}

export const adminApi = new AdminApiClient();
