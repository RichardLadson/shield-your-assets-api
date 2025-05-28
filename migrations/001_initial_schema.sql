-- =============================================
-- MEDICAID PLANNING DATABASE SCHEMA
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- CORE USER MANAGEMENT
-- =============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'planner' CHECK (role IN ('admin', 'planner', 'client')),
    organization VARCHAR(255),
    phone VARCHAR(20),
    license_number VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CLIENT INFORMATION
-- =============================================

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_planner_id UUID REFERENCES users(id),
    gohighlevel_contact_id VARCHAR(255), -- Integration with goHighLevel CRM
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    ssn_last_four VARCHAR(4),
    gender VARCHAR(20),
    marital_status VARCHAR(50) CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
    
    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(20),
    address JSONB, -- {street, city, state, zip, county}
    
    -- Medical Information
    health_status VARCHAR(50) CHECK (health_status IN ('good', 'fair', 'declining', 'critical')),
    primary_diagnosis TEXT,
    secondary_diagnoses TEXT[],
    requires_ltc BOOLEAN DEFAULT false,
    
    -- Emergency Contact
    emergency_contact JSONB, -- {name, relationship, phone, email}
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CASE MANAGEMENT
-- =============================================

CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    assigned_planner_id UUID REFERENCES users(id),
    
    -- Case Details
    case_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'completed', 'cancelled', 'on_hold')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Medicaid Application Info
    state_code VARCHAR(2) NOT NULL,
    application_type VARCHAR(50) CHECK (application_type IN ('initial', 'renewal', 'appeal', 'change')),
    application_date DATE,
    target_eligibility_date DATE,
    
    -- Financial Snapshot (complete form data when case was created)
    initial_assessment JSONB,
    
    -- Case Notes
    description TEXT,
    internal_notes TEXT,
    
    -- Dates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- FINANCIAL ASSESSMENTS
-- =============================================

CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    
    -- Assessment Metadata
    assessment_type VARCHAR(50) DEFAULT 'comprehensive' CHECK (assessment_type IN ('initial', 'comprehensive', 'update', 'final')),
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    assessor_id UUID REFERENCES users(id),
    
    -- Assets (all amounts stored in cents to avoid floating point issues)
    countable_assets BIGINT DEFAULT 0, -- In cents ($45,000 = 4500000)
    non_countable_assets BIGINT DEFAULT 0,
    asset_details JSONB, -- Detailed breakdown by category
    
    -- Income (monthly amounts in cents)
    gross_monthly_income BIGINT DEFAULT 0,
    net_monthly_income BIGINT DEFAULT 0,
    income_details JSONB, -- Detailed breakdown by source
    
    -- Expenses (monthly amounts in cents)
    monthly_expenses BIGINT DEFAULT 0,
    medical_expenses BIGINT DEFAULT 0,
    expense_details JSONB, -- Detailed breakdown by category
    
    -- Eligibility Results
    is_resource_eligible BOOLEAN,
    is_income_eligible BOOLEAN,
    resource_limit BIGINT, -- State-specific limit in cents
    income_limit BIGINT, -- State-specific limit in cents
    excess_resources BIGINT DEFAULT 0,
    excess_income BIGINT DEFAULT 0,
    
    -- Projections
    months_until_depletion INTEGER,
    estimated_qualification_date DATE,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- MEDICAID PLANNING STRATEGIES
-- =============================================

CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    created_by_id UUID REFERENCES users(id),
    
    -- Plan Information
    plan_name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(50) CHECK (plan_type IN ('asset_protection', 'income_planning', 'spend_down', 'trust_planning', 'spousal_protection')),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'proposed', 'approved', 'in_progress', 'completed', 'cancelled')),
    
    -- Strategy Details
    strategies JSONB, -- Array of strategy objects with implementation details
    projected_savings BIGINT, -- Estimated asset protection in cents
    implementation_timeline JSONB, -- Timeline with milestones and deadlines
    
    -- Legal/Compliance Considerations
    lookback_considerations TEXT,
    penalty_period_risk TEXT,
    compliance_notes TEXT,
    
    -- Approval and Implementation
    client_approved_at TIMESTAMP WITH TIME ZONE,
    implementation_started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TASK MANAGEMENT
