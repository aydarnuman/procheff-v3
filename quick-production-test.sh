#!/bin/bash

# 🚀 Quick Production Test Script
# Tests if production is running and accessible

PROD_URL="${1:-http://localhost:3000}"

echo "🔍 Testing Production: $PROD_URL"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counter
PASSED=0
FAILED=0

test_endpoint() {
  local name=$1
  local endpoint=$2

  echo -n "Testing $name... "

  response=$(curl -s -w "%{http_code}" -m 5 "$PROD_URL$endpoint" 2>&1)
  status_code=$(echo "$response" | tail -c 4)

  if [ "$status_code" == "200" ] || [ "$status_code" == "201" ]; then
    echo -e "${GREEN}✅ OK${NC} (HTTP $status_code)"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}❌ FAIL${NC} (HTTP $status_code)"
    FAILED=$((FAILED + 1))
  fi
}

# Critical endpoints
echo "🔴 CRITICAL ENDPOINTS:"
test_endpoint "Health Check" "/api/health"
test_endpoint "Database Stats" "/api/database/stats"
test_endpoint "Metrics" "/api/metrics"

echo ""
echo "🟡 HIGH PRIORITY:"
test_endpoint "Cache Stats" "/api/cache/stats"
test_endpoint "Market Price" "/api/market/price"
test_endpoint "Menu Pool" "/api/menu/havuz"

echo ""
echo "=================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}❌ Production has issues!${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Production is healthy!${NC}"
  exit 0
fi
