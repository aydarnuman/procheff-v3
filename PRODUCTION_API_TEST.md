# 🚀 PRODUCTION API TEST GUIDE

**Generated:** 2025-11-15
**Total Endpoints:** 104
**Purpose:** Production API functionality verification

---

## 🎯 QUICK START

### Production URL
```bash
PRODUCTION_URL="https://procheff.com"  # Değiştir!
# veya
PRODUCTION_URL="http://YOUR_DROPLET_IP:3000"
```

### Test All Critical APIs
```bash
# Quick health check
curl $PRODUCTION_URL/api/health

# Database check
curl $PRODUCTION_URL/api/database/stats

# Metrics check
curl $PRODUCTION_URL/api/metrics

# Cache check
curl $PRODUCTION_URL/api/cache/stats
```

---

## 📊 API ENDPOINT KATEGORİLERİ

### 1️⃣ SYSTEM HEALTH & MONITORING (5 endpoints)

| Endpoint | Method | Description | Priority |
|----------|--------|-------------|----------|
| `/api/health` | GET | System health check | 🔴 CRITICAL |
| `/api/metrics` | GET | Logging metrics | 🔴 CRITICAL |
| `/api/database/stats` | GET | Database statistics | 🔴 CRITICAL |
| `/api/cache/stats` | GET | Cache statistics | 🟡 HIGH |
| `/api/memory` | GET | Memory usage | 🟡 HIGH |

**Test Script:**
```bash
#!/bin/bash
BASE_URL="https://procheff.com"

echo "🏥 Testing System Health..."

# Health check
curl -s "$BASE_URL/api/health" | jq '.'

# Metrics
curl -s "$BASE_URL/api/metrics" | jq '.metrics | {total_logs, errors, success_rate}'

# Database stats
curl -s "$BASE_URL/api/database/stats" | jq '.stats | {dbSize, logCount}'

# Cache stats
curl -s "$BASE_URL/api/cache/stats" | jq '.data | {totalEntries, totalHits, cacheEfficiency}'

# Memory
curl -s "$BASE_URL/api/memory" | jq '.'
```

---

### 2️⃣ AUTHENTICATION (3 endpoints)

| Endpoint | Method | Description | Priority |
|----------|--------|-------------|----------|
| `/api/auth/[...nextauth]` | POST | NextAuth authentication | 🔴 CRITICAL |
| `/api/auth/register` | POST | User registration | 🔴 CRITICAL |
| `/api/user/profile` | GET/PUT | User profile | 🟡 HIGH |

**Test Script:**
```bash
# Register new user
curl -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "name": "Test User"
  }'

# Login (NextAuth)
curl -X POST "$BASE_URL/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'

# Get profile (requires auth token)
curl -X GET "$BASE_URL/api/user/profile" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3️⃣ AI ENDPOINTS (8 endpoints)

| Endpoint | Method | Description | Priority |
|----------|--------|-------------|----------|
| `/api/ai/cost-analysis` | POST | Cost calculation | 🔴 CRITICAL |
| `/api/ai/decision` | POST | Strategic decision | 🔴 CRITICAL |
| `/api/ai/deep-analysis` | POST | Deep analysis | 🟡 HIGH |
| `/api/ai/classify-product` | POST | Product classification | 🟢 MEDIUM |
| `/api/ai/classify-document` | POST | Document classification | 🟢 MEDIUM |
| `/api/ai/detect-product` | POST | Product detection | 🟢 MEDIUM |
| `/api/ai/fetch-price` | POST | Price fetching | 🟢 MEDIUM |
| `/api/ai/test-postgres` | GET | PostgreSQL test | 🟢 LOW |

**Test Script:**
```bash
# Cost Analysis
curl -X POST "$BASE_URL/api/ai/cost-analysis" \
  -H "Content-Type: application/json" \
  -d '{
    "menu_data": [{"name": "Çorba", "portion": 250, "quantity": 100}],
    "kurum": "Test Kurum",
    "ihale_turu": "Yemek İhalesi",
    "kisilik": 100,
    "gun_sayisi": 30
  }'

# Decision Engine
curl -X POST "$BASE_URL/api/ai/decision" \
  -H "Content-Type: application/json" \
  -d '{
    "cost_analysis": {"total_cost": 50000},
    "market_analysis": {"price_trend": "stable"},
    "kurum": "Test Kurum"
  }'

# Deep Analysis
curl -X POST "$BASE_URL/api/ai/deep-analysis" \
  -H "Content-Type: application/json" \
  -d '{
    "analysisId": "test-123",
    "contextualAnalysis": {},
    "marketData": {}
  }'
