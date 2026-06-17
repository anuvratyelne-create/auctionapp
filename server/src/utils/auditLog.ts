import supabase from '../config/supabase';

// Audit event types
export type AuditEventType =
  | 'PLAYER_SOLD'
  | 'PLAYER_UNSOLD'
  | 'BID_PLACED'
  | 'SALE_UNDONE'
  | 'TOURNAMENT_CREATED'
  | 'TOURNAMENT_UPDATED'
  | 'TOURNAMENT_DELETED'
  | 'TEAM_CREATED'
  | 'TEAM_UPDATED'
  | 'TEAM_DELETED'
  | 'PLAYER_CREATED'
  | 'PLAYER_UPDATED'
  | 'PLAYER_DELETED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'PASSWORD_CHANGED'
  | 'AUCTION_STARTED'
  | 'AUCTION_RESET';

interface AuditLogEntry {
  event_type: AuditEventType;
  user_id?: string;
  tournament_id?: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
}

/**
 * Log an audit event to the database
 * Fails silently to avoid disrupting main operations
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      event_type: entry.event_type,
      user_id: entry.user_id || null,
      tournament_id: entry.tournament_id || null,
      entity_type: entry.entity_type || null,
      entity_id: entry.entity_id || null,
      details: entry.details || {},
      ip_address: entry.ip_address || null,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    // Fail silently - audit logging should not break main operations
    // In production, consider logging to a file as fallback
    console.error('Audit log failed:', error);
  }
}

/**
 * Helper to extract IP address from request
 */
export function getClientIP(req: { ip?: string; headers?: Record<string, string | string[] | undefined> }): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

// Convenience functions for common audit events
export const auditLog = {
  playerSold: (userId: string, tournamentId: string, playerId: string, details: Record<string, unknown>) =>
    logAuditEvent({
      event_type: 'PLAYER_SOLD',
      user_id: userId,
      tournament_id: tournamentId,
      entity_type: 'player',
      entity_id: playerId,
      details
    }),

  playerUnsold: (userId: string, tournamentId: string, playerId: string) =>
    logAuditEvent({
      event_type: 'PLAYER_UNSOLD',
      user_id: userId,
      tournament_id: tournamentId,
      entity_type: 'player',
      entity_id: playerId
    }),

  bidPlaced: (userId: string, tournamentId: string, playerId: string, details: Record<string, unknown>) =>
    logAuditEvent({
      event_type: 'BID_PLACED',
      user_id: userId,
      tournament_id: tournamentId,
      entity_type: 'player',
      entity_id: playerId,
      details
    }),

  saleUndone: (userId: string, tournamentId: string, playerId: string, details: Record<string, unknown>) =>
    logAuditEvent({
      event_type: 'SALE_UNDONE',
      user_id: userId,
      tournament_id: tournamentId,
      entity_type: 'player',
      entity_id: playerId,
      details
    }),

  tournamentCreated: (userId: string, tournamentId: string, details: Record<string, unknown>) =>
    logAuditEvent({
      event_type: 'TOURNAMENT_CREATED',
      user_id: userId,
      tournament_id: tournamentId,
      entity_type: 'tournament',
      entity_id: tournamentId,
      details
    }),

  tournamentUpdated: (userId: string, tournamentId: string, details: Record<string, unknown>) =>
    logAuditEvent({
      event_type: 'TOURNAMENT_UPDATED',
      user_id: userId,
      tournament_id: tournamentId,
      entity_type: 'tournament',
      entity_id: tournamentId,
      details
    }),

  auctionReset: (userId: string, tournamentId: string) =>
    logAuditEvent({
      event_type: 'AUCTION_RESET',
      user_id: userId,
      tournament_id: tournamentId,
      entity_type: 'tournament',
      entity_id: tournamentId
    })
};
