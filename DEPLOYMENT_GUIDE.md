# 🚀 PROCHEFF-V3 PRODUCTION DEPLOYMENT GUIDE

**Last Updated:** 2025-11-15
**Database:** DigitalOcean Managed PostgreSQL
**Platform:** DigitalOcean Droplet

---

## 📋 PRODUCTION CREDENTIALS

### DigitalOcean PostgreSQL Database
```bash
Host:     db-postgresql-fra1-22277-do-user-28803712-0.f.db.ondigitalocean.com
Port:     25060
Database: defaultdb
Username: doadmin
Password: YOUR_DATABASE_PASSWORD_HERE
SSL:      Required
```

### DigitalOcean API Token
```bash
YOUR_DIGITALOCEAN_API_TOKEN_HERE
```

### Deploy Key (SSH)
```bash
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDDFIEoc7OeNdrJk9YJXSDHi3/Sa+cumXgZ5mZscIxN9
```

---

## 🎯 STEP 1: FIND YOUR DROPLET IP

### Option A: Using DigitalOcean CLI (doctl)
```bash
# Install doctl
snap install doctl

# Authenticate
doctl auth init --access-token YOUR_DIGITALOCEAN_API_TOKEN_HERE

# List droplets
doctl compute droplet list

# Expected output:
# ID          Name           Public IPv4      ...
# 123456789   procheff-v3    164.92.XXX.XXX   ...
```

### Option B: Via DigitalOcean Dashboard
1. Go to https://cloud.digitalocean.com/
2. Click "Droplets"
3. Find your droplet (probably named "procheff-v3" or similar)
4. Note the IP address

### Option C: Check if you have it in notes
```bash
# Common DigitalOcean IP ranges:
# Frankfurt: 164.92.x.x
# Amsterdam: 165.22.x.x
# London: 167.99.x.x
```

---

## 🔌 STEP 2: SSH INTO DROPLET

```bash
# Replace with your actual IP
DROPLET_IP="164.92.XXX.XXX"

# SSH with root user and provided password
ssh root@$DROPLET_IP
# Password: 43Numan43A (from oceanserver:43Numan43A)
```

---

## 📦 STEP 3: SETUP PRODUCTION ENVIRONMENT

Once SSH'd into the Droplet:

```bash
# Navigate to project directory
cd /var/www/procheff-v3 || cd /root/procheff-v3 || cd ~/procheff-v3

# If project doesn't exist, clone it
git clone git@github.com:aydarnuman/procheff-v3.git /var/www/procheff-v3
cd /var/www/procheff-v3

# Create .env.production file
cat > .env.production <<'EOF'
# Database
DB_MODE=postgres
DATABASE_URL=postgresql://doadmin:YOUR_DATABASE_PASSWORD_HERE@db-postgresql-fra1-22277-do-user-28803712-0.f.db.ondigitalocean.com:25060/defaultdb?sslmode=require

# API Keys (ADD YOUR REAL KEYS HERE!)
ANTHROPIC_API_KEY=sk-ant-your-real-key-here
ANTHROPIC_MODEL=claude-sonnet-4-20250514
GOOGLE_API_KEY=AIza-your-real-key-here

# NextAuth
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://DROPLET_IP:3000

# Environment
NODE_ENV=production
DISABLE_SSL_VERIFICATION=false
EOF

# IMPORTANT: Edit .env.production and add real API keys
nano .env.production
```

---

## 🔄 STEP 4: INSTALL & BUILD

```bash
# Install dependencies
npm install

# Build for production
npm run build

# If build fails with TypeScript errors:
# These are mostly dependency issues, not migration issues
npm run build 2>&1 | grep -E "error TS" | grep "src/(lib|app/api)" | head -20
```

---

## 🗄️ STEP 5: TEST DATABASE CONNECTION

```bash
# Test PostgreSQL connection from Droplet
PGPASSWORD=YOUR_DATABASE_PASSWORD_HERE psql \
  -h db-postgresql-fra1-22277-do-user-28803712-0.f.db.ondigitalocean.com \
  -p 25060 \
  -U doadmin \
  -d defaultdb \
  -c "\dt"

# Should show list of tables
# If connection fails:
# 1. Check firewall rules in DigitalOcean dashboard
# 2. Verify SSL is enabled
# 3. Check if Droplet IP is whitelisted in database trusted sources
```

---

## 🚀 STEP 6: START APPLICATION

### Option A: Direct Start (Testing)
```bash
# Start Next.js
npm start

# Application should be running on http://DROPLET_IP:3000
```

### Option B: PM2 (Production)
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start npm --name "procheff-v3" -- start

# Configure PM2 to start on boot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs procheff-v3

# Useful PM2 commands:
pm2 restart procheff-v3   # Restart app
pm2 stop procheff-v3      # Stop app
pm2 delete procheff-v3    # Remove app
pm2 monit                 # Monitor resources
```

---

## 🌐 STEP 7: SETUP NGINX (Optional - for HTTPS)

```bash
# Install Nginx
apt update
apt install nginx -y

# Create Nginx config
cat > /etc/nginx/sites-available/procheff-v3 <<'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN.com;  # or use IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/procheff-v3 /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# If using domain, install SSL with Let's Encrypt:
apt install certbot python3-certbot-nginx -y
certbot --nginx -d YOUR_DOMAIN.com
```

---

## 🧪 STEP 8: TEST PRODUCTION APIs

### From Droplet (localhost)
```bash
# Download test script
curl -o test-production-apis.sh https://raw.githubusercontent.com/aydarnuman/procheff-v3/main/test-production-apis.sh
chmod +x test-production-apis.sh

