import { Router, Response } from 'express';
import supabase from '../config/supabase';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get full dashboard stats
router.get('/dashboard', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tournamentId = req.tournamentId;

    // Get all players (including retention info)
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select(`
        id, name, photo_url, base_price, sold_price, status,
        is_retained, retention_price,
        category_id,
        categories(id, name),
        team_id,
        teams(id, name, short_name, logo_url)
      `)
      .eq('tournament_id', tournamentId);

    if (playersError) {
      return res.status(500).json({ error: playersError.message });
    }

    // Get all categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('display_order');

    if (categoriesError) {
      return res.status(500).json({ error: categoriesError.message });
    }

    // Get all teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .eq('tournament_id', tournamentId);

    if (teamsError) {
      return res.status(500).json({ error: teamsError.message });
    }

    // Calculate overview stats (include both sold AND retained players)
    const soldPlayers = players?.filter(p => p.status === 'sold') || [];
    const retainedPlayers = players?.filter(p => p.status === 'retained' || p.is_retained) || [];
    const allAcquiredPlayers = [...soldPlayers, ...retainedPlayers.filter(rp => !soldPlayers.find(sp => sp.id === rp.id))];
    const unsoldPlayers = players?.filter(p => p.status === 'unsold') || [];
    const availablePlayers = players?.filter(p => p.status === 'available') || [];

    // Calculate total value including retention prices
    const totalSoldValue = soldPlayers.reduce((sum, p) => sum + (p.sold_price || 0), 0);
    const totalRetentionValue = retainedPlayers.reduce((sum, p) => sum + (p.retention_price || p.sold_price || 0), 0);
    const totalAcquiredValue = totalSoldValue + totalRetentionValue;

    const avgSoldPrice = allAcquiredPlayers.length > 0 ? Math.round(totalAcquiredValue / allAcquiredPlayers.length) : 0;
    const totalPlayers = players?.length || 0;
    const auctionProgress = totalPlayers > 0 ? Math.round((allAcquiredPlayers.length / totalPlayers) * 100) : 0;

    // Calculate category stats (include retained players)
    const categoryStats = categories?.map(cat => {
      const catPlayers = players?.filter(p => p.category_id === cat.id) || [];
      const catSold = catPlayers.filter(p => p.status === 'sold');
      const catRetained = catPlayers.filter(p => p.status === 'retained' || p.is_retained);
      const catAcquired = [...catSold, ...catRetained.filter(rp => !catSold.find(sp => sp.id === rp.id))];
      const catUnsold = catPlayers.filter(p => p.status === 'unsold');
      const catAvailable = catPlayers.filter(p => p.status === 'available');

      const soldValue = catSold.reduce((sum, p) => sum + (p.sold_price || 0), 0);
      const retainedValue = catRetained.reduce((sum, p) => sum + (p.retention_price || p.sold_price || 0), 0);
      const totalValue = soldValue + retainedValue;

      return {
        id: cat.id,
        name: cat.name,
        total_players: catPlayers.length,
        sold_players: catAcquired.length, // Include retained in "sold" count for display
        available_players: catAvailable.length,
        unsold_players: catUnsold.length,
        total_value: totalValue,
        avg_sold_price: catAcquired.length > 0 ? Math.round(totalValue / catAcquired.length) : 0
      };
    }) || [];

    // Calculate team spending (include retained players)
    const teamSpending = teams?.map(team => {
      const teamSoldPlayers = soldPlayers.filter(p => p.team_id === team.id);
      const teamRetainedPlayers = retainedPlayers.filter(p => p.team_id === team.id);
      // Combine without duplicates
      const teamAllPlayers = [...teamSoldPlayers, ...teamRetainedPlayers.filter(rp => !teamSoldPlayers.find(sp => sp.id === rp.id))];

      const soldPoints = teamSoldPlayers.reduce((sum, p) => sum + (p.sold_price || 0), 0);
      const retentionPoints = teamRetainedPlayers.reduce((sum, p) => sum + (p.retention_price || p.sold_price || 0), 0);
      const spentPoints = soldPoints + retentionPoints;

      return {
        id: team.id,
        name: team.name,
        short_name: team.short_name,
        logo_url: team.logo_url,
        spent_points: spentPoints,
        remaining_budget: team.total_budget - spentPoints,
        player_count: teamAllPlayers.length,
        avg_per_player: teamAllPlayers.length > 0 ? Math.round(spentPoints / teamAllPlayers.length) : 0
      };
    }).sort((a, b) => b.spent_points - a.spent_points) || [];

    // Get top purchases (top 10 by price - include both sold and retained)
    const topPurchases = allAcquiredPlayers
      .map(p => ({
        ...p,
        final_price: p.is_retained ? (p.retention_price || p.sold_price || 0) : (p.sold_price || 0)
      }))
      .sort((a, b) => b.final_price - a.final_price)
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        name: p.name,
        photo_url: p.photo_url,
        sold_price: p.final_price,
        base_price: p.base_price,
        category_name: (p.categories as any)?.name || 'Unknown',
        team_name: (p.teams as any)?.name || 'Unknown',
        team_short_name: (p.teams as any)?.short_name || 'N/A',
        team_logo: (p.teams as any)?.logo_url,
        multiplier: p.base_price > 0 ? Number((p.final_price / p.base_price).toFixed(1)) : 0,
        is_retained: p.is_retained || p.status === 'retained'
      }));

    res.json({
      overview: {
        total_players: totalPlayers,
        sold_players: allAcquiredPlayers.length, // Includes retained
        unsold_players: unsoldPlayers.length,
        available_players: availablePlayers.length,
        total_sold_value: totalAcquiredValue, // Includes retention value
        avg_sold_price: avgSoldPrice,
        auction_progress: auctionProgress,
        // Additional breakdown
        auction_sold: soldPlayers.length,
        retained_players: retainedPlayers.length,
        auction_value: totalSoldValue,
        retention_value: totalRetentionValue
      },
      categories: categoryStats,
      team_spending: teamSpending,
      top_purchases: topPurchases
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get lightweight live stats
router.get('/live', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tournamentId = req.tournamentId;

    const { data: players, error } = await supabase
      .from('players')
      .select('status, sold_price, is_retained, retention_price')
      .eq('tournament_id', tournamentId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const soldPlayers = players?.filter(p => p.status === 'sold') || [];
    const retainedPlayers = players?.filter(p => (p.status === 'retained' || p.is_retained) && p.status !== 'sold') || [];
    // Combine sold and retained (no need for duplicate check since we filter above)
    const allAcquired = [...soldPlayers, ...retainedPlayers];

    const totalPlayers = players?.length || 0;
    const totalSoldValue = soldPlayers.reduce((sum, p) => sum + (p.sold_price || 0), 0);
    const totalRetentionValue = retainedPlayers.reduce((sum, p) => sum + (p.retention_price || p.sold_price || 0), 0);
    const totalAcquiredValue = totalSoldValue + totalRetentionValue;
    const auctionProgress = totalPlayers > 0 ? Math.round((allAcquired.length / totalPlayers) * 100) : 0;

    res.json({
      sold_players: allAcquired.length,
      total_sold_value: totalAcquiredValue,
      auction_progress: auctionProgress
    });
  } catch (error) {
    console.error('Error fetching live stats:', error);
    res.status(500).json({ error: 'Failed to fetch live stats' });
  }
});

export default router;
