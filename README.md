# Sports Player Auction Platform

A professional, real-time web application for managing sports player auctions (IPL-style cricket league auctions).

## Features

### Core Auction
- **Real-time Bidding** - Live updates across all screens using WebSocket
- **Keyboard Shortcuts** - Fast-paced bidding with team-specific keyboard keys
- **Dynamic Bid Increments** - Auto-adjusts based on current bid amount
- **Timer System** - Configurable countdown with auto-reset on bids
- **RTM (Right to Match)** - Full retention and RTM card support

### Visual Experience
- **15+ Projection Themes** - Stadium Spotlight, Championship Gold, Electric Arena, etc.
- **Sound Effects** - Bid sounds, sold/unsold effects, countdown beeps
- **Sold Celebration** - Fireworks, confetti with team colors
- **Player Entry Animation** - Dramatic reveal when player comes up
- **Fortune Wheel** - Animated random player selection

### Multiple Views
- **Auction Panel** - Main control interface
- **Live View** - Read-only view for spectators
- **OBS Overlay** - Transparent overlay for streaming (3 modes: minimal/standard/premium)
- **Summary Screen** - Team standings and stats

### Management
- **Player Self-Registration** - QR code for players to register themselves
- **Admin Approval** - Review and approve player registrations
- **CSV Import** - Bulk player upload
- **Budget Alerts** - Notifications when team budget is low
- **Accelerated Mode** - Fast auction mode with shorter timers

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Zustand, Socket.io-client, Vite
- **Backend**: Node.js, Express, Socket.io, Helmet, Rate Limiting
- **Database**: Supabase (PostgreSQL)

---

## Quick Start for Testers

### Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/auctionapp.git
cd auctionapp
```

### Step 2: Set Up Supabase (Free)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project" and create a project
3. Go to **SQL Editor** in the left sidebar
4. Create the database tables by running this SQL:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile VARCHAR(15) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  tournament_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tournaments table
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  total_points INTEGER DEFAULT 100000,
  min_players INTEGER DEFAULT 7,
  max_players INTEGER DEFAULT 15,
  bid_increment INTEGER DEFAULT 1000,
  share_code VARCHAR(10) UNIQUE,
  status VARCHAR(20) DEFAULT 'setup',
  player_display_mode VARCHAR(20) DEFAULT 'random',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(10) NOT NULL,
  logo_url TEXT,
  keyboard_key VARCHAR(5),
  owner_name VARCHAR(255),
  owner_photo TEXT,
  total_budget INTEGER DEFAULT 100000,
  spent_points INTEGER DEFAULT 0,
  retention_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  base_price INTEGER NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  team_id UUID REFERENCES teams(id),
  name VARCHAR(255) NOT NULL,
  photo_url TEXT,
  jersey_number VARCHAR(10),
  base_price INTEGER,
  sold_price INTEGER,
  status VARCHAR(20) DEFAULT 'available',
  stats JSONB DEFAULT '{}',
  sequence_num INTEGER DEFAULT 0,
  is_retained BOOLEAN DEFAULT FALSE,
  retention_price INTEGER,
  retained_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bids table
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  is_final BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for users
ALTER TABLE users ADD CONSTRAINT fk_tournament
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id);
```

5. Go to **Settings > API** and copy:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - `anon` public key

### Step 3: Configure Environment

```bash
# Server configuration
cp server/.env.example server/.env
```

Edit `server/.env`:
```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here
JWT_SECRET=generate_a_random_string_here
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

```bash
# Client configuration
cp client/.env.example client/.env
```

Edit `client/.env`:
```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Step 4: Install & Run

```bash
# Install all dependencies
npm install

# Start both servers (runs on ports 3001 and 5173)
npm run dev
```

### Step 5: Test the App

1. Open `http://localhost:5173`
2. **Demo Login**: Use `demo` / `demo123` to try instantly
3. **Or Register**: Create your own tournament

---

## Demo Credentials

For quick testing without setup:
```
Mobile: demo
Password: demo123
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| A | Auction panel |
| S | Summary panel |
| P | Players panel |
| C | Category panel |
| M | Manage panel |
| F | Toggle Fullscreen |
| ↑ | Increment bid |
| Team keys | Place bid (shown on hover) |

---

## Shareable Links

After creating a tournament, share these links:

| Link | Purpose |
|------|---------|
| `/live/{code}` | Spectator view |
| `/summary/{code}` | Team standings display |
| `/overlay/{code}` | OBS streaming overlay |
| `/register/{code}` | Player self-registration |

---

## Project Structure

```
/auctionapp
├── /server              # Backend API
│   ├── /src
│   │   ├── /routes      # API endpoints
│   │   ├── /socket      # Real-time handlers
│   │   └── /middleware  # Auth & security
│   └── .env.example
│
├── /client              # React frontend
│   ├── /src
│   │   ├── /components  # UI components
│   │   ├── /pages       # Route pages
│   │   ├── /stores      # Zustand state
│   │   └── /utils       # Helpers
│   └── .env.example
│
└── package.json         # Workspace config
```

---

## Screenshots

*Add screenshots here*

---

## License

MIT