```

---

### 4️⃣ ANALYSIS PIPELINE (10 endpoints)

| Endpoint | Method | Description | Priority |
|----------|--------|-------------|----------|
| `/api/analysis/upload` | POST | Upload tender file | 🔴 CRITICAL |
| `/api/analysis/process` | POST | Process uploaded file | 🔴 CRITICAL |
| `/api/analysis/[id]` | GET | Get analysis result | 🔴 CRITICAL |
| `/api/analysis/start` | POST | Start new analysis | 🟡 HIGH |
| `/api/analysis/complete` | POST | Mark as complete | 🟡 HIGH |
| `/api/analysis/contextual` | POST | Contextual analysis | 🟡 HIGH |
| `/api/analysis/market` | POST | Market analysis | 🟡 HIGH |
| `/api/analysis/results/[id]` | GET | Get result by ID | 🟡 HIGH |
| `/api/analysis/process-single` | POST | Single file process | 🟢 MEDIUM |

**Test Script:**
```bash
# Upload file
curl -X POST "$BASE_URL/api/analysis/upload" \
  -F "file=@sample-tender.pdf" \
  -F "metadata={\"kurum\":\"Test Kurum\"}"

# Get analysis result
ANALYSIS_ID="test-analysis-123"
curl -X GET "$BASE_URL/api/analysis/$ANALYSIS_ID"

# Get analysis results
curl -X GET "$BASE_URL/api/analysis/results/$ANALYSIS_ID"
```

---

### 5️⃣ İHALE INTEGRATION (10 endpoints)

| Endpoint | Method | Description | Priority |
|----------|--------|-------------|----------|
| `/api/ihale/login` | POST | İhalebul login | 🔴 CRITICAL |
| `/api/ihale/list` | GET | List tenders | 🔴 CRITICAL |
| `/api/ihale/detail/[id]` | GET | Tender detail | 🔴 CRITICAL |
| `/api/ihale/upload` | POST | Upload tender | 🟡 HIGH |
| `/api/ihale/proxy` | GET | Proxy requests | 🟡 HIGH |
| `/api/ihale/quick-export` | POST | Quick export | 🟢 MEDIUM |
| `/api/ihale/export-csv/[id]` | GET | Export as CSV | 🟢 MEDIUM |
| `/api/ihale/fetch-full-content` | POST | Fetch full content | 🟢 MEDIUM |

**Test Script:**
```bash
# Login to İhalebul
curl -X POST "$BASE_URL/api/ihale/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'

# List tenders
curl -X GET "$BASE_URL/api/ihale/list?sessionId=SESSION_ID"

# Get tender detail
curl -X GET "$BASE_URL/api/ihale/detail/TENDER_ID?sessionId=SESSION_ID"
```

---

### 6️⃣ MARKET DATA (15 endpoints)

| Endpoint | Method | Description | Priority |
|----------|--------|-------------|----------|
| `/api/market/price` | GET/POST | Price data | 🔴 CRITICAL |
| `/api/market/history` | GET | Price history | 🟡 HIGH |
| `/api/market/history/[productKey]` | GET | Product history | 🟡 HIGH |
| `/api/market/compare` | POST | Price comparison | 🟡 HIGH |
| `/api/market/bulk` | POST | Bulk operations | 🟢 MEDIUM |
| `/api/market/fusion` | POST | Data fusion | 🟢 MEDIUM |
| `/api/market/volatility/[id]` | GET | Volatility analysis | 🟢 MEDIUM |
| `/api/market/risk/analyze` | POST | Risk analysis | 🟢 MEDIUM |
| `/api/market/product/detect` | POST | Product detection | 🟢 MEDIUM |
| `/api/market/scraper-health` | GET | Scraper status | 🟢 LOW |
| `/api/market/init` | POST | Initialize market | 🟢 LOW |
| `/api/market/migrate` | POST | Database migration | 🟢 LOW |
| `/api/market/admin/init` | POST | Admin init | 🟢 LOW |

**Test Script:**
```bash
# Get price data
curl -X GET "$BASE_URL/api/market/price?product=domates"

# Get price history
curl -X GET "$BASE_URL/api/market/history?months=6"

# Get product history
curl -X GET "$BASE_URL/api/market/history/domates-kg"

# Compare prices
curl -X POST "$BASE_URL/api/market/compare" \
  -H "Content-Type: application/json" \
  -d '{
    "products": ["domates", "patates", "soğan"]
  }'

