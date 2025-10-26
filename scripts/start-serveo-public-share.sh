#!/bin/bash

# Stateful Markdown - Serveo Public Share Orchestrator
# Main script to start public markdown sharing via SSH tunnels

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Global variables
TASK_PORT="$1"
MD_FILE_PATH="$2"
SHARING_NAME="$3"
CHECKING_PORT="$4"
CHECKING_URL_TIMEOUT_SECONDS="${5:-2}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TUNNEL_MANAGER="$SCRIPT_DIR/serveo-tunnel-manager.sh"

# Process IDs for cleanup
VISIBILITY_SERVER_PID=""
MARKDOWN_SERVER_PID=""
MARKDOWN_TUNNEL_PID=""
VISIBILITY_TUNNEL_PID=""

# Public URLs
MARKDOWN_PUBLIC_URL=""
VISIBILITY_PUBLIC_URL=""

# Log functions
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] SERVEO:${NC} $1"
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

log_info() {
    echo -e "${CYAN}[$(date '+%H:%M:%S')] INFO:${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[$(date '+%H:%M:%S')] STEP:${NC} $1"
}

# Function to cleanup processes on ports and related services
cleanup_ports() {
    local task_port="$1"
    local checking_port="$2"

    log_step "Cleaning up any existing processes on ports $task_port and $checking_port..."

    # Kill any existing Serveo tunnels
    local serveo_pids=$(pgrep -f "serveo.net" 2>/dev/null || true)
    if [ -n "$serveo_pids" ]; then
        log_info "Killing existing Serveo tunnels: $serveo_pids"
        echo "$serveo_pids" | xargs kill -TERM 2>/dev/null || true
        sleep 2
    fi

    # Kill any existing stateful-md processes
    local stateful_pids=$(pgrep -f "stateful-md.*s-md-visible" 2>/dev/null || true)
    if [ -n "$stateful_pids" ]; then
        log_info "Killing existing stateful-md processes: $stateful_pids"
        echo "$stateful_pids" | xargs kill -TERM 2>/dev/null || true
        sleep 2
    fi

    # Kill any existing test-visibility-server processes
    local visibility_pids=$(pgrep -f "test-visibility-server" 2>/dev/null || true)
    if [ -n "$visibility_pids" ]; then
        log_info "Killing existing visibility server processes: $visibility_pids"
        echo "$visibility_pids" | xargs kill -TERM 2>/dev/null || true
        sleep 2
    fi

    # Kill processes using task port
    local task_pids=$(lsof -ti :$task_port 2>/dev/null || true)
    if [ -n "$task_pids" ]; then
        log_info "Killing processes on port $task_port: $task_pids"
        echo "$task_pids" | xargs kill -TERM 2>/dev/null || true
        sleep 2
        # Force kill if still running
        local remaining_pids=$(lsof -ti :$task_port 2>/dev/null || true)
        if [ -n "$remaining_pids" ]; then
            log_warning "Force killing remaining processes on port $task_port: $remaining_pids"
            echo "$remaining_pids" | xargs kill -KILL 2>/dev/null || true
        fi
    fi

    # Kill processes using checking port
    local checking_pids=$(lsof -ti :$checking_port 2>/dev/null || true)
    if [ -n "$checking_pids" ]; then
        log_info "Killing processes on port $checking_port: $checking_pids"
        echo "$checking_pids" | xargs kill -TERM 2>/dev/null || true
        sleep 2
        # Force kill if still running
        local remaining_pids=$(lsof -ti :$checking_port 2>/dev/null || true)
        if [ -n "$remaining_pids" ]; then
            log_warning "Force killing remaining processes on port $checking_port: $remaining_pids"
            echo "$remaining_pids" | xargs kill -KILL 2>/dev/null || true
        fi
    fi

    # Clean up any leftover tunnel manager processes
    local tunnel_pids=$(pgrep -f "serveo-tunnel-manager" 2>/dev/null || true)
    if [ -n "$tunnel_pids" ]; then
        log_info "Killing tunnel manager processes: $tunnel_pids"
        echo "$tunnel_pids" | xargs kill -TERM 2>/dev/null || true
    fi

    # Wait a moment for ports to be freed
    sleep 2

    log_success "Port and process cleanup completed"
}

