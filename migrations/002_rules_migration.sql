-- =============================================
-- RULES AND REFERENCE DATA MIGRATION
-- =============================================

-- =============================================
-- MEDICAID RULES BY STATE AND YEAR
-- =============================================

CREATE TABLE medicaid_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state VARCHAR(2) NOT NULL, -- Two-letter state code (FL, CA, etc.)
    year INTEGER NOT NULL DEFAULT 2025,
    
    -- Income Limits (monthly amounts in dollars)
    income_limit_single INTEGER, -- Community Medicaid income limit for single person
    income_limit_married INTEGER, -- Community Medicaid income limit for married couple
    nursing_home_income_limit_single INTEGER, -- Nursing home Medicaid income limit for single
    nursing_home_income_limit_married INTEGER, -- Nursing home Medicaid income limit for married
    
    -- Asset/Resource Limits (amounts in dollars)
    resource_limit_single INTEGER, -- Asset limit for single person
    resource_limit_married INTEGER, -- Asset limit for married couple
    home_equity_limit INTEGER, -- Maximum home equity allowed
    
    -- Community Spouse Protections (amounts in dollars)
    community_spouse_resource_allowance_min INTEGER, -- Minimum CSRA
    community_spouse_resource_allowance_max INTEGER, -- Maximum CSRA
    monthly_maintenance_needs_allowance_min INTEGER, -- Minimum MMNA
    monthly_maintenance_needs_allowance_max INTEGER, -- Maximum MMNA
    
    -- Other Allowances (amounts in dollars)
    monthly_personal_needs_allowance INTEGER, -- Personal needs allowance in nursing home
    average_nursing_home_cost INTEGER, -- Average monthly nursing home cost in state
    
    -- Metadata
    effective_date DATE DEFAULT CURRENT_DATE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    
    -- Ensure one record per state per year
    UNIQUE(state, year)
);

-- Index for fast lookups
CREATE INDEX idx_medicaid_rules_state_year ON medicaid_rules(state, year);
CREATE INDEX idx_medicaid_rules_year ON medicaid_rules(year);

-- =============================================
-- OTHER BENEFIT PROGRAMS (SSI, SNAP, Medicare, Veterans)
-- =============================================

CREATE TABLE benefit_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state VARCHAR(2) NOT NULL, -- Two-letter state code
    program VARCHAR(20) NOT NULL, -- 'ssi', 'snap', 'medicare', 'veterans'
    year INTEGER NOT NULL DEFAULT 2025,
    
    -- Flexible amounts (different programs have different structures)
    individual_amount INTEGER, -- Individual benefit amount
    couple_amount INTEGER, -- Couple benefit amount
    income_limit INTEGER, -- Income qualification limit
    resource_limit INTEGER, -- Asset qualification limit
    
    -- Program-specific data stored as JSON for flexibility
    program_details JSONB,
    
    -- Metadata
    effective_date DATE DEFAULT CURRENT_DATE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    
    -- Ensure one record per state per program per year
    UNIQUE(state, program, year)
);

-- Indexes for fast lookups
CREATE INDEX idx_benefit_rules_state_program_year ON benefit_rules(state, program, year);
CREATE INDEX idx_benefit_rules_program_year ON benefit_rules(program, year);

-- =============================================
-- ESTATE RECOVERY RULES BY STATE
-- =============================================

