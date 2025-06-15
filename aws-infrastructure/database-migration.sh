#!/bin/bash

# Database Migration Script for Shield Your Assets API
# This script handles migrating your existing database to AWS RDS

set -e  # Exit on any error

# Configuration
ENVIRONMENT_NAME="shield-assets-prod"
REGION="us-east-1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to get database credentials from AWS Secrets Manager
get_db_credentials() {
    print_status "Retrieving database credentials from AWS Secrets Manager..."
    
    DB_SECRET=$(aws secretsmanager get-secret-value \
        --secret-id "${ENVIRONMENT_NAME}/rds/credentials" \
        --region $REGION \
        --query 'SecretString' \
        --output text)
    
    if [ $? -ne 0 ]; then
        print_error "Failed to retrieve database credentials"
        exit 1
    fi
    
    # Parse JSON and export variables
    export RDS_HOST=$(echo $DB_SECRET | jq -r '.host')
    export RDS_PORT=$(echo $DB_SECRET | jq -r '.port')
    export RDS_USER=$(echo $DB_SECRET | jq -r '.username')
    export RDS_PASSWORD=$(echo $DB_SECRET | jq -r '.password')
    export RDS_DBNAME=$(echo $DB_SECRET | jq -r '.dbname')
    
    print_success "Database credentials retrieved"
}

# Function to test database connection
test_db_connection() {
    print_status "Testing database connection..."
    
    PGPASSWORD=$RDS_PASSWORD psql -h $RDS_HOST -p $RDS_PORT -U $RDS_USER -d postgres -c "SELECT version();" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Database connection successful"
    else
        print_error "Failed to connect to database"
        print_error "Please check:"
        print_error "1. Security groups allow your IP"
        print_error "2. Database is in available state"
        print_error "3. Network connectivity"
        exit 1
    fi
}

# Function to create database if it doesn't exist
create_database() {
    print_status "Creating database '$RDS_DBNAME' if it doesn't exist..."
    
    PGPASSWORD=$RDS_PASSWORD psql -h $RDS_HOST -p $RDS_PORT -U $RDS_USER -d postgres -c "CREATE DATABASE $RDS_DBNAME;" 2>/dev/null || true
    
    print_success "Database creation attempted"
}

# Function to backup existing database
backup_database() {
    local source_host=$1
    local source_port=$2
    local source_user=$3
    local source_db=$4
    local backup_file="medicaid_planning_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    print_status "Creating backup of existing database..."
    
    # Check if source database is accessible
    if [ -z "$source_host" ]; then
        print_warning "No source database specified. Skipping backup."
        return 0
    fi
    
    # Create backup
    PGPASSWORD=${SOURCE_DB_PASSWORD:-} pg_dump \
        -h $source_host \
        -p $source_port \
        -U $source_user \
        -d $source_db \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        > $backup_file
    
    if [ $? -eq 0 ]; then
        print_success "Backup created: $backup_file"
        echo $backup_file
    else
        print_error "Failed to create backup"
        exit 1
    fi
}

# Function to restore database from backup
restore_database() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_status "Restoring database from backup: $backup_file"
    
    PGPASSWORD=$RDS_PASSWORD psql \
        -h $RDS_HOST \
        -p $RDS_PORT \
        -U $RDS_USER \
        -d $RDS_DBNAME \
        < $backup_file
    
    if [ $? -eq 0 ]; then
        print_success "Database restored successfully"
    else
        print_error "Failed to restore database"
        exit 1
    fi
}

