#!/bin/bash

# Test script for server registration API

DASHBOARD_URL="http://localhost:3030"

echo "Testing Server Registration API"
echo "================================"
echo ""

# Test 1: Register a server
echo "1. Testing POST /api/servers/register"
REGISTER_RESPONSE=$(curl -s -X POST "$DASHBOARD_URL/api/servers/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "game-dev-server",
    "port": 3000,
    "type": "vite",
    "status": "ready",
    "timestamp": 1234567890,
    "pid": 12345,
    "url": "http://localhost:3000"
  }')

echo "Response: $REGISTER_RESPONSE"
echo ""

# Extract serverId from response
SERVER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"serverId":"[^"]*"' | cut -d'"' -f4)
echo "Extracted serverId: $SERVER_ID"
echo ""

# Test 2: List all servers
echo "2. Testing GET /api/servers"
LIST_RESPONSE=$(curl -s "$DASHBOARD_URL/api/servers")
echo "Response: $LIST_RESPONSE"
echo ""

# Test 3: Register another server
echo "3. Registering second server"
REGISTER2_RESPONSE=$(curl -s -X POST "$DASHBOARD_URL/api/servers/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "metrics-server",
    "port": 8766,
    "type": "express"
  }')

echo "Response: $REGISTER2_RESPONSE"
echo ""

# Test 4: List all servers again
echo "4. Testing GET /api/servers (should show 2 servers)"
LIST2_RESPONSE=$(curl -s "$DASHBOARD_URL/api/servers")
echo "Response: $LIST2_RESPONSE"
echo ""

# Test 5: Missing required field (should return 400)
echo "5. Testing validation (missing 'name' field - should fail)"
ERROR_RESPONSE=$(curl -s -X POST "$DASHBOARD_URL/api/servers/register" \
  -H "Content-Type: application/json" \
  -d '{
    "port": 3000,
    "type": "vite"
  }')

echo "Response: $ERROR_RESPONSE"
echo ""

echo "================================"
echo "Tests complete!"
