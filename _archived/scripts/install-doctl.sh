#!/bin/bash

# DigitalOcean doctl CLI Installation Script
# For macOS and Linux

set -e

echo "🚀 Installing DigitalOcean doctl CLI..."
echo ""

# Detect OS
OS="$(uname -s)"

case "${OS}" in
    Darwin*)
        echo "✓ Detected macOS"
        echo ""
        
        # Check if Homebrew is installed
        if ! command -v brew &> /dev/null; then
            echo "❌ Homebrew not found. Installing Homebrew first..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        
        echo "📦 Installing doctl via Homebrew..."
        brew install doctl
        ;;
        
    Linux*)
        echo "✓ Detected Linux"
        echo ""
        
        # Check if snap is available
        if command -v snap &> /dev/null; then
            echo "📦 Installing doctl via snap..."
            sudo snap install doctl
        else
            echo "📦 Installing doctl via direct download..."
            cd ~
            wget https://github.com/digitalocean/doctl/releases/download/v1.104.0/doctl-1.104.0-linux-amd64.tar.gz
            tar xf doctl-1.104.0-linux-amd64.tar.gz
            sudo mv doctl /usr/local/bin
            rm doctl-1.104.0-linux-amd64.tar.gz
        fi
        ;;
        
    *)
        echo "❌ Unsupported OS: ${OS}"
        echo "Please install doctl manually from: https://docs.digitalocean.com/reference/doctl/how-to/install/"
        exit 1
        ;;
esac

echo ""
echo "✅ doctl installed successfully!"
echo ""

# Verify installation
if command -v doctl &> /dev/null; then
    echo "📋 doctl version:"
    doctl version
    echo ""
    echo "🎯 Next steps:"
    echo "1. Authenticate: doctl auth init"
    echo "2. Get your API token from: https://cloud.digitalocean.com/account/api/tokens"
    echo "3. Deploy your app: doctl apps create --spec .do/app.yaml"
    echo ""
else
    echo "❌ Installation failed. Please install manually."
    exit 1
fi
