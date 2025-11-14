#!/bin/bash

# Bu script'i sunucuda çalıştırın
# ssh root@134.209.203.198 'bash -s' < add-deploy-key-to-server.sh

echo "🔑 Adding GitHub Actions deploy key to server..."

# Public key
DEPLOY_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIF68RsPVapzaaLu6Fc8eHGJ5dBo93ISxprn1U/F4yycq github-actions-deploy"

# Add to authorized_keys if not already present
if ! grep -q "$DEPLOY_KEY" ~/.ssh/authorized_keys 2>/dev/null; then
    echo "$DEPLOY_KEY" >> ~/.ssh/authorized_keys
    echo "✅ Deploy key added successfully!"
else
    echo "ℹ️ Deploy key already exists in authorized_keys"
fi

# Set correct permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

echo "✅ SSH configuration completed!"
echo ""
echo "🧪 Testing SSH access..."
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 root@134.209.203.198 "echo '✅ SSH connection successful!'" || echo "❌ SSH connection failed"
