#!/bin/bash

#############################################
# Sentient Engine - Monitoring & Logs Script
#############################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PRODUCTION_HOST="${PRODUCTION_HOST:-}"
PRODUCTION_USER="${PRODUCTION_USER:-root}"
DEPLOY_DIR="${DEPLOY_DIR:-~/sentient-deploy}"

print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

print_header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo ""
}

check_connection() {
    if [ -z "$PRODUCTION_HOST" ]; then
        print_error "PRODUCTION_HOST not set"
        exit 1
    fi
}

show_service_status() {
    print_header "Service Status"

    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml ps"
}

show_resource_usage() {
    print_header "Resource Usage"

    print_info "Docker container stats:"
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}'"

    echo ""
    print_info "Disk usage:"
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "df -h /srv/sentient"

    echo ""
    print_info "Docker disk usage:"
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "docker system df"
}

show_logs() {
    print_header "Service Logs"

    echo "Select service:"
    echo "1) api-service"
    echo "2) orchestrator-service"
    echo "3) mqtt-gateway"
    echo "4) realtime-gateway"
    echo "5) sentient-ui"
    echo "6) postgres"
    echo "7) redis"
    echo "8) mqtt"
    echo "9) nginx"
    echo "10) All services"
    echo ""

    read -p "Select service: " -r choice

    local service=""
    case $choice in
        1) service="api-service" ;;
        2) service="orchestrator-service" ;;
        3) service="mqtt-gateway" ;;
        4) service="realtime-gateway" ;;
        5) service="sentient-ui" ;;
        6) service="postgres" ;;
        7) service="redis" ;;
        8) service="mqtt" ;;
        9) service="nginx" ;;
        10) service="" ;;
        *) print_error "Invalid choice"; return ;;
    esac

    read -p "Number of lines (default 100): " -r lines
    lines=${lines:-100}

    read -p "Follow logs? (y/n): " -r follow

    local cmd="cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml logs --tail=$lines"

    if [ -n "$service" ]; then
        cmd="$cmd $service"
    fi

    if [[ $follow =~ ^[Yy]$ ]]; then
        cmd="$cmd -f"
    fi

    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "$cmd"
}

show_health_checks() {
    print_header "Health Checks"

    print_info "Checking HTTP health endpoint..."
    if ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "curl -sf http://localhost/health" &> /dev/null; then
        print_success "HTTP health check passed"
    else
        print_error "HTTP health check failed"
    fi

    print_info "Checking API health endpoint..."
    if ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "curl -sf http://localhost/api/health" &> /dev/null; then
        print_success "API health check passed"
    else
        print_error "API health check failed"
    fi

    print_info "Checking database connection..."
    if ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "docker exec sentient_postgres pg_isready -U sentient" &> /dev/null; then
        print_success "Database is ready"
    else
        print_error "Database connection failed"
    fi

    print_info "Checking Redis connection..."
    if ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "docker exec sentient_redis redis-cli ping" | grep -q "PONG"; then
        print_success "Redis is responsive"
    else
        print_error "Redis connection failed"
    fi

    print_info "Checking MQTT broker..."
    if ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "timeout 2 mosquitto_sub -h localhost -p 1883 -t test -C 1" &> /dev/null; then
        print_success "MQTT broker is accessible"
    else
        print_warning "MQTT broker check inconclusive"
    fi
}

show_database_stats() {
    print_header "Database Statistics"

    print_info "Database size:"
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "docker exec sentient_postgres psql -U sentient -d sentient_prod -c '\
        SELECT pg_size_pretty(pg_database_size(current_database())) as size;'"

    echo ""
    print_info "Table sizes:"
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "docker exec sentient_postgres psql -U sentient -d sentient_prod -c '\
        SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'\''.'\''||tablename)) AS size \
        FROM pg_tables WHERE schemaname NOT IN ('\''pg_catalog'\'', '\''information_schema'\'') \
        ORDER BY pg_total_relation_size(schemaname||'\''.'\''||tablename) DESC LIMIT 10;'"

    echo ""
    print_info "Connection count:"
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "docker exec sentient_postgres psql -U sentient -d sentient_prod -c '\
        SELECT count(*) as connections FROM pg_stat_activity;'"
}

show_mqtt_stats() {
    print_header "MQTT Statistics"

    print_info "Getting MQTT broker stats..."
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "docker exec sentient_mqtt mosquitto_sub -h localhost -t '\$SYS/#' -C 10 -W 2 2>/dev/null || echo 'MQTT stats not available'"
}

show_recent_errors() {
    print_header "Recent Errors (Last Hour)"

    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml logs --since 1h 2>&1 | grep -i 'error\|exception\|fail' | tail -50"
}

interactive_dashboard() {
    while true; do
        clear
        print_header "Sentient Engine - Live Dashboard"

        show_service_status
        show_health_checks

        echo ""
        print_info "Press Ctrl+C to exit"
        sleep 5
    done
}

export_metrics() {
    print_header "Exporting Metrics"

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local output_file="sentient_metrics_$timestamp.txt"

    {
        echo "Sentient Engine Metrics Report"
        echo "Generated: $(date)"
        echo "Host: $PRODUCTION_HOST"
        echo ""
        echo "========== Service Status =========="
        ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml ps"
        echo ""
        echo "========== Resource Usage =========="
        ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "docker stats --no-stream"
        echo ""
        echo "========== Disk Usage =========="
        ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "df -h /srv/sentient"
        echo ""
        echo "========== Database Stats =========="
        ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "docker exec sentient_postgres psql -U sentient -d sentient_prod -c 'SELECT pg_size_pretty(pg_database_size(current_database()));'"
        echo ""
        echo "========== Recent Errors =========="
        ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml logs --since 1h 2>&1 | grep -i 'error' | tail -20"
    } > "$output_file"

    print_success "Metrics exported to: $output_file"
}

main_menu() {
    print_header "Sentient Engine - Monitoring & Logs"

    echo "1) Show service status"
    echo "2) Show resource usage"
    echo "3) View logs"
    echo "4) Run health checks"
    echo "5) Show database statistics"
    echo "6) Show MQTT statistics"
    echo "7) Show recent errors"
    echo "8) Live dashboard (auto-refresh)"
    echo "9) Export metrics report"
    echo "10) Exit"
    echo ""

    read -p "Select an option: " -r choice

    case $choice in
        1) show_service_status ;;
        2) show_resource_usage ;;
        3) show_logs ;;
        4) show_health_checks ;;
        5) show_database_stats ;;
        6) show_mqtt_stats ;;
        7) show_recent_errors ;;
        8) interactive_dashboard ;;
        9) export_metrics ;;
        10) exit 0 ;;
        *) print_error "Invalid option" ;;
    esac

    echo ""
    read -p "Press Enter to continue..."
    main_menu
}

# Main execution
check_connection
main_menu
