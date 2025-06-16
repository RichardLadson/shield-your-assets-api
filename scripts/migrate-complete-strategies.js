const fs = require('fs');
const path = require('path');
const db = require('../config/database');

// Parse the complete strategies text file
function parseStrategiesFile(filePath) {
    console.log('Reading strategies file:', filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const strategies = [];
    
    // Split by strategy numbers (1. 2. 3. etc.)
    const strategyBlocks = content.split(/^\d+\.\s+/m).slice(1); // Remove header before first strategy
    
    console.log(`Found ${strategyBlocks.length} strategy blocks`);
    
    strategyBlocks.forEach((block, index) => {
        try {
            const strategyNumber = index + 1;
            console.log(`Parsing strategy ${strategyNumber}...`);
            
            // Extract strategy name (first line in caps)
            const lines = block.trim().split('\n');
            const strategyName = lines[0].trim();
            
            // Find sections
            const sections = {
                strategy: '',
                benefits: [],
                limitations: [],
                effectiveness: '',
                timing: ''
            };
            
            let currentSection = '';
            let currentBenefits = [];
            let currentLimitations = [];
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                if (line.startsWith('Strategy:')) {
                    currentSection = 'strategy';
                    sections.strategy = line.replace('Strategy:', '').trim();
                } else if (line === 'Benefits:') {
                    currentSection = 'benefits';
                } else if (line === 'Limitations:') {
                    currentSection = 'limitations';
                } else if (line.startsWith('Effectiveness:')) {
                    currentSection = 'effectiveness';
                    sections.effectiveness = line.replace('Effectiveness:', '').trim();
                } else if (line.startsWith('Timing:')) {
                    currentSection = 'timing';
                    sections.timing = line.replace('Timing:', '').trim();
                } else if (line.startsWith('- ') && currentSection === 'benefits') {
                    currentBenefits.push(line.substring(2));
                } else if (line.startsWith('- ') && currentSection === 'limitations') {
                    currentLimitations.push(line.substring(2));
                }
            }
            
            sections.benefits = currentBenefits;
            sections.limitations = currentLimitations;
            
            // Determine category based on strategy content and position
            let category = 'General Planning';
            let timingCategory = 'medium_term';
            
            if (strategyNumber <= 10) {
                category = 'Asset Planning';
            } else if (strategyNumber <= 15) {
                category = 'Income Planning';
            } else if (strategyNumber <= 20) {
                category = 'Trust Planning';
            } else if (strategyNumber <= 25) {
                category = 'Annuity Planning';
            } else if (strategyNumber <= 30) {
                category = 'Divestment Planning';
            } else if (strategyNumber <= 35) {
                category = 'Community Spouse Planning';
            } else if (strategyNumber <= 40) {
                category = 'Estate Recovery Planning';
            } else if (strategyNumber <= 45) {
                category = 'Post-Eligibility Planning';
            } else if (strategyNumber <= 50) {
                category = 'Crisis Planning';
            } else if (strategyNumber <= 60) {
                category = 'Specialized Planning';
            } else if (strategyNumber <= 65) {
                category = 'Compliance & Monitoring';
            } else if (strategyNumber <= 75) {
                category = 'Advanced Planning';
            } else if (strategyNumber <= 85) {
                category = 'Technology & Modern Planning';
            } else if (strategyNumber <= 95) {
                category = 'Family & Relationship Strategies';
            } else {
                category = 'Emergency & Contingency';
            }
            
            // Determine timing based on timing description
            if (sections.timing.toLowerCase().includes('immediate') || 
                sections.timing.toLowerCase().includes('can be implemented') ||
                sections.timing.toLowerCase().includes('close to')) {
                timingCategory = 'immediate';
            } else if (sections.timing.toLowerCase().includes('5 years') ||
                       sections.timing.toLowerCase().includes('long-term')) {
                timingCategory = 'long_term';
            }
            
            // Extract effectiveness score
            let effectivenessScore = 6; // default
            const effectivenessMatch = sections.effectiveness.match(/(\d+)\/10/);
            if (effectivenessMatch) {
                effectivenessScore = parseInt(effectivenessMatch[1]);
            } else if (sections.effectiveness.toLowerCase().includes('high')) {
                effectivenessScore = 8;
            } else if (sections.effectiveness.toLowerCase().includes('medium-high')) {
                effectivenessScore = 7;
            } else if (sections.effectiveness.toLowerCase().includes('medium')) {
                effectivenessScore = 6;
            } else if (sections.effectiveness.toLowerCase().includes('low')) {
                effectivenessScore = 4;
            } else if (sections.effectiveness.toLowerCase().includes('essential')) {
                effectivenessScore = 10;
            }
            
            // Create user-friendly name
            const friendlyName = strategyName.replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());
            
            // Create plain English explanation
            const plainEnglishExplanation = sections.strategy;
            
            // Create benefits array in the format expected by the database
            const realBenefits = sections.benefits.map(benefit => ({
                title: benefit.split(' - ')[0] || benefit.substring(0, 50) + '...',
                description: benefit
            }));
            
            // Create what to know array
            const whatToKnow = sections.limitations;
            
            // Determine badge info
            let badgeColor = 'blue';
            let badgeText = '🔵 MEDIUM-TERM - Strategic Planning';
            
            if (timingCategory === 'immediate') {
                badgeColor = 'green';
                badgeText = '🟢 IMMEDIATE - No Waiting!';
            } else if (timingCategory === 'long_term') {
                badgeColor = 'yellow';
                badgeText = '🟡 LONG-TERM - Plan Ahead';
            }
            
            strategies.push({
                id: strategyNumber,
                formal_name: strategyName,
                friendly_name: friendlyName,
                category: category,
                timing_category: timingCategory,
                badge_color: badgeColor,
                badge_text: badgeText,
                savings_description: `Strategy ${strategyNumber} - ${sections.effectiveness}`,
                emotional_hook: `Discover how ${friendlyName.toLowerCase()} can protect your assets and secure your family's future.`,
                plain_english_explanation: plainEnglishExplanation,
                real_benefits: realBenefits,
                what_to_know: whatToKnow,
                effectiveness_metrics: {
                    success_rate: effectivenessScore >= 8 ? "90%+" : effectivenessScore >= 6 ? "70-90%" : "50-70%",
                    protection_amount: "Varies by situation",
                    time_to_implement: timingCategory === 'immediate' ? "1-4 weeks" : 
                                     timingCategory === 'long_term' ? "5+ years" : "1-2 years"
                },
                bottom_line: sections.timing,
                effectiveness_score: effectivenessScore,
                is_active: true,
                sort_order: strategyNumber
            });
            
        } catch (error) {
            console.error(`Error parsing strategy ${index + 1}:`, error.message);
        }
    });
    
    return strategies;
}

