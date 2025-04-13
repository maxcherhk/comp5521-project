#!/bin/bash
set -e

# Function to start a service in a new terminal
start_service() {
  cd "$1"
  echo "Starting service in $1: $2"
  bash -c "$2" &
  cd ..
}

echo "Starting DeFi application..."

# Start Hardhat node
start_service "hardhat" "npx hardhat node"

# Give Hardhat node time to start
sleep 5

# Deploy contracts
start_service "hardhat" "npx hardhat run scripts/deploy_multiple_pools.js --network localhost"
sleep 2

# Transfer tokens for testing
start_service "hardhat" "npx hardhat run scripts/transferTokenForTesting.js --network localhost"
sleep 1

# Transfer DF tokens
start_service "hardhat" "npx hardhat run scripts/transferDF.js --network localhost"
sleep 1

# Add liquidity
start_service "hardhat" "npx hardhat run scripts/add-liquidity.js --network localhost"
sleep 1

# Start frontend
start_service "frontend" "npm run start"

# Keep container running
echo "All services started! Container is now running..."
tail -f /dev/null 