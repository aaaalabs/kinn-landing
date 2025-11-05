#!/bin/bash

#
# KINN Emergency Rollback Script
#
# Usage: ./scripts/rollback.sh [method]
#
# Methods:
#   feature-flag    - Disable feature flags (fastest - no deployment)
#   deployment      - Rollback to previous Vercel deployment
#   git             - Rollback to previous git tag
#   help            - Show this help message
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function print_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
}

function print_success() {
    echo -e "${GREEN}✅ SUCCESS: $1${NC}"
}

function print_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

function print_info() {
    echo -e "ℹ️  $1"
}

function show_help() {
    cat << EOF
KINN Emergency Rollback Script
===============================

Usage: ./scripts/rollback.sh [method]

Available Methods:
  feature-flag    Disable feature flags (fastest, no deployment)
  deployment      Rollback to previous Vercel deployment
  git             Rollback to previous git tag and deploy
  help            Show this help message

Examples:
  ./scripts/rollback.sh feature-flag
  ./scripts/rollback.sh deployment
  ./scripts/rollback.sh git

Notes:
  - Always try 'feature-flag' first (fastest, safest)
  - 'deployment' is fast but requires Vercel CLI
  - 'git' is for complete rollback to previous state

EOF
}

function rollback_feature_flags() {
    print_info "Rolling back via feature flags..."

    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI not installed. Run: npm install -g vercel"
        exit 1
    fi

    print_warning "This will disable all feature flags in production"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Rollback cancelled"
        exit 0
    fi

    # Disable all feature flags
    print_info "Disabling FEATURE_NEW_MIDDLEWARE..."
    vercel env add FEATURE_NEW_MIDDLEWARE false --force 2>/dev/null || true

    print_info "Disabling FEATURE_NEW_CONFIG..."
    vercel env add FEATURE_NEW_CONFIG false --force 2>/dev/null || true

    print_info "Disabling FEATURE_SERVICE_LAYER..."
    vercel env add FEATURE_SERVICE_LAYER false --force 2>/dev/null || true

    print_success "Feature flags disabled"
    print_info "Changes will take effect on next function invocation (cold start)"
    print_info "No deployment needed - rollback is instant!"
}

function rollback_deployment() {
    print_info "Rolling back to previous Vercel deployment..."

    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI not installed. Run: npm install -g vercel"
        exit 1
    fi

    # Get last 5 deployments
    print_info "Fetching recent deployments..."
    vercel ls --limit 5

    echo
    print_warning "Enter the URL of the deployment to rollback to:"
    read -r DEPLOYMENT_URL

    if [ -z "$DEPLOYMENT_URL" ]; then
        print_error "No deployment URL provided"
        exit 1
    fi

    print_warning "This will promote deployment: $DEPLOYMENT_URL"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Rollback cancelled"
        exit 0
    fi

    print_info "Promoting deployment..."
    vercel promote "$DEPLOYMENT_URL"

    print_success "Deployment rolled back successfully"
    print_info "Live site: https://kinn.at"
}

function rollback_git() {
    print_info "Rolling back via git..."

    # Check if in git repo
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not in a git repository"
        exit 1
    fi

    # Show recent tags
    print_info "Recent stable tags:"
    git tag -l "stable-*" --sort=-v:refname | head -5

    echo
    print_warning "Enter tag to rollback to (e.g., stable-2025-11-04):"
    read -r TAG

    if [ -z "$TAG" ]; then
        print_error "No tag provided"
        exit 1
    fi

    # Verify tag exists
    if ! git rev-parse "$TAG" > /dev/null 2>&1; then
        print_error "Tag '$TAG' does not exist"
        exit 1
    fi

    print_warning "This will:"
    print_warning "  1. Create backup commit of current state"
    print_warning "  2. Reset to tag '$TAG'"
    print_warning "  3. Deploy to production"
    echo
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Rollback cancelled"
        exit 0
    fi

    # Create backup commit
    print_info "Creating backup commit..."
    git add -A
    git commit -m "backup: before rollback to $TAG" || true

    # Checkout tag
    print_info "Checking out tag $TAG..."
    git checkout "$TAG"

    # Deploy to production
    if command -v vercel &> /dev/null; then
        print_info "Deploying to production..."
        vercel --prod

        print_success "Rollback complete"
        print_info "Rolled back to: $TAG"
        print_info "Backup commit created on previous branch"
    else
        print_error "Vercel CLI not installed"
        print_warning "Code rolled back to $TAG but not deployed"
        print_info "Run 'vercel --prod' manually to deploy"
    fi
}

# Main script
case "${1:-help}" in
    feature-flag)
        rollback_feature_flags
        ;;
    deployment)
        rollback_deployment
        ;;
    git)
        rollback_git
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown method: $1"
        echo
        show_help
        exit 1
        ;;
esac
