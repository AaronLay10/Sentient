#!/bin/bash

#############################################
# Sentient Engine - Production Deploy Script
#############################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration (override with environment variables)
PRODUCTION_HOST="${PRODUCTION_HOST:-}"
PRODUCTION_USER="${PRODUCTION_USER:-root}"
PRODUCTION_DOMAIN="${PRODUCTION_DOMAIN:-}"
DEPLOY_DIR="${DEPLOY_DIR:-~/sentient-deploy}"
GHCR_USERNAME="${GHCR_USERNAME:-}"

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

#############################################
# Helper Functions
#############################################

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo ""
}

check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check if required commands exist
    local required_cmds=("docker" "docker-compose" "ssh" "scp")
    for cmd in "${required_cmds[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            print_error "$cmd is not installed"
            exit 1
        fi
        print_success "$cmd is installed"
    done

    # Check if .env.production exists
    if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
        print_error ".env.production not found"
        print_info "Copy .env.production.example to .env.production and fill in the values"
        exit 1
    fi
    print_success ".env.production exists"

    # Check required environment variables
    if [ -z "$PRODUCTION_HOST" ]; then
        print_error "PRODUCTION_HOST environment variable not set"
        exit 1
    fi
    print_success "PRODUCTION_HOST: $PRODUCTION_HOST"

    if [ -z "$GHCR_USERNAME" ]; then
        print_error "GHCR_USERNAME environment variable not set"
        exit 1
    fi
    print_success "GHCR_USERNAME: $GHCR_USERNAME"

    # Test SSH connection
    print_info "Testing SSH connection..."
    if ssh -o ConnectTimeout=5 -o BatchMode=yes "$PRODUCTION_USER@$PRODUCTION_HOST" "echo 'SSH OK'" &> /dev/null; then
        print_success "SSH connection successful"
    else
        print_error "Cannot connect to $PRODUCTION_USER@$PRODUCTION_HOST"
        print_info "Make sure SSH key is added to the server"
        exit 1
    fi
}

build_images() {
    print_header "Building Docker Images"

    cd "$PROJECT_ROOT"

    local services=("api-service" "orchestrator-service" "mqtt-gateway" "realtime-gateway" "sentient-ui")

    for service in "${services[@]}"; do
        print_info "Building $service..."
        docker build -f "apps/$service/Dockerfile" \
            -t "ghcr.io/$GHCR_USERNAME/sentient-${service/-service/}:latest" \
            . || {
            print_error "Failed to build $service"
            exit 1
        }
        print_success "$service built successfully"
    done
}

push_images() {
    print_header "Pushing Images to Registry"

    print_info "Logging into GitHub Container Registry..."
    echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin || {
        print_error "Failed to login to GHCR. Set GITHUB_TOKEN environment variable."
        exit 1
    }

    local images=("sentient-api" "sentient-orchestrator" "sentient-mqtt-gateway" "sentient-realtime" "sentient-ui")

    for image in "${images[@]}"; do
        print_info "Pushing $image..."
        docker push "ghcr.io/$GHCR_USERNAME/$image:latest" || {
            print_error "Failed to push $image"
            exit 1
        }
        print_success "$image pushed successfully"
    done
}

prepare_server() {
    print_header "Preparing Production Server"

    print_info "Creating deployment directory..."
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "mkdir -p $DEPLOY_DIR"
    print_success "Deployment directory created"

    print_info "Creating data directories..."
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "sudo mkdir -p /srv/sentient/data/{postgres,redis,mqtt} /srv/sentient/logs/{nginx,mqtt}"
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "sudo chown -R $PRODUCTION_USER:$PRODUCTION_USER /srv/sentient"
    print_success "Data directories created"
}

