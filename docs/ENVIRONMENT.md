# Environment Variables Documentation

**Complete guide to all environment variables in Procheff-v3**

**Last Updated**: 2025-01-12

---

## 📚 Quick Start

```bash
# 1. Copy example file
cp .env.example .env.local

# 2. Edit with your values
nano .env.local

# 3. Restart server
npm run dev
```

---

## 🔑 Required Variables

### AI API Keys

#### ANTHROPIC_API_KEY
- **Required**: Yes
- **Description**: Anthropic Claude API key for AI analysis
- **Get from**: https://console.anthropic.com/
- **Format**: `sk-ant-api03-...`
- **Impact**: All AI analysis features (deep analysis, cost analysis, decision engine)
- **Example**: `ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

#### GOOGLE_API_KEY
- **Required**: Yes (for OCR)
- **Description**: Google Gemini API key for OCR and image analysis
- **Get from**: https://aistudio.google.com/
- **Format**: `AIza...`
- **Impact**: Document OCR, image analysis, text extraction
- **Example**: `GOOGLE_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

#### GEMINI_API_KEY
- **Required**: No (uses GOOGLE_API_KEY if not set)
- **Description**: Alias for GOOGLE_API_KEY
- **Default**: Uses GOOGLE_API_KEY value

### Authentication

#### NEXTAUTH_SECRET
- **Required**: Yes
- **Description**: Secret key for NextAuth session encryption
- **Generate**: `openssl rand -base64 32`
- **Impact**: User authentication, session management, multi-org support
- **Security**: Keep secret, never commit to git
- **Example**: `NEXTAUTH_SECRET=your-generated-secret-here`

#### NEXTAUTH_URL
- **Required**: Yes
- **Description**: Base URL of your application
- **Development**: `http://localhost:3001`
- **Production**: `https://your-domain.com`
- **Impact**: OAuth callbacks, session cookies

---

## ⚙️ Optional Variables

### Database

#### DATABASE_PATH
- **Required**: No
- **Description**: SQLite database file path
- **Default**: `./procheff.db`
- **Impact**: Log storage, analysis persistence, user data
- **Example**: `DATABASE_PATH=./procheff.db`

#### DATABASE_URL
- **Required**: No
- **Description**: Database connection URL (SQLite format)
- **Default**: `file:./procheff.db`
- **Format**: `file:/path/to/database.db`

### Redis (Rate Limiting & Caching)

#### UPSTASH_REDIS_REST_URL
- **Required**: No (only if using rate limiting/caching)
- **Description**: Upstash Redis REST API URL
- **Get from**: https://upstash.com/
- **Impact**: Enables rate limiting and response caching
- **Cost**: Free tier available
- **Example**: `UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io`

#### UPSTASH_REDIS_REST_TOKEN
- **Required**: No (only if using rate limiting/caching)
- **Description**: Upstash Redis REST API token
- **Get from**: https://upstash.com/
- **Pair with**: UPSTASH_REDIS_REST_URL

### Feature Flags

#### ENABLE_RATE_LIMITING
- **Required**: No
- **Description**: Enable API rate limiting
- **Default**: `false`
- **Requires**: Redis configured
- **Impact**: Protects API from abuse
- **Example**: `ENABLE_RATE_LIMITING=true`

#### ENABLE_CACHING
- **Required**: No
- **Description**: Enable response caching
- **Default**: `false`
- **Requires**: Redis configured
- **Impact**: Improves performance, reduces API calls
- **Example**: `ENABLE_CACHING=true`

#### ENABLE_BATCH
- **Required**: No
- **Description**: Enable batch processing
- **Default**: `false`
- **Requires**: None (uses SQLite)
- **Impact**: Multi-file upload support
- **Example**: `ENABLE_BATCH=true`

#### ENABLE_IHALE_ANALYSIS
- **Required**: No
- **Description**: Enable ihale analysis features
- **Default**: `true`

#### ENABLE_SMART_ANALYZE
- **Required**: No
- **Description**: Enable smart analysis features
- **Default**: `true`

#### ENABLE_MENU_MANAGEMENT
- **Required**: No
- **Description**: Enable menu management features
- **Default**: `true`

#### ENABLE_COST_CALCULATOR
- **Required**: No
- **Description**: Enable cost calculator
- **Default**: `true`

#### ENABLE_OFFER_ENGINE
- **Required**: No
- **Description**: Enable offer/decision engine
- **Default**: `true`

#### ENABLE_ANALYTICS
- **Required**: No
- **Description**: Enable analytics features
- **Default**: `true`

### AI Configuration

#### ANTHROPIC_MODEL
- **Required**: No
- **Description**: Claude model to use
- **Default**: `claude-sonnet-4-20250514`
- **Options**: `claude-sonnet-4-20250514`, `claude-3-5-sonnet-20241022`
- **Impact**: AI model selection

#### DEFAULT_AI_MODEL
- **Required**: No
- **Description**: Default AI model fallback
- **Default**: `claude-sonnet-4-20250514`

#### GEMINI_MODEL
- **Required**: No
- **Description**: Gemini model for OCR
- **Default**: `gemini-2.0-flash-exp`

#### AI_MODEL_TEMPERATURE
- **Required**: No
- **Description**: AI model temperature (creativity)
- **Default**: `0.7`
- **Range**: `0.0` (deterministic) to `1.0` (creative)

#### AI_MAX_TOKENS
- **Required**: No
- **Description**: Maximum tokens per AI response
- **Default**: `16000`

#### AI_DEBUG
- **Required**: No
- **Description**: Enable AI debugging logs
- **Default**: `false`

