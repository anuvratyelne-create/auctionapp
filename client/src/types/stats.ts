export interface CategoryStats {
  id: string;
  name: string;
  total_players: number;
  sold_players: number;
  available_players: number;
  unsold_players: number;
  total_value: number;
  avg_sold_price: number;
}

export interface TeamSpending {
  id: string;
  name: string;
  short_name: string;
  logo_url?: string;
  spent_points: number;
  remaining_budget: number;
  player_count: number;
  avg_per_player: number;
}

export interface TopPurchase {
  id: string;
  name: string;
  photo_url?: string;
  sold_price: number;
  base_price: number;
  category_name: string;
  team_name: string;
  team_short_name: string;
  team_logo?: string;
  multiplier: number;
}

export interface DashboardStats {
  overview: {
    total_players: number;
    sold_players: number;
    unsold_players: number;
    available_players: number;
    total_sold_value: number;
    avg_sold_price: number;
    auction_progress: number;
  };
  categories: CategoryStats[];
  team_spending: TeamSpending[];
  top_purchases: TopPurchase[];
}

export interface LiveStats {
  sold_players: number;
  total_sold_value: number;
  auction_progress: number;
}
