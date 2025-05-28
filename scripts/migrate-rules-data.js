const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

// Helper function to map state names to 2-letter codes
const stateNameToCode = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
    'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
    'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
    'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
    'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'newhampshire': 'NH', 'newjersey': 'NJ',
    'newmexico': 'NM', 'newyork': 'NY', 'northcarolina': 'NC', 'northdakota': 'ND', 'ohio': 'OH',
    'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhodeisland': 'RI', 'southcarolina': 'SC',
    'southdakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
    'virginia': 'VA', 'washington': 'WA', 'westvirginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
    // Handle spaces in state names
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'west virginia': 'WV'
};

// Helper function to map recovery aggressiveness
function mapRecoveryAggressiveness(data) {
    if (!data.recoveryScope) return 'moderate';
    
    const scope = data.recoveryScope;
    if (scope.aggressiveness === 'none' || scope.aggressiveness === false) return 'none';
    if (scope.aggressiveness === 'minimal' || scope.aggressiveness === 'low') return 'minimal';
    if (scope.aggressiveness === 'aggressive' || scope.aggressiveness === 'high') return 'aggressive';
    return 'moderate';
}

// Helper function to map home protection strength
function mapHomeProtectionStrength(data) {
    if (!data.homeExemptions) return 'moderate';
    
    const strength = data.homeExemptions.strength;
    if (strength === 'very strong') return 'very_strong';
    if (strength === 'strong') return 'strong';
    if (strength === 'weak') return 'weak';
    if (strength === 'very weak') return 'very_weak';
    return 'moderate';
}

async function migrateBenefitRules() {
    try {
        console.log('🚀 Migrating benefit rules...');
        
        const benefitRulesPath = path.join(__dirname, '..', 'src', 'data', 'benefit_rules_2025.json');
        const benefitRulesData = JSON.parse(fs.readFileSync(benefitRulesPath, 'utf8'));
        
        let insertCount = 0;
        
        for (const [stateName, stateData] of Object.entries(benefitRulesData)) {
            const stateCode = stateNameToCode[stateName.toLowerCase()];
            if (!stateCode) {
                console.warn(`⚠️  Unknown state: ${stateName}`);
                continue;
            }
            
            // Migrate SSI data
            if (stateData.ssi) {
                await pool.query(`
                    INSERT INTO benefit_rules (state, program, year, individual_amount, couple_amount, resource_limit, program_details)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (state, program, year) DO UPDATE SET
                        individual_amount = EXCLUDED.individual_amount,
                        couple_amount = EXCLUDED.couple_amount,
                        resource_limit = EXCLUDED.resource_limit,
                        program_details = EXCLUDED.program_details,
                        last_updated = CURRENT_TIMESTAMP
                `, [
                    stateCode, 'ssi', 2025,
                    stateData.ssi.individualFBR,
                    stateData.ssi.coupleFBR,
                    stateData.ssi.resourceLimitIndividual,
                    JSON.stringify(stateData.ssi)
                ]);
                insertCount++;
            }
            
            // Migrate SNAP data
            if (stateData.snap) {
                await pool.query(`
                    INSERT INTO benefit_rules (state, program, year, individual_amount, couple_amount, income_limit, program_details)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (state, program, year) DO UPDATE SET
                        individual_amount = EXCLUDED.individual_amount,
                        couple_amount = EXCLUDED.couple_amount,
                        income_limit = EXCLUDED.income_limit,
                        program_details = EXCLUDED.program_details,
                        last_updated = CURRENT_TIMESTAMP
                `, [
                    stateCode, 'snap', 2025,
                    stateData.snap.maxBenefitIndividual,
                    stateData.snap.maxBenefitCouple,
                    stateData.snap.incomeLimit,
                    JSON.stringify(stateData.snap)
                ]);
                insertCount++;
            }
            
            // Migrate Medicare data
            if (stateData.medicare) {
                await pool.query(`
                    INSERT INTO benefit_rules (state, program, year, program_details)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (state, program, year) DO UPDATE SET
                        program_details = EXCLUDED.program_details,
                        last_updated = CURRENT_TIMESTAMP
                `, [
                    stateCode, 'medicare', 2025,
                    JSON.stringify(stateData.medicare)
                ]);
                insertCount++;
            }
            
            // Migrate Veterans Benefits data
            if (stateData.veteransBenefits) {
                await pool.query(`
                    INSERT INTO benefit_rules (state, program, year, individual_amount, program_details)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (state, program, year) DO UPDATE SET
                        individual_amount = EXCLUDED.individual_amount,
                        program_details = EXCLUDED.program_details,
                        last_updated = CURRENT_TIMESTAMP
                `, [
                    stateCode, 'veterans', 2025,
                    stateData.veteransBenefits.basicPension,
                    JSON.stringify(stateData.veteransBenefits)
                ]);
                insertCount++;
            }
        }
        
        console.log(`✅ Migrated ${insertCount} benefit rules records`);
        
    } catch (error) {
        console.error('❌ Error migrating benefit rules:', error.message);
        throw error;
    }
}

