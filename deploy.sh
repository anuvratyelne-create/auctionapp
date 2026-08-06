#!/bin/bash

# Auction App Deployment Script for Hostinger VPS
# Usage: ./deploy.sh

set -e

# Configuration
VPS_IP="200.141.7.239"
VPS_USER="root"
APP_DIR="/var/www/auctionapp"
DOMAIN=""  # Will be set later or use IP

echo "=========================================="
echo "  Auction App Deployment Script"
echo "=========================================="

# Step 1: Build the application
echo ""
echo "[1/4] Building application..."
npm run build

# Step 2: Create deployment package
echo ""
echo "[2/4] Creating deployment package..."
rm -f deploy.tar.gz

# Create a clean package with only production files
tar -czvf deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    package.json \
    package-lock.json \
    server/package.json \
    server/dist/ \
    client/dist/

echo ""
echo "[3/4] Uploading to VPS..."
scp deploy.tar.gz ${VPS_USER}@${VPS_IP}:/tmp/

echo ""
echo "[4/4] Running remote setup..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
set -e

echo "Setting up application directory..."
mkdir -p /var/www/auctionapp
cd /var/www/auctionapp

echo "Extracting files..."
tar -xzvf /tmp/deploy.tar.gz
rm /tmp/deploy.tar.gz

echo "Installing Node.js if needed..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

echo "Installing production dependencies..."
cd /var/www/auctionapp
npm install --omit=dev

echo "Installing PM2..."
npm install -g pm2

echo "Server setup complete!"
echo ""
echo "=========================================="
echo "  NEXT STEPS (Manual):"
echo "=========================================="
echo "1. Create server/.env file with your config"
echo "2. Run: pm2 start server/dist/index.js --name auction-app"
echo "3. Run: pm2 save && pm2 startup"
echo "4. Setup Nginx (optional)"
echo "=========================================="
ENDSSH

echo ""
echo "=========================================="
echo "  Deployment package uploaded!"
echo "=========================================="
echo ""
echo "Now SSH into your VPS to complete setup:"
echo "  ssh root@${VPS_IP}"
echo ""
