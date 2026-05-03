#!/bin/bash

# Atticus Trading Platform Deployment Script
echo "🚀 Deploying Atticus Trading Platform..."

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo "❌ DFX is not installed. Please install the Internet Computer SDK first."
    echo "Visit: https://internetcomputer.org/docs/current/developer-docs/setup/install/"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start local ICP network
echo "🌐 Starting local ICP network..."
dfx start --background

# Wait for network to be ready
echo "⏳ Waiting for network to be ready..."
sleep 5

# Deploy canisters
echo "📦 Deploying canisters..."
dfx deploy

# Build frontend
echo "🔨 Building frontend..."
npm run build

# Deploy frontend assets
echo "📤 Deploying frontend assets..."
dfx deploy atticus_frontend

# Get canister IDs
echo "📋 Canister IDs:"
echo "Trading Canister: $(dfx canister id trading_canister)"
echo "Price Oracle: Removed (using WebSocket feeds)"
echo "Frontend: $(dfx canister id atticus_frontend)"

echo "✅ Deployment complete!"
echo "🌐 Frontend URL: http://localhost:4943/?canisterId=$(dfx canister id atticus_frontend)"
echo "🔧 Development server: npm run dev"


