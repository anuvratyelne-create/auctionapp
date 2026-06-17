import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import supabase from '../config/supabase';
import { z } from 'zod';
import { csrfTokenEndpoint } from '../middleware/csrf';

// Generate cryptographically secure share code
function generateSecureShareCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

const router = Router();

// Helper to log auth events (silent failure if table doesn't exist)
async function logAuthEvent(
  userId: string | null,
  action: string,
  success: boolean,
  details: Record<string, unknown> = {},
  req?: Request
) {
  try {
    const { error } = await supabase.from('auth_logs').insert({
      user_id: userId,
      action,
      success,
      ip_address: req?.ip || req?.headers['x-forwarded-for'] || null,
      user_agent: req?.headers['user-agent'] || null,
      details
    });
    // Silently ignore errors (table might not exist if migration not run)
    if (error && !error.message.includes('does not exist')) {
      console.error('Failed to log auth event:', error.message);
    }
  } catch (err) {
    // Silently fail - logging shouldn't break auth
  }
}

const registerSchema = z.object({
  email: z.string().email(),
  mobile: z.string().min(10).max(15),
  password: z.string().min(6),
  tournamentName: z.string().min(1),
  totalPoints: z.number().min(1000).default(100000),
  minPlayers: z.number().min(1).default(7),
  maxPlayers: z.number().min(1).default(15)
});

const loginSchema = z.object({
  identifier: z.string().min(1), // Can be email or mobile
  password: z.string().min(1)
});

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(10).max(15),
  password: z.string().min(6),
  state: z.string().min(1),
  city: z.string().min(1),
});

