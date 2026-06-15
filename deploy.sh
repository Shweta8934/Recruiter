#!/bin/bash
set -e

PROJECT="ai-recruitment-platform"
APP_DIR="/www/wwwroot/$PROJECT"
BACKUP_DIR="/www/wwwroot/backups/$PROJECT"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 Starting deployment of $PROJECT..."

# 1. Backup current version (excluding heavy folders to save space)
echo "📦 Creating backup..."
mkdir -p $BACKUP_DIR
tar --exclude="$APP_DIR/node_modules" --exclude="$APP_DIR/.next" -czf $BACKUP_DIR/backup_$TIMESTAMP.tar.gz $APP_DIR

# 2. Navigate to app directory
cd $APP_DIR

# 3. Pull latest code from GitHub
echo "🔄 Pulling latest code from GitHub..."
git fetch --all
git reset --hard origin/main

# 4. Clear old Next.js build cache
echo "🧹 Clearing old Next.js build cache..."
sudo rm -rf .next
sudo rm -rf node_modules/.cache

# 5. Install dependencies
echo "📥 Installing dependencies..."
sudo npm install

# 6. Generate Prisma client
echo "🗄️ Generating Prisma Client..."
sudo npx prisma generate

# 7. Build Next.js application
echo "🏗️ Building the application..."
npm run build

# 8. Restart Application Service (Port 3000)
echo "♻️ Restarting Node project on port 3000..."
sudo fuser -k 3000/tcp || true

echo "🚀 Starting server with npm run start in background..."
nohup npm run start > server.log 2>&1 &

echo "✅ Deployment complete! $TIMESTAMP"
