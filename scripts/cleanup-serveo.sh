#!/bin/bash

# Serveo Cleanup Script
# Kills all Serveo tunnels and stateful-md related processes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log functions
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] CLEANUP:${NC} $1"
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

# Function to kill processes safely
kill_processes() {
    local pids="$1"
    local description="$2"

    if [ -n "$pids" ]; then
        log "Killing $description: $pids"
        # Try TERM first
        echo "$pids" | xargs kill -TERM 2>/dev/null || true
        sleep 2

        # Check if any are still running and force kill
        local remaining=""
        for pid in $pids; do
            if kill -0 "$pid" 2>/dev/null; then
                remaining="$remaining $pid"
            fi
        done

        if [ -n "$remaining" ]; then
            log_warning "Force killing remaining $description:$remaining"
            echo "$remaining" | xargs kill -KILL 2>/dev/null || true
        fi
    fi
}

# Main cleanup function
cleanup_all() {
    log "🧹 Starting comprehensive Serveo and stateful-md cleanup..."
    echo ""

    # Kill Serveo tunnel processes
    log "Cleaning up Serveo tunnels..."
    local serveo_pids=$(pgrep -f "ssh.*serveo.net" 2>/dev/null || true)
    kill_processes "$serveo_pids" "Serveo tunnel processes"

    # Kill stateful-md processes
    log "Cleaning up stateful-md processes..."
    local stateful_pids=$(pgrep -f "stateful-md.*s-md-visible" 2>/dev/null || true)
    kill_processes "$stateful_pids" "stateful-md processes"

    # Kill test-visibility-server processes
    log "Cleaning up visibility server processes..."
    local visibility_pids=$(pgrep -f "test-visibility-server" 2>/dev/null || true)
    kill_processes "$visibility_pids" "visibility server processes"

    # Kill tunnel manager processes
    log "Cleaning up tunnel manager processes..."
    local tunnel_pids=$(pgrep -f "serveo-tunnel-manager" 2>/dev/null || true)
    kill_processes "$tunnel_pids" "tunnel manager processes"

    # Kill main orchestrator processes
    log "Cleaning up orchestrator processes..."
    local orchestrator_pids=$(pgrep -f "start-serveo-public-share" 2>/dev/null || true)
    kill_processes "$orchestrator_pids" "orchestrator processes"

    # Clean up common ports used by the application
    log "Cleaning up processes on common ports..."
    for port in 3000 3001 3002 8080 8081; do
        local port_pids=$(lsof -ti :$port 2>/dev/null || true)
        if [ -n "$port_pids" ]; then
            kill_processes "$port_pids" "processes on port $port"
        fi
    done

    # Additional cleanup with pkill for any missed processes
    log "Final cleanup sweep..."
    pkill -f "serveo" 2>/dev/null || true
    pkill -f "stateful-md" 2>/dev/null || true

    sleep 2

    # Clean up temporary files
    log "Cleaning up temporary files..."
    rm -f /tmp/visibility-server.log
    rm -f /tmp/markdown-server.log
    rm -f /tmp/markdown-server-public.log
    rm -f /tmp/markdown-tunnel.log
    rm -f /tmp/visibility-tunnel.log
    rm -rf /tmp/serveo-logs/* 2>/dev/null || true

    log_success "Cleanup completed!"
    echo ""
    echo -e "${GREEN}✅ All Serveo tunnels and stateful-md processes have been terminated${NC}"
    echo -e "${GREEN}✅ Temporary files cleaned up${NC}"
    echo -e "${GREEN}✅ Ports should now be available${NC}"
    echo ""
}

# Function to show what would be cleaned up (dry run)
show_cleanup_preview() {
    echo -e "${YELLOW}🔍 CLEANUP PREVIEW - What would be cleaned up:${NC}"
    echo ""

    # Show Serveo processes
    local serveo_pids=$(pgrep -f "ssh.*serveo.net" 2>/dev/null || true)
    if [ -n "$serveo_pids" ]; then
        echo -e "${YELLOW}Serveo tunnels:${NC}"
        ps -p $serveo_pids -o pid,command 2>/dev/null || true
        echo ""
    fi

    # Show stateful-md processes
    local stateful_pids=$(pgrep -f "stateful-md" 2>/dev/null || true)
    if [ -n "$stateful_pids" ]; then
        echo -e "${YELLOW}Stateful-md processes:${NC}"
        ps -p $stateful_pids -o pid,command 2>/dev/null || true
        echo ""
    fi

    # Show visibility server processes
    local visibility_pids=$(pgrep -f "test-visibility-server" 2>/dev/null || true)
    if [ -n "$visibility_pids" ]; then
        echo -e "${YELLOW}Visibility server processes:${NC}"
        ps -p $visibility_pids -o pid,command 2>/dev/null || true
        echo ""
    fi

    # Show port usage
    echo -e "${YELLOW}Port usage (common ports):${NC}"
    for port in 3000 3001 3002 8080 8081; do
        local port_info=$(lsof -i :$port 2>/dev/null || true)
        if [ -n "$port_info" ]; then
            echo "Port $port:"
            echo "$port_info"
            echo ""
        fi
    done

    # Show temporary files
    echo -e "${YELLOW}Temporary files that would be cleaned:${NC}"
    ls -la /tmp/*server*.log /tmp/*tunnel*.log /tmp/serveo-logs/ 2>/dev/null || echo "No temporary files found"
    echo ""
}

# Show usage information
show_usage() {
    echo "Serveo Cleanup Script"
    echo "====================="
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --preview, -p    Show what would be cleaned up (dry run)"
    echo "  --force, -f      Skip confirmation and clean immediately"
    echo "  --help, -h       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0              # Interactive cleanup with confirmation"
    echo "  $0 --preview    # Show what would be cleaned"
    echo "  $0 --force      # Clean immediately without confirmation"
    echo ""
}

# Main execution
main() {
    case "${1:-}" in
        "--preview"|"-p")
            show_cleanup_preview
            ;;
        "--force"|"-f")
            cleanup_all
            ;;
        "--help"|"-h")
            show_usage
            ;;
        "")
            # Interactive mode with confirmation
            show_cleanup_preview
            echo -e "${YELLOW}Do you want to proceed with cleanup? (y/n)${NC}"
            read -r response
            if [ "$response" = "y" ] || [ "$response" = "Y" ] || [ "$response" = "yes" ]; then
                cleanup_all
            else
                log "Cleanup cancelled by user"
            fi
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Check if script is being sourced or executed
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
