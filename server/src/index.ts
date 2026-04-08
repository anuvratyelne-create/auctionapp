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
import { setupSocketHandlers } from './socket/handlers';

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fix stuck bidding players - reset them to available
app.post('/api/fix-bidding', async (req, res) => {
  try {
    const { data: players, error } = await supabase
      .from('players')
      .update({ status: 'available' })
      .eq('status', 'bidding')
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

// Setup demo tournament (one-time setup endpoint)
import supabase from './config/supabase';

app.post('/api/setup-demo', async (req, res) => {
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

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io ready for connections`);
});

export { io };
