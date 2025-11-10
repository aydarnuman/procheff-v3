# 🐋 VS Code Docker Extension - Quick Guide

VS Code Docker extension ile Procheff v3 containerlarınızı kolayca yönetin!

## 🎯 Docker Extension Kullanımı

### 1️⃣ Docker View'i Aç

**Sol sidebar'da Docker ikonuna tıklayın** veya:
- macOS: `Cmd+Shift+P` → "Docker: Focus on Docker View"
- Windows/Linux: `Ctrl+Shift+P` → "Docker: Focus on Docker View"

### 2️⃣ Container Yönetimi

Docker view'de göreceğiniz bölümler:

```
📦 Containers
   └── procheff-v3
       ├── procheff-web (running)
       ├── procheff-redis (running)
       └── procheff-worker (running)

🖼️ Images
   └── procheff-v3:latest

📚 Volumes
   └── procheff-data
   └── procheff-uploads

🌐 Networks
   └── procheff-network
```

---

## ⚡ Hızlı Komutlar

### Container İşlemleri

| Eylem | Nasıl |
|-------|-------|
| **Start** | Container'a sağ tık → Start |
| **Stop** | Container'a sağ tık → Stop |
| **Restart** | Container'a sağ tık → Restart |
| **Remove** | Container'a sağ tık → Remove |
| **Logs** | Container'a sağ tık → View Logs |
| **Shell** | Container'a sağ tık → Attach Shell |
| **Inspect** | Container'a sağ tık → Inspect |

### Docker Compose İşlemleri

**docker-compose.yml dosyasına sağ tık:**

- **Compose Up**: Tüm servisleri başlat
- **Compose Down**: Tüm servisleri durdur
- **Compose Restart**: Tüm servisleri yeniden başlat

---

## 🚀 Procheff v3 Özel Komutlar

### Development Environment

```bash
# VS Code Terminal'de (Ctrl+`)
docker-compose up -d

# Logs'u takip et
docker-compose logs -f web
```

VS Code'da: `Ctrl+Shift+P` → **"Tasks: Run Task"** → **"Docker: Run Container (Development)"**

### Production Build Test

```bash
# Build image
docker build -t procheff-v3:latest .

# Run production container
docker run -p 8080:8080 \
  -e NODE_ENV=production \
  -e DATABASE_PATH=/app/data/procheff.db \
  --env-file .env.local \
  procheff-v3:latest
```

VS Code'da: `Ctrl+Shift+P` → **"Tasks: Run Task"** → **"Docker: Build Image"**

---

## 📊 Container Monitoring

### CPU & Memory Usage

1. Docker view'de container'a sağ tık
2. **"View Logs"** veya **"Inspect"** seç
3. Stats görmek için terminal'de:

```bash
docker stats procheff-v3
```

### Health Check

```bash
# Container içinde health check
docker exec procheff-web curl http://localhost:8080/api/health

# Veya browser'da
open http://localhost:3001/api/health
```

---

## 🔍 Debugging

### Container İçine Gir

1. Docker view'de **procheff-web** container'a sağ tık
2. **"Attach Shell"** seç
3. Container içinde komut çalıştır:

```bash
# Check Node.js version
node --version

# Check environment
env | grep NODE_ENV

# Check files
ls -la /app

# Check database
ls -la /app/data
```

### Logs Görüntüle

**Method 1: VS Code**
- Container'a sağ tık → **"View Logs"**
- Logs otomatik refresh olur

**Method 2: Terminal**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web

# Last 100 lines
docker-compose logs --tail=100 web
```

---

## 🛠️ Troubleshooting

### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "3002:8080"  # Changed from 3001
```

### Container Keeps Restarting

1. View logs: `docker-compose logs web`
2. Check for errors
3. Common issues:
   - Missing environment variables
   - Database connection failed
   - Port conflicts

### Rebuild Containers

```bash
# Stop and remove containers
docker-compose down

# Rebuild from scratch
docker-compose up -d --build --force-recreate

# Clean everything
docker system prune -a --volumes -f
```

---

## 🎨 VS Code Tasks

Configured tasks (press `Ctrl+Shift+P` → **"Tasks: Run Task"**):

| Task | Description |
|------|-------------|
| **Docker: Build Image** | Build production image |
| **Docker: Run Container (Development)** | Start all services |
| **Docker: Stop Containers** | Stop all services |
| **Docker: View Logs** | View container logs |
| **Docker: Rebuild and Restart** | Rebuild and restart |
| **DigitalOcean: Deploy** | Deploy to DigitalOcean |
| **Development: Start Server** | Start dev server (non-Docker) |

---

## 📁 VS Code File Structure

```
.vscode/
├── docker-compose.code-workspace  # Docker workspace
├── extensions.json                # Recommended extensions
├── launch.json                    # Debug configurations
├── settings.json                  # VS Code settings
└── tasks.json                     # Docker tasks
```

---

## 🚀 Quick Workflow

### Local Development

1. **Start containers:**
   ```bash
   docker-compose up -d
   ```

2. **View in VS Code:**
   - Open Docker view
   - See running containers
   - Check logs if needed

3. **Access app:**
   - Web: http://localhost:3001
   - Health: http://localhost:3001/api/health

4. **Stop when done:**
   ```bash
   docker-compose down
   ```

### Production Testing

1. **Build production image:**
   ```bash
   docker build -t procheff-v3:latest .
   ```

2. **Test locally:**
   ```bash
   docker run -p 8080:8080 --env-file .env.local procheff-v3:latest
   ```

3. **Deploy to DigitalOcean:**
   ```bash
   ./deploy-automatic.sh
   ```

---

## 💡 Pro Tips

### 1. Quick Container Access

Add to your shell profile:

```bash
# ~/.zshrc or ~/.bashrc
alias dps='docker ps'
alias dlog='docker-compose logs -f'
alias dup='docker-compose up -d'
alias ddown='docker-compose down'
alias dbuild='docker-compose up -d --build'
```

### 2. VS Code Extensions

Recommended Docker extensions:
- ✅ **Docker** (ms-azuretools.vscode-docker)
- ✅ **Remote - Containers** (for dev containers)

### 3. Docker Compose Override

Create `docker-compose.override.yml` for local development:

```yaml
version: '3.9'
services:
  web:
    volumes:
      - ./src:/app/src:delegated  # Hot reload
    ports:
      - "3001:8080"
      - "9229:9229"  # Debug port
```

---

## 🎯 Next Steps

1. ✅ Install Docker extension (already done!)
2. ✅ Open Docker view in VS Code
3. ✅ Run `docker-compose up -d`
4. ✅ Monitor containers in VS Code
5. ✅ Test health endpoint
6. ✅ Deploy to DigitalOcean when ready!

---

## 🆘 Need Help?

- **VS Code Docker Docs**: https://code.visualstudio.com/docs/containers/overview
- **Docker Compose Docs**: https://docs.docker.com/compose/
- **Procheff Deployment**: [DEPLOY-NOW.md](DEPLOY-NOW.md)

---

*Created: 2025-11-10*
*Version: 3.0.0*
*Extension: ms-azuretools.vscode-docker*