# Run tests
./test-production-apis.sh http://localhost:3000
```

### From Your Local Machine
```bash
# In your local procheff-v3 directory
./test-production-apis.sh http://DROPLET_IP:3000

# Or if domain is configured:
./test-production-apis.sh https://your-domain.com
```

### Quick Health Checks
```bash
# Replace with your IP/domain
PROD_URL="http://164.92.XXX.XXX:3000"

# Health check
curl $PROD_URL/api/health | jq

# Database stats
curl $PROD_URL/api/database/stats | jq

# Metrics
curl $PROD_URL/api/metrics | jq

# Cache stats
curl $PROD_URL/api/cache/stats | jq

# Test PostgreSQL endpoint
curl $PROD_URL/api/ai/test-postgres | jq
```

---

## 🔄 STEP 9: CONTINUOUS DEPLOYMENT

### Manual Deployment
```bash
# SSH into droplet
ssh root@DROPLET_IP

# Navigate to project
cd /var/www/procheff-v3

# Pull latest changes
git pull origin main

# Install dependencies (if package.json changed)
npm install

# Rebuild
npm run build

# Restart PM2
pm2 restart procheff-v3

# Or restart direct start:
# Kill existing process and start again
```

### Automated Deployment (GitHub Actions)
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to DigitalOcean
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DROPLET_IP }}
          username: root
          password: ${{ secrets.DROPLET_PASSWORD }}
          script: |
            cd /var/www/procheff-v3
            git pull origin main
            npm install
            npm run build
            pm2 restart procheff-v3
```

Add secrets to GitHub:
- `DROPLET_IP`: Your Droplet IP
- `DROPLET_PASSWORD`: 43Numan43A

---

## 🐛 TROUBLESHOOTING

### Database Connection Issues
```bash
# Check if PostgreSQL is accessible
telnet db-postgresql-fra1-22277-do-user-28803712-0.f.db.ondigitalocean.com 25060

# Check database firewall rules in DigitalOcean
# Add Droplet IP to trusted sources

# Test connection with verbose output
PGPASSWORD=YOUR_DATABASE_PASSWORD_HERE psql \
  -h db-postgresql-fra1-22277-do-user-28803712-0.f.db.ondigitalocean.com \
  -p 25060 \
  -U doadmin \
  -d defaultdb \
  --verbose
```

### App Not Starting
```bash
# Check logs
pm2 logs procheff-v3 --lines 50

# Check if port 3000 is in use
lsof -i :3000
netstat -tulpn | grep 3000

# Kill process on port 3000
kill -9 $(lsof -t -i:3000)

# Check environment variables
cat .env.production
```

### Build Errors
```bash
# Clear cache and rebuild
rm -rf .next
npm run build

# Check for missing dependencies
npm install --legacy-peer-deps
```

### 500 Internal Server Error
```bash
# Check app logs
pm2 logs procheff-v3

# Check database connection
curl http://localhost:3000/api/health

# Verify environment variables
node -e "console.log(process.env.DATABASE_URL)"
```

---

## 📊 MONITORING

### PM2 Monitoring
```bash
pm2 monit                    # Live monitoring
pm2 status                   # Status overview
pm2 logs procheff-v3         # Live logs
pm2 logs procheff-v3 --lines 100  # Last 100 lines
```

### System Resources
```bash
htop                         # CPU/Memory usage
df -h                        # Disk usage
free -h                      # Memory usage
```

### Application Metrics
```bash
# Via API
curl http://localhost:3000/api/metrics
curl http://localhost:3000/api/database/stats
curl http://localhost:3000/api/memory
```

---

## 🔐 SECURITY CHECKLIST

- [ ] Change default SSH port from 22 to custom port
- [ ] Setup UFW firewall
- [ ] Disable root SSH login
- [ ] Use SSH keys instead of password
- [ ] Setup fail2ban
- [ ] Enable HTTPS with Let's Encrypt
- [ ] Secure .env.production file (chmod 600)
- [ ] Setup database backups
- [ ] Enable DigitalOcean backups
- [ ] Setup monitoring/alerting

### Quick Security Setup
```bash
# UFW Firewall
ufw allow 22/tcp        # SSH
ufw allow 80/tcp        # HTTP
ufw allow 443/tcp       # HTTPS
ufw enable

# Secure .env file
chmod 600 /var/www/procheff-v3/.env.production

# Setup automatic updates
apt install unattended-upgrades -y
dpkg-reconfigure --priority=low unattended-upgrades
```

---

## 📝 QUICK REFERENCE

### Essential Commands
```bash
# SSH into server
ssh root@DROPLET_IP

# Navigate to project
cd /var/www/procheff-v3

# Update code
git pull origin main && npm install && npm run build && pm2 restart procheff-v3

# View logs
pm2 logs procheff-v3

# Restart app
pm2 restart procheff-v3

# Check status
pm2 status

# Test API
curl http://localhost:3000/api/health
```

### Important Files
```
/var/www/procheff-v3/.env.production    # Environment variables
/var/www/procheff-v3/.next/             # Next.js build output
/root/.pm2/logs/                        # PM2 logs
/etc/nginx/sites-available/procheff-v3  # Nginx config
```

---

**Ready to deploy? Follow steps 1-8 above!** 🚀
