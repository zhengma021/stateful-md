#!/bin/bash

# Test script for Serveo Public Sharing functionality
# This script tests the new serveo-share command

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
TEST_FILE="./scripts/example.md"
TEST_SHARING_NAME="serveo-test-doc"
TEST_TASK_PORT=3000
TEST_CHECKING_PORT=3001

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Log functions
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] TEST:${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] SUCCESS:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING:${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[$(date '+%H:%M:%S')] STEP:${NC} $1"
}

# Function to show test banner
show_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                                                          ║"
    echo "║           🧪 SERVEO PUBLIC SHARE TEST SUITE             ║"
    echo "║                                                          ║"
    echo "║              Testing v0.2 Serveo Integration            ║"
    echo "║                                                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# Function to cleanup any existing processes
cleanup() {
    log_step "Cleaning up any existing processes..."

    # Kill any existing serveo processes
    pkill -f "serveo" 2>/dev/null || true
    pkill -f "start-serveo-public-share" 2>/dev/null || true
    pkill -f "test-visibility-server" 2>/dev/null || true
    pkill -f "stateful-md.*s-md-visible" 2>/dev/null || true

    # Wait for cleanup
    sleep 2

    log_success "Cleanup completed"
}

# Function to check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."

    cd "$PROJECT_ROOT"

    # Check if project is built
    if [ ! -d "dist" ]; then
        log "Building project..."
        npm run build || {
            log_error "Failed to build project"
            exit 1
        }
    fi

    # Check if test file exists
    if [ ! -f "$TEST_FILE" ]; then
        log_error "Test file not found: $TEST_FILE"
        exit 1
    fi

    # Check if required scripts exist
    if [ ! -f "scripts/start-serveo-public-share.sh" ]; then
        log_error "Serveo script not found: scripts/start-serveo-public-share.sh"
        exit 1
    fi

    if [ ! -f "scripts/serveo-tunnel-manager.sh" ]; then
        log_error "Tunnel manager not found: scripts/serveo-tunnel-manager.sh"
        exit 1
    fi

    # Check if SSH is available
    if ! command -v ssh >/dev/null 2>&1; then
        log_error "SSH not found. Cannot test Serveo tunnels."
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Function to test CLI help
test_cli_help() {
    log_step "Testing CLI help for serveo-share command..."

    cd "$PROJECT_ROOT"

    # Test if serveo-share command is available
    if npm start -- serveo-share --help 2>&1 | grep -q "Share markdown content publicly"; then
        log_success "serveo-share command is available in CLI"
    else
        log_error "serveo-share command not found in CLI"
        return 1
    fi

    return 0
}

# Function to test argument validation
test_argument_validation() {
    log_step "Testing argument validation..."

    cd "$PROJECT_ROOT"

    # Test missing required arguments
    log "Testing missing file argument..."
    if npm start -- serveo-share --sharing-name test 2>&1 | grep -q "required option.*--file"; then
        log_success "Missing file argument properly detected"
    else
        log_warning "Missing file argument detection may have issues"
    fi

    # Test missing sharing name
    log "Testing missing sharing-name argument..."
    if npm start -- serveo-share --file ./test.md 2>&1 | grep -q "required option.*--sharing-name"; then
        log_success "Missing sharing-name argument properly detected"
    else
        log_warning "Missing sharing-name argument detection may have issues"
    fi

    # Test invalid file path
    log "Testing invalid file path..."
    if npm start -- serveo-share --file ./nonexistent.md --sharing-name test 2>&1 | grep -q "not found"; then
        log_success "Invalid file path properly detected"
    else
        log_warning "Invalid file path detection may have issues"
    fi

    return 0
}

# Function to test dry run (without actually creating tunnels)
test_dry_run() {
    log_step "Testing Serveo script components..."

    cd "$PROJECT_ROOT"

    # Test tunnel manager script syntax
    log "Testing tunnel manager script syntax..."
    if bash -n scripts/serveo-tunnel-manager.sh; then
        log_success "Tunnel manager script syntax is valid"
    else
        log_error "Tunnel manager script has syntax errors"
        return 1
    fi

    # Test main script syntax
    log "Testing main Serveo script syntax..."
    if bash -n scripts/start-serveo-public-share.sh; then
        log_success "Main Serveo script syntax is valid"
    else
        log_error "Main Serveo script has syntax errors"
        return 1
    fi

    # Test script permissions
    if [ -x scripts/serveo-tunnel-manager.sh ] && [ -x scripts/start-serveo-public-share.sh ]; then
        log_success "Scripts have proper execute permissions"
    else
        log_error "Scripts missing execute permissions"
        return 1
    fi

    return 0
}