// Check for existing strategies to avoid duplicates
async function getExistingStrategies() {
    try {
        const result = await db.query('SELECT formal_name, sort_order FROM enhanced_strategies');
        return new Set(result.rows.map(row => `${row.formal_name}_${row.sort_order}`));
    } catch (error) {
        console.error('Error getting existing strategies:', error);
        return new Set();
    }
}

// Insert strategies into database
async function insertStrategies(strategies) {
    console.log(`\nInserting ${strategies.length} strategies into database...`);
    
    const existingStrategies = await getExistingStrategies();
    console.log(`Found ${existingStrategies.size} existing strategies in database`);
    
    let inserted = 0;
    let skipped = 0;
    
    for (const strategy of strategies) {
        const strategyKey = `${strategy.formal_name}_${strategy.sort_order}`;
        
        if (existingStrategies.has(strategyKey)) {
            console.log(`Skipping duplicate: ${strategy.formal_name} (${strategy.sort_order})`);
            skipped++;
            continue;
        }
        
        try {
            const query = `
                INSERT INTO enhanced_strategies (
                    formal_name, friendly_name, category, timing_category, badge_color, badge_text,
                    savings_description, emotional_hook, plain_english_explanation, real_benefits,
                    what_to_know, effectiveness_metrics, bottom_line, effectiveness_score,
                    is_active, sort_order
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING id
            `;
            
            const values = [
                strategy.formal_name,
                strategy.friendly_name,
                strategy.category,
                strategy.timing_category,
                strategy.badge_color,
                strategy.badge_text,
                strategy.savings_description,
                strategy.emotional_hook,
                strategy.plain_english_explanation,
                strategy.real_benefits,
                strategy.what_to_know,
                strategy.effectiveness_metrics,
                strategy.bottom_line,
                strategy.effectiveness_score,
                strategy.is_active,
                strategy.sort_order
            ];
            
            const result = await db.query(query, values);
            console.log(`✓ Inserted: ${strategy.formal_name} (ID: ${result.rows[0].id})`);
            inserted++;
            
        } catch (error) {
            console.error(`✗ Error inserting ${strategy.formal_name}:`, error.message);
        }
    }
    
    console.log(`\n=== Migration Complete ===`);
    console.log(`Inserted: ${inserted} strategies`);
    console.log(`Skipped (duplicates): ${skipped} strategies`);
    console.log(`Total strategies processed: ${strategies.length}`);
    
    return { inserted, skipped };
}

