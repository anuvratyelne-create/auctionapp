const API_URL = '/api';

// TTL-based cache for API responses
interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() < entry.expiry) {
      return entry.data;
    }
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, { data, expiry: Date.now() + ttlMs });
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

const apiCache = new ApiCache();

// Cache TTL constants (in milliseconds)
const CACHE_TTL = {
  TEAMS: 30 * 1000,      // 30 seconds
  PLAYERS: 30 * 1000,    // 30 seconds
  CATEGORIES: 5 * 60 * 1000,  // 5 minutes
};

class ApiClient {
  private token: string | null = null;

  // Request deduplication for getTeams
  private teamsPromise: Promise<any> | null = null;
  private teamsPromiseTime: number = 0;

  setToken(token: string | null) {
    const tokenChanged = this.token !== token;
    this.token = token;
    // Invalidate cache when token changes (different user/tournament)
    // This is critical for multi-tournament support - prevents data mixing
    if (tokenChanged) {
      apiCache.invalidate();
      // Also clear teams promise cache
      this.teamsPromise = null;
      this.teamsPromiseTime = 0;
      console.log('API cache invalidated due to token change');
    }
  }

  // Expose cache invalidation for components that need to force refresh
  invalidateCache(pattern?: string): void {
    apiCache.invalidate(pattern);
  }

