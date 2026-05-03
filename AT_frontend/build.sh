#!/bin/bash

# Build script for Render deployment with network error handling
set -e

echo "🚀 Starting Atticus Frontend Build..."

# Function to retry npm install with exponential backoff
retry_npm_install() {
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "📦 Attempt $attempt: Installing dependencies..."
        
        if npm install --no-optional --legacy-peer-deps \
            --fetch-retries=5 \
            --fetch-retry-factor=2 \
            --fetch-retry-mintimeout=20000 \
            --fetch-retry-maxtimeout=120000 \
            --fetch-timeout=300000; then
            echo "✅ Dependencies installed successfully!"
            return 0
        else
            echo "❌ Attempt $attempt failed"
            if [ $attempt -lt $max_attempts ]; then
                local wait_time=$((2 ** attempt))
                echo "⏳ Waiting ${wait_time}s before retry..."
                sleep $wait_time
            fi
            ((attempt++))
        fi
    done
    
    echo "💥 All npm install attempts failed"
    exit 1
}

# Retry npm install
retry_npm_install

# Build the project
echo "🔨 Building project..."
npm run build

echo "✅ Build completed successfully!"