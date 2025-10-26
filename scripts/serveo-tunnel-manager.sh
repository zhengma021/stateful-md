#!/bin/bash

# Serveo SSH Tunnel Manager
# Handles individual SSH tunnel creation, monitoring, and URL extraction

set -e

# Configuration
SERVEO_HOST="serveo.net"
TUNNEL_TIMEOUT=30
MAX_RETRIES=3
TUNNEL_LOG_DIR="/tmp/serveo-logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Global variables
TUNNEL_PID=""
PUBLIC_URL=""
TUNNEL_DOMAIN=""

# Create log directory
mkdir -p "$TUNNEL_LOG_DIR"

# Function to log messages
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] TUNNEL:${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Function to check if SSH is available
check_ssh() {
    if ! command -v ssh >/dev/null 2>&1; then
        log_error "SSH command not found. Please install OpenSSH client."
        return 1
    fi
    return 0
}

# Function to check internet connectivity
check_connectivity() {
    log "Checking internet connectivity..."
    if ! ping -c 1 "$SERVEO_HOST" >/dev/null 2>&1; then
        log_error "Cannot reach $SERVEO_HOST. Check your internet connection."
        return 1
    fi
    log_success "Internet connectivity confirmed"
    return 0
}

# Function to extract domain from SSH output
extract_domain_from_output() {
    local output="$1"
    # Look for patterns like: "Forwarding HTTP traffic from https://abc123.serveo.net"
    # Also look for other common Serveo output patterns
    local domain=$(echo "$output" | grep -oE 'https://[a-zA-Z0-9.-]+\.serveo\.net' | head -1 | sed 's|https://||')

    # If the first pattern doesn't work, try alternative patterns
    if [ -z "$domain" ]; then
        domain=$(echo "$output" | grep -oE '[a-zA-Z0-9.-]+\.serveo\.net' | head -1)
    fi

    echo "$domain"
}

# Function to create SSH tunnel
create_tunnel() {
    local local_port="$1"
    local tunnel_name="$2"
    local log_file="$TUNNEL_LOG_DIR/tunnel-${tunnel_name}-${local_port}.log"

    log "Creating SSH tunnel for port $local_port (name: $tunnel_name)..."

    # Remove old log file
    rm -f "$log_file"

    # Start SSH tunnel in background and capture output
    # Note: Serveo will establish tunnel even if no service is running on the port yet
    ssh -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        -o LogLevel=ERROR \
        -o ConnectTimeout=15 \
        -o ServerAliveInterval=60 \
        -o ServerAliveCountMax=3 \
        -o ExitOnForwardFailure=no \
        -R "80:localhost:$local_port" \
        "$SERVEO_HOST" \
        > "$log_file" 2>&1 &

    TUNNEL_PID=$!
    log "SSH tunnel started with PID: $TUNNEL_PID"

    # Wait for tunnel to establish and extract domain
    local retry_count=0
    local domain=""

    while [ $retry_count -lt $TUNNEL_TIMEOUT ] && [ -z "$domain" ]; do
        sleep 1
        retry_count=$((retry_count + 1))

        # Check if SSH process is still running
        if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
            log_error "SSH tunnel process died unexpectedly"
            cat "$log_file" >&2
            return 1
        fi

        # Try to extract domain from log file
        if [ -f "$log_file" ]; then
            domain=$(extract_domain_from_output "$(cat "$log_file")")
            if [ -n "$domain" ]; then
                TUNNEL_DOMAIN="$domain"
                PUBLIC_URL="https://$domain"
                log_success "Tunnel established: $PUBLIC_URL (port $local_port ready for service)"
                return 0
            fi
        fi

        # Show progress
        if [ $((retry_count % 5)) -eq 0 ]; then
            log "Waiting for tunnel to establish... ($retry_count/${TUNNEL_TIMEOUT}s) - No service needed yet"
        fi
    done

    # Timeout reached
    log_error "Timeout waiting for tunnel to establish"
    if [ -f "$log_file" ]; then
        log_error "SSH output:"
        cat "$log_file" >&2
    fi

    # Kill the SSH process
    if kill -0 "$TUNNEL_PID" 2>/dev/null; then
        kill "$TUNNEL_PID" 2>/dev/null || true
    fi

    return 1
}

# Function to monitor tunnel health
monitor_tunnel() {
    if [ -z "$TUNNEL_PID" ]; then
        return 1
    fi

    if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
        log_error "Tunnel process $TUNNEL_PID is no longer running"
        return 1
    fi

    return 0
}

# Function to test tunnel connectivity
test_tunnel() {
    if [ -z "$PUBLIC_URL" ]; then
        log_error "No public URL available to test"
        return 1
    fi

    log "Testing tunnel connectivity: $PUBLIC_URL"

    # Test with a simple HTTP request
    if curl -s --connect-timeout 10 --max-time 20 "$PUBLIC_URL" >/dev/null 2>&1; then
        log_success "Tunnel is responding correctly"
        return 0
    else
        log_warning "Tunnel test failed - this is normal if no service is running on the port yet"
        return 1
    fi
}

# Function to cleanup tunnel
cleanup_tunnel() {
    if [ -n "$TUNNEL_PID" ]; then
        log "Cleaning up tunnel (PID: $TUNNEL_PID)..."
        if kill -0 "$TUNNEL_PID" 2>/dev/null; then
            kill "$TUNNEL_PID" 2>/dev/null || true
            sleep 2
            # Force kill if still running
            if kill -0 "$TUNNEL_PID" 2>/dev/null; then
                kill -9 "$TUNNEL_PID" 2>/dev/null || true
            fi
        fi
        log_success "Tunnel cleanup completed"
    fi

    # Clean up log files older than 1 hour
    find "$TUNNEL_LOG_DIR" -name "tunnel-*.log" -mmin +60 -delete 2>/dev/null || true
}

# Function to get tunnel info
get_tunnel_info() {
    echo "TUNNEL_PID=$TUNNEL_PID"
    echo "PUBLIC_URL=$PUBLIC_URL"
    echo "TUNNEL_DOMAIN=$TUNNEL_DOMAIN"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  create <local_port> <tunnel_name>  Create a new SSH tunnel"
    echo "  monitor                            Check tunnel health"
    echo "  test                              Test tunnel connectivity"
    echo "  cleanup                           Clean up tunnel and resources"
    echo "  info                              Show tunnel information"
    echo "  help                              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 create 3000 markdown-server"
    echo "  $0 monitor"
    echo "  $0 test"
    echo "  $0 cleanup"
}

# Trap to cleanup on exit
trap cleanup_tunnel EXIT INT TERM

# Main command handling
case "${1:-help}" in
    "create")
        if [ $# -ne 3 ]; then
            log_error "Usage: $0 create <local_port> <tunnel_name>"
            exit 1
        fi

        LOCAL_PORT="$2"
        TUNNEL_NAME="$3"

        # Validate port number
        if ! [[ "$LOCAL_PORT" =~ ^[0-9]+$ ]] || [ "$LOCAL_PORT" -lt 1 ] || [ "$LOCAL_PORT" -gt 65535 ]; then
            log_error "Invalid port number: $LOCAL_PORT"
            exit 1
        fi

        # Check prerequisites
        check_ssh || exit 1
        check_connectivity || exit 1

        # Create tunnel
        if create_tunnel "$LOCAL_PORT" "$TUNNEL_NAME"; then
            log_success "Tunnel created successfully"
            get_tunnel_info

            # Keep script running to maintain tunnel
            log "Tunnel is active. Press Ctrl+C to stop..."
            while monitor_tunnel; do
                sleep 5
            done
        else
            log_error "Failed to create tunnel"
            exit 1
        fi
        ;;

    "monitor")
        if monitor_tunnel; then
            log_success "Tunnel is healthy"
            exit 0
        else
            log_error "Tunnel is not healthy"
            exit 1
        fi
        ;;

    "test")
        if test_tunnel; then
            exit 0
        else
            exit 1
        fi
        ;;

    "cleanup")
        cleanup_tunnel
        ;;

    "info")
        get_tunnel_info
        ;;

    "help"|*)
        show_usage
        exit 0
        ;;
esac