# Function to validate inputs
validate_inputs() {
    log_step "Validating inputs..."

    # Check if all required parameters are provided
    if [ $# -lt 4 ] || [ $# -gt 5 ]; then
        log_error "Usage: $0 <task-port> <md-file-path> <sharing-name> <checking-port> [checking-url-timeout-seconds]"
        log_error "Example: $0 3000 ./my-doc.md my-public-doc 3001"
        log_error "Example with timeout: $0 3000 ./my-doc.md my-public-doc 3001 10"
        exit 1
    fi

    # Validate port numbers
    if ! [[ "$TASK_PORT" =~ ^[0-9]+$ ]] || [ "$TASK_PORT" -lt 1024 ] || [ "$TASK_PORT" -gt 65535 ]; then
        log_error "Invalid task port: $TASK_PORT (must be 1024-65535)"
        exit 1
    fi

    if ! [[ "$CHECKING_PORT" =~ ^[0-9]+$ ]] || [ "$CHECKING_PORT" -lt 1024 ] || [ "$CHECKING_PORT" -gt 65535 ]; then
        log_error "Invalid checking port: $CHECKING_PORT (must be 1024-65535)"
        exit 1
    fi

    # Check if ports are different
    if [ "$TASK_PORT" = "$CHECKING_PORT" ]; then
        log_error "Task port and checking port must be different"
        exit 1
    fi

    # Validate timeout parameter
    if ! [[ "$CHECKING_URL_TIMEOUT_SECONDS" =~ ^[0-9]+$ ]] || [ "$CHECKING_URL_TIMEOUT_SECONDS" -lt 1 ] || [ "$CHECKING_URL_TIMEOUT_SECONDS" -gt 30 ]; then
        log_error "Invalid checking URL timeout: $CHECKING_URL_TIMEOUT_SECONDS (must be 1-30 seconds)"
        exit 1
    fi

    # Check if markdown file exists
    if [ ! -f "$MD_FILE_PATH" ]; then
        log_error "Markdown file not found: $MD_FILE_PATH"
        exit 1
    fi

    # Validate sharing name
    if ! [[ "$SHARING_NAME" =~ ^[a-zA-Z0-9_-]+$ ]]; then
        log_error "Invalid sharing name: $SHARING_NAME (only letters, numbers, hyphens, and underscores allowed)"
        exit 1
    fi

    # Check if tunnel manager exists
    if [ ! -f "$TUNNEL_MANAGER" ]; then
        log_error "Tunnel manager script not found: $TUNNEL_MANAGER"
        exit 1
    fi

    # Clean up any existing processes on the required ports
    cleanup_ports "$TASK_PORT" "$CHECKING_PORT"

    log_success "Input validation completed"
}

# Function to check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."

    # Check if Node.js is available
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js not found. Please install Node.js."
        exit 1
    fi

    # Check if npm is available
    if ! command -v npm >/dev/null 2>&1; then
        log_error "npm not found. Please install npm."
        exit 1
    fi

    # Check if SSH is available
    if ! command -v ssh >/dev/null 2>&1; then
        log_error "SSH not found. Please install OpenSSH client."
        exit 1
    fi

    # Check if curl is available (for testing)
    if ! command -v curl >/dev/null 2>&1; then
        log_warning "curl not found. Tunnel testing will be limited."
    fi

    # Check if the project is built
    if [ ! -d "$PROJECT_ROOT/dist" ]; then
        log_info "Project not built. Building now..."
        cd "$PROJECT_ROOT"
        npm run build || {
            log_error "Failed to build project"
            exit 1
        }
    fi

    log_success "Prerequisites check completed"
}

# Function to start visibility server
start_visibility_server() {
    log_step "Starting visibility server on port $CHECKING_PORT..."

    cd "$PROJECT_ROOT"
    node scripts/test-visibility-server.js --port "$CHECKING_PORT" > /tmp/visibility-server.log 2>&1 &
    VISIBILITY_SERVER_PID=$!

    # Wait for server to start
    local retry_count=0
    while [ $retry_count -lt 10 ]; do
        if curl -s "http://localhost:$CHECKING_PORT/api/check-visibility" >/dev/null 2>&1; then
            log_success "Visibility server started (PID: $VISIBILITY_SERVER_PID)"
            return 0
        fi
        sleep 1
        retry_count=$((retry_count + 1))
    done

    log_error "Failed to start visibility server"
    return 1
}