-- =============================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES plans(id),
    assigned_to_id UUID REFERENCES users(id),
    created_by_id UUID REFERENCES users(id),
    
    -- Task Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) CHECK (task_type IN ('document_collection', 'application_prep', 'strategy_implementation', 'follow_up', 'review', 'other')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'deferred')),
    
    -- Scheduling
    due_date DATE,
    estimated_hours DECIMAL(4,2),
    actual_hours DECIMAL(4,2),
    
    -- Dependencies
    depends_on_task_id UUID REFERENCES tasks(id),
    
    -- Progress Tracking
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    completion_notes TEXT,
    
    -- Dates
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- DOCUMENT MANAGEMENT
-- =============================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES plans(id),
    uploaded_by_id UUID REFERENCES users(id),
    
    -- File Information
    filename VARCHAR(255) NOT NULL, -- Generated filename for storage
    original_filename VARCHAR(255) NOT NULL, -- Original filename from user
    file_path VARCHAR(500) NOT NULL, -- Full path to stored file
    file_size BIGINT,
    mime_type VARCHAR(100),
    document_type VARCHAR(100) CHECK (document_type IN ('bank_statement', 'tax_return', 'property_deed', 'insurance_policy', 'medical_record', 'legal_document', 'id_document', 'other')),
    
    -- Document Metadata
    title VARCHAR(255),
    description TEXT,
    tags TEXT[],
    is_sensitive BOOLEAN DEFAULT true,
    
    -- Dates and Validity
    document_date DATE, -- Date the document was issued/created
    expiration_date DATE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Processing Status
    is_processed BOOLEAN DEFAULT false,
    processing_notes TEXT,
    
    -- Access Control
    is_client_accessible BOOLEAN DEFAULT false,
    access_level VARCHAR(50) DEFAULT 'private' CHECK (access_level IN ('private', 'internal', 'client', 'public'))
);

-- =============================================
-- CARE PROVIDERS & FACILITIES
-- =============================================

CREATE TABLE care_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Provider Information
    name VARCHAR(255) NOT NULL,
    provider_type VARCHAR(100) CHECK (provider_type IN ('nursing_home', 'assisted_living', 'adult_day_care', 'home_health', 'hospice', 'hospital', 'other')),
    license_number VARCHAR(100),
    
    -- Contact Information
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    address JSONB, -- {street, city, state, zip}
    
    -- Medicaid Information
    accepts_medicaid BOOLEAN DEFAULT false,
    medicaid_certified BOOLEAN DEFAULT false,
    medicaid_bed_count INTEGER,
    private_pay_rate DECIMAL(10,2), -- Daily rate
    medicaid_rate DECIMAL(10,2), -- Daily rate
    
    -- Quality Ratings
    cms_rating INTEGER CHECK (cms_rating >= 1 AND cms_rating <= 5),
    last_inspection_date DATE,
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for cases and care providers (many-to-many)
CREATE TABLE case_care_providers (
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    care_provider_id UUID REFERENCES care_providers(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) CHECK (relationship_type IN ('current', 'preferred', 'considering', 'past')),
    start_date DATE,
    end_date DATE,
    monthly_cost DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (case_id, care_provider_id)
);

-- =============================================
-- STATE-SPECIFIC MEDICAID RULES
-- =============================================

CREATE TABLE medicaid_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_code VARCHAR(2) NOT NULL,
    effective_date DATE NOT NULL,
    
    -- Resource Limits (stored in cents)
    individual_resource_limit BIGINT NOT NULL, -- $2,000 = 200000 cents
    community_spouse_resource_allowance_min BIGINT,
    community_spouse_resource_allowance_max BIGINT,
    
    -- Income Limits (monthly, stored in cents)
    individual_income_limit BIGINT NOT NULL, -- $2,901 = 290100 cents
    community_spouse_income_allowance BIGINT,
    
    -- Estate Recovery Rules
    has_estate_recovery BOOLEAN DEFAULT true,
    estate_recovery_exemptions JSONB, -- Array of exemption rules
    
    -- Look-back and Penalty Rules
    lookback_period_months INTEGER DEFAULT 60, -- Usually 5 years (60 months)
    penalty_divisor DECIMAL(10,2), -- Average monthly private pay cost for penalty calculation
    
    -- State-specific Rules (flexible storage)
    state_specific_rules JSONB, -- Unique state requirements and variations
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(state_code, effective_date)
);

