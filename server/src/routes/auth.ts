import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../config/supabase';
import { z } from 'zod';

const router = Router();

const registerSchema = z.object({
  mobile: z.string().min(10).max(15),
  password: z.string().min(6),
  tournamentName: z.string().min(1),
  totalPoints: z.number().min(1000).default(100000),
  minPlayers: z.number().min(1).default(7),
  maxPlayers: z.number().min(1).default(15)
});

const loginSchema = z.object({
  mobile: z.string().min(1),
  password: z.string().min(1)
});

// Register new user and create tournament
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if mobile already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('mobile', data.mobile)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Mobile number already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Generate share code
    const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create tournament first
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .insert({
        name: data.tournamentName,
        total_points: data.totalPoints,
        min_players: data.minPlayers,
        max_players: data.maxPlayers,
        bid_increment: 1000,
        share_code: shareCode,
        status: 'setup'
      })
      .select()
      .single();

    if (tournamentError) {
      console.error('Tournament creation error:', tournamentError);
      return res.status(500).json({ error: 'Failed to create tournament' });
    }

    // Create user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        mobile: data.mobile,
        password_hash: passwordHash,
        tournament_id: tournament.id
      })
      .select()
      .single();

    if (userError) {
      // Rollback tournament creation
      await supabase.from('tournaments').delete().eq('id', tournament.id);
      console.error('User creation error:', userError);
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Create default categories
    const defaultCategories = [
      { name: 'Platinum', base_price: 10000, display_order: 1 },
      { name: 'Gold', base_price: 7000, display_order: 2 },
      { name: 'Silver', base_price: 5000, display_order: 3 },
      { name: 'Bronze', base_price: 3000, display_order: 4 }
    ];

    await supabase.from('categories').insert(
      defaultCategories.map(cat => ({
        ...cat,
        tournament_id: tournament.id
      }))
    );

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, tournamentId: tournament.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, mobile: user.mobile },
      tournament: tournament  // Return full tournament object
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    // Demo credentials - only available in development
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment && data.mobile === 'demo' && data.password === 'demo123') {
      // Find or create demo tournament
      let { data: tournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('share_code', 'DEMO01')
        .single();

      if (!tournament) {
        const { data: newTournament } = await supabase
          .from('tournaments')
          .insert({
            name: 'Demo Tournament',
            total_points: 100000,
            min_players: 7,
            max_players: 15,
            bid_increment: 1000,
            share_code: 'DEMO01',
            status: 'setup'
          })
          .select()
          .single();
        tournament = newTournament;

        // Create default categories for demo tournament
        if (tournament) {
          const defaultCategories = [
            { name: 'Platinum', base_price: 10000, display_order: 1 },
            { name: 'Gold', base_price: 7000, display_order: 2 },
            { name: 'Silver', base_price: 5000, display_order: 3 },
            { name: 'Bronze', base_price: 3000, display_order: 4 }
          ];
          await supabase.from('categories').insert(
            defaultCategories.map(cat => ({
              ...cat,
              tournament_id: tournament!.id
            }))
          );
        }
      }

      // Check if categories exist for demo tournament, create if not
      const { data: existingCategories } = await supabase
        .from('categories')
        .select('id')
        .eq('tournament_id', tournament!.id)
        .limit(1);

      if (!existingCategories || existingCategories.length === 0) {
        const defaultCategories = [
          { name: 'Platinum', base_price: 10000, display_order: 1 },
          { name: 'Gold', base_price: 7000, display_order: 2 },
          { name: 'Silver', base_price: 5000, display_order: 3 },
          { name: 'Bronze', base_price: 3000, display_order: 4 }
        ];
        await supabase.from('categories').insert(
          defaultCategories.map(cat => ({
            ...cat,
            tournament_id: tournament!.id
          }))
        );
      }

      const token = jwt.sign(
        { userId: 'demo', tournamentId: tournament!.id },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      return res.json({
        token,
        user: { id: 'demo', mobile: 'demo' },
        tournament: tournament  // Return full tournament object
      });
    }

    // Regular login
    const { data: user, error } = await supabase
      .from('users')
      .select('*, tournaments(*)')
      .eq('mobile', data.mobile)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(data.password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, tournamentId: user.tournament_id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // user.tournaments is a nested object from the join, not an array
    const tournament = Array.isArray(user.tournaments) ? user.tournaments[0] : user.tournaments;
    res.json({
      token,
      user: { id: user.id, mobile: user.mobile },
      tournament: tournament || null  // Return full tournament object
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify token
router.get('/verify', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      tournamentId: string;
    };

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', decoded.tournamentId)
      .single();

    res.json({
      valid: true,
      userId: decoded.userId,
      tournament
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
