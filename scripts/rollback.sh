#!/bin/bash

#############################################
# Sentient Engine - Rollback Script
#############################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PRODUCTION_HOST="${PRODUCTION_HOST:-}"
PRODUCTION_USER="${PRODUCTION_USER:-root}"
DEPLOY_DIR="${DEPLOY_DIR:-~/sentient-deploy}"
BACKUP_DIR="${BACKUP_DIR:-/srv/sentient/backups}"

print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo ""
}

check_connection() {
    if [ -z "$PRODUCTION_HOST" ]; then
        print_error "PRODUCTION_HOST not set"
        exit 1
    fi

    if ! ssh -o ConnectTimeout=5 "$PRODUCTION_USER@$PRODUCTION_HOST" "echo 'OK'" &> /dev/null; then
        print_error "Cannot connect to $PRODUCTION_USER@$PRODUCTION_HOST"
        exit 1
    fi
}

list_backups() {
    print_header "Available Database Backups"

    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "ls -lht $BACKUP_DIR/*.sql 2>/dev/null || echo 'No backups found'"
}

backup_current_state() {
    print_header "Backing Up Current State"

    local timestamp=$(date +%Y%m%d_%H%M%S)

    print_info "Creating database backup before rollback..."
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "
        mkdir -p $BACKUP_DIR
        docker exec sentient_postgres pg_dump -U sentient sentient_prod > $BACKUP_DIR/pre_rollback_$timestamp.sql
    "
    print_success "Database backed up to: pre_rollback_$timestamp.sql"
}

rollback_images() {
    print_header "Rolling Back Docker Images"

    read -p "Enter the image tag to rollback to (e.g., main-abc1234): " -r image_tag

    if [ -z "$image_tag" ]; then
        print_error "Image tag cannot be empty"
        exit 1
    fi

    print_warning "This will rollback all services to tag: $image_tag"
    read -p "Continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        print_warning "Rollback cancelled"
        exit 0
    fi

    print_info "Updating docker-compose to use tag: $image_tag"
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "
        cd $DEPLOY_DIR
        sed -i.bak 's/:latest/:$image_tag/g' docker-compose.prod.yml
    "

    print_info "Pulling images..."
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml pull"

    print_info "Restarting services..."
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml up -d"

    print_success "Services rolled back to $image_tag"
}

rollback_database() {
    print_header "Rolling Back Database"

    list_backups
    echo ""

    read -p "Enter the backup filename to restore: " -r backup_file

    if [ -z "$backup_file" ]; then
        print_error "Backup filename cannot be empty"
        exit 1
    fi

    print_warning "This will restore the database from: $backup_file"
    print_warning "ALL CURRENT DATA WILL BE LOST!"
    read -p "Continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        print_warning "Rollback cancelled"
        exit 0
    fi

    print_info "Stopping API service..."
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml stop api-service"

    print_info "Restoring database..."
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "
        docker exec -i sentient_postgres psql -U sentient -d sentient_prod < $BACKUP_DIR/$backup_file
    "

    print_info "Starting API service..."
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml start api-service"

    print_success "Database restored from $backup_file"
}

emergency_stop() {
    print_header "Emergency Stop"

    print_warning "This will stop ALL Sentient services"
    read -p "Continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        exit 0
    fi

    print_info "Stopping all services..."
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml down"

    print_success "All services stopped"
}

emergency_restart() {
    print_header "Emergency Restart"

    print_info "Restarting all services..."
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml restart"

    print_success "All services restarted"
}

show_status() {
    print_header "Current Deployment Status"

    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml ps"

    echo ""
    print_info "Recent logs (last 50 lines):"
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml logs --tail=50"
}

main_menu() {
    print_header "Sentient Engine - Rollback & Recovery"

    echo "1) Rollback Docker images to previous version"
    echo "2) Rollback database from backup"
    echo "3) List available backups"
    echo "4) Show current status"
    echo "5) Emergency stop all services"
    echo "6) Emergency restart all services"
    echo "7) Exit"
    echo ""

    read -p "Select an option: " -r choice

    case $choice in
        1)
            backup_current_state
            rollback_images
            ;;
        2)
            backup_current_state
            rollback_database
            ;;
        3)
            list_backups
            ;;
        4)
            show_status
            ;;
        5)
            emergency_stop
            ;;
        6)
            emergency_restart
            ;;
        7)
            print_info "Exiting"
            exit 0
            ;;
        *)
            print_error "Invalid option"
            exit 1
            ;;
    esac
}

# Main execution
check_connection
main_menu
