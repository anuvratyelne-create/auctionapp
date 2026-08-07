import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import tournamentRoutes from './routes/tournaments';
import teamRoutes from './routes/teams';
import playerRoutes from './routes/players';
import categoryRoutes from './routes/categories';
import auctionRoutes from './routes/auction';
import retentionRoutes from './routes/retention';
import statsRoutes from './routes/stats';
import exportRoutes from './routes/export';
import uploadRoutes from './routes/upload';
import adminRoutes from './routes/admin';
import superAdminRoutes from './routes/superAdmin';
import { setupSocketHandlers } from './socket/handlers';
import { authenticateToken, AuthRequest } from './middleware/auth';
import { requestLogger, errorLogger } from './middleware/requestLogger';
import { csrfErrorHandler } from './middleware/csrf';
import logger from './utils/logger';
import supabase from './config/supabase';

dotenv.config();

// Auto-cleanup constants (configurable via environment)
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const TOURNAMENT_MAX_AGE_DAYS = parseInt(process.env.TOURNAMENT_RETENTION_DAYS || '90', 10);
const CLEANUP_ENABLED = process.env.DISABLE_AUTO_CLEANUP !== 'true';

const app = express();
const httpServer = createServer(app);

// Parse CORS origins from environment or use defaults
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development, enable in production
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting - general API limit
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Even stricter rate limit for admin auth (security)
const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: { error: 'Too many admin login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit for public endpoints (no auth required)
// Stricter to prevent abuse of public data access
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes (vs 500 for authenticated)
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

// Cookie parser for CSRF tokens
app.use(cookieParser());

// Request size limit to prevent DoS
app.use(express.json({ limit: '10mb' }));

// Structured logging for HTTP requests
app.use(requestLogger);

// Apply general rate limiting
app.use('/api', generalLimiter);

// Apply stricter rate limiting to public endpoints (no auth required)
app.use('/api/teams/public', publicLimiter);
app.use('/api/players/public', publicLimiter);
app.use('/api/categories/public', publicLimiter);

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/auction', auctionRoutes);
app.use('/api/retention', retentionRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin/auth', adminAuthLimiter); // Apply stricter limit to admin auth
app.use('/api/admin', adminRoutes);

// Super Admin routes (hidden path - not discoverable)
app.use('/api/sa', superAdminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fix stuck bidding players - reset them to available (requires auth, scoped to user's tournament)
app.post('/api/fix-bidding', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.tournamentId) {
      return res.status(400).json({ error: 'Tournament ID required' });
    }

    const { data: players, error } = await supabase
      .from('players')
      .update({ status: 'available' })
      .eq('status', 'bidding')
      .eq('tournament_id', req.tournamentId)
      .select();

    if (error) {
      return res.status(500).json({ error: 'Failed to fix bidding players' });
    }

    res.json({
      success: true,
      message: `Fixed ${players?.length || 0} stuck bidding players`,
      count: players?.length || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fix bidding players' });
  }
});

// Setup demo tournament (one-time setup endpoint - requires admin key)
app.post('/api/setup-demo', async (req, res) => {
  // Require X-Admin-Key header for security
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_KEY || process.env.JWT_SECRET;

  if (!adminKey || adminKey !== expectedKey) {
    return res.status(401).json({ error: 'Admin key required' });
  }

  try {
    // Find demo tournament
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('*')
      .eq('share_code', 'DEMO01')
      .single();

    if (!tournament) {
      return res.status(404).json({ error: 'Demo tournament not found' });
    }

    // Update tournament settings
    await supabase
      .from('tournaments')
      .update({
        total_points: 1000000,  // 10 Lakhs
        min_players: 15,
        max_players: 18,
        bid_increment: 5000
      })
      .eq('id', tournament.id);

    // Update existing categories with new prices (instead of delete/create)
    const categoryUpdates = [
      { name: 'Platinum', base_price: 50000, display_order: 1 },
      { name: 'Gold', base_price: 30000, display_order: 2 },
      { name: 'Silver', base_price: 20000, display_order: 3 },
      { name: 'Bronze', base_price: 10000, display_order: 4 }
    ];

    for (const cat of categoryUpdates) {
      // Try to update existing, or insert if not exists
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('tournament_id', tournament.id)
        .eq('name', cat.name)
        .single();

      if (existing) {
        await supabase
          .from('categories')
          .update({ base_price: cat.base_price, display_order: cat.display_order })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('categories')
          .insert({ ...cat, tournament_id: tournament.id });
      }
    }

    // Update all teams to have 10 Lakh budget
    await supabase
      .from('teams')
      .update({ total_budget: 1000000 })
      .eq('tournament_id', tournament.id);

    res.json({
      success: true,
      message: 'Demo tournament configured!',
      settings: {
        budget: '10,00,000 Points (10 Lakh)',
        min_players: 15,
        max_players: 18,
        bid_increment: '5,000 Points',
        categories: ['Platinum (50,000 pts)', 'Gold (30,000 pts)', 'Silver (20,000 pts)', 'Bronze (10,000 pts)']
      }
    });
  } catch (error) {
    logger.error('Setup error', { type: 'setup', error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Setup failed' });
  }
});

// Error handlers - must be after routes
app.use(csrfErrorHandler);
app.use(errorLogger);

// Serve static frontend files in production
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// Handle SPA routing - send index.html for non-API routes
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Socket.io setup
setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;

// Smart auto-cleanup job for old INACTIVE tournaments only (runs daily)
// Preserves: completed tournaments, tournaments with bids, demo tournaments
async function cleanupOldTournaments(): Promise<void> {
  if (!CLEANUP_ENABLED) {
    logger.info('Cleanup: Disabled via DISABLE_AUTO_CLEANUP=true', { type: 'cleanup' });
    return;
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - TOURNAMENT_MAX_AGE_DAYS);
    const cutoffISO = cutoffDate.toISOString();

    // Find old tournaments that are ONLY in 'setup' status (never started)
    // Excludes: demo tournament, completed/live/paused tournaments
    const { data: oldTournaments, error: findError } = await supabase
      .from('tournaments')
      .select('id, name, share_code, created_at, status')
      .lt('created_at', cutoffISO)
      .eq('status', 'setup')  // Only delete abandoned setup tournaments
      .neq('share_code', 'DEMO01');

    if (findError) {
      logger.error('Error finding old tournaments', { type: 'cleanup', error: findError.message });
      return;
    }

    if (!oldTournaments || oldTournaments.length === 0) {
      logger.debug('Cleanup: No abandoned tournaments to delete', { type: 'cleanup' });
      return;
    }

    // Filter out tournaments that have any bid activity (someone used them)
    const tournamentsToDelete: typeof oldTournaments = [];

    for (const tournament of oldTournaments) {
      const { count: bidCount } = await supabase
        .from('bids')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', tournament.id);

      // Only delete if no bids exist (truly abandoned)
      if (!bidCount || bidCount === 0) {
        tournamentsToDelete.push(tournament);
      }
    }

    if (tournamentsToDelete.length === 0) {
      logger.debug('Cleanup: No abandoned tournaments without activity to delete', { type: 'cleanup' });
      return;
    }

    logger.info(`Cleanup: Found ${tournamentsToDelete.length} abandoned tournaments older than ${TOURNAMENT_MAX_AGE_DAYS} days`, {
      type: 'cleanup',
      count: tournamentsToDelete.length,
      retentionDays: TOURNAMENT_MAX_AGE_DAYS
    });

    for (const tournament of tournamentsToDelete) {
      try {
        // Delete in order: bids → players → teams → categories → sponsors → tournament
        await supabase.from('bids').delete().eq('tournament_id', tournament.id);
        await supabase.from('players').delete().eq('tournament_id', tournament.id);
        await supabase.from('teams').delete().eq('tournament_id', tournament.id);
        await supabase.from('categories').delete().eq('tournament_id', tournament.id);
        await supabase.from('sponsors').delete().eq('tournament_id', tournament.id);
        await supabase.from('tournaments').delete().eq('id', tournament.id);

        logger.info(`Cleanup: Deleted abandoned tournament "${tournament.name}"`, {
          type: 'cleanup',
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          createdAt: tournament.created_at
        });
      } catch (deleteError) {
        logger.error(`Cleanup: Failed to delete tournament ${tournament.id}`, {
          type: 'cleanup',
          tournamentId: tournament.id,
          error: deleteError instanceof Error ? deleteError.message : String(deleteError)
        });
      }
    }

    logger.info(`Cleanup: Completed deletion of ${tournamentsToDelete.length} abandoned tournaments`, {
      type: 'cleanup',
      deletedCount: tournamentsToDelete.length
    });

    // Also clean up stale demo tournament data (older than 7 days)
    // This resets the demo tournament so it doesn't accumulate old data
    await cleanupDemoTournamentData();
  } catch (error) {
    logger.error('Cleanup job error', {
      type: 'cleanup',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Clean up demo tournament data that's older than 7 days
async function cleanupDemoTournamentData(): Promise<void> {
  try {
    // Find demo tournament
    const { data: demoTournament } = await supabase
      .from('tournaments')
      .select('id')
      .eq('share_code', 'DEMO01')
      .single();

    if (!demoTournament) {
      return; // No demo tournament exists
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffISO = sevenDaysAgo.toISOString();

    // Delete old bids from demo tournament
    const { data: deletedBidsData } = await supabase
      .from('bids')
      .delete()
      .eq('tournament_id', demoTournament.id)
      .lt('created_at', cutoffISO)
      .select('id');
    const deletedBids = deletedBidsData?.length || 0;

    // Reset sold players back to available (older than 7 days)
    const { data: resetPlayersData } = await supabase
      .from('players')
      .update({ status: 'available', team_id: null, sold_price: null })
      .eq('tournament_id', demoTournament.id)
      .eq('status', 'sold')
      .lt('updated_at', cutoffISO)
      .select('id');
    const resetPlayers = resetPlayersData?.length || 0;

    // Reset team spending
    await supabase
      .from('teams')
      .update({ spent_points: 0, retention_spent: 0 })
      .eq('tournament_id', demoTournament.id);

    if (deletedBids > 0 || resetPlayers > 0) {
      logger.info(`Demo cleanup: Deleted ${deletedBids} old bids, reset ${resetPlayers} players`, {
        type: 'cleanup',
        deletedBids,
        resetPlayers
      });
    }
  } catch (error) {
    logger.error('Demo cleanup error', { type: 'cleanup', error: error instanceof Error ? error.message : String(error) });
  }
}

// Run cleanup on startup and then every 24 hours
if (CLEANUP_ENABLED) {
  cleanupOldTournaments();
}
const cleanupInterval = CLEANUP_ENABLED
  ? setInterval(cleanupOldTournaments, CLEANUP_INTERVAL_MS)
  : null;

// Graceful shutdown handling
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`${signal} received. Starting graceful shutdown...`, { type: 'shutdown', signal });

  // Stop accepting new connections
  httpServer.close(() => {
    logger.info('HTTP server closed', { type: 'shutdown' });
  });

  // Notify all connected clients
  io.emit('server:shutdown', { message: 'Server is shutting down for maintenance' });

  // Clear cleanup interval
  if (cleanupInterval) clearInterval(cleanupInterval);

  // Wait for existing connections to drain (3 seconds)
  logger.info('Waiting for connections to drain...', { type: 'shutdown' });
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Close socket.io
  io.close(() => {
    logger.info('Socket.io closed', { type: 'shutdown' });
  });

  logger.info('Graceful shutdown complete', { type: 'shutdown' });
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, { type: 'startup', port: PORT });
  logger.info('Socket.io ready for connections', { type: 'startup' });
  if (CLEANUP_ENABLED) {
    logger.info(`Auto-cleanup enabled: ONLY abandoned setup tournaments (no bids) older than ${TOURNAMENT_MAX_AGE_DAYS} days will be deleted`, {
      type: 'startup',
      cleanupEnabled: true,
      retentionDays: TOURNAMENT_MAX_AGE_DAYS
    });
  } else {
    logger.info('Auto-cleanup disabled (DISABLE_AUTO_CLEANUP=true)', { type: 'startup', cleanupEnabled: false });
  }
});

export { io };