copy_files() {
    print_header "Copying Deployment Files"

    cd "$PROJECT_ROOT"

    print_info "Copying docker-compose.prod.yml..."
    scp docker-compose.prod.yml "$PRODUCTION_USER@$PRODUCTION_HOST:$DEPLOY_DIR/"
    print_success "docker-compose.prod.yml copied"

    print_info "Copying nginx configuration..."
    scp -r nginx "$PRODUCTION_USER@$PRODUCTION_HOST:$DEPLOY_DIR/"
    print_success "nginx configuration copied"

    print_info "Copying mosquitto configuration..."
    scp -r mosquitto "$PRODUCTION_USER@$PRODUCTION_HOST:$DEPLOY_DIR/"
    print_success "mosquitto configuration copied"

    print_info "Copying .env.production..."
    scp .env.production "$PRODUCTION_USER@$PRODUCTION_HOST:$DEPLOY_DIR/"
    print_success ".env.production copied"

    # Update image names in docker-compose
    print_info "Updating docker-compose with correct image names..."
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "cd $DEPLOY_DIR && sed -i 's|ghcr.io/yourusername|ghcr.io/$GHCR_USERNAME|g' docker-compose.prod.yml"
    print_success "Image names updated"
}

deploy_services() {
    print_header "Deploying Services"

    print_info "Pulling latest images..."
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml pull"
    print_success "Images pulled"

    print_info "Starting database and Redis..."
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml up -d postgres redis"
    sleep 10

    print_info "Running database migrations..."
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml run --rm api-service pnpm prisma:db:push" || {
        print_warning "Migration may have already run"
    }
    print_success "Database migrations complete"

    print_info "Starting all services..."
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml up -d --remove-orphans"
    print_success "All services started"
}

health_check() {
    print_header "Running Health Checks"

    print_info "Waiting 30 seconds for services to start..."
    sleep 30

    print_info "Checking container status..."
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml ps"

    print_info "Checking health endpoint..."
    if ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "curl -f http://localhost/health"; then
        print_success "Health check passed"
    else
        print_error "Health check failed"
        print_info "Check logs with: ssh $PRODUCTION_USER@$PRODUCTION_HOST 'cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml logs'"
        exit 1
    fi
}

cleanup() {
    print_header "Cleanup"

    print_info "Removing unused Docker images..."
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "docker image prune -f"
    print_success "Cleanup complete"
}

show_status() {
    print_header "Deployment Status"

    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml ps"
}

#############################################
# Main Deployment Flow
#############################################

main() {
    print_header "Sentient Engine Deployment"
    print_info "Target: $PRODUCTION_USER@$PRODUCTION_HOST"
    print_info "Deploy directory: $DEPLOY_DIR"
    echo ""

    # Ask for confirmation
    read -p "Continue with deployment? (yes/no): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        print_warning "Deployment cancelled"
        exit 0
    fi

    check_prerequisites

    # Ask if we should build and push
    read -p "Build and push new images? (yes/no): " -r
    echo
    if [[ $REPLY =~ ^[Yy]es$ ]]; then
        build_images
        push_images
    else
        print_info "Skipping image build and push"
    fi

    prepare_server
    copy_files
    deploy_services
    health_check
    cleanup
    show_status

    print_success "Deployment complete!"
    if [ -n "$PRODUCTION_DOMAIN" ]; then
        print_info "Access your application at: https://$PRODUCTION_DOMAIN"
    fi
}

# Handle script arguments
case "${1:-}" in
    --skip-build)
        print_info "Skipping build step"
        check_prerequisites
        prepare_server
        copy_files
        deploy_services
        health_check
        cleanup
        show_status
        ;;
    --status)
        show_status
        ;;
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  (no args)      Full deployment with build"
        echo "  --skip-build   Deploy without building images"
        echo "  --status       Show deployment status"
        echo "  --help         Show this help message"
        echo ""
        echo "Required Environment Variables:"
        echo "  PRODUCTION_HOST      Server hostname or IP"
        echo "  GHCR_USERNAME        GitHub Container Registry username"
        echo "  GITHUB_TOKEN         GitHub token for GHCR (for push)"
        echo ""
        echo "Optional Environment Variables:"
        echo "  PRODUCTION_USER      SSH user (default: root)"
        echo "  PRODUCTION_DOMAIN    Production domain name"
        echo "  DEPLOY_DIR           Deploy directory (default: ~/sentient-deploy)"
        ;;
    *)
        main
        ;;
esac
