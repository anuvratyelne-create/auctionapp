import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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
import { setupSocketHandlers } from './socket/handlers';
import { authenticateToken, AuthRequest } from './middleware/auth';
import supabase from './config/supabase';

// Auto-cleanup constants
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const TOURNAMENT_MAX_AGE_DAYS = 10;

dotenv.config();

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

// CORS
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

// Request size limit to prevent DoS
app.use(express.json({ limit: '10mb' }));

// Apply general rate limiting
app.use('/api', generalLimiter);

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
    console.error('Setup error:', error);
    res.status(500).json({ error: 'Setup failed' });
  }
});

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

// Auto-cleanup job for old tournaments (runs daily)
async function cleanupOldTournaments(): Promise<void> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - TOURNAMENT_MAX_AGE_DAYS);
    const cutoffISO = cutoffDate.toISOString();

    // Find tournaments older than 10 days, excluding demo tournament
    const { data: oldTournaments, error: findError } = await supabase
      .from('tournaments')
      .select('id, name, share_code, created_at')
      .lt('created_at', cutoffISO)
      .neq('share_code', 'DEMO01');

    if (findError) {
      console.error('Error finding old tournaments:', findError);
      return;
    }

    if (!oldTournaments || oldTournaments.length === 0) {
      console.log('Cleanup: No old tournaments to delete');
      return;
    }

    console.log(`Cleanup: Found ${oldTournaments.length} tournaments older than ${TOURNAMENT_MAX_AGE_DAYS} days`);

    for (const tournament of oldTournaments) {
      try {
        // Delete in order: bids → players → teams → categories → sponsors → tournament
        await supabase.from('bids').delete().eq('tournament_id', tournament.id);
        await supabase.from('players').delete().eq('tournament_id', tournament.id);
        await supabase.from('teams').delete().eq('tournament_id', tournament.id);
        await supabase.from('categories').delete().eq('tournament_id', tournament.id);
        await supabase.from('sponsors').delete().eq('tournament_id', tournament.id);
        await supabase.from('tournaments').delete().eq('id', tournament.id);

        console.log(`Cleanup: Deleted tournament "${tournament.name}" (${tournament.id}), created: ${tournament.created_at}`);
      } catch (deleteError) {
        console.error(`Cleanup: Failed to delete tournament ${tournament.id}:`, deleteError);
      }
    }

    console.log(`Cleanup: Completed deletion of ${oldTournaments.length} old tournaments`);
  } catch (error) {
    console.error('Cleanup job error:', error);
  }
}

// Run cleanup on startup and then every 24 hours
cleanupOldTournaments();
const cleanupInterval = setInterval(cleanupOldTournaments, CLEANUP_INTERVAL_MS);

// Graceful shutdown handling
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  httpServer.close(() => {
    console.log('HTTP server closed');
  });

  // Notify all connected clients
  io.emit('server:shutdown', { message: 'Server is shutting down for maintenance' });

  // Clear cleanup interval
  clearInterval(cleanupInterval);

  // Wait for existing connections to drain (3 seconds)
  console.log('Waiting for connections to drain...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Close socket.io
  io.close(() => {
    console.log('Socket.io closed');
  });

  console.log('Graceful shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io ready for connections`);
  console.log(`Auto-cleanup enabled: tournaments older than ${TOURNAMENT_MAX_AGE_DAYS} days will be deleted`);
});

export { io };
