#!/bin/bash

# Production Troubleshooting Script
# Usage: Run on your production server

echo "🔍 PRODUCTION TROUBLESHOOTING"
echo "=============================="
echo ""

# 1. Check running containers
echo "1️⃣ Docker Container Status:"
echo "----------------------------"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# 2. Check container health
echo "2️⃣ Health Checks:"
echo "------------------"
echo "Checking procheff-v3 health..."
docker exec procheff-v3 curl -s http://localhost:8080/api/health 2>/dev/null || echo "❌ procheff-v3 health check failed"
echo ""
echo "Checking ihale-worker health..."
docker exec ihale-worker curl -s http://localhost:8080/health 2>/dev/null || echo "❌ ihale-worker health check failed"
echo ""

# 3. Check logs for errors
echo "3️⃣ Recent Error Logs:"
echo "---------------------"
echo "procheff-v3 errors:"
docker logs procheff-v3 --tail 20 2>&1 | grep -iE "error|fatal|crash|failed" || echo "No recent errors"
echo ""
echo "ihale-worker errors:"
docker logs ihale-worker --tail 20 2>&1 | grep -iE "error|fatal|crash|failed" || echo "No recent errors"
echo ""

# 4. Check environment variables
echo "4️⃣ Environment Variables Check:"
echo "--------------------------------"
echo "Checking critical env vars in procheff-v3..."
docker exec procheff-v3 env | grep -E "ANTHROPIC_API_KEY|GOOGLE_API_KEY|NEXTAUTH_SECRET|DATABASE_PATH" | sed 's/=.*/=***/' || echo "❌ Missing env vars"
echo ""
echo "Checking ihale worker env vars..."
docker exec ihale-worker env | grep -E "IHALEBUL_USERNAME|IHALEBUL_PASSWORD" | sed 's/=.*/=***/' || echo "❌ Missing ihale credentials"
echo ""

# 5. Check disk space
echo "5️⃣ Disk Space:"
echo "--------------"
df -h | grep -E "/$|/var"
echo ""

# 6. Check memory
echo "6️⃣ Memory Usage:"
echo "----------------"
free -h
echo ""

# 7. Check nginx status
echo "7️⃣ Nginx Status:"
echo "----------------"
systemctl status nginx --no-pager | head -10
echo ""

# 8. Test local endpoints
echo "8️⃣ Local Endpoint Tests:"
echo "------------------------"
echo "Testing localhost:3001 (or your port)..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3001/api/health || echo "❌ Port 3001 not responding"
echo ""

# 9. Quick fix attempts
echo "9️⃣ Quick Fix Options:"
echo "---------------------"
echo "a) Restart containers: docker-compose -f docker-compose.digitalocean.yml restart"
echo "b) Check logs: docker logs procheff-v3 -f"
echo "c) Recreate containers: docker-compose -f docker-compose.digitalocean.yml up -d --force-recreate"
echo "d) Check .env file: cat .env | head -5"
echo ""

echo "🔔 Summary:"
echo "-----------"
# Count issues
ISSUES=0
docker ps | grep -q procheff-v3 || { echo "❌ procheff-v3 not running"; ((ISSUES++)); }
docker ps | grep -q ihale-worker || { echo "❌ ihale-worker not running"; ((ISSUES++)); }
systemctl is-active nginx > /dev/null || { echo "❌ Nginx not running"; ((ISSUES++)); }

if [ $ISSUES -eq 0 ]; then
    echo "✅ All services appear to be running"
    echo "⚠️  Check CloudFlare settings and origin server configuration"
else
    echo "❌ Found $ISSUES critical issues - fix required!"
fi