# Function to start markdown server with public URLs directly
start_markdown_server_with_public_urls() {
    log_step "Starting markdown server with public URLs on port $TASK_PORT..."

    cd "$PROJECT_ROOT"

    # Use the public visibility URL directly
    local public_checking_url="$VISIBILITY_PUBLIC_URL/api/check-visibility"
    log_info "Using public visibility URL: $public_checking_url"

    npm start -- s-md-visible \
        --file "$MD_FILE_PATH" \
        --sharing-name "$SHARING_NAME" \
        --checking-url "$public_checking_url" \
        --port "$TASK_PORT" \
        --checking-url-timeout "$CHECKING_URL_TIMEOUT_SECONDS" \
        --skip-url-validation > /tmp/markdown-server-public.log 2>&1 &

    MARKDOWN_SERVER_PID=$!

    # Wait for server to start
    local retry_count=0
    while [ $retry_count -lt 15 ]; do
        if curl -s "http://localhost:$TASK_PORT/health" >/dev/null 2>&1; then
            log_success "Markdown server started with public URLs (PID: $MARKDOWN_SERVER_PID)"
            return 0
        fi
        sleep 1
        retry_count=$((retry_count + 1))
        log_info "Waiting for markdown server to be ready... (attempt $retry_count/15)"
    done

    log_error "Failed to start markdown server with public URLs"
    if [ -f /tmp/markdown-server-public.log ]; then
        log_error "Server log contents:"
        tail -20 /tmp/markdown-server-public.log >&2
    fi
    return 1
}

# Function to create SSH tunnels
create_tunnels() {
    log_step "Creating SSH tunnels via Serveo..."
    log_info "Note: Tunnels are created first, then servers will be started to bind to the ports"

    # Start markdown server tunnel
    log_info "Creating tunnel for markdown server (port $TASK_PORT)..."
    "$TUNNEL_MANAGER" create "$TASK_PORT" "markdown" > /tmp/markdown-tunnel.log 2>&1 &
    MARKDOWN_TUNNEL_PID=$!

    # Start visibility server tunnel in parallel
    log_info "Creating tunnel for visibility server (port $CHECKING_PORT)..."
    "$TUNNEL_MANAGER" create "$CHECKING_PORT" "visibility" > /tmp/visibility-tunnel.log 2>&1 &
    VISIBILITY_TUNNEL_PID=$!

    # Wait longer for both tunnels to establish
    log_info "Waiting for tunnels to establish (this may take 30-60 seconds)..."
    sleep 10

    # Check markdown tunnel
    local retry_count=0
    while [ $retry_count -lt 6 ]; do  # 60 seconds total
        if [ -f /tmp/markdown-tunnel.log ]; then
            MARKDOWN_PUBLIC_URL=$(grep "PUBLIC_URL=" /tmp/markdown-tunnel.log | cut -d'=' -f2 | head -1)
            if [ -n "$MARKDOWN_PUBLIC_URL" ]; then
                log_success "Markdown tunnel created: $MARKDOWN_PUBLIC_URL"
                break
            fi
        fi
        sleep 10
        retry_count=$((retry_count + 1))
        log_info "Still waiting for markdown tunnel... ($((retry_count * 10))s elapsed)"
    done

    if [ -z "$MARKDOWN_PUBLIC_URL" ]; then
        log_error "Failed to get markdown tunnel URL after 60 seconds"
        log_error "Markdown tunnel log contents:"
        cat /tmp/markdown-tunnel.log 2>/dev/null || echo "No log file found"
        return 1
    fi

    # Check visibility tunnel
    retry_count=0
    while [ $retry_count -lt 6 ]; do  # 60 seconds total
        if [ -f /tmp/visibility-tunnel.log ]; then
            VISIBILITY_PUBLIC_URL=$(grep "PUBLIC_URL=" /tmp/visibility-tunnel.log | cut -d'=' -f2 | head -1)
            if [ -n "$VISIBILITY_PUBLIC_URL" ]; then
                log_success "Visibility tunnel created: $VISIBILITY_PUBLIC_URL"
                break
            fi
        fi
        sleep 10
        retry_count=$((retry_count + 1))
        log_info "Still waiting for visibility tunnel... ($((retry_count * 10))s elapsed)"
    done

    if [ -z "$VISIBILITY_PUBLIC_URL" ]; then
        log_error "Failed to get visibility tunnel URL after 60 seconds"
        log_error "Visibility tunnel log contents:"
        cat /tmp/visibility-tunnel.log 2>/dev/null || echo "No log file found"
        return 1
    fi

    log_success "Both SSH tunnels established successfully"

    # Give tunnels additional time to fully establish before starting servers
    log_info "Allowing tunnels additional time to stabilize..."
    sleep 10

    return 0
}