async function migrateEstateRecoveryRules() {
    try {
        console.log('🚀 Migrating estate recovery rules...');
        
        const estateRecoveryDir = path.join(__dirname, '..', 'src', 'data', 'estateRecovery');
        const files = fs.readdirSync(estateRecoveryDir).filter(file => file.endsWith('.json'));
        
        let insertCount = 0;
        
        for (const file of files) {
            const stateName = file.replace('.json', '');
            const stateCode = stateNameToCode[stateName.toLowerCase()];
            
            if (!stateCode) {
                console.warn(`⚠️  Unknown state: ${stateName}`);
                continue;
            }
            
            const filePath = path.join(estateRecoveryDir, file);
            const stateData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            const recoveryAggressiveness = mapRecoveryAggressiveness(stateData);
            const homeProtectionStrength = mapHomeProtectionStrength(stateData);
            
            await pool.query(`
                INSERT INTO estate_recovery_rules (
                    state, home_protection_strength, recovery_aggressiveness,
                    primary_residence_protected, homestead_exemption,
                    optional_recovery, tefra_liens, expanded_estate_definition, non_probate_transfers_pursued,
                    lookback_years, claim_deadline_months,
                    protected_assets, recovery_conditions, exceptions, planning_strategies,
                    data_source
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                ON CONFLICT (state) DO UPDATE SET
                    home_protection_strength = EXCLUDED.home_protection_strength,
                    recovery_aggressiveness = EXCLUDED.recovery_aggressiveness,
                    primary_residence_protected = EXCLUDED.primary_residence_protected,
                    homestead_exemption = EXCLUDED.homestead_exemption,
                    optional_recovery = EXCLUDED.optional_recovery,
                    tefra_liens = EXCLUDED.tefra_liens,
                    expanded_estate_definition = EXCLUDED.expanded_estate_definition,
                    non_probate_transfers_pursued = EXCLUDED.non_probate_transfers_pursued,
                    lookback_years = EXCLUDED.lookback_years,
                    claim_deadline_months = EXCLUDED.claim_deadline_months,
                    protected_assets = EXCLUDED.protected_assets,
                    recovery_conditions = EXCLUDED.recovery_conditions,
                    exceptions = EXCLUDED.exceptions,
                    planning_strategies = EXCLUDED.planning_strategies,
                    last_updated = CURRENT_TIMESTAMP
            `, [
                stateCode,
                homeProtectionStrength,
                recoveryAggressiveness,
                stateData.homeExemptions?.primary || false,
                stateData.homeExemptions?.conditions?.includes('homestead') || false,
                stateData.recoveryScope?.optionalRecovery || false,
                stateData.recoveryScope?.tefraLiens || false,
                stateData.recoveryScope?.expandedEstate || false,
                stateData.recoveryScope?.nonProbateTransfersPursued || false,
                stateData.recoveryTimeframes?.lookBackYears || null,
                stateData.recoveryTimeframes?.claimDeadlineAfterDeathMonths || null,
                stateData.assetProtections?.protectedAssets || [],
                stateData.homeExemptions?.conditions || [],
                stateData.homeExemptions?.exceptions || [],
                stateData.planningOpportunities || [],
                `JSON file: ${file}`
            ]);
            
            insertCount++;
        }
        
        console.log(`✅ Migrated ${insertCount} estate recovery rules`);
        
    } catch (error) {
        console.error('❌ Error migrating estate recovery rules:', error.message);
        throw error;
    }
}

async function main() {
    try {
        console.log('🎯 Starting rules data migration...');
        
        await migrateBenefitRules();
        await migrateEstateRecoveryRules();
        
        console.log('🎉 Rules data migration completed successfully!');
        
        // Show summary
        const benefitCount = await pool.query('SELECT COUNT(*) FROM benefit_rules');
        const estateCount = await pool.query('SELECT COUNT(*) FROM estate_recovery_rules');
        
        console.log('\\n📊 Migration Summary:');
        console.log(`- Benefit Rules: ${benefitCount.rows[0].count} records`);
        console.log(`- Estate Recovery Rules: ${estateCount.rows[0].count} records`);
        
        process.exit(0);
        
    } catch (error) {
        console.error('💥 Migration failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { migrateBenefitRules, migrateEstateRecoveryRules };