  private getToken(): string | null {
    // Try instance token first
    if (this.token) {
      return this.token;
    }

    // Fall back to reading from localStorage (zustand persist)
    try {
      const stored = localStorage.getItem('auction-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.token) {
          this.token = parsed.state.token;
          return this.token;
        }
      }
    } catch (e) {
      // Silently fail - no token available
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
    email: string;
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

  async login(identifier: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  }

  async resetPassword(email: string, newPassword: string) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, newPassword }),
    });
  }

  async signup(data: {
    name: string;
    email: string;
    mobile: string;
    password: string;
    state: string;
    city: string;
  }) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
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
    category_prices?: {
      platinum: number;
      gold: number;
      silver: number;
      bronze: number;
    };
  }) {
    return this.request<{ tournament: any; token: string; message: string }>('/tournaments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTournament(data: Partial<{
    name: string;
    logo_url: string;
    broadcaster_logo_url: string;
    broadcaster_name: string;
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

  // DEPRECATED: Use deleteTournamentById instead
  async deleteTournament() {
    return this.request<{ success: boolean; message: string }>('/tournaments/current', {
      method: 'DELETE',
    });
  }

  // Delete tournament by explicit ID (preferred method)
  async deleteTournamentById(tournamentId: string) {
    return this.request<{ success: boolean; message: string; deletedId: string }>(`/tournaments/${tournamentId}`, {
      method: 'DELETE',
    });
  }

  async getMyTournaments() {
    return this.request<any[]>('/tournaments/my');
  }

  async selectTournament(tournamentId: string) {
    return this.request<{ tournament: any; token: string; message: string }>(`/tournaments/${tournamentId}/select`, {
      method: 'POST',
    });
  }

  async getDemoTournament() {
    return this.request<{
      tournament: any;
      teams: any[];
      players: any[];
      categories: any[];
      token: string;
      isDemo: boolean;
    }>('/tournaments/demo');
  }

  async getTournamentByShareCode(shareCode: string) {
    return this.request(`/tournaments/share/${shareCode}`);
  }

  async getSponsors() {
    return this.request('/tournaments/sponsors');
  }

  async addSponsor(logo_url: string, name?: string, display_order?: number) {
    return this.request('/tournaments/sponsors', {
      method: 'POST',
      body: JSON.stringify({ logo_url, name, display_order }),
    });
  }

  async deleteSponsor(id: string) {
    return this.request(`/tournaments/sponsors/${id}`, { method: 'DELETE' });
  }

  // Teams (with caching + request deduplication)
  async getTeams() {
    const cacheKey = 'teams';
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return Promise.resolve(cached);
    }

    const now = Date.now();
    // Return existing promise if called within 200ms (deduplication)
    if (this.teamsPromise && (now - this.teamsPromiseTime) < 200) {
      return this.teamsPromise;
    }

    this.teamsPromiseTime = now;
    this.teamsPromise = this.request('/teams').then((data) => {
      apiCache.set(cacheKey, data, CACHE_TTL.TEAMS);
      return data;
    });

    // Clear promise after it resolves
    this.teamsPromise.finally(() => {
      setTimeout(() => {
        this.teamsPromise = null;
      }, 200);
    });

    return this.teamsPromise;
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
    apiCache.invalidate('teams');
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
    apiCache.invalidate('teams');
    return this.request(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTeam(id: string) {
    apiCache.invalidate('teams');
    return this.request(`/teams/${id}`, { method: 'DELETE' });
  }

  async removePlayerFromTeam(teamId: string, playerId: string) {
    return this.request(`/teams/${teamId}/players/${playerId}`, { method: 'DELETE' });
  }

  // Categories (cached for 5 minutes - rarely change during auction)
  async getCategories() {
    const cacheKey = 'categories';
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return Promise.resolve(cached);
    }

    return this.request('/categories').then((data) => {
      apiCache.set(cacheKey, data, CACHE_TTL.CATEGORIES);
      return data;
    });
  }

  async getCategoriesPublic(tournamentId: string) {
    return this.request(`/categories/public/${tournamentId}`);
  }

  async createCategory(data: { name: string; base_price: number; display_order?: number }) {
    apiCache.invalidate('categories');
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: string, data: Partial<{ name: string; base_price: number; display_order: number }>) {
    apiCache.invalidate('categories');
    return this.request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateStandardCategoryPrices(categoryPrices?: {
    platinum: number;
    gold: number;
    silver: number;
    bronze: number;
  }) {
    apiCache.invalidate('categories');
    return this.request('/categories/update-standard-prices', {
      method: 'POST',
      body: JSON.stringify({ category_prices: categoryPrices }),
    });
  }

  async deleteCategory(id: string) {
    apiCache.invalidate('categories');
    return this.request(`/categories/${id}`, { method: 'DELETE' });
  }

  // Players (cached for 30 seconds)
  async getPlayers(status?: string, category_id?: string, role_category?: string) {
    let query = '';
    const params: string[] = [];
    if (status) params.push(`status=${status}`);
    if (category_id) params.push(`category_id=${category_id}`);
    if (role_category) params.push(`role_category=${role_category}`);
    if (params.length) query = `?${params.join('&')}`;

    const cacheKey = `players${query}`;
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return Promise.resolve(cached);
    }

    return this.request(`/players${query}`).then((data) => {
      apiCache.set(cacheKey, data, CACHE_TTL.PLAYERS);
      return data;
    });
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
    apiCache.invalidate('players');
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

  async createPlayersBulkUpsert(players: Array<{
    name: string;
    photo_url?: string;
    jersey_number?: string;
    category_id: string;
    base_price?: number;
    stats?: Record<string, any>;
    rowNumber?: number;
  }>) {
    return this.request<{
      created: any[];
      updated: any[];
      errors: Array<{ row: number; name: string; error: string }>;
    }>('/players/bulk-upsert', {
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
    apiCache.invalidate('players');
    return this.request(`/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePlayer(id: string) {
    apiCache.invalidate('players');
    return this.request(`/players/${id}`, { method: 'DELETE' });
  }

  async resetPlayer(id: string) {
    apiCache.invalidate('players');
    apiCache.invalidate('teams');
    return this.request(`/players/${id}/reset`, { method: 'POST' });
  }

  async togglePlayerAvailability(id: string) {
    return this.request(`/players/${id}/toggle-availability`, { method: 'POST' });
  }

  async searchPlayerByNumber(number: string) {
    return this.request(`/players/search/number/${number}`);
  }

  async searchPlayerByUID(uid: string) {
    return this.request(`/players/search/uid/${uid}`);
  }

  // Upload
  async uploadImageFromUrl(url: string, filename?: string) {
    return this.request<{ success: boolean; url: string; path: string }>('/upload/from-url', {
      method: 'POST',
      body: JSON.stringify({ url, filename }),
    });
  }

  async uploadImagesFromUrls(images: Array<{ url: string; filename?: string }>) {
    return this.request<{
      results: Array<{ originalUrl: string; newUrl: string | null; error?: string }>;
    }>('/upload/bulk-from-url', {
      method: 'POST',
      body: JSON.stringify({ images }),
    });
  }

  // Auction
  async getNextPlayer(category_id?: string, role_category?: string) {
    const params: string[] = [];
    if (category_id && category_id !== 'all') params.push(`category_id=${category_id}`);
    if (role_category) params.push(`role_category=${role_category}`);
    const query = params.length ? `?${params.join('&')}` : '';
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
    // Invalidate caches as player/team data changes
    apiCache.invalidate('players');
    apiCache.invalidate('teams');
    return this.request('/auction/sold', {
      method: 'POST',
      body: JSON.stringify({ player_id, team_id, amount }),
    });
  }

  async markUnsold() {
    apiCache.invalidate('players');
    return this.request('/auction/unsold', { method: 'POST' });
  }

  async reauctionUnsold() {
    apiCache.invalidate('players');
    return this.request('/auction/reauction-unsold', { method: 'POST' });
  }

  async resetAuction() {
    apiCache.invalidate('players');
    apiCache.invalidate('teams');
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
