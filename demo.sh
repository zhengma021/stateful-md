#!/bin/bash

# Demo script for Stateful Markdown application
# This script demonstrates the complete workflow of running the application

set -e  # Exit on any error

echo "🚀 Stateful Markdown Demo"
echo "========================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if required files exist
print_info "Checking prerequisites..."

if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the stateful-md directory."
    exit 1
fi

if [ ! -f "example.md" ]; then
    print_error "example.md not found. Please ensure the example file exists."
    exit 1
fi

print_success "Prerequisites check passed"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi

# Build the project
print_info "Building the TypeScript project..."
npm run build
print_success "Build completed"

echo
print_info "Demo Overview:"
echo "  1. Start a test visibility server on port 3001"
echo "  2. Start the stateful markdown server on port 3000"
echo "  3. Open your browser to view the content"
echo "  4. Toggle visibility to see real-time updates"
echo

# Check if ports are available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    else
        return 0
    fi
}

if ! check_port 3000; then
    print_error "Port 3000 is already in use. Please stop the service using this port."
    exit 1
fi

if ! check_port 3001; then
    print_error "Port 3001 is already in use. Please stop the service using this port."
    exit 1
fi

print_success "Ports 3000 and 3001 are available"

# Function to cleanup background processes
cleanup() {
    echo
    print_warning "Shutting down servers..."

    # Kill background processes
    if [ ! -z "$VISIBILITY_PID" ]; then
        kill $VISIBILITY_PID 2>/dev/null || true
    fi

    if [ ! -z "$STATEFUL_MD_PID" ]; then
        kill $STATEFUL_MD_PID 2>/dev/null || true
    fi

    # Wait a moment for graceful shutdown
    sleep 2

    # Force kill if still running
    pkill -f "test-visibility-server.js" 2>/dev/null || true
    pkill -f "stateful-md.*s-md-visible" 2>/dev/null || true

    print_success "Cleanup completed"
    exit 0
}

# Set up signal handlers for cleanup
trap cleanup SIGINT SIGTERM EXIT

echo
print_info "Starting demo servers..."

# Start the visibility server in background
print_info "Starting test visibility server on port 3001..."
node test-visibility-server.js &
VISIBILITY_PID=$!

# Wait a moment for the server to start
sleep 2

# Check if visibility server is running
if ! curl -s http://localhost:3001/status > /dev/null; then
    print_error "Failed to start visibility server"
    exit 1
fi

print_success "Visibility server started (PID: $VISIBILITY_PID)"

# Start the stateful markdown server in background
print_info "Starting stateful markdown server on port 3000..."
npm start s-md-visible \
    --file ./example.md \
    --sharing-name demo-document \
    --checking-url http://localhost:3001/api/check-visibility \
    --port 3000 &

STATEFUL_MD_PID=$!

# Wait for the server to start
sleep 3

# Check if stateful-md server is running
if ! curl -s http://localhost:3000/health > /dev/null; then
    print_error "Failed to start stateful markdown server"
    exit 1
fi

print_success "Stateful markdown server started (PID: $STATEFUL_MD_PID)"

echo
print_success "🎉 Demo is now running!"
echo
print_info "Available URLs:"
echo "  📊 Visibility Server Status:  http://localhost:3001/status"
echo "  🏠 Stateful MD Home:         http://localhost:3000/"
echo "  📄 Shared Document:          http://localhost:3000/stateful-md/demo-document"
echo "  💚 Health Check:             http://localhost:3000/health"
echo

print_info "API Endpoints for testing:"
echo "  🔍 Check Visibility:         GET  http://localhost:3001/api/check-visibility"
echo "  🔄 Toggle Visibility:        POST http://localhost:3001/api/toggle-visibility"
echo "  ⚙️  Set Visibility:          POST http://localhost:3001/api/set-visibility"
echo

print_warning "Demo Instructions:"
echo "  1. Open http://localhost:3000/stateful-md/demo-document in your browser"
echo "  2. The content should be visible (visibility starts as 'true')"
echo "  3. In another terminal, run: curl -X POST http://localhost:3001/api/toggle-visibility"
echo "  4. Watch the content disappear in real-time (within 1 second)"
echo "  5. Toggle again to make it reappear"
echo "  6. Try disabling JavaScript to see the protection message"
echo

print_info "Example commands to test:"
echo "  # Check current visibility"
echo "  curl http://localhost:3001/api/check-visibility"
echo
echo "  # Toggle visibility on/off"
echo "  curl -X POST http://localhost:3001/api/toggle-visibility"
echo
echo "  # Set specific visibility state"
echo "  curl -X POST http://localhost:3001/api/set-visibility -H 'Content-Type: application/json' -d '{\"visible\": false}'"
echo

# Open browser automatically (if available)
if command -v open >/dev/null 2>&1; then
    print_info "Opening browser automatically (macOS)..."
    open http://localhost:3000/stateful-md/demo-document
elif command -v xdg-open >/dev/null 2>&1; then
    print_info "Opening browser automatically (Linux)..."
    xdg-open http://localhost:3000/stateful-md/demo-document
elif command -v start >/dev/null 2>&1; then
    print_info "Opening browser automatically (Windows)..."
    start http://localhost:3000/stateful-md/demo-document
else
    print_warning "Cannot open browser automatically. Please open http://localhost:3000/stateful-md/demo-document manually."
fi

echo
print_warning "Press Ctrl+C to stop the demo servers"

# Wait for user interrupt
while true; do
    sleep 1
done