# Function to verify public visibility API is accessible
verify_public_visibility_api() {
    log_step "Verifying public visibility API accessibility..."

    local public_checking_url="$VISIBILITY_PUBLIC_URL/api/check-visibility"
    log_info "Testing public visibility URL: $public_checking_url"

    local retry_count=0
    while [ $retry_count -lt 10 ]; do
        if curl -s --connect-timeout 10 --max-time 15 "$public_checking_url" >/dev/null 2>&1; then
            log_success "Public visibility API is accessible and ready"
            return 0
        fi
        retry_count=$((retry_count + 1))
        log_info "Waiting for public visibility API to be accessible... (attempt $retry_count/10)"
        sleep 3
    done

    log_warning "Public visibility API not yet accessible after 30 seconds"
    log_warning "Markdown server will start anyway - it may take time to connect"
    return 0
}

# Function to display public URLs
display_public_urls() {
    echo ""
    echo -e "${GREEN}🌐 PUBLIC SHARING ACTIVE${NC}"
    echo -e "${GREEN}========================${NC}"
    echo ""
    echo -e "${CYAN}📄 SHARE THIS URL:${NC}"
    echo -e "${YELLOW}   $MARKDOWN_PUBLIC_URL/stateful-md/$SHARING_NAME${NC}"
    echo ""
    echo -e "${CYAN}🔍 VISIBILITY CONTROL API:${NC}"
    echo -e "${YELLOW}   $VISIBILITY_PUBLIC_URL/api/check-visibility${NC}"
    echo ""
    echo -e "${CYAN}📊 TOGGLE VISIBILITY:${NC}"
    echo -e "${YELLOW}   curl -X POST $VISIBILITY_PUBLIC_URL/api/toggle-visibility${NC}"
    echo ""
    echo -e "${RED}⚠️  IMPORTANT SECURITY NOTICE:${NC}"
    echo -e "${RED}   • Your content is now PUBLIC on the internet${NC}"
    echo -e "${RED}   • Anyone with the URL can access it${NC}"
    echo -e "${RED}   • Visibility control is the only protection${NC}"
    echo ""
    echo -e "${BLUE}🔧 CONTROL:${NC}"
    echo -e "${BLUE}   • Press Ctrl+C to stop all services and close tunnels${NC}"
    echo -e "${BLUE}   • Tunnels will automatically close when this script exits${NC}"
    echo ""
    echo -e "${GREEN}✅ All services running. Monitoring...${NC}"
    echo ""
}

# Function to monitor services
monitor_services() {
    local check_count=0

    while true; do
        sleep 10
        check_count=$((check_count + 1))

        # Check visibility server
        if [ -n "$VISIBILITY_SERVER_PID" ] && ! kill -0 "$VISIBILITY_SERVER_PID" 2>/dev/null; then
            log_error "Visibility server died unexpectedly"
            log_error "Checking server logs for error details..."
            if [ -f /tmp/visibility-server.log ]; then
                log_error "Visibility server log (last 10 lines):"
                tail -10 /tmp/visibility-server.log >&2
            fi
            break
        fi

        # Check markdown server
        if [ -n "$MARKDOWN_SERVER_PID" ] && ! kill -0 "$MARKDOWN_SERVER_PID" 2>/dev/null; then
            log_error "Markdown server died unexpectedly"
            log_error "Checking server logs for error details..."
            if [ -f /tmp/markdown-server-public.log ]; then
                log_error "Public markdown server log (last 10 lines):"
                tail -10 /tmp/markdown-server-public.log >&2
            elif [ -f /tmp/markdown-server.log ]; then
                log_error "Markdown server log (last 10 lines):"
                tail -10 /tmp/markdown-server.log >&2
            fi
            break
        fi

        # Check tunnels periodically
        if [ $((check_count % 6)) -eq 0 ]; then  # Every minute
            log_info "Health check: All services running (${check_count}0s elapsed)"

            # Test tunnel connectivity
            if ! curl -s --connect-timeout 5 "$MARKDOWN_PUBLIC_URL" >/dev/null 2>&1; then
                log_warning "Markdown tunnel may be having connectivity issues"
            fi
        fi
    done
}

