const pool = require('../config/database');

async function createAdditionalTables() {
    try {
        console.log('🚀 Creating additional tables for rules migration...');
        
        // Create benefit_rules table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS benefit_rules (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                state VARCHAR(2) NOT NULL,
                program VARCHAR(20) NOT NULL,
                year INTEGER NOT NULL DEFAULT 2025,
                individual_amount INTEGER,
                couple_amount INTEGER,
                income_limit INTEGER,
                resource_limit INTEGER,
                program_details JSONB,
                effective_date DATE DEFAULT CURRENT_DATE,
                last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                UNIQUE(state, program, year)
            );
        `);
        
        console.log('✅ Created benefit_rules table');
        
        // Create estate_recovery_rules table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS estate_recovery_rules (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                state VARCHAR(2) NOT NULL UNIQUE,
                home_protection_strength VARCHAR(20) CHECK (home_protection_strength IN ('very_strong', 'strong', 'moderate', 'weak', 'very_weak')),
                primary_residence_protected BOOLEAN DEFAULT false,
                homestead_exemption BOOLEAN DEFAULT false,
                recovery_aggressiveness VARCHAR(20) CHECK (recovery_aggressiveness IN ('none', 'minimal', 'moderate', 'aggressive', 'very_aggressive')),
                optional_recovery BOOLEAN DEFAULT false,
                tefra_liens BOOLEAN DEFAULT false,
                expanded_estate_definition BOOLEAN DEFAULT false,
                non_probate_transfers_pursued BOOLEAN DEFAULT false,
                lookback_years INTEGER,
                claim_deadline_months INTEGER,
                statute_of_limitations_years INTEGER,
                recovery_threshold_dollars INTEGER,
                home_equity_limit INTEGER,
                protected_assets TEXT[],
                recovery_conditions TEXT[],
                exceptions TEXT[],
                planning_strategies TEXT[],
                last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                data_source VARCHAR(100),
                notes TEXT
            );
        `);
        
        console.log('✅ Created estate_recovery_rules table');
        
        // Create indexes
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_benefit_rules_state_program_year ON benefit_rules(state, program, year);
            CREATE INDEX IF NOT EXISTS idx_benefit_rules_program_year ON benefit_rules(program, year);
            CREATE INDEX IF NOT EXISTS idx_estate_recovery_state ON estate_recovery_rules(state);
            CREATE INDEX IF NOT EXISTS idx_estate_recovery_aggressiveness ON estate_recovery_rules(recovery_aggressiveness);
            CREATE INDEX IF NOT EXISTS idx_estate_recovery_home_protection ON estate_recovery_rules(home_protection_strength);
        `);
        
        console.log('✅ Created indexes');
        
        // Grant permissions
        await pool.query(`
            GRANT SELECT, INSERT, UPDATE ON benefit_rules TO medicaid_app;
            GRANT SELECT, INSERT, UPDATE ON estate_recovery_rules TO medicaid_app;
        `);
        
        console.log('✅ Granted permissions');
        console.log('🎉 Additional tables created successfully!');
        
    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
        throw error;
    }
}

if (require.main === module) {
    createAdditionalTables()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { createAdditionalTables };