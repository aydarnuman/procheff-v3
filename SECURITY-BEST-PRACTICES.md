# Security Best Practices

## 🔒 Protecting Sensitive Information

### Never Commit These to Version Control:
- ❌ Server IP addresses
- ❌ SSH credentials
- ❌ API keys
- ❌ Database passwords
- ❌ Email addresses (for production accounts)
- ❌ Private URLs
- ❌ Internal infrastructure details

### Use Environment Variables Instead:
```bash
# BAD - Hardcoded in script
ssh root@161.35.217.113

# GOOD - Using environment variable
ssh $SSH_USER@$SERVER_IP
```

## 📝 Configuration Management

### 1. Create Template Files
Always provide `.example` files for configuration:
- `server-config.example.sh` - Server configuration template
- `.env.example` - Environment variables template
- `docker-compose.example.yml` - Docker compose template

### 2. Use .gitignore
Ensure sensitive files are in `.gitignore`:
```gitignore
# Server configuration
server-config.sh
!server-config.example.sh

# Environment files
.env*
!.env.example

# Database files
*.db
*.db-*
```

### 3. Load Configuration Safely
```bash
#!/bin/bash

# Load configuration if exists
if [ -f "./server-config.sh" ]; then
    source ./server-config.sh
elif [ -z "$SERVER_IP" ]; then
    echo "❌ Error: Configuration not found"
    echo "Create server-config.sh from server-config.example.sh"
    exit 1
fi
```

## 🚀 Deployment Scripts

### Safe Deployment Script Pattern
```bash
#!/bin/bash

# Check required variables
required_vars=("SERVER_IP" "SSH_USER" "APP_DIR")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set"
        exit 1
    fi
done

# Use variables
ssh $SSH_USER@$SERVER_IP "cd $APP_DIR && git pull"
```

## 🔑 SSH Security

### Use SSH Config Instead
Create `~/.ssh/config`:
```
Host production
    HostName your.server.ip
    User root
    Port 22
    IdentityFile ~/.ssh/id_rsa
```

Then use:
```bash
ssh production
```

## 📦 Docker Security

### Environment Variables in Docker
```yaml
# docker-compose.yml
services:
  app:
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - API_KEY=${API_KEY}
```

### Use Docker Secrets (for production)
```yaml
services:
  app:
    secrets:
      - db_password
      - api_key

secrets:
  db_password:
    external: true
  api_key:
    external: true
```

## 🔍 Security Audit Checklist

Before committing:
- [ ] No hardcoded IPs in scripts
- [ ] No passwords in code
- [ ] No API keys in files
- [ ] Template files provided
- [ ] .gitignore updated
- [ ] Documentation uses placeholders

## 🛠️ Tools for Security

### Git Secrets
Prevents committing secrets:
```bash
# Install
brew install git-secrets

# Setup
git secrets --install
git secrets --register-aws
```

### TruffleHog
Scans for secrets in git history:
```bash
# Install
pip install truffleHog

# Scan
trufflehog git https://github.com/your/repo
```

## 📚 References

- [OWASP Security Guidelines](https://owasp.org)
- [12 Factor App - Config](https://12factor.net/config)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
