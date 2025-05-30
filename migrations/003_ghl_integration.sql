-- Migration: Add GoHighLevel integration fields
-- Date: 2025-05-28
-- Description: Adds fields to support GoHighLevel CRM integration

-- Add GoHighLevel fields to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS ghl_contact_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS ghl_opportunity_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS ghl_sync_status VARCHAR(50) DEFAULT 'pending' CHECK (ghl_sync_status IN ('pending', 'synced', 'failed')),
ADD COLUMN IF NOT EXISTS ghl_last_sync_at TIMESTAMP;

-- Add GoHighLevel note ID to reports table
ALTER TABLE reports
ADD COLUMN IF NOT EXISTS ghl_note_id VARCHAR(255);

-- Add GoHighLevel location ID to users table for multi-location support
ALTER TABLE users
ADD COLUMN IF NOT EXISTS ghl_location_id VARCHAR(255);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_ghl_contact_id ON clients(ghl_contact_id);
CREATE INDEX IF NOT EXISTS idx_clients_ghl_opportunity_id ON clients(ghl_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_clients_ghl_sync_status ON clients(ghl_sync_status);
CREATE INDEX IF NOT EXISTS idx_reports_ghl_note_id ON reports(ghl_note_id);
CREATE INDEX IF NOT EXISTS idx_users_ghl_location_id ON users(ghl_location_id);

-- Add composite index for sync status queries
CREATE INDEX IF NOT EXISTS idx_clients_ghl_sync_composite ON clients(ghl_sync_status, ghl_last_sync_at);