# Scraper health
curl -X GET "$BASE_URL/api/market/scraper-health"
```

---

### 7️⃣ MENU MANAGEMENT (7 endpoints)

| Endpoint | Method | Description | Priority |
|----------|--------|-------------|----------|
| `/api/menu/planner` | GET/POST | Menu planner | 🟡 HIGH |
| `/api/menu/havuz` | GET | Menu pool | 🟡 HIGH |
| `/api/menu/gramaj` | POST | Portion calculator | 🟡 HIGH |
| `/api/menu/detail/[id]` | GET | Menu details | 🟢 MEDIUM |
| `/api/menu/export/planner` | POST | Export menu | 🟢 MEDIUM |
| `/api/menu/export/planner-pdf` | POST | Export as PDF | 🟢 MEDIUM |
| `/api/menu/export/gramaj` | POST | Export portions | 🟢 MEDIUM |

**Test Script:**
```bash
# Get menu pool
curl -X GET "$BASE_URL/api/menu/havuz"

# Create menu plan
curl -X POST "$BASE_URL/api/menu/planner" \
  -H "Content-Type: application/json" \
  -d '{
    "days": 5,
    "meals": ["breakfast", "lunch", "dinner"]
  }'

# Calculate portions
curl -X POST "$BASE_URL/api/menu/gramaj" \
  -H "Content-Type: application/json" \
  -d '{
    "food": "çorba",
    "servings": 100
  }'
```

---

### 8️⃣ NOTIFICATIONS (6 endpoints)

| Endpoint | Method | Description | Priority |
|----------|--------|-------------|----------|
| `/api/notifications` | GET/POST | Notifications | 🟡 HIGH |
| `/api/notifications/stream` | GET | SSE stream | 🟡 HIGH |
| `/api/notifications/test` | POST | Test notification | 🟢 MEDIUM |
| `/api/settings/notifications/channels` | GET/POST | Channel config | 🟢 MEDIUM |
| `/api/settings/notifications/preferences` | GET/PUT | User preferences | 🟢 MEDIUM |
| `/api/settings/notifications/verify` | POST | Verify channel | 🟢 LOW |

**Test Script:**
```bash
# Get notifications
curl -X GET "$BASE_URL/api/notifications?limit=10"

# SSE Stream (use EventSource in browser)
curl -N "$BASE_URL/api/notifications/stream"

# Send test notification
curl -X POST "$BASE_URL/api/notifications/test" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "email",
    "recipient": "test@example.com"
  }'
```

---

### 9️⃣ ORCHESTRATION (6 endpoints)

| Endpoint | Method | Description | Priority |
|----------|--------|-------------|----------|
| `/api/orchestrate` | POST | Create orchestration | 🟡 HIGH |
| `/api/orchestrate/jobs` | GET | List jobs | 🟡 HIGH |
| `/api/orchestrate/jobs/[id]` | GET/DELETE/PATCH | Job operations | 🟡 HIGH |
| `/api/orchestrate/jobs/[id]/events` | GET | Job events (SSE) | 🟢 MEDIUM |
| `/api/orchestrate/history` | GET | Job history | 🟢 MEDIUM |
| `/api/orchestrate/active-count` | GET | Active job count | 🟢 LOW |

**Test Script:**
```bash
# List orchestration jobs
curl -X GET "$BASE_URL/api/orchestrate/jobs?status=running"

# Get job details
curl -X GET "$BASE_URL/api/orchestrate/jobs/JOB_ID"

# Cancel job
curl -X PATCH "$BASE_URL/api/orchestrate/jobs/JOB_ID" \
  -H "Content-Type: application/json" \
  -d '{"action": "cancel"}'

# Get active job count
curl -X GET "$BASE_URL/api/orchestrate/active-count"
```

---

### 🔟 DATABASE OPERATIONS (4 endpoints)

| Endpoint | Method | Description | Priority |
|----------|--------|-------------|----------|
| `/api/database/stats` | GET | Database statistics | 🔴 CRITICAL |
| `/api/database/backup` | POST | Create backup | 🟡 HIGH |
| `/api/database/vacuum` | POST | Vacuum database | 🟢 MEDIUM |
| `/api/database/cleanup` | POST | Cleanup old data | 🟢 MEDIUM |

**Test Script:**
```bash
# Get database stats
curl -X GET "$BASE_URL/api/database/stats"

# Trigger backup
curl -X POST "$BASE_URL/api/database/backup"