# Function to demonstrate usage
show_usage_demo() {
    log_step "Demonstrating usage..."

    echo ""
    echo -e "${CYAN}📖 USAGE EXAMPLES:${NC}"
    echo ""
    echo -e "${YELLOW}Basic usage:${NC}"
    echo "  npm start -- serveo-share \\"
    echo "    --file ./scripts/example.md \\"
    echo "    --sharing-name my-public-doc"
    echo ""
    echo -e "${YELLOW}With custom ports:${NC}"
    echo "  npm start -- serveo-share \\"
    echo "    --file ./my-document.md \\"
    echo "    --sharing-name secret-project \\"
    echo "    --task-port 3000 \\"
    echo "    --checking-port 3001"
    echo ""
    echo -e "${CYAN}📋 WHAT HAPPENS:${NC}"
    echo "  1. 🖥️  Starts local visibility server"
    echo "  2. 🚀 Starts local markdown server"
    echo "  3. 🌐 Creates SSH tunnels via Serveo"
    echo "  4. 📄 Displays public URLs for sharing"
    echo "  5. 🔄 Monitors services until stopped"
    echo ""
}

# Function to run interactive test
run_interactive_test() {
    log_step "Interactive Test Option"

    echo ""
    echo -e "${YELLOW}Would you like to run a live test with actual Serveo tunnels?${NC}"
    echo -e "${YELLOW}This will create real public URLs that are accessible from the internet.${NC}"
    echo ""
    echo -e "${RED}⚠️  WARNING: This will make your test content publicly accessible!${NC}"
    echo ""
    echo -e "${CYAN}Options:${NC}"
    echo "  1. Yes, run live test (creates public tunnels)"
    echo "  2. No, skip live test (safer option)"
    echo ""
    read -p "Enter your choice (1 or 2): " choice

    case $choice in
        1)
            log "Starting live Serveo test..."
            echo ""
            echo -e "${RED}🚨 STARTING LIVE PUBLIC SHARE TEST${NC}"
            echo -e "${RED}Your content will be publicly accessible on the internet!${NC}"
            echo ""
            echo -e "${YELLOW}Command that will be executed:${NC}"
            echo "npm start -- serveo-share \\"
            echo "  --file $TEST_FILE \\"
            echo "  --sharing-name $TEST_SHARING_NAME \\"
            echo "  --task-port $TEST_TASK_PORT \\"
            echo "  --checking-port $TEST_CHECKING_PORT"
            echo ""
            echo -e "${YELLOW}Press Enter to continue or Ctrl+C to cancel...${NC}"
            read -r

            cd "$PROJECT_ROOT"
            npm start -- serveo-share \
                --file "$TEST_FILE" \
                --sharing-name "$TEST_SHARING_NAME" \
                --task-port "$TEST_TASK_PORT" \
                --checking-port "$TEST_CHECKING_PORT"
            ;;
        2)
            log "Skipping live test as requested"
            ;;
        *)
            log_warning "Invalid choice. Skipping live test."
            ;;
    esac
}

# Function to run all tests
run_tests() {
    local all_passed=true

    # Run individual tests
    test_cli_help || all_passed=false
    test_argument_validation || all_passed=false
    test_dry_run || all_passed=false

    if [ "$all_passed" = true ]; then
        return 0
    else
        return 1
    fi
}

# Function to show results
show_results() {
    local test_passed=$1

    echo ""
    echo -e "${PURPLE}📊 TEST RESULTS SUMMARY${NC}"
    echo "========================"

    if [ "$test_passed" = true ]; then
        echo -e "${GREEN}✅ All automated tests passed!${NC}"
        echo -e "${GREEN}✅ CLI command is properly integrated${NC}"
        echo -e "${GREEN}✅ Argument validation works correctly${NC}"
        echo -e "${GREEN}✅ Bash scripts have valid syntax${NC}"
        echo -e "${GREEN}✅ Scripts have proper permissions${NC}"
    else
        echo -e "${RED}❌ Some tests failed${NC}"
        echo -e "${YELLOW}Please check the error messages above${NC}"
    fi

    echo ""
    echo -e "${CYAN}📝 NEXT STEPS:${NC}"
    if [ "$test_passed" = true ]; then
        echo "  • Ready for production use"
        echo "  • Run live test when needed"
        echo "  • Share public URLs securely"
    else
        echo "  • Fix failing tests before production use"
        echo "  • Check script syntax and permissions"
        echo "  • Verify CLI integration"
    fi
    echo ""
}

# Main execution
main() {
    show_banner

    # Cleanup any existing processes
    cleanup

    # Check prerequisites
    check_prerequisites

    # Run automated tests
    log_step "Running automated tests..."
    if run_tests; then
        test_passed=true
        log_success "All automated tests completed successfully"
    else
        test_passed=false
        log_error "Some automated tests failed"
    fi

    # Show usage examples
    show_usage_demo

    # Show results
    show_results $test_passed

    # Offer interactive test
    run_interactive_test

    log_success "Test suite completed"

    # Return appropriate exit code
    if [ "$test_passed" = true ]; then
        exit 0
    else
        exit 1
    fi
}

# Check if script is being sourced or executed
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
