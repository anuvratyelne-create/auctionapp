/**
 * LocalStorage Cache for fast app loading
 * Uses "stale-while-revalidate" pattern:
 * 1. Show cached data immediately
 * 2. Fetch fresh data in background
 * 3. Update UI when fresh data arrives
 */

interface CachedData<T> {
  data: T;
  timestamp: number;
  tournamentId: string;
}

// Cache keys
const CACHE_KEYS = {
  TEAMS: 'auction_cache_teams',
  PLAYERS: 'auction_cache_players',
  CATEGORIES: 'auction_cache_categories',
  TOURNAMENT: 'auction_cache_tournament',
  SPONSORS: 'auction_cache_sponsors',
};

// Cache duration (how long before data is considered "stale" - but still usable)
const CACHE_DURATION = {
  TEAMS: 24 * 60 * 60 * 1000,      // 24 hours
  PLAYERS: 24 * 60 * 60 * 1000,    // 24 hours
  CATEGORIES: 7 * 24 * 60 * 60 * 1000,  // 7 days (rarely changes)
  TOURNAMENT: 24 * 60 * 60 * 1000, // 24 hours
  SPONSORS: 24 * 60 * 60 * 1000,   // 24 hours
};

class LocalCache {
  private currentTournamentId: string | null = null;

  /**
   * Set the current tournament ID for cache scoping
   */
  setTournamentId(tournamentId: string | null) {
    if (this.currentTournamentId !== tournamentId) {
      this.currentTournamentId = tournamentId;
      console.log('[LocalCache] Tournament ID set:', tournamentId);
    }
  }

  /**
   * Get cached data if available and not too old
   */
  get<T>(key: string): T | null {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const cached: CachedData<T> = JSON.parse(stored);

      // Check if cache is for current tournament
      if (cached.tournamentId !== this.currentTournamentId) {
        console.log('[LocalCache] Cache miss - different tournament');
        return null;
      }

      // Return cached data (even if stale - we'll refresh in background)
      console.log('[LocalCache] Cache hit:', key);
      return cached.data;
    } catch (e) {
      console.error('[LocalCache] Error reading cache:', e);
      return null;
    }
  }

  /**
   * Check if cached data is stale (older than duration)
   */
  isStale(key: string, durationMs: number): boolean {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return true;

      const cached: CachedData<any> = JSON.parse(stored);
      const age = Date.now() - cached.timestamp;
      return age > durationMs;
    } catch (e) {
      return true;
    }
  }

  /**
   * Save data to cache
   */
  set<T>(key: string, data: T): void {
    if (!this.currentTournamentId) {
      console.log('[LocalCache] No tournament ID, skipping cache');
      return;
    }

    try {
      const cached: CachedData<T> = {
        data,
        timestamp: Date.now(),
        tournamentId: this.currentTournamentId,
      };
      localStorage.setItem(key, JSON.stringify(cached));
      console.log('[LocalCache] Cached:', key);
    } catch (e) {
      console.error('[LocalCache] Error saving cache:', e);
      // If localStorage is full, clear old caches
      this.clearAll();
    }
  }

  /**
   * Clear specific cache
   */
  clear(key: string): void {
    try {
      localStorage.removeItem(key);
      console.log('[LocalCache] Cleared:', key);
    } catch (e) {
      console.error('[LocalCache] Error clearing cache:', e);
    }
  }

  /**
   * Clear all auction caches
   */
  clearAll(): void {
    Object.values(CACHE_KEYS).forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {}
    });
    console.log('[LocalCache] All caches cleared');
  }

  /**
   * Clear caches for current tournament (on logout or tournament switch)
   */
  clearCurrentTournament(): void {
    this.clearAll();
  }

  // Convenience methods for specific data types

  getTeams(): any[] | null {
    return this.get<any[]>(CACHE_KEYS.TEAMS);
  }

  setTeams(teams: any[]): void {
    this.set(CACHE_KEYS.TEAMS, teams);
  }

  isTeamsStale(): boolean {
    return this.isStale(CACHE_KEYS.TEAMS, CACHE_DURATION.TEAMS);
  }

  getPlayers(): any[] | null {
    return this.get<any[]>(CACHE_KEYS.PLAYERS);
  }

  setPlayers(players: any[]): void {
    this.set(CACHE_KEYS.PLAYERS, players);
  }

  isPlayersStale(): boolean {
    return this.isStale(CACHE_KEYS.PLAYERS, CACHE_DURATION.PLAYERS);
  }

  getCategories(): any[] | null {
    return this.get<any[]>(CACHE_KEYS.CATEGORIES);
  }

  setCategories(categories: any[]): void {
    this.set(CACHE_KEYS.CATEGORIES, categories);
  }

  isCategoriesStale(): boolean {
    return this.isStale(CACHE_KEYS.CATEGORIES, CACHE_DURATION.CATEGORIES);
  }

  getTournament(): any | null {
    return this.get<any>(CACHE_KEYS.TOURNAMENT);
  }

  setTournament(tournament: any): void {
    this.set(CACHE_KEYS.TOURNAMENT, tournament);
  }

  getSponsors(): any[] | null {
    return this.get<any[]>(CACHE_KEYS.SPONSORS);
  }

  setSponsors(sponsors: any[]): void {
    this.set(CACHE_KEYS.SPONSORS, sponsors);
  }

  /**
   * Invalidate teams cache (after create/update/delete)
   */
  invalidateTeams(): void {
    this.clear(CACHE_KEYS.TEAMS);
  }

  /**
   * Invalidate players cache (after create/update/delete)
   */
  invalidatePlayers(): void {
    this.clear(CACHE_KEYS.PLAYERS);
  }

  /**
   * Invalidate categories cache
   */
  invalidateCategories(): void {
    this.clear(CACHE_KEYS.CATEGORIES);
  }
}

// Export singleton instance
export const localCache = new LocalCache();
export { CACHE_KEYS, CACHE_DURATION };
