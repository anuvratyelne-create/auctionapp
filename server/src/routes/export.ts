import { Router, Response } from 'express';
import supabase from '../config/supabase';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Export full tournament data as JSON
router.get('/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tournamentId = req.tournamentId;

    // Get tournament info
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (tournamentError) {
      return res.status(500).json({ error: tournamentError.message });
    }

    // Get all teams with players
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        *,
        players:players(
          id, name, photo_url, player_uid, jersey_number, base_price, sold_price, retention_price, status, is_retained,
          categories(name)
        )
      `)
      .eq('tournament_id', tournamentId)
      .order('created_at');

    if (teamsError) {
      return res.status(500).json({ error: teamsError.message });
    }

    // Filter to include both sold AND retained players in team rosters
    const teamsWithAcquiredPlayers = teams?.map(team => ({
      ...team,
      players: team.players?.filter((p: any) => p.status === 'sold' || p.status === 'retained').map((p: any) => ({
        ...p,
        // Use retention_price for retained players
        sold_price: p.status === 'retained' ? (p.retention_price || p.sold_price) : p.sold_price
      })) || []
    }));

    // Get all categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('display_order');

    if (categoriesError) {
      return res.status(500).json({ error: categoriesError.message });
    }

    // Get all players
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select(`
        *,
        categories(name),
        teams(name, short_name)
      `)
      .eq('tournament_id', tournamentId)
      .order('sold_price', { ascending: false, nullsFirst: false });

    if (playersError) {
      return res.status(500).json({ error: playersError.message });
    }

    // Calculate summary stats (include both sold AND retained)
    const soldPlayers = players?.filter(p => p.status === 'sold') || [];
    const retainedPlayers = players?.filter(p => p.status === 'retained' || p.is_retained) || [];
    const allAcquiredPlayers = [...soldPlayers, ...retainedPlayers.filter(rp => !soldPlayers.find(sp => sp.id === rp.id))];

    const totalSoldValue = soldPlayers.reduce((sum, p) => sum + (p.sold_price || 0), 0);
    const totalRetentionValue = retainedPlayers.reduce((sum, p) => sum + (p.retention_price || p.sold_price || 0), 0);
    const totalAcquiredValue = totalSoldValue + totalRetentionValue;

    const summary = {
      exported_at: new Date().toISOString(),
      tournament: {
        id: tournament.id,
        name: tournament.name,
        share_code: tournament.share_code,
        total_points: tournament.total_points,
        min_players: tournament.min_players,
        max_players: tournament.max_players,
        bid_increment: tournament.bid_increment
      },
      stats: {
        total_players: players?.length || 0,
        sold_players: allAcquiredPlayers.length,
        auction_sold: soldPlayers.length,
        retained_players: retainedPlayers.length,
        unsold_players: players?.filter(p => p.status === 'unsold').length || 0,
        available_players: players?.filter(p => p.status === 'available').length || 0,
        total_sold_value: totalAcquiredValue,
        auction_value: totalSoldValue,
        retention_value: totalRetentionValue,
        avg_sold_price: allAcquiredPlayers.length > 0 ? Math.round(totalAcquiredValue / allAcquiredPlayers.length) : 0
      },
      teams: teamsWithAcquiredPlayers,
      categories,
      players: players?.map(p => ({
        id: p.id,
        name: p.name,
        player_uid: p.player_uid,
        jersey_number: p.jersey_number,
        category: (p.categories as any)?.name,
        base_price: p.base_price,
        sold_price: p.sold_price,
        status: p.status,
        team: (p.teams as any)?.name || null,
        team_short: (p.teams as any)?.short_name || null
      }))
    };

    res.json(summary);
  } catch (error) {
    console.error('Error exporting summary:', error);
    res.status(500).json({ error: 'Failed to export summary' });
  }
});

// Export players as CSV
router.get('/csv/players', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tournamentId = req.tournamentId;

    const { data: players, error } = await supabase
      .from('players')
      .select(`
        *,
        categories(name),
        teams(name, short_name)
      `)
      .eq('tournament_id', tournamentId)
      .order('name');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Create CSV header - Player ID first for easy lookup
    const headers = ['Player ID', 'Name', 'Jersey Number', 'Category', 'Base Price', 'Sold Price', 'Status', 'Team'];

    // Create CSV rows
    const rows = players?.map(p => [
      p.player_uid || '',
      `"${p.name.replace(/"/g, '""')}"`,
      p.jersey_number || '',
      (p.categories as any)?.name || '',
      p.base_price,
      p.sold_price || '',
      p.status,
      (p.teams as any)?.name || ''
    ].join(','));

    const csv = [headers.join(','), ...(rows || [])].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=players.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting players CSV:', error);
    res.status(500).json({ error: 'Failed to export players CSV' });
  }
});