CREATE TABLE estate_recovery_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state VARCHAR(2) NOT NULL UNIQUE, -- Two-letter state code
    
    -- Home Protection Strength
    home_protection_strength VARCHAR(20) CHECK (home_protection_strength IN ('very_strong', 'strong', 'moderate', 'weak', 'very_weak')),
    primary_residence_protected BOOLEAN DEFAULT false,
    homestead_exemption BOOLEAN DEFAULT false,
    
    -- Recovery Aggressiveness
    recovery_aggressiveness VARCHAR(20) CHECK (recovery_aggressiveness IN ('none', 'minimal', 'moderate', 'aggressive', 'very_aggressive')),
    optional_recovery BOOLEAN DEFAULT false,
    tefra_liens BOOLEAN DEFAULT false, -- Tax Equity and Fiscal Responsibility Act liens
    expanded_estate_definition BOOLEAN DEFAULT false,
    non_probate_transfers_pursued BOOLEAN DEFAULT false,
    
    -- Timeframes
    lookback_years INTEGER,
    claim_deadline_months INTEGER, -- Months after death to file claim
    statute_of_limitations_years INTEGER,
    
    -- Financial Thresholds
    recovery_threshold_dollars INTEGER, -- Minimum estate value before recovery attempted
    home_equity_limit INTEGER, -- Maximum home equity subject to recovery
    
    -- Protected Assets (stored as array of strings)
    protected_assets TEXT[], -- ['homestead', 'joint_tenancy', 'trusts', etc.]
    
    -- Legal Framework
    recovery_conditions TEXT[], -- Array of specific conditions
    exceptions TEXT[], -- Array of exceptions to recovery
    
    -- Planning Opportunities
    planning_strategies TEXT[], -- Array of available strategies
    
    -- Metadata
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_source VARCHAR(100),
    notes TEXT
);

-- Index for fast state lookups
CREATE INDEX idx_estate_recovery_state ON estate_recovery_rules(state);
CREATE INDEX idx_estate_recovery_aggressiveness ON estate_recovery_rules(recovery_aggressiveness);
CREATE INDEX idx_estate_recovery_home_protection ON estate_recovery_rules(home_protection_strength);

-- =============================================
-- CREATE VIEWS FOR EASY QUERYING
-- =============================================

-- View for current year Medicaid rules
CREATE VIEW current_medicaid_rules AS
SELECT * FROM medicaid_rules 
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE);

-- View for current year benefit rules  
CREATE VIEW current_benefit_rules AS
SELECT * FROM benefit_rules 
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE);

-- View combining Medicaid and estate recovery for comprehensive state info
CREATE VIEW comprehensive_state_rules AS
SELECT 
    m.state,
    m.year,
    m.income_limit_single,
    m.resource_limit_single,
    m.home_equity_limit,
    e.home_protection_strength,
    e.recovery_aggressiveness,
    e.protected_assets
FROM medicaid_rules m
LEFT JOIN estate_recovery_rules e ON m.state = e.state
WHERE m.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE medicaid_rules IS 'Medicaid eligibility rules by state and year - core eligibility criteria';
COMMENT ON TABLE benefit_rules IS 'Other government benefit program rules (SSI, SNAP, Medicare, Veterans)';
COMMENT ON TABLE estate_recovery_rules IS 'Estate recovery policies and asset protection rules by state';

COMMENT ON COLUMN medicaid_rules.state IS 'Two-letter state abbreviation (FL, CA, NY, etc.)';
COMMENT ON COLUMN medicaid_rules.income_limit_single IS 'Monthly income limit for single person community Medicaid';
COMMENT ON COLUMN medicaid_rules.resource_limit_single IS 'Asset limit for single person Medicaid eligibility';

COMMENT ON COLUMN estate_recovery_rules.home_protection_strength IS 'Overall strength of home protection: very_strong (FL) to very_weak';
COMMENT ON COLUMN estate_recovery_rules.recovery_aggressiveness IS 'How aggressively state pursues recovery: none (FL) to very_aggressive';
COMMENT ON COLUMN estate_recovery_rules.protected_assets IS 'Array of asset types protected from recovery';

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant access to the medicaid app user
GRANT SELECT, INSERT, UPDATE ON medicaid_rules TO medicaid_app;
GRANT SELECT, INSERT, UPDATE ON benefit_rules TO medicaid_app;
GRANT SELECT, INSERT, UPDATE ON estate_recovery_rules TO medicaid_app;

-- Grant access to the views
GRANT SELECT ON current_medicaid_rules TO medicaid_app;
GRANT SELECT ON current_benefit_rules TO medicaid_app;
GRANT SELECT ON comprehensive_state_rules TO medicaid_app;