# Function to cleanup all processes
cleanup_all() {
    echo ""
    log_step "Shutting down all services..."

    # Kill visibility server
    if [ -n "$VISIBILITY_SERVER_PID" ]; then
        log_info "Stopping visibility server (PID: $VISIBILITY_SERVER_PID)"
        kill "$VISIBILITY_SERVER_PID" 2>/dev/null || true
    fi

    # Kill markdown server
    if [ -n "$MARKDOWN_SERVER_PID" ]; then
        log_info "Stopping markdown server (PID: $MARKDOWN_SERVER_PID)"
        kill "$MARKDOWN_SERVER_PID" 2>/dev/null || true
    fi

    # Kill tunnel processes
    if [ -n "$MARKDOWN_TUNNEL_PID" ]; then
        log_info "Stopping markdown tunnel (PID: $MARKDOWN_TUNNEL_PID)"
        kill "$MARKDOWN_TUNNEL_PID" 2>/dev/null || true
    fi

    if [ -n "$VISIBILITY_TUNNEL_PID" ]; then
        log_info "Stopping visibility tunnel (PID: $VISIBILITY_TUNNEL_PID)"
        kill "$VISIBILITY_TUNNEL_PID" 2>/dev/null || true
    fi

    # Kill any remaining processes by name if PIDs failed
    log_info "Cleaning up any remaining related processes..."

    # Kill any remaining Serveo tunnels
    pkill -f "serveo.net" 2>/dev/null || true

    # Kill any remaining stateful-md processes
    pkill -f "stateful-md.*s-md-visible" 2>/dev/null || true

    # Kill any remaining test-visibility-server processes
    pkill -f "test-visibility-server.*--port.*$CHECKING_PORT" 2>/dev/null || true

    # Kill any remaining tunnel manager processes
    pkill -f "serveo-tunnel-manager" 2>/dev/null || true

    # Force cleanup of ports if still in use
    local remaining_task_pids=$(lsof -ti :$TASK_PORT 2>/dev/null || true)
    if [ -n "$remaining_task_pids" ]; then
        log_warning "Force killing remaining processes on port $TASK_PORT"
        echo "$remaining_task_pids" | xargs kill -KILL 2>/dev/null || true
    fi

    local remaining_checking_pids=$(lsof -ti :$CHECKING_PORT 2>/dev/null || true)
    if [ -n "$remaining_checking_pids" ]; then
        log_warning "Force killing remaining processes on port $CHECKING_PORT"
        echo "$remaining_checking_pids" | xargs kill -KILL 2>/dev/null || true
    fi

    # Preserve log files for debugging, just clean up serveo-logs
    rm -rf /tmp/serveo-logs/* 2>/dev/null || true

    # Show where logs are preserved
    log_info "Log files preserved for debugging:"
    log_info "  Visibility server: /tmp/visibility-server.log"
    log_info "  Markdown server: /tmp/markdown-server.log"
    log_info "  Markdown server (public): /tmp/markdown-server-public.log"

    # Wait a moment for processes to terminate
    sleep 2

    log_success "Cleanup completed"
    echo ""
    echo -e "${GREEN}🔒 Public sharing stopped. Your content is no longer accessible.${NC}"
    echo ""
}

# Function to show startup banner
show_banner() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                                                          ║"
    echo "║             🌐 STATEFUL MARKDOWN PUBLIC SHARE            ║"
    echo "║                                                          ║"
    echo "║         Share your markdown content on the internet      ║"
    echo "║              via secure SSH tunnels (Serveo)            ║"
    echo "║                                                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo -e "${CYAN}Configuration:${NC}"
    echo -e "${CYAN}  📄 File:${NC} $MD_FILE_PATH"
    echo -e "${CYAN}  🏷️  Name:${NC} $SHARING_NAME"
    echo -e "${CYAN}  🚀 Markdown Port:${NC} $TASK_PORT"
    echo -e "${CYAN}  🔍 Visibility Port:${NC} $CHECKING_PORT"
    echo ""
}

# Main execution
main() {
    # Show banner
    show_banner

    # Set up cleanup trap
    trap cleanup_all EXIT INT TERM

    # Validate inputs
    validate_inputs "$@"

    # Check prerequisites
    check_prerequisites

    # IMPORTANT: Create SSH tunnels FIRST, then start servers
    # This allows Serveo to establish tunnels even before services are running
    create_tunnels || exit 1

    # Now start servers directly with public URLs (no restart needed)
    start_visibility_server || exit 1

    # Verify public API is accessible before starting markdown server
    verify_public_visibility_api

    start_markdown_server_with_public_urls || exit 1

    # Display public URLs to user
    display_public_urls

    # Monitor services
    monitor_services
}

# Check if script is being sourced or executed
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
