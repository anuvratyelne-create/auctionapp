const API_URL = '/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private getToken(): string | null {
    // Try instance token first
    if (this.token) {
      console.log('[API] Using instance token');
      return this.token;
    }

    // Fall back to reading from localStorage (zustand persist)
    try {
      const stored = localStorage.getItem('auction-auth');
      console.log('[API] localStorage auction-auth:', stored ? 'found' : 'not found');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.token) {
          this.token = parsed.state.token;
          console.log('[API] Got token from localStorage');
          return this.token;
        }
      }
    } catch (e) {
      console.error('[API] Error reading token from localStorage:', e);
    }
    console.log('[API] No token found');
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
      let errorMsg = 'Request failed';
      if (typeof data.error === 'string') {
        errorMsg = data.error;
      } else if (Array.isArray(data.error)) {
        errorMsg = data.error.map((e: any) => e.message || e).join(', ');
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  // Auth
  async register(data: {
    mobile: string;
    password: string;
    tournamentName: string;
    totalPoints?: number;
    minPlayers?: number;
    maxPlayers?: number;
  }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(mobile: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ mobile, password }),
    });
  }

  async verifyToken() {
    return this.request('/auth/verify');
  }

  // Tournament
  async getTournament() {
    return this.request('/tournaments/current');
  }

  async createTournament(data: {
    name: string;
    logo_url?: string | null;
    sports_type?: 'cricket' | 'football' | 'kabaddi' | 'basketball' | 'other';
    auction_date?: string | null;
    auction_time?: string | null;
    total_points?: number;
    default_base_bid?: number;
    bid_increment?: number;
    min_players?: number;
    max_players?: number;
  }) {
    return this.request<{ tournament: any; token: string; message: string }>('/tournaments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTournament(data: Partial<{
    name: string;
    logo_url: string;
    total_points: number;
    min_players: number;
    max_players: number;
    bid_increment: number;
    status: string;
    player_display_mode: string;
  }>) {
    return this.request('/tournaments/current', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getTournamentByShareCode(shareCode: string) {
    return this.request(`/tournaments/share/${shareCode}`);
  }

  async getSponsors() {
    return this.request('/tournaments/sponsors');
  }

  async addSponsor(logo_url: string, display_order?: number) {
    return this.request('/tournaments/sponsors', {
      method: 'POST',
      body: JSON.stringify({ logo_url, display_order }),
    });
  }

  async deleteSponsor(id: string) {
    return this.request(`/tournaments/sponsors/${id}`, { method: 'DELETE' });
  }

  // Teams
  async getTeams() {
    return this.request('/teams');
  }

  async getTeamsPublic(tournamentId: string) {
    return this.request(`/teams/public/${tournamentId}`);
  }

  async getTeam(id: string) {
    return this.request(`/teams/${id}`);
  }

  async createTeam(data: {
    name: string;
    short_name: string;
    logo_url?: string;
    keyboard_key?: string;
    owner_name?: string;
    owner_photo?: string;
    total_budget?: number;
  }) {
    return this.request('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeam(id: string, data: Partial<{
    name: string;
    short_name: string;
    logo_url: string;
    keyboard_key: string;
    owner_name: string;
    owner_photo: string;
    total_budget: number;
  }>) {
    return this.request(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTeam(id: string) {
    return this.request(`/teams/${id}`, { method: 'DELETE' });
  }

  async removePlayerFromTeam(teamId: string, playerId: string) {
    return this.request(`/teams/${teamId}/players/${playerId}`, { method: 'DELETE' });
  }

  // Categories
  async getCategories() {
    return this.request('/categories');
  }

  async getCategoriesPublic(tournamentId: string) {
    return this.request(`/categories/public/${tournamentId}`);
  }

  async createCategory(data: { name: string; base_price: number; display_order?: number }) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: string, data: Partial<{ name: string; base_price: number; display_order: number }>) {
    return this.request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateStandardCategoryPrices() {
    return this.request('/categories/update-standard-prices', {
      method: 'POST',
    });
  }

  async deleteCategory(id: string) {
    return this.request(`/categories/${id}`, { method: 'DELETE' });
  }

  // Players
  async getPlayers(status?: string, category_id?: string) {
    let query = '';
    const params: string[] = [];
    if (status) params.push(`status=${status}`);
    if (category_id) params.push(`category_id=${category_id}`);
    if (params.length) query = `?${params.join('&')}`;
    return this.request(`/players${query}`);
  }

  async getPlayersPublic(tournamentId: string, status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request(`/players/public/${tournamentId}${query}`);
  }

  async getPlayer(id: string) {
    return this.request(`/players/${id}`);
  }

  async createPlayer(data: {
    name: string;
    photo_url?: string;
    jersey_number?: string;
    category_id: string;
    base_price?: number;
    stats?: Record<string, any>;
  }) {
    return this.request('/players', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createPlayersBulk(players: Array<{
    name: string;
    photo_url?: string;
    jersey_number?: string;
    category_id: string;
    base_price?: number;
    stats?: Record<string, any>;
  }>) {
    return this.request('/players/bulk', {
      method: 'POST',
      body: JSON.stringify({ players }),
    });
  }

  async updatePlayer(id: string, data: Partial<{
    name: string;
    photo_url: string;
    jersey_number: string;
    category_id: string;
    base_price: number;
    stats: Record<string, any>;
  }>) {
    return this.request(`/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePlayer(id: string) {
    return this.request(`/players/${id}`, { method: 'DELETE' });
  }

  async resetPlayer(id: string) {
    return this.request(`/players/${id}/reset`, { method: 'POST' });
  }

  async togglePlayerAvailability(id: string) {
    return this.request(`/players/${id}/toggle-availability`, { method: 'POST' });
  }

  async searchPlayerByNumber(number: string) {
    return this.request(`/players/search/number/${number}`);
  }

  // Auction
  async getNextPlayer(category_id?: string) {
    const query = category_id && category_id !== 'all' ? `?category_id=${category_id}` : '';
    return this.request(`/auction/next-player${query}`);
  }

  async getPlayerForAuction(playerId: string) {
    return this.request(`/auction/player/${playerId}`);
  }

  async placeBid(team_id: string, amount: number) {
    return this.request('/auction/bid', {
      method: 'POST',
      body: JSON.stringify({ team_id, amount }),
    });
  }

  async incrementBid(amount?: number) {
    return this.request('/auction/increment', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async markSold(player_id?: string, team_id?: string, amount?: number) {
    return this.request('/auction/sold', {
      method: 'POST',
      body: JSON.stringify({ player_id, team_id, amount }),
    });
  }

  async markUnsold() {
    return this.request('/auction/unsold', { method: 'POST' });
  }

  async reauctionUnsold() {
    return this.request('/auction/reauction-unsold', { method: 'POST' });
  }

  async resetAuction() {
    return this.request('/auction/reset', { method: 'POST' });
  }

  async getAuctionState() {
    return this.request('/auction/state');
  }

  async updatePoints() {
    return this.request('/auction/update-points', { method: 'POST' });
  }

  // Retention
  async getRetentionSettings() {
    return this.request('/retention/settings');
  }

  async updateRetentionSettings(data: {
    retention_enabled: boolean;
    max_retentions_per_team: number;
    retention_price: number;
  }) {
    return this.request('/retention/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getRetainedPlayers() {
    return this.request('/retention/players');
  }

  async getTeamRetentions(teamId: string) {
    return this.request(`/retention/team/${teamId}`);
  }

  async retainPlayer(teamId: string, playerId: string, retentionPrice?: number) {
    return this.request('/retention/retain', {
      method: 'POST',
      body: JSON.stringify({ team_id: teamId, player_id: playerId, retention_price: retentionPrice }),
    });
  }

  async removeRetention(playerId: string) {
    return this.request(`/retention/retain/${playerId}`, { method: 'DELETE' });
  }

  async getRetentionSummary() {
    return this.request('/retention/summary');
  }

  // Stats
  async getDashboardStats() {
    return this.request('/stats/dashboard');
  }

  async getLiveStats() {
    return this.request('/stats/live');
  }

  // Export
  async getExportSummary() {
    return this.request('/export/summary');
  }

  async exportPlayersCSV() {
    const token = this.getToken();
    const response = await fetch('/api/export/csv/players', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('Failed to export players CSV');
    return response.blob();
  }

  async exportTeamsCSV() {
    const token = this.getToken();
    const response = await fetch('/api/export/csv/teams', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('Failed to export teams CSV');
    return response.blob();
  }

  async getPDFData() {
    return this.request('/export/pdf/summary');
  }

  // Team Comparison
  async compareTeams(teamIds: string[]) {
    return this.request(`/teams/compare?ids=${teamIds.join(',')}`);
  }

  // Public Player Registration
  async getRegistrationInfo(shareCode: string) {
    return this.request(`/players/public/register/${shareCode}/info`);
  }

  async registerPlayer(shareCode: string, data: {
    name: string;
    jersey_number?: string;
    photo_url?: string;
    role?: string;
  }) {
    return this.request(`/players/public/register/${shareCode}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Pending Players (Admin Approval)
  async getPendingPlayers() {
    return this.request('/players/pending');
  }

  async approvePlayer(id: string, data: { category_id: string; base_price?: number }) {
    return this.request(`/players/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async rejectPlayer(id: string) {
    return this.request(`/players/${id}/reject`, {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();
