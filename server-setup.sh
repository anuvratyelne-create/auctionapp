#!/bin/bash

# Server Setup Script - Run this on VPS after deployment
# Usage: bash server-setup.sh

set -e

APP_DIR="/var/www/auctionapp"

echo "=========================================="
echo "  Auction App Server Setup"
echo "=========================================="

# Check if .env exists
if [ ! -f "$APP_DIR/server/.env" ]; then
    echo ""
    echo "Creating .env file..."
    cat > $APP_DIR/server/.env << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://ariozzlabkyglnxugjkz.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here

# JWT Secret (use a strong random string)
JWT_SECRET=change_this_to_a_secure_random_string_64_chars_minimum

# Server Configuration
PORT=3001
NODE_ENV=production

# Client URL (for CORS) - Update with your domain
CLIENT_URL=http://200.141.7.239

# Auto-Cleanup Settings
TOURNAMENT_RETENTION_DAYS=90
DISABLE_AUTO_CLEANUP=false
EOF
    echo "Created .env file at $APP_DIR/server/.env"
    echo "IMPORTANT: Edit this file with your actual Supabase credentials!"
    echo ""
fi

# Start/Restart PM2
echo "Starting application with PM2..."
cd $APP_DIR

# Stop existing if running
pm2 delete auction-app 2>/dev/null || true

# Start fresh
pm2 start server/dist/index.js --name "auction-app" --env production

# Save PM2 config
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root

echo ""
echo "=========================================="
echo "  Setting up Nginx..."
echo "=========================================="

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    apt-get update
    apt-get install -y nginx
fi

# Create Nginx config
cat > /etc/nginx/sites-available/auctionapp << 'EOF'
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Max upload size (for images)
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # WebSocket support
        proxy_read_timeout 86400;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/auctionapp /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t
systemctl reload nginx
systemctl enable nginx

# Open firewall ports
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 22/tcp
    ufw --force enable
fi

echo ""
echo "=========================================="
echo "  SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "Your app is now running at: http://200.141.7.239"
echo ""
echo "Useful commands:"
echo "  pm2 status          - Check app status"
echo "  pm2 logs auction-app - View logs"
echo "  pm2 restart auction-app - Restart app"
echo ""
echo "IMPORTANT: Edit /var/www/auctionapp/server/.env"
echo "with your actual Supabase credentials!"
echo ""
