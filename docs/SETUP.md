# 🚀 Procheff-v3 Setup Guide

**Complete installation and configuration guide for Procheff-v3**

**Last Updated:** November 10, 2025
**Estimated Time:** 15 minutes

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Environment Configuration](#environment-configuration)
- [Database Initialization](#database-initialization)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose | Download |
|----------|---------|---------|----------|
| **Node.js** | 18.x or 20.x | JavaScript runtime | [nodejs.org](https://nodejs.org/) |
| **npm** | 9.x or 10.x | Package manager | Included with Node.js |
| **Git** | Latest | Version control | [git-scm.com](https://git-scm.com/) |

### Required API Keys

| Service | Purpose | How to Get |
|---------|---------|------------|
| **Anthropic Claude** | AI analysis engine | [Step-by-step guide](#getting-anthropic-api-key) |
| **Google AI (Gemini)** | OCR processing | [Step-by-step guide](#getting-google-api-key) |

### System Requirements

```
Operating System: macOS, Linux, or Windows
RAM: 2GB minimum (4GB recommended)
Disk Space: 500MB minimum
Internet: Required for AI API calls
```

---

## Quick Start

**For experienced developers:**

```bash
# 1. Clone repository
git clone <your-repo-url>
cd procheff-v3

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local

# 4. Add API keys to .env.local
# ANTHROPIC_API_KEY=sk-ant-xxxxx
# GOOGLE_API_KEY=AIzaxxxxx

# 5. Run development server
npm run dev

# 6. Open browser
# http://localhost:3001
```

---

## Detailed Setup

### Step 1: Clone Repository

```bash
# Clone the repository
git clone <your-repo-url>

# Navigate to project directory
cd procheff-v3

# Verify you're in the right directory
ls -la
# Should see: package.json, src/, .gitignore, etc.
```

### Step 2: Install Dependencies

```bash
# Install all required packages
npm install

# Wait for installation to complete (~2-3 minutes)
# You should see:
# added XXX packages in XXs
```

**What gets installed:**
- Next.js 16 (framework)
- React 19 (UI library)
- Anthropic SDK (Claude AI)
- Google Generative AI SDK (Gemini)
- SQLite driver (better-sqlite3)
- All other dependencies from package.json

### Step 3: Environment Configuration

#### Create `.env.local` File

```bash
# Create environment file
touch .env.local

# Or copy from example (if available)
cp .env.example .env.local
```

#### Add Required Variables

Open `.env.local` in your text editor and add:

```bash
# ============================================
# Procheff-v3 Environment Configuration
# ============================================

# Claude AI Configuration
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Google Gemini Configuration (for OCR)
GOOGLE_API_KEY=AIzaxxxxx

# Database Configuration (optional)
DATABASE_URL=file:./procheff.db

# NextAuth Configuration (if using authentication)
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3001

# Optional: Logging Level
LOG_LEVEL=info
```

---

## Getting API Keys

### Getting Anthropic API Key

**Step-by-step process:**

1. **Visit Anthropic Console**
   ```
   https://console.anthropic.com/
   ```

2. **Create Account or Sign In**
   - Click "Sign Up" if new user
   - Or "Sign In" if you have an account

3. **Navigate to API Keys**
   - Go to "API Keys" section
   - Click "Create API Key"

4. **Generate Key**
   - Give it a name (e.g., "Procheff Development")
   - Click "Create Key"
   - **IMPORTANT:** Copy the key immediately (it won't be shown again)

5. **Add to `.env.local`**
   ```bash
   ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
   ```

**Key Format:**
```
sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Pricing (as of 2025):**
- Claude Sonnet 4.5: ~$3 per million input tokens
- Claude Sonnet 4.5: ~$15 per million output tokens
- Free tier: $5 credit for new accounts

**Quota Limits:**
- Free tier: ~1M tokens/month
- Paid tier: Higher limits, pay-as-you-go

### Getting Google API Key

**Step-by-step process:**

1. **Visit Google AI Studio**
   ```
   https://aistudio.google.com/
   ```

2. **Sign In with Google Account**
   - Use your Google account
   - Accept terms of service

3. **Create API Key**
   - Click "Get API Key"
   - Select "Create API key in new project"
   - Or use existing project

4. **Copy API Key**
   - Copy the generated key
   - Format: `AIzaSyxxxxx...`

5. **Add to `.env.local`**
   ```bash
   GOOGLE_API_KEY=AIzaSyxxxxx
   ```

**Key Format:**
```
AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Pricing (as of 2025):**
- Gemini 2.0 Flash: Free tier available
- Free tier: 1,500 requests/day
- Paid tier: Pay-as-you-go

**Alternative: Google Cloud Console**
```
1. Go to: https://console.cloud.google.com/
2. Enable "Generative Language API"
3. Create credentials → API Key
4. Copy and restrict key to your IP
```

---

## Database Initialization

### Automatic Initialization

The database is **automatically created** on first run. No manual setup required!

**What happens on first run:**

```mermaid
graph TD
    Start[npm run dev] --> Check{procheff.db exists?}
    Check -->|No| Create[Create procheff.db]
    Check -->|Yes| Connect[Connect to existing DB]
    Create --> Init[Initialize schema]
    Connect --> Init
    Init --> Tables[Create tables]
    Tables --> Ready[✅ Database Ready]

    style Ready fill:#10B981
```

**Tables Created:**
- `logs` - AI operation logs
- `users` - User accounts
- `organizations` - Organizations/workspaces
- `memberships` - User-organization relationships

**Location:**
```bash
/procheff-v3/procheff.db
```

### Manual Verification

```bash
# Check if database exists
ls -la procheff.db

# View database schema
sqlite3 procheff.db ".schema"

# Check tables
sqlite3 procheff.db ".tables"

# Count log entries
sqlite3 procheff.db "SELECT COUNT(*) FROM logs;"
```

---

## Running the Application

### Development Mode

```bash
# Start development server
npm run dev

# Output:
#   ▲ Next.js 16.0.1 (webpack)
#   - Local:        http://localhost:3001
#   - Network:      http://192.168.1.x:3001
#   ✓ Ready in 1156ms
```

**Features in Dev Mode:**
- ✅ Hot module replacement (instant updates)
- ✅ Detailed error messages
- ✅ Source maps for debugging
- ✅ Automatic recompilation

### Production Build

```bash
# Build for production
npm run build

# Output:
#   ✓ Compiled successfully
#   ✓ Static pages: 8/8
#   ✓ Build time: 15s

# Start production server
npm start
```

### Port Configuration

**Default Port:** 3001

**Change Port:**
```bash
# Option 1: Inline
PORT=3002 npm run dev

# Option 2: package.json
"scripts": {
  "dev": "next dev -p 3002"
}
```

---

## Verification

### Step 1: Check Server

```bash
# Server should be running
✓ Ready in 1156ms

# Browser test
curl http://localhost:3001
```

### Step 2: Test API Endpoints

#### Test 1: Metrics Endpoint

```bash
curl http://localhost:3001/api/metrics

# Expected response:
# {
#   "total_calls": 0,
#   "success_rate": 0,
#   "avg_duration": 0,
#   "avg_tokens": 0,
#   "error_count": 0
# }
```

#### Test 2: Logs Endpoint

```bash
curl http://localhost:3001/api/logs

# Expected response:
# {
#   "logs": []
# }
```

#### Test 3: Deep Analysis (Full Test)

```bash
curl -X POST http://localhost:3001/api/ai/deep-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "extracted_data": {
      "kurum": "Test Kurumu",
      "ihale_turu": "Test İhale",
      "butce": "100000 TL"
    }
  }'

# Expected: JSON response with analysis
# {
#   "success": true,
#   "data": { ... },
#   "metadata": { ... }
# }
```

**If this works, your setup is complete!** ✅

### Step 3: Verify Database

```bash
# Check logs table
sqlite3 procheff.db "SELECT COUNT(*) FROM logs;"

# Should return: 1 or more (from deep analysis test)

# View recent logs
sqlite3 procheff.db "SELECT * FROM logs ORDER BY created_at DESC LIMIT 5;"
```

### Step 4: Verify UI

**Open in Browser:**
```
http://localhost:3001
```

**Pages to Test:**
- ✅ Dashboard: `http://localhost:3001`
- ✅ Monitoring: `http://localhost:3001/monitor`
- ✅ Logs: `http://localhost:3001/logs`
- ✅ Cost Analysis: `http://localhost:3001/cost-analysis`
- ✅ Decision Engine: `http://localhost:3001/decision`

**Keyboard Shortcuts to Test:**
- `Cmd/Ctrl + K` - Open command palette
- `Cmd/Ctrl + B` - Toggle sidebar (on module pages)

---

## Troubleshooting

### Common Issues

#### 1. "Cannot find module" errors

**Problem:**
```
Error: Cannot find module '@anthropic-ai/sdk'
```

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### 2. "ANTHROPIC_API_KEY is not set"

**Problem:**
```
Error: ANTHROPIC_API_KEY environment variable is not set
```

**Solution:**
```bash
# Check .env.local exists
ls -la .env.local

# Check it contains the key
cat .env.local | grep ANTHROPIC_API_KEY

# If missing, add it:
echo "ANTHROPIC_API_KEY=sk-ant-xxxxx" >> .env.local

# Restart server
npm run dev
```

#### 3. "Port 3001 is already in use"

**Problem:**
```
Error: Port 3001 is in use
```

**Solution:**
```bash
# Option 1: Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Option 2: Use different port
PORT=3002 npm run dev
```

#### 4. "Database is locked"

**Problem:**
```
Error: database is locked
```

**Solution:**
```bash
# Stop all instances
pkill -f "next dev"

# Remove WAL files
rm procheff.db-wal procheff.db-shm

# Restart
npm run dev
```

#### 5. "Anthropic API Error 401"

**Problem:**
```
Error: 401 Unauthorized - Invalid API key
```

**Solution:**
```bash
# Verify API key format
# Should start with: sk-ant-api03-

# Test key directly
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":1024,"messages":[{"role":"user","content":"Hi"}]}'

# If 401, key is invalid - regenerate from console
```

#### 6. "Module not found: Can't resolve 'better-sqlite3'"

**Problem:**
```
Error: Can't resolve 'better-sqlite3'
```

**Solution:**
```bash
# Install build tools (macOS)
xcode-select --install

# Install build tools (Linux)
sudo apt-get install build-essential

# Reinstall better-sqlite3
npm rebuild better-sqlite3
```

#### 7. "Next.js build fails"

**Problem:**
```
Error: Build failed
```

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

---

## Environment Variables Reference

### Required Variables

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-xxxxx` | ✅ Yes | Claude API key |
| `GOOGLE_API_KEY` | `AIzaSyxxxxx` | ✅ Yes | Gemini Vision API key |

### Optional Variables

| Variable | Example | Default | Description |
|----------|---------|---------|-------------|
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | Same | Claude model version |
| `DATABASE_URL` | `file:./procheff.db` | `procheff.db` | Database location |
| `NEXTAUTH_SECRET` | `random-secret-string` | None | NextAuth secret |
| `NEXTAUTH_URL` | `http://localhost:3001` | Auto-detect | NextAuth URL |
| `LOG_LEVEL` | `info` | `info` | Logging level |
| `PORT` | `3002` | `3001` | Server port |

### Validation Script

```bash
# Create a validation script
cat > check-env.sh << 'EOF'
#!/bin/bash

echo "🔍 Checking environment configuration..."

# Check .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ .env.local file not found!"
  exit 1
fi

# Check ANTHROPIC_API_KEY
if grep -q "ANTHROPIC_API_KEY=" .env.local; then
  echo "✅ ANTHROPIC_API_KEY is set"
else
  echo "❌ ANTHROPIC_API_KEY is missing"
fi

# Check GOOGLE_API_KEY
if grep -q "GOOGLE_API_KEY=" .env.local; then
  echo "✅ GOOGLE_API_KEY is set"
else
  echo "❌ GOOGLE_API_KEY is missing"
fi

echo "✅ Environment check complete"
EOF

chmod +x check-env.sh
./check-env.sh
```

---

## Next Steps

### After Successful Setup

1. **Explore the UI**
   - Dashboard: Overview of all modules
   - Command Palette: Press `Cmd/Ctrl + K`
   - Monitoring: Real-time metrics

2. **Test AI Features**
   - Cost Analysis: Upload a menu CSV
   - Decision Engine: Analyze a tender
   - Menu Parser: Parse a PDF menu

3. **Read Documentation**
   - [Architecture Guide](./ARCHITECTURE.md) - System overview
   - [Database Schema](./DATABASE.md) - Data structure
   - [API Documentation](./ARCHITECTURE.md#api-endpoints) - Endpoint reference

4. **Development Workflow**
   ```bash
   # Make changes
   # Server auto-reloads

   # View logs
   http://localhost:3001/logs

   # Monitor performance
   http://localhost:3001/monitor
   ```

### Production Deployment

**For production deployment, see:**
- [Vercel Deployment](#vercel-deployment)
- [Railway Deployment](#railway-deployment)
- [Docker Deployment](#docker-deployment)

---

## Vercel Deployment

### Quick Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts
# Add environment variables in Vercel dashboard
```

### Environment Variables in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `ANTHROPIC_API_KEY`
   - `GOOGLE_API_KEY`
   - `NEXTAUTH_SECRET` (generate with: `openssl rand -base64 32`)
   - `NEXTAUTH_URL` (your production URL)

---

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Production
FROM node:20-alpine

WORKDIR /app

COPY --from=base /app/.next ./.next
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/public ./public

EXPOSE 3001

CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  procheff:
    build: .
    ports:
      - "3001:3001"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    volumes:
      - ./procheff.db:/app/procheff.db
```

**Run:**
```bash
docker-compose up -d
```

---

## Support & Resources

### Documentation
- [Architecture](./ARCHITECTURE.md)
- [Database](./DATABASE.md)
- [Command Palette](../COMMAND-PALETTE.md)

### External Resources
- [Next.js Docs](https://nextjs.org/docs)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [Google AI Docs](https://ai.google.dev/docs)

### Getting Help

**Common Resources:**
- Check troubleshooting section above
- Review error logs in `/logs`
- Check browser console (F12)
- Verify environment variables

---

## Checklist

### Pre-Launch Checklist

```
✅ Node.js installed (v18 or v20)
✅ Git installed
✅ Repository cloned
✅ Dependencies installed (npm install)
✅ .env.local created
✅ ANTHROPIC_API_KEY added
✅ GOOGLE_API_KEY added
✅ Development server running (npm run dev)
✅ http://localhost:3001 accessible
✅ API test successful (curl /api/metrics)
✅ Database initialized (procheff.db exists)
✅ Logs table created (sqlite3 check)
✅ UI loads correctly
✅ Command Palette works (Cmd/Ctrl + K)
```

**If all items are checked, you're ready to use Procheff-v3!** 🎉

---

**Last Updated:** November 10, 2025
**Version:** 3.0.0
**Maintainer:** Procheff Development Team