# Function to run fresh migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Check if migrations directory exists
    if [ -d "../migrations" ]; then
        print_status "Found migrations directory"
        
        # Run each migration file in order
        for migration_file in ../migrations/*.sql; do
            if [ -f "$migration_file" ]; then
                print_status "Running migration: $(basename $migration_file)"
                
                PGPASSWORD=$RDS_PASSWORD psql \
                    -h $RDS_HOST \
                    -p $RDS_PORT \
                    -U $RDS_USER \
                    -d $RDS_DBNAME \
                    -f "$migration_file"
                
                if [ $? -eq 0 ]; then
                    print_success "Migration completed: $(basename $migration_file)"
                else
                    print_error "Migration failed: $(basename $migration_file)"
                    exit 1
                fi
            fi
        done
    else
        print_warning "No migrations directory found"
    fi
}

# Function to verify migration
verify_migration() {
    print_status "Verifying database migration..."
    
    # Check if key tables exist
    local tables=("users" "clients" "cases" "assessments" "plans" "medicaid_rules")
    
    for table in "${tables[@]}"; do
        local count=$(PGPASSWORD=$RDS_PASSWORD psql \
            -h $RDS_HOST \
            -p $RDS_PORT \
            -U $RDS_USER \
            -d $RDS_DBNAME \
            -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='$table';" | tr -d ' ')
        
        if [ "$count" = "1" ]; then
            print_success "Table '$table' exists"
        else
            print_warning "Table '$table' not found"
        fi
    done
    
    # Get total table count
    local total_tables=$(PGPASSWORD=$RDS_PASSWORD psql \
        -h $RDS_HOST \
        -p $RDS_PORT \
        -U $RDS_USER \
        -d $RDS_DBNAME \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" | tr -d ' ')
    
    print_success "Total tables in database: $total_tables"
}

# Function to update application configuration
update_app_config() {
    print_status "Database migration completed successfully!"
    print_status "Your application is now configured to use AWS RDS"
    
    echo
    echo "Database Details:"
    echo "  Host: $RDS_HOST"
    echo "  Port: $RDS_PORT"
    echo "  Database: $RDS_DBNAME"
    echo "  User: $RDS_USER"
    echo
    echo "The database credentials are stored in AWS Secrets Manager:"
    echo "  Secret: ${ENVIRONMENT_NAME}/rds/credentials"
    echo
    echo "Your ECS application will automatically use these credentials."
}

# Main execution
print_status "Starting database migration process..."

# Check prerequisites
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL client (psql) is not installed"
    print_error "Install it with: brew install postgresql (macOS) or apt-get install postgresql-client (Ubuntu)"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    print_error "jq is not installed"
    print_error "Install it with: brew install jq (macOS) or apt-get install jq (Ubuntu)"
    exit 1
fi

# Get database credentials
get_db_credentials

# Test connection
test_db_connection

# Create database
create_database

# Ask user about migration method
echo
echo "Choose migration method:"
echo "1. Restore from existing database backup"
echo "2. Run fresh migrations (for new setup)"
echo "3. Manual migration (I'll handle it myself)"
echo
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo
        echo "Please provide your source database details:"
        read -p "Source database host: " SOURCE_HOST
        read -p "Source database port (default 5432): " SOURCE_PORT
        SOURCE_PORT=${SOURCE_PORT:-5432}
        read -p "Source database user: " SOURCE_USER
        read -p "Source database name: " SOURCE_DB
        read -s -p "Source database password: " SOURCE_DB_PASSWORD
        echo
        
        export SOURCE_DB_PASSWORD
        backup_file=$(backup_database $SOURCE_HOST $SOURCE_PORT $SOURCE_USER $SOURCE_DB)
        restore_database $backup_file
        ;;
    2)
        run_migrations
        ;;
    3)
        print_status "Manual migration selected"
        print_status "Connect to your RDS instance using:"
        echo "  psql -h $RDS_HOST -p $RDS_PORT -U $RDS_USER -d $RDS_DBNAME"
        echo "  Password: [stored in AWS Secrets Manager]"
        echo
        read -p "Press Enter when you've completed the manual migration..."
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

# Verify migration
verify_migration

# Update configuration
update_app_config

print_success "Database migration process completed! 🎉"

# Clean up backup files (optional)
if [ "$choice" = "1" ] && [ ! -z "$backup_file" ]; then
    echo
    read -p "Delete backup file $backup_file? (y/N): " delete_backup
    if [[ $delete_backup =~ ^[Yy]$ ]]; then
        rm -f $backup_file
        print_success "Backup file deleted"
    else
        print_status "Backup file kept: $backup_file"
    fi
fi