-- =============================================
-- REPORTS AND EXPORTS
-- =============================================

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    generated_by_id UUID REFERENCES users(id),
    
    -- Report Details
    report_type VARCHAR(100) CHECK (report_type IN ('eligibility_assessment', 'comprehensive_plan', 'progress_summary', 'compliance_review', 'client_summary')),
    title VARCHAR(255) NOT NULL,
    format VARCHAR(20) CHECK (format IN ('pdf', 'html', 'json', 'csv')),
    
    -- File Information
    file_path VARCHAR(500),
    file_size BIGINT,
    
    -- Report Data (stored as JSON for flexibility and easy sharing)
    report_data JSONB,
    
    -- Sharing and Access Control
    share_token VARCHAR(255) UNIQUE, -- For secure public sharing
    is_shareable BOOLEAN DEFAULT false,
    shared_with_client BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accessed_at TIMESTAMP WITH TIME ZONE -- Track when last accessed
);

-- =============================================
-- AUDIT TRAIL FOR COMPLIANCE
-- =============================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    
    -- Action Details
    action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'view', 'export'
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    
    -- Change Details (for compliance and troubleshooting)
    old_values JSONB,
    new_values JSONB,
    
    -- Context Information
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INTEGRATION SETTINGS (for goHighLevel, etc.)
-- =============================================

CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_type VARCHAR(100) NOT NULL, -- 'gohighlevel', 'quickbooks', 'docusign', etc.
    
    -- Configuration (encrypted sensitive data)
    config JSONB NOT NULL, -- API keys, endpoints, settings
    is_active BOOLEAN DEFAULT true,
    
    -- Sync Status and Monitoring
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(50) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'success', 'error', 'disabled')),
    sync_error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Client indexes
CREATE INDEX idx_clients_planner ON clients(assigned_planner_id);
CREATE INDEX idx_clients_ghl_id ON clients(gohighlevel_contact_id);
CREATE INDEX idx_clients_name ON clients(last_name, first_name);
CREATE INDEX idx_clients_active ON clients(is_active);

-- Case indexes
CREATE INDEX idx_cases_client ON cases(client_id);
CREATE INDEX idx_cases_planner ON cases(assigned_planner_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_state ON cases(state_code);
CREATE INDEX idx_cases_number ON cases(case_number);
CREATE INDEX idx_cases_created ON cases(created_at);

-- Assessment indexes
CREATE INDEX idx_assessments_case ON assessments(case_id);
CREATE INDEX idx_assessments_date ON assessments(assessment_date);
CREATE INDEX idx_assessments_type ON assessments(assessment_type);

-- Plan indexes
CREATE INDEX idx_plans_case ON plans(case_id);
CREATE INDEX idx_plans_status ON plans(status);
CREATE INDEX idx_plans_type ON plans(plan_type);

-- Task indexes
CREATE INDEX idx_tasks_case ON tasks(case_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- Document indexes
CREATE INDEX idx_documents_case ON documents(case_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_uploaded ON documents(uploaded_at);

-- Report indexes
CREATE INDEX idx_reports_case ON reports(case_id);
CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_reports_token ON reports(share_token);
CREATE INDEX idx_reports_generated ON reports(generated_at);

-- Audit log indexes
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- Medicaid rules indexes
CREATE INDEX idx_medicaid_rules_state ON medicaid_rules(state_code);
CREATE INDEX idx_medicaid_rules_effective ON medicaid_rules(effective_date);

-- Care provider indexes
CREATE INDEX idx_care_providers_type ON care_providers(provider_type);
CREATE INDEX idx_care_providers_medicaid ON care_providers(accepts_medicaid);
CREATE INDEX idx_care_providers_active ON care_providers(is_active);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_care_providers_updated_at BEFORE UPDATE ON care_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();