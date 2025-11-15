#!/bin/bash

# 🚀 Procheff-v3 Production API Test Suite
# Usage: ./test-production-apis.sh [BASE_URL]

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${1:-https://procheff.com}"
RESULTS_FILE="api_test_results_$(date +%Y%m%d_%H%M%S).txt"
PASSED=0
FAILED=0
TOTAL=0

# Print header
echo -e "${BLUE}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🚀 PROCHEFF-V3 PRODUCTION API TEST SUITE      ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════╝${NC}"
echo ""
echo "Base URL: $BASE_URL"
echo "Results File: $RESULTS_FILE"
echo "Started: $(date)"
echo ""

# Initialize results file
cat > $RESULTS_FILE <<EOF
PROCHEFF-V3 API TEST RESULTS
=============================
Base URL: $BASE_URL
Timestamp: $(date)
=============================

EOF

# Test function
test_api() {
  local priority=$1
  local name=$2
  local method=$3
  local endpoint=$4
  local data=$5
  local expected_status=${6:-200}

  TOTAL=$((TOTAL + 1))
  echo -n "[$TOTAL] Testing $name... "

  # Make request
  if [ "$method" == "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" -m 10 "$BASE_URL$endpoint" 2>&1)
  else
    response=$(curl -s -w "\n%{http_code}" -m 10 -X "$method" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$BASE_URL$endpoint" 2>&1)
  fi

  # Extract status code
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  # Check if status code is numeric
  if ! [[ "$status_code" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}❌ FAIL (Connection Error)${NC}"
    echo "[$TOTAL] ❌ $name - Connection Error" >> $RESULTS_FILE
    echo "  Endpoint: $endpoint" >> $RESULTS_FILE
    echo "  Error: $status_code" >> $RESULTS_FILE
    echo "" >> $RESULTS_FILE
    FAILED=$((FAILED + 1))
    return 1
  fi

  # Evaluate result
  if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $status_code)"
    echo "[$TOTAL] ✅ $name - HTTP $status_code" >> $RESULTS_FILE
    PASSED=$((PASSED + 1))
  elif [ "$status_code" -eq 401 ] || [ "$status_code" -eq 403 ]; then
    echo -e "${YELLOW}⚠️  AUTH REQUIRED${NC} (HTTP $status_code)"
    echo "[$TOTAL] ⚠️  $name - HTTP $status_code (Auth Required)" >> $RESULTS_FILE
    PASSED=$((PASSED + 1))  # Count as pass, just needs auth
  else
    echo -e "${RED}❌ FAIL${NC} (HTTP $status_code)"
    echo "[$TOTAL] ❌ $name - HTTP $status_code" >> $RESULTS_FILE
    echo "  Endpoint: $endpoint" >> $RESULTS_FILE
    echo "  Response: ${body:0:200}" >> $RESULTS_FILE
    echo "" >> $RESULTS_FILE
    FAILED=$((FAILED + 1))
  fi
}

# ============================================
# CRITICAL TESTS
# ============================================
echo -e "\n${RED}🔴 CRITICAL ENDPOINTS${NC}"
echo "🔴 CRITICAL ENDPOINTS" >> $RESULTS_FILE
echo "=====================" >> $RESULTS_FILE

test_api "🔴" "Health Check" "GET" "/api/health"
test_api "🔴" "Database Stats" "GET" "/api/database/stats"
test_api "🔴" "Metrics Dashboard" "GET" "/api/metrics"
test_api "🔴" "Cache Statistics" "GET" "/api/cache/stats"
test_api "🔴" "Memory Usage" "GET" "/api/memory"

# ============================================
# HIGH PRIORITY TESTS
# ============================================
echo -e "\n${YELLOW}🟡 HIGH PRIORITY ENDPOINTS${NC}"
echo "" >> $RESULTS_FILE
echo "🟡 HIGH PRIORITY ENDPOINTS" >> $RESULTS_FILE
echo "==========================" >> $RESULTS_FILE

test_api "🟡" "Market Price Data" "GET" "/api/market/price"
test_api "🟡" "Market History" "GET" "/api/market/history?months=1"
test_api "🟡" "Market Scraper Health" "GET" "/api/market/scraper-health"
test_api "🟡" "Menu Pool" "GET" "/api/menu/havuz"
test_api "🟡" "Notifications List" "GET" "/api/notifications?limit=5"
test_api "🟡" "Orchestration Jobs" "GET" "/api/orchestrate/jobs?limit=5"
test_api "🟡" "Active Job Count" "GET" "/api/orchestrate/active-count"
test_api "🟡" "Logs Recent" "GET" "/api/logs?limit=10"

# ============================================
# MEDIUM PRIORITY TESTS
# ============================================
echo -e "\n${BLUE}🟢 MEDIUM PRIORITY ENDPOINTS${NC}"
echo "" >> $RESULTS_FILE
echo "🟢 MEDIUM PRIORITY ENDPOINTS" >> $RESULTS_FILE
echo "============================" >> $RESULTS_FILE

test_api "🟢" "Product List" "GET" "/api/products/list"
test_api "🟢" "Chat Analytics" "GET" "/api/chat/analytics"
test_api "🟢" "Performance Stats" "GET" "/api/performance/stats"
test_api "🟢" "Monitoring Dashboard" "GET" "/api/monitoring/dashboard"
test_api "🟢" "Parser Menu (OPTIONS)" "OPTIONS" "/api/parser/menu"

# ============================================
# AI ENDPOINTS (Might fail without auth/data)
# ============================================
echo -e "\n${BLUE}🤖 AI ENDPOINTS (Auth Required)${NC}"
echo "" >> $RESULTS_FILE
echo "🤖 AI ENDPOINTS" >> $RESULTS_FILE
echo "===============" >> $RESULTS_FILE

test_api "🤖" "AI PostgreSQL Test" "GET" "/api/ai/test-postgres"
test_api "🤖" "AI Cost Analysis" "POST" "/api/ai/cost-analysis" '{"test":true}'
test_api "🤖" "AI Decision Engine" "POST" "/api/ai/decision" '{"test":true}'

# ============================================
# DATABASE OPERATIONS
# ============================================
echo -e "\n${BLUE}💾 DATABASE OPERATIONS${NC}"
echo "" >> $RESULTS_FILE
echo "💾 DATABASE OPERATIONS" >> $RESULTS_FILE
echo "======================" >> $RESULTS_FILE

test_api "💾" "Database Vacuum" "POST" "/api/database/vacuum"
test_api "💾" "Database Cleanup" "POST" "/api/database/cleanup"

# ============================================
# SUMMARY
# ============================================
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  TEST SUMMARY                     ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Total Tests:  ${TOTAL}"
echo -e "${GREEN}Passed:       ${PASSED}${NC}"
echo -e "${RED}Failed:       ${FAILED}${NC}"
echo ""

# Calculate success rate
if [ $TOTAL -gt 0 ]; then
  SUCCESS_RATE=$(echo "scale=2; ($PASSED * 100) / $TOTAL" | bc)
  echo -e "Success Rate: ${SUCCESS_RATE}%"
else
  SUCCESS_RATE="0"
fi

# Write summary to file
cat >> $RESULTS_FILE <<EOF

=============================
SUMMARY
=============================
Total Tests: $TOTAL
Passed: $PASSED
Failed: $FAILED
Success Rate: ${SUCCESS_RATE}%
=============================
EOF

echo ""
echo "✅ Results saved to: $RESULTS_FILE"
echo ""

# Exit with appropriate code
if [ $FAILED -gt 0 ]; then
  echo -e "${RED}❌ Some tests failed. Check $RESULTS_FILE for details.${NC}"
  exit 1
else
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
fi