// Remove duplicate strategies based on formal_name and sort_order
async function deduplicateStrategies() {
    console.log('\n=== Running Deduplication ===');
    
    try {
        // Find duplicates
        const duplicateQuery = `
            SELECT formal_name, sort_order, COUNT(*) as count, 
                   ARRAY_AGG(id ORDER BY created_at DESC) as ids
            FROM enhanced_strategies 
            GROUP BY formal_name, sort_order 
            HAVING COUNT(*) > 1
        `;
        
        const duplicates = await db.query(duplicateQuery);
        
        if (duplicates.rows.length === 0) {
            console.log('No duplicates found.');
            return 0;
        }
        
        console.log(`Found ${duplicates.rows.length} sets of duplicates`);
        
        let removed = 0;
        
        for (const duplicate of duplicates.rows) {
            const idsToRemove = duplicate.ids.slice(1); // Keep the first (newest) one
            
            console.log(`Removing ${idsToRemove.length} duplicate(s) of "${duplicate.formal_name}"`);
            
            for (const id of idsToRemove) {
                await db.query('DELETE FROM enhanced_strategies WHERE id = $1', [id]);
                removed++;
            }
        }
        
        console.log(`Removed ${removed} duplicate strategies`);
        return removed;
        
    } catch (error) {
        console.error('Error during deduplication:', error.message);
        return 0;
    }
}

// Main migration function
async function runMigration() {
    try {
        console.log('=== Medicaid Strategies Migration ===\n');
        
        const filePath = '/Users/richardladson/Documents/web_dev/medicaid_planning/Complete_Medicaid_Planning_Strategies_Database.txt';
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        
        // Parse strategies from file
        const strategies = parseStrategiesFile(filePath);
        console.log(`Successfully parsed ${strategies.length} strategies`);
        
        // Insert strategies
        const result = await insertStrategies(strategies);
        
        // Run deduplication
        const duplicatesRemoved = await deduplicateStrategies();
        
        // Final count
        const finalCount = await db.query('SELECT COUNT(*) as count FROM enhanced_strategies');
        console.log(`\n=== Final Results ===`);
        console.log(`Total strategies in database: ${finalCount.rows[0].count}`);
        console.log(`New strategies added: ${result.inserted}`);
        console.log(`Duplicates removed: ${duplicatesRemoved}`);
        
        if (finalCount.rows[0].count >= 101) {
            console.log('✅ Migration successful! All 101 strategies are now in the database.');
        } else {
            console.log(`⚠️  Expected 101 strategies, but found ${finalCount.rows[0].count}. Please review the results.`);
        }
        
    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    } finally {
        await db.end();
    }
}

// Run the migration
if (require.main === module) {
    runMigration();
}

module.exports = { runMigration, parseStrategiesFile, deduplicateStrategies };