// Export teams as CSV
router.get('/csv/teams', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tournamentId = req.tournamentId;

    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        *,
        players:players(id, name, sold_price, retention_price, status, is_retained, categories(name))
      `)
      .eq('tournament_id', tournamentId)
      .order('created_at');

    if (teamsError) {
      return res.status(500).json({ error: teamsError.message });
    }

    // Create CSV with team summary and their players
    const lines: string[] = [];

    // Header for teams summary
    lines.push('Team Name,Short Name,Owner,Total Budget,Spent,Remaining,Players,Retained');

    teams?.forEach(team => {
      const soldPlayers = team.players?.filter((p: any) => p.status === 'sold') || [];
      const retainedPlayers = team.players?.filter((p: any) => p.status === 'retained') || [];
      const soldSpent = soldPlayers.reduce((sum: number, p: any) => sum + (p.sold_price || 0), 0);
      const retentionSpent = team.retention_spent || retainedPlayers.reduce((sum: number, p: any) => sum + (p.retention_price || 0), 0);
      const totalSpent = soldSpent + retentionSpent;

      lines.push([
        `"${team.name.replace(/"/g, '""')}"`,
        team.short_name,
        team.owner_name || '',
        team.total_budget,
        totalSpent,
        team.total_budget - totalSpent,
        soldPlayers.length + retainedPlayers.length,
        retainedPlayers.length
      ].join(','));
    });

    lines.push('');
    lines.push('');
    lines.push('Team Rosters');
    lines.push('Team,Player Name,Category,Price,Type');

    teams?.forEach(team => {
      const soldPlayers = team.players?.filter((p: any) => p.status === 'sold') || [];
      const retainedPlayers = team.players?.filter((p: any) => p.status === 'retained') || [];

      soldPlayers.forEach((p: any) => {
        lines.push([
          team.short_name,
          `"${p.name.replace(/"/g, '""')}"`,
          p.categories?.name || '',
          p.sold_price || 0,
          'Auction'
        ].join(','));
      });

      retainedPlayers.forEach((p: any) => {
        lines.push([
          team.short_name,
          `"${p.name.replace(/"/g, '""')}"`,
          p.categories?.name || '',
          p.retention_price || 0,
          'Retained'
        ].join(','));
      });
    });

    const csv = lines.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=teams.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting teams CSV:', error);
    res.status(500).json({ error: 'Failed to export teams CSV' });
  }
});