# Vacuum database
curl -X POST "$BASE_URL/api/database/vacuum"
```

---

### 1️⃣1️⃣ CHAT & FEEDBACK (4 endpoints)

| Endpoint | Method | Description | Priority |
|----------|--------|-------------|----------|
| `/api/chat` | POST | Chat endpoint | 🟡 HIGH |
| `/api/chat/analytics` | GET | Chat analytics | 🟢 MEDIUM |
| `/api/chat/feedback` | POST | Submit feedback | 🟢 MEDIUM |
| `/api/chat/feedback/metrics` | GET | Feedback metrics | 🟢 LOW |

---

### 1️⃣2️⃣ SETTINGS & ADMIN (20+ endpoints)

All `/api/settings/*` and `/api/admin/*` endpoints for configuration.

---

## 🧪 AUTOMATED TEST SCRIPT

```bash
#!/bin/bash
# Production API Test Suite

BASE_URL="https://procheff.com"
RESULTS_FILE="api_test_results_$(date +%Y%m%d_%H%M%S).txt"

echo "🧪 Starting Production API Tests..." > $RESULTS_FILE
echo "Base URL: $BASE_URL" >> $RESULTS_FILE
echo "Timestamp: $(date)" >> $RESULTS_FILE
echo "======================================" >> $RESULTS_FILE

# Test function
test_api() {
  local name=$1
  local method=$2
  local endpoint=$3
  local data=$4

  echo -n "Testing $name... "

  if [ "$method" == "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$BASE_URL$endpoint")
  fi

  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$status_code" == "200" ] || [ "$status_code" == "201" ]; then
    echo "✅ PASS (HTTP $status_code)" | tee -a $RESULTS_FILE
  else
    echo "❌ FAIL (HTTP $status_code)" | tee -a $RESULTS_FILE
    echo "  Response: $body" >> $RESULTS_FILE
  fi
}

# CRITICAL TESTS
echo "" | tee -a $RESULTS_FILE
echo "🔴 CRITICAL ENDPOINTS:" | tee -a $RESULTS_FILE
test_api "Health Check" "GET" "/api/health"
test_api "Database Stats" "GET" "/api/database/stats"
test_api "Metrics" "GET" "/api/metrics"
test_api "Cache Stats" "GET" "/api/cache/stats"

# HIGH PRIORITY TESTS
echo "" | tee -a $RESULTS_FILE
echo "🟡 HIGH PRIORITY ENDPOINTS:" | tee -a $RESULTS_FILE
test_api "Market Price" "GET" "/api/market/price"
test_api "Market History" "GET" "/api/market/history"
test_api "Menu Pool" "GET" "/api/menu/havuz"
test_api "Notifications" "GET" "/api/notifications?limit=5"

echo "" | tee -a $RESULTS_FILE
echo "======================================" | tee -a $RESULTS_FILE
echo "✅ Test suite completed!" | tee -a $RESULTS_FILE
echo "Results saved to: $RESULTS_FILE"
```

---

## 📊 EXPECTED RESPONSES

### Health Check
```json
{
  "status": "healthy",
  "timestamp": "2025-11-15T10:30:00.000Z",
  "checks": {
    "database": true,
    "memory": true
  },
  "details": {
    "database": {
      "connected": true,
      "tables": 21
    },
    "memory": {
      "used": 512000000,
      "free": 1024000000
    }
  }
}
```

### Database Stats
```json
{
  "success": true,
  "stats": {
    "dbSize": "15.2 MB",
    "logCount": 1523,
    "tables": {
      "users": 5,
      "ai_logs": 1523,
      "analysis_results_v2": 42,
      ...
    }
  }
}
```

### Metrics
```json
{
  "success": true,
  "metrics": {
    "total_logs": 1523,
    "errors": 12,
    "success_rate": "99.2%",
    "level_distribution": [
      {"level": "info", "count": 1200},
      {"level": "success", "count": 300},
      {"level": "error", "count": 12}
    ]
  }
}
```

---

## 🚨 COMMON ISSUES & FIXES

### 1. 500 Internal Server Error
```bash
# Check logs
curl $BASE_URL/api/logs?level=error&limit=10

# Check database connection
curl $BASE_URL/api/health
```

### 2. 401 Unauthorized
```bash
# Login first
curl -X POST $BASE_URL/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "pass"}'
```

### 3. 404 Not Found
- Endpoint URL'si yanlış
- Route dosyası eksik
- Next.js build hatası

### 4. CORS Error
- Production'da Nginx ayarlarını kontrol et
- CORS headers ekle

---

## 📝 PRODUCTION CHECKLIST

- [ ] Health check çalışıyor
- [ ] Database bağlantısı aktif (PostgreSQL)
- [ ] AI endpoints yanıt veriyor
- [ ] Authentication çalışıyor
- [ ] File upload/download çalışıyor
- [ ] İhalebul integration aktif
- [ ] Market data sync çalışıyor
- [ ] Notifications gönderiliyor
- [ ] Logging/metrics toplanıyor
- [ ] Backup sistemleri aktif

---

**Oluşturulma:** 2025-11-15
**Son Güncelleme:** Migration tamamlandıktan sonra
**Status:** ✅ Ready for Production Testing