// Signup - Create user only (no tournament)
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const data = signupSchema.parse(req.body);

    // Check if email already exists (case-insensitive)
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', data.email.toLowerCase())
      .single();

    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Check if mobile already exists
    const { data: existingMobile } = await supabase
      .from('users')
      .select('id')
      .eq('mobile', data.mobile)
      .single();

    if (existingMobile) {
      return res.status(400).json({ error: 'Mobile number already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user without tournament (normalize email to lowercase)
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        name: data.name,
        email: data.email.toLowerCase(),
        mobile: data.mobile,
        password_hash: passwordHash,
        state: data.state,
        city: data.city,
        tournament_id: null
      })
      .select()
      .single();

    if (userError) {
      console.error('User creation error:', userError);
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, tournamentId: null },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile, state: user.state, city: user.city },
      tournament: null,
      tournaments: [] // New user has no tournaments yet
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Register new user and create tournament
// Uses manual transaction pattern with full rollback on any failure
router.post('/register', async (req: Request, res: Response) => {
  // Track created resources for rollback
  let createdTournamentId: string | null = null;
  let createdUserId: string | null = null;

  try {
    const data = registerSchema.parse(req.body);

    // Check if email already exists (case-insensitive)
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', data.email.toLowerCase())
      .single();

    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Check if mobile already exists
    const { data: existingMobile } = await supabase
      .from('users')
      .select('id')
      .eq('mobile', data.mobile)
      .single();

    if (existingMobile) {
      return res.status(400).json({ error: 'Mobile number already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Generate cryptographically secure share code
    const shareCode = generateSecureShareCode();

    // Step 1: Create tournament
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

    if (tournamentError || !tournament) {
      console.error('Tournament creation error:', tournamentError);
      return res.status(500).json({ error: 'Failed to create tournament' });
    }
    createdTournamentId = tournament.id;

    // Step 2: Create user (normalize email to lowercase)
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email: data.email.toLowerCase(),
        mobile: data.mobile,
        password_hash: passwordHash,
        tournament_id: tournament.id
      })
      .select()
      .single();

    if (userError || !user) {
      throw new Error(`User creation failed: ${userError?.message || 'Unknown error'}`);
    }
    createdUserId = user.id;

    // Step 3: Update tournament with owner_id
    const { error: ownerError } = await supabase
      .from('tournaments')
      .update({ owner_id: user.id })
      .eq('id', tournament.id);

    if (ownerError) {
      throw new Error(`Failed to set tournament owner: ${ownerError.message}`);
    }

    // Step 4: Create default categories
    const defaultCategories = [
      { name: 'Platinum', base_price: 10000, display_order: 1 },
      { name: 'Gold', base_price: 7000, display_order: 2 },
      { name: 'Silver', base_price: 5000, display_order: 3 },
      { name: 'Bronze', base_price: 3000, display_order: 4 }
    ];

    const { error: categoriesError } = await supabase.from('categories').insert(
      defaultCategories.map(cat => ({
        ...cat,
        tournament_id: tournament.id
      }))
    );

    if (categoriesError) {
      throw new Error(`Failed to create categories: ${categoriesError.message}`);
    }

    // All steps successful - generate JWT
    const token = jwt.sign(
      { userId: user.id, tournamentId: tournament.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, mobile: user.mobile },
      tournament: tournament,
      tournaments: [tournament] // User just created this tournament
    });
  } catch (error) {
    // Rollback in reverse order
    console.error('Register error, rolling back:', error);

    if (createdUserId) {
      await supabase.from('users').delete().eq('id', createdUserId);
    }

    if (createdTournamentId) {
      // Delete categories first (no FK constraint but good practice)
      await supabase.from('categories').delete().eq('tournament_id', createdTournamentId);
      await supabase.from('tournaments').delete().eq('id', createdTournamentId);
    }

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    // Demo credentials - ONLY available in development and if not explicitly disabled
    // Set DISABLE_DEMO=true in production as an extra safeguard
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const demoDisabled = process.env.DISABLE_DEMO === 'true';
    if (isDevelopment && !demoDisabled && data.identifier === 'demo' && data.password === 'demo123') {
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
        tournament: tournament,
        tournaments: [tournament] // Demo user has one tournament
      });
    }

    // Regular login - check if identifier is email or mobile
    const isEmail = data.identifier.includes('@');
    // Normalize email to lowercase for case-insensitive matching
    const normalizedIdentifier = isEmail ? data.identifier.toLowerCase() : data.identifier;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq(isEmail ? 'email' : 'mobile', normalizedIdentifier)
      .single();

    if (error || !user) {
      await logAuthEvent(null, 'failed_login', false, { reason: 'user_not_found' }, req);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(data.password, user.password_hash);

    if (!validPassword) {
      await logAuthEvent(user.id, 'failed_login', false, { reason: 'invalid_password' }, req);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Fetch ALL tournaments owned by this user
    const { data: ownedTournaments } = await supabase
      .from('tournaments')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    // Also check the legacy tournament_id field
    let tournaments = ownedTournaments || [];
    if (user.tournament_id && !tournaments.find(t => t.id === user.tournament_id)) {
      const { data: legacyTournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', user.tournament_id)
        .single();
      if (legacyTournament) {
        tournaments = [legacyTournament, ...tournaments];
      }
    }

    // Use the first tournament as default, or the legacy tournament_id
    const activeTournament = tournaments.length > 0 ? tournaments[0] : null;
    const activeTournamentId = activeTournament?.id || null;

    // Update last_login (ignore errors if column doesn't exist)
    try {
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);
    } catch {
      // Silently ignore - column might not exist
    }

    // Log successful login
    await logAuthEvent(user.id, 'login', true, { tournaments_count: tournaments.length }, req);

    const token = jwt.sign(
      { userId: user.id, tournamentId: activeTournamentId },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        state: user.state,
        city: user.city
      },
      tournament: activeTournament,
      tournaments: tournaments // All tournaments user owns
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Change password (requires current password for security)
// This is a secure password change, not an unauthenticated reset
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }

    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required for security' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    // Check if user exists (case-insensitive email)
    const normalizedEmail = email.toLowerCase();
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, password_hash')
      .eq('email', normalizedEmail)
      .single();

    if (findError || !user) {
      // Generic error to prevent email enumeration
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      await logAuthEvent(user.id, 'PASSWORD_CHANGE_FAILED', false, { reason: 'Invalid current password' }, req);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Hash new password and update
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('email', normalizedEmail);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to change password' });
    }

    await logAuthEvent(user.id, 'PASSWORD_CHANGED', true, {}, req);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Password change failed' });
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

    // Handle demo user
    if (decoded.userId === 'demo') {
      let tournament = null;
      if (decoded.tournamentId) {
        const { data: tournamentData } = await supabase
          .from('tournaments')
          .select('*')
          .eq('id', decoded.tournamentId)
          .single();
        tournament = tournamentData;
      }
      return res.json({
        valid: true,
        userId: 'demo',
        user: { id: 'demo', name: 'Demo User', email: null, mobile: 'demo' },
        tournament,
        tournaments: tournament ? [tournament] : []
      });
    }

    // Fetch user info
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, mobile, state, city')
      .eq('id', decoded.userId)
      .single();

    // Fetch current tournament
    let tournament = null;
    if (decoded.tournamentId) {
      const { data: tournamentData } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', decoded.tournamentId)
        .single();
      tournament = tournamentData;
    }

    // Fetch all user's tournaments
    const { data: tournaments } = await supabase
      .from('tournaments')
      .select('*')
      .eq('owner_id', decoded.userId)
      .order('created_at', { ascending: false });

    res.json({
      valid: true,
      userId: decoded.userId,
      user,
      tournament,
      tournaments: tournaments || []
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Get user's tournaments
router.get('/tournaments', async (req: Request, res: Response) => {
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

    // Handle demo user
    if (decoded.userId === 'demo') {
      let tournament = null;
      if (decoded.tournamentId) {
        const { data: tournamentData } = await supabase
          .from('tournaments')
          .select('*')
          .eq('id', decoded.tournamentId)
          .single();
        tournament = tournamentData;
      }
      return res.json({
        tournaments: tournament ? [tournament] : [],
        activeTournamentId: decoded.tournamentId
      });
    }

    const { data: tournaments, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('owner_id', decoded.userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch tournaments' });
    }

    res.json({
      tournaments: tournaments || [],
      activeTournamentId: decoded.tournamentId
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Switch active tournament
router.post('/switch-tournament', async (req: Request, res: Response) => {
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

    const { tournamentId } = req.body;
    if (!tournamentId) {
      return res.status(400).json({ error: 'Tournament ID required' });
    }

    // Handle demo user - can only access demo tournament
    if (decoded.userId === 'demo') {
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .eq('share_code', 'DEMO01')
        .single();

      if (!tournament) {
        return res.status(403).json({ error: 'Demo user can only access demo tournament' });
      }

      const newToken = jwt.sign(
        { userId: 'demo', tournamentId: tournament.id },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      return res.json({ token: newToken, tournament });
    }

    // Verify user owns this tournament
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .eq('owner_id', decoded.userId)
      .single();

    if (error || !tournament) {
      return res.status(403).json({ error: 'You do not own this tournament' });
    }

    // Generate new token with switched tournament
    const newToken = jwt.sign(
      { userId: decoded.userId, tournamentId: tournament.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    await logAuthEvent(decoded.userId, 'switch_tournament', true, {
      from: decoded.tournamentId,
      to: tournament.id
    }, req);

    res.json({
      token: newToken,
      tournament
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Create new tournament for existing user
router.post('/create-tournament', async (req: Request, res: Response) => {
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

    const { name, totalPoints, minPlayers, maxPlayers, bidIncrement } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tournament name is required' });
    }

    // Generate cryptographically secure share code
    const shareCode = generateSecureShareCode();

    // Create tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .insert({
        name,
        total_points: totalPoints || 100000,
        min_players: minPlayers || 7,
        max_players: maxPlayers || 15,
        bid_increment: bidIncrement || 1000,
        share_code: shareCode,
        status: 'setup',
        owner_id: decoded.userId
      })
      .select()
      .single();

    if (tournamentError || !tournament) {
      console.error('Tournament creation error:', tournamentError);
      return res.status(500).json({ error: 'Failed to create tournament' });
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

    // Generate new token with new tournament
    const newToken = jwt.sign(
      { userId: decoded.userId, tournamentId: tournament.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token: newToken,
      tournament
    });
  } catch (error) {
    console.error('Create tournament error:', error);
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

// Get CSRF token for state-changing requests
// Clients should call this before making POST/PUT/DELETE requests
router.get('/csrf-token', csrfTokenEndpoint);

export default router;