// Export PDF summary (returns data for client-side PDF generation)
router.get('/pdf/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tournamentId = req.tournamentId;

    // Get tournament info
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (tournamentError) {
      return res.status(500).json({ error: tournamentError.message });
    }

    // Get teams with their players (sold and retained)
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id, name, short_name, logo_url, owner_name, total_budget, retention_spent,
        players:players(
          id, name, player_uid, jersey_number, sold_price, retention_price, status, is_retained,
          categories(name)
        )
      `)
      .eq('tournament_id', tournamentId)
      .order('created_at');

    if (teamsError) {
      return res.status(500).json({ error: teamsError.message });
    }

    // Get categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('display_order');

    if (categoriesError) {
      return res.status(500).json({ error: categoriesError.message });
    }

    // Get player counts
    const { data: allPlayers } = await supabase
      .from('players')
      .select('status, sold_price, retention_price, is_retained')
      .eq('tournament_id', tournamentId);

    const soldPlayers = allPlayers?.filter(p => p.status === 'sold') || [];
    const retainedPlayers = allPlayers?.filter(p => p.status === 'retained' || p.is_retained) || [];
    const allAcquired = [...soldPlayers, ...retainedPlayers.filter(rp => !soldPlayers.find(sp => (sp as any).id === (rp as any).id))];

    const totalSoldValue = soldPlayers.reduce((sum, p) => sum + (p.sold_price || 0), 0);
    const totalRetentionValue = retainedPlayers.reduce((sum, p) => sum + (p.retention_price || p.sold_price || 0), 0);
    const totalAcquiredValue = totalSoldValue + totalRetentionValue;

    // Format data for PDF
    const pdfData = {
      tournament: {
        name: tournament.name,
        date: new Date().toLocaleDateString(),
        share_code: tournament.share_code
      },
      summary: {
        total_players: allPlayers?.length || 0,
        sold_players: allAcquired.length,
        auction_sold: soldPlayers.length,
        retained_players: retainedPlayers.length,
        unsold_players: allPlayers?.filter(p => p.status === 'unsold').length || 0,
        total_value: totalAcquiredValue,
        avg_price: allAcquired.length > 0 ? Math.round(totalAcquiredValue / allAcquired.length) : 0
      },
      teams: teams?.map(team => {
        const teamSoldPlayers = team.players?.filter((p: any) => p.status === 'sold') || [];
        const teamRetainedPlayers = team.players?.filter((p: any) => p.status === 'retained') || [];
        const soldSpent = teamSoldPlayers.reduce((sum: number, p: any) => sum + (p.sold_price || 0), 0);
        const retentionSpent = team.retention_spent || teamRetainedPlayers.reduce((sum: number, p: any) => sum + (p.retention_price || 0), 0);
        const totalSpent = soldSpent + retentionSpent;

        return {
          name: team.name,
          short_name: team.short_name,
          owner: team.owner_name,
          budget: team.total_budget,
          spent: totalSpent,
          remaining: team.total_budget - totalSpent,
          players: [
            ...teamSoldPlayers.map((p: any) => ({
              name: p.name,
              player_uid: p.player_uid,
              jersey: p.jersey_number,
              category: p.categories?.name,
              price: p.sold_price,
              is_retained: false
            })),
            ...teamRetainedPlayers.map((p: any) => ({
              name: p.name,
              player_uid: p.player_uid,
              jersey: p.jersey_number,
              category: p.categories?.name,
              price: p.retention_price,
              is_retained: true
            }))
          ]
        };
      }),
      categories: categories?.map(cat => {
        return {
          name: cat.name,
          base_price: cat.base_price
        };
      })
    };

    res.json(pdfData);
  } catch (error) {
    console.error('Error generating PDF data:', error);
    res.status(500).json({ error: 'Failed to generate PDF data' });
  }
});

// Export auction results as CSV (sold/retained players with prices)
router.get('/csv/results', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tournamentId = req.tournamentId;

    // Get tournament name for filename
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('name')
      .eq('id', tournamentId)
      .single();

    // Get all acquired players (sold + retained) with their details
    const { data: players, error } = await supabase
      .from('players')
      .select(`
        name, player_uid, jersey_number, base_price, sold_price, retention_price, status, is_retained,
        categories(name),
        teams(name, short_name)
      `)
      .eq('tournament_id', tournamentId)
      .in('status', ['sold', 'retained'])
      .order('sold_price', { ascending: false, nullsFirst: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // CSV headers
    const headers = ['Player ID', 'Name', 'Jersey', 'Category', 'Team', 'Base Price', 'Final Price', 'Type', 'Profit/Loss'];

    // CSV rows
    const rows = players?.map(p => {
      const finalPrice = p.status === 'retained' ? (p.retention_price || 0) : (p.sold_price || 0);
      const profitLoss = finalPrice - (p.base_price || 0);
      return [
        p.player_uid || '',
        `"${(p.name || '').replace(/"/g, '""')}"`,
        p.jersey_number || '',
        (p.categories as any)?.name || '',
        (p.teams as any)?.short_name || '',
        p.base_price || 0,
        finalPrice,
        p.status === 'retained' ? 'Retained' : 'Auction',
        profitLoss >= 0 ? `+${profitLoss}` : profitLoss
      ].join(',');
    }) || [];

    const csv = [headers.join(','), ...rows].join('\n');

    const filename = `${(tournament?.name || 'auction').replace(/[^a-zA-Z0-9]/g, '_')}_results.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting results CSV:', error);
    res.status(500).json({ error: 'Failed to export results CSV' });
  }
});

// Export full tournament backup as JSON
router.get('/backup', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tournamentId = req.tournamentId;

    // Fetch all tournament data
    const [tournament, teams, players, categories, bids] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', tournamentId).single(),
      supabase.from('teams').select('*').eq('tournament_id', tournamentId),
      supabase.from('players').select('*').eq('tournament_id', tournamentId),
      supabase.from('categories').select('*').eq('tournament_id', tournamentId),
      supabase.from('bids').select('*').eq('tournament_id', tournamentId)
    ]);

    if (tournament.error) {
      return res.status(500).json({ error: 'Failed to fetch tournament' });
    }

    const backup = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      tournament: tournament.data,
      teams: teams.data || [],
      players: players.data || [],
      categories: categories.data || [],
      bids: bids.data || []
    };

    const filename = `${(tournament.data?.name || 'tournament').replace(/[^a-zA-Z0-9]/g, '_')}_backup_${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.json(backup);
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

export default router;