### Application Settings

#### APP_NAME
- **Required**: No
- **Description**: Application name
- **Default**: `procheff-v3`

#### APP_VERSION
- **Required**: No
- **Description**: Application version
- **Default**: `3.0.0`

#### TIER
- **Required**: No
- **Description**: Application tier
- **Default**: `professional`
- **Options**: `basic`, `professional`, `enterprise`

#### NEXT_PUBLIC_APP_URL
- **Required**: No
- **Description**: Public application URL (exposed to client)
- **Default**: `http://localhost:3001`

#### NEXT_PUBLIC_APP_VERSION
- **Required**: No
- **Description**: Public app version (exposed to client)
- **Default**: `3.0.0`

### File Processing

#### MAX_DOCUMENT_SIZE_MB
- **Required**: No
- **Description**: Maximum document size in MB
- **Default**: `50`

#### OCR_ENABLED
- **Required**: No
- **Description**: Enable OCR processing
- **Default**: `true`

#### PDF_PARSING_TIMEOUT
- **Required**: No
- **Description**: PDF parsing timeout in milliseconds
- **Default**: `20000` (20 seconds)

### İhalebul Integration

#### SCRAPER_ENABLED
- **Required**: No
- **Description**: Enable ihalebul.com scraping
- **Default**: `false`

#### IHALEBUL_USERNAME
- **Required**: No (if SCRAPER_ENABLED=true)
- **Description**: İhalebul.com username
- **Impact**: Tender data scraping

#### IHALEBUL_PASSWORD
- **Required**: No (if SCRAPER_ENABLED=true)
- **Description**: İhalebul.com password
- **Security**: Keep secret

#### SCRAPER_API_KEY
- **Required**: No
- **Description**: Scraper API key (if using external service)

### Monitoring & Alerts

#### SLACK_WEBHOOK_URL
- **Required**: No
- **Description**: Slack webhook URL for alerts
- **Get from**: https://api.slack.com/messaging/webhooks
- **Impact**: Sends system alerts to Slack
- **Example**: `SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL`

#### LOG_LEVEL
- **Required**: No
- **Description**: Logging level
- **Default**: `info`
- **Options**: `debug`, `info`, `warn`, `error`

### Performance

#### RATE_LIMIT_GLOBAL
- **Required**: No
- **Description**: Global rate limit (requests per minute)
- **Default**: `100`

#### RATE_LIMIT_ANALYSIS
- **Required**: No
- **Description**: Analysis endpoint rate limit
- **Default**: `3`

#### RATE_LIMIT_MARKET
- **Required**: No
- **Description**: Market endpoint rate limit
- **Default**: `10`

#### RATE_LIMIT_AI
- **Required**: No
- **Description**: AI endpoint rate limit
- **Default**: `5`

#### CACHE_TTL
- **Required**: No
- **Description**: Cache time-to-live in seconds
- **Default**: `3600` (1 hour)

#### CACHE_ENABLED
- **Required**: No
- **Description**: Enable caching globally
- **Default**: `true` (if Redis configured)

### Next.js

#### NODE_ENV
- **Required**: No
- **Description**: Node environment
- **Default**: `development`
- **Options**: `development`, `production`, `test`

#### PORT
- **Required**: No
- **Description**: Server port
- **Default**: `3001`

#### HOSTNAME
- **Required**: No
- **Description**: Server hostname
- **Default**: `0.0.0.0`

#### NEXT_TELEMETRY_DISABLED
- **Required**: No
- **Description**: Disable Next.js telemetry
- **Default**: `1` (disabled)

---

## 📋 Environment Profiles

### Development (.env.local)

```bash
NODE_ENV=development
PORT=3001

# AI Keys
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...

# Auth
NEXTAUTH_SECRET=dev-secret-not-secure
NEXTAUTH_URL=http://localhost:3001

# Database
DATABASE_PATH=./procheff.dev.db

# Features (disabled in dev)
ENABLE_RATE_LIMITING=false
ENABLE_CACHING=false
ENABLE_BATCH=false
```

### Production (.env.production)

```bash
NODE_ENV=production
PORT=8080

# AI Keys
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...

# Auth
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://procheff.example.com

# Database
DATABASE_PATH=/app/data/procheff.db

# Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Features (enabled in production)
ENABLE_RATE_LIMITING=true
ENABLE_CACHING=true
ENABLE_BATCH=true

# Monitoring
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

---

## ✅ Validation

Check your environment setup:

```bash
# Check required variables
node -e "
const required = ['ANTHROPIC_API_KEY', 'GOOGLE_API_KEY', 'NEXTAUTH_SECRET'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('Missing:', missing.join(', '));
  process.exit(1);
}
console.log('✅ All required variables set');
"
```

---

## 🔧 Troubleshooting

### "ANTHROPIC_API_KEY is missing"
- Add `ANTHROPIC_API_KEY` to `.env.local`
- Verify format starts with `sk-ant-`
- Restart dev server: `Ctrl+C` then `npm run dev`

### "Cannot connect to Redis"
- If Redis not needed: Set `ENABLE_RATE_LIMITING=false`
- Otherwise: Create Upstash account at https://upstash.com/
- Check URL and token are correct
- Test: `curl $UPSTASH_REDIS_REST_URL/ping`

### "NEXTAUTH_SECRET is not set"
- Generate: `openssl rand -base64 32`
- Add to `.env.local`
- Restart server

### "Database locked"
- Close other connections to SQLite
- Check file permissions
- Restart server

---

**Last Updated**: 2025-01-12  
**Total Variables**: 45+  
**Maintained By**: Procheff-v3 Development Team


