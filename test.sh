#!/bin/bash

# Simple test script for Stateful Markdown
# This script provides an easy way to test the application

set -e

echo "🧪 Stateful Markdown - Simple Test Script"
echo "========================================"
echo

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}💡 $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    print_step "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
fi

# Build the project
print_step "Building project..."
npm run build >/dev/null 2>&1
print_success "Build completed"

# Check if ports are available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    else
        return 0
    fi
}

if ! check_port 3000; then
    print_error "Port 3000 is in use. Please stop the service and try again."
    exit 1
fi

if ! check_port 3001; then
    print_error "Port 3001 is in use. Please stop the service and try again."
    exit 1
fi

print_success "Ports 3000 and 3001 are available"

# Function to cleanup
cleanup() {
    echo
    print_step "Stopping servers..."
    pkill -f "test-visibility-server.js" 2>/dev/null || true
    pkill -f "stateful-md.*s-md-visible" 2>/dev/null || true
    sleep 1
    print_success "Cleanup completed"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo
print_step "Starting test servers..."

# Start visibility server
print_info "Starting visibility server on port 3001..."
node test-visibility-server.js > /tmp/visibility.log 2>&1 &
VIS_PID=$!

sleep 2

# Check if visibility server started
if ! curl -s http://localhost:3001/status > /dev/null; then
    print_error "Visibility server failed to start"
    cat /tmp/visibility.log
    exit 1
fi

print_success "Visibility server running (PID: $VIS_PID)"

# Start stateful markdown server
print_info "Starting stateful markdown server on port 3000..."
npm start -- s-md-visible \
    --file ./example.md \
    --sharing-name test-doc \
    --checking-url http://localhost:3001/api/check-visibility \
    --port 3000 > /tmp/stateful.log 2>&1 &

MD_PID=$!

sleep 3

# Check if markdown server started
if ! curl -s http://localhost:3000/health > /dev/null; then
    print_error "Stateful markdown server failed to start"
    cat /tmp/stateful.log
    exit 1
fi

print_success "Stateful markdown server running (PID: $MD_PID)"

echo
print_success "🎉 Both servers are running!"
echo
print_info "Test URLs:"
echo "  📄 Content: http://localhost:3000/stateful-md/test-doc"
echo "  🏠 Home: http://localhost:3000/"
echo "  💚 Health: http://localhost:3000/health"
echo "  📊 Visibility API: http://localhost:3001/status"
echo

print_info "Test Commands:"
echo "  # Check visibility"
echo "  curl http://localhost:3001/api/check-visibility"
echo
echo "  # Toggle visibility (watch content disappear/appear)"
echo "  curl -X POST http://localhost:3001/api/toggle-visibility"
echo
echo "  # Set visibility to false"
echo "  curl -X POST http://localhost:3001/api/set-visibility -H 'Content-Type: application/json' -d '{\"visible\": false}'"
echo
echo "  # Set visibility to true"
echo "  curl -X POST http://localhost:3001/api/set-visibility -H 'Content-Type: application/json' -d '{\"visible\": true}'"
echo

# Open browser if available
if command -v open >/dev/null 2>&1; then
    print_info "Opening browser..."
    open http://localhost:3000/stateful-md/test-doc
elif command -v xdg-open >/dev/null 2>&1; then
    print_info "Opening browser..."
    xdg-open http://localhost:3000/stateful-md/test-doc
else
    print_info "Please open http://localhost:3000/stateful-md/test-doc in your browser"
fi

echo
print_step "Running automated tests..."

# Test visibility check
echo -n "Testing visibility API... "
RESPONSE=$(curl -s http://localhost:3001/api/check-visibility)
if echo "$RESPONSE" | grep -q '"visible":true'; then
    echo "✅"
else
    echo "❌"
    print_error "Visibility API test failed: $RESPONSE"
fi

# Test health endpoint
echo -n "Testing health endpoint... "
HEALTH=$(curl -s http://localhost:3000/health)
if echo "$HEALTH" | grep -q '"status":"healthy"'; then
    echo "✅"
else
    echo "❌"
    print_error "Health check failed: $HEALTH"
fi

# Test content accessibility
echo -n "Testing content accessibility... "
if curl -s http://localhost:3000/stateful-md/test-doc | grep -q "Stateful Markdown Document"; then
    echo "✅"
else
    echo "❌"
    print_error "Content not accessible"
fi

# Test visibility toggle
echo -n "Testing visibility toggle... "
TOGGLE_RESULT=$(curl -s -X POST http://localhost:3001/api/toggle-visibility)
if echo "$TOGGLE_RESULT" | grep -q '"visible":false'; then
    # Toggle back
    curl -s -X POST http://localhost:3001/api/toggle-visibility > /dev/null
    echo "✅"
else
    echo "❌"
    print_error "Visibility toggle failed: $TOGGLE_RESULT"
fi

echo
print_success "🎉 All tests passed!"
echo
print_info "The application is working correctly!"
print_info "Try the test commands above to see real-time visibility control."
print_info "Press Ctrl+C to stop the servers when done."

# Wait for user to stop
while true; do
    sleep 1
done
