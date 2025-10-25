#!/bin/bash

# Convenient wrapper script for running Stateful Markdown demos
# This script allows you to run demos from the root directory

set -e

echo "🚀 Stateful Markdown Demo Launcher"
echo "=================================="
echo

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

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

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "scripts" ]; then
    print_error "Please run this script from the stateful-md root directory"
    exit 1
fi

print_info "Available demos:"
echo "  1. Full Demo (English content)"
echo "  2. Chinese Content Test"
echo "  3. Simple Test"
echo "  4. Manual Setup Instructions"
echo

read -p "Please select an option (1-4): " choice

case $choice in
    1)
        print_info "Running full demo with English content..."
        cd scripts && ./demo.sh
        ;;
    2)
        print_info "Running Chinese content test..."
        if [ ! -f "scripts/test-chinese/example-chinese.md" ]; then
            print_error "Chinese example file not found"
            exit 1
        fi
        cd scripts/test-chinese && ./test-chinese-simple.sh
        ;;
    3)
        print_info "Running simple test..."
        cd scripts && ./test.sh
        ;;
    4)
        print_info "Manual Setup Instructions:"
        echo
        echo "📋 Step 1: Start visibility server"
        echo "   Terminal 1: node scripts/test-visibility-server.js"
        echo
        echo "📋 Step 2: Start markdown server"
        echo "   Terminal 2: npm start -- s-md-visible \\"
        echo "               --file ./scripts/example.md \\"
        echo "               --sharing-name demo-doc \\"
        echo "               --checking-url http://localhost:3001/api/check-visibility \\"
        echo "               --port 3000"
        echo
        echo "📋 Step 3: Open browser"
        echo "   http://localhost:3000/stateful-md/demo-doc"
        echo
        echo "📋 Step 4: Test visibility control"
        echo "   curl -X POST http://localhost:3001/api/toggle-visibility"
        echo
        print_success "Manual setup instructions displayed"
        ;;
    *)
        print_error "Invalid option. Please select 1-4."
        exit 1
        ;;
esac
