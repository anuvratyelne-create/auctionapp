import { Router, Response } from 'express';
import supabase from '../config/supabase';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const createCategorySchema = z.object({
  name: z.string().min(1),
  base_price: z.number().min(100),
  display_order: z.number().optional()
});

// Get all categories with stats
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select(`
        *,
        players:players(id, status, sold_price, retention_price, is_retained)
      `)
      .eq('tournament_id', req.tournamentId)
      .order('display_order', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }

    // Calculate stats for each category (include retained players)
    const categoriesWithStats = categories?.map(cat => {
      const allPlayers = cat.players || [];
      const soldPlayers = allPlayers.filter((p: any) => p.status === 'sold');
      const retainedPlayers = allPlayers.filter((p: any) => p.status === 'retained' || p.is_retained);
      const acquiredPlayers = [...soldPlayers, ...retainedPlayers.filter((rp: any) => !soldPlayers.find((sp: any) => sp.id === rp.id))];

      const soldValue = soldPlayers.reduce((sum: number, p: any) => sum + (p.sold_price || 0), 0);
      const retentionValue = retainedPlayers.reduce((sum: number, p: any) => sum + (p.retention_price || p.sold_price || 0), 0);
      const totalAcquiredValue = soldValue + retentionValue;

      const avgSoldPrice = acquiredPlayers.length > 0 ? Math.round(totalAcquiredValue / acquiredPlayers.length) : 0;

      return {
        id: cat.id,
        name: cat.name,
        base_price: cat.base_price,
        display_order: cat.display_order,
        total_players: allPlayers.length,
        sold_players: acquiredPlayers.length, // Includes retained
        retained_players: retainedPlayers.length,
        available_players: allPlayers.filter((p: any) => p.status === 'available').length,
        unsold_players: allPlayers.filter((p: any) => p.status === 'unsold').length,
        avg_sold_price: avgSoldPrice,
        total_sold_value: totalAcquiredValue
      };
    }) || [];

    res.json(categoriesWithStats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get categories for public view
router.get('/public/:tournamentId', async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name, base_price, display_order')
      .eq('tournament_id', req.params.tournamentId)
      .order('display_order', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }

    res.json(categories || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const data = createCategorySchema.parse(req.body);

    // Get next display order if not provided
    let displayOrder = data.display_order;
    if (!displayOrder) {
      const { data: lastCat } = await supabase
        .from('categories')
        .select('display_order')
        .eq('tournament_id', req.tournamentId)
        .order('display_order', { ascending: false })
        .limit(1)
        .single();

      displayOrder = (lastCat?.display_order || 0) + 1;
    }

    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        ...data,
        tournament_id: req.tournamentId,
        display_order: displayOrder
      })
      .select()
      .single();

    if (error) {
      console.error('Category creation error:', error);
      return res.status(500).json({ error: 'Failed to create category' });
    }

    res.status(201).json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const updates = createCategorySchema.partial().parse(req.body);

    const { data: category, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', req.params.id)
      .eq('tournament_id', req.tournamentId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update category' });
    }

    res.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Bulk update categories with standard prices
router.post('/update-standard-prices', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const standardPrices: Record<string, number> = {
      'Platinum': 50000,
      'Gold': 30000,
      'Silver': 20000,
      'Bronze': 10000
    };

    const results = [];
    for (const [name, base_price] of Object.entries(standardPrices)) {
      const { data, error } = await supabase
        .from('categories')
        .update({ base_price })
        .eq('tournament_id', req.tournamentId)
        .eq('name', name)
        .select();

      if (data && data.length > 0) {
        results.push({ name, base_price, updated: true });
      }
    }

    res.json({
      message: 'Categories updated with standard prices',
      updated: results
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update categories' });
  }
});

// Delete category
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Check if any players use this category
    const { data: players } = await supabase
      .from('players')
      .select('id')
      .eq('category_id', req.params.id)
      .limit(1);

    if (players && players.length > 0) {
      return res.status(400).json({ error: 'Cannot delete category with players. Move players first.' });
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', req.params.id)
      .eq('tournament_id', req.tournamentId);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete category' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
