#!/bin/bash

# ✅ ATTICUS ODIN.FUN STYLE DEPLOYMENT SCRIPT
# Following odin.fun pattern: Single canister deployment

echo "🚀 Deploying Atticus (Odin.fun Style Architecture)..."

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo "❌ dfx not found. Please install dfx first."
    exit 1
fi

# Deploy single Atticus Core canister
echo "📦 Deploying Atticus Core canister..."
dfx deploy atticus_core --network ic

# Get canister ID
CANISTER_ID=$(dfx canister id atticus_core --network ic)
echo "✅ Atticus Core canister deployed with ID: $CANISTER_ID"

# Update environment file
echo "ATTICUS_CORE_CANISTER_ID=$CANISTER_ID" > .env
echo "ICP_NETWORK=ic" >> .env
echo "ICP_HOST=https://ic0.app" >> .env
echo "NODE_ENV=production" >> .env

echo "✅ Environment configuration updated"
echo "🎯 Next steps:"
echo "1. Update your frontend with the canister ID: $CANISTER_ID"
echo "2. Deploy frontend to Render with environment variables"
echo "3. Test all functionality"

echo "🚀 Atticus deployment complete!"