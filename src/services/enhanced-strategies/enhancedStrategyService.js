// Enhanced Strategy Service
// Handles all operations for the new enhanced strategy system

const db = require('../../../config/database');
const logger = require('../../config/logger');

/**
 * Get all enhanced strategies
 * @param {Object} filters - Optional filters (category, timing_category, active)
 * @returns {Promise<Array>} Array of enhanced strategies
 */
async function getAllEnhancedStrategies(filters = {}) {
  try {
    let query = `
      SELECT 
        id, formal_name, friendly_name, category, timing_category, badge_color, badge_text,
        savings_description, emotional_hook, plain_english_explanation, real_benefits,
        what_to_know, effectiveness_metrics, bottom_line, effectiveness_score,
        is_active, sort_order, created_at, updated_at
      FROM enhanced_strategies 
      WHERE is_active = true
    `;
    
    const queryParams = [];
    let paramCount = 1;
    
    // Add filters
    if (filters.category) {
      query += ` AND category = $${paramCount}`;
      queryParams.push(filters.category);
      paramCount++;
    }
    
    if (filters.timing_category) {
      query += ` AND timing_category = $${paramCount}`;
      queryParams.push(filters.timing_category);
      paramCount++;
    }
    
    if (filters.min_effectiveness) {
      query += ` AND effectiveness_score >= $${paramCount}`;
      queryParams.push(filters.min_effectiveness);
      paramCount++;
    }
    
    query += ' ORDER BY sort_order ASC, effectiveness_score DESC, id ASC';
    
    const result = await db.query(query, queryParams);
    
    logger.info(`Retrieved ${result.rows.length} enhanced strategies`, { filters });
    return result.rows;
    
  } catch (error) {
    logger.error('Error getting enhanced strategies:', error);
    throw new Error('Failed to retrieve enhanced strategies');
  }
}

/**
 * Get enhanced strategy by ID
 * @param {number} id - Strategy ID
 * @returns {Promise<Object|null>} Enhanced strategy or null if not found
 */
async function getEnhancedStrategyById(id) {
  try {
    const query = `
      SELECT 
        id, formal_name, friendly_name, category, timing_category, badge_color, badge_text,
        savings_description, emotional_hook, plain_english_explanation, real_benefits,
        what_to_know, effectiveness_metrics, bottom_line, effectiveness_score,
        is_active, sort_order, created_at, updated_at
      FROM enhanced_strategies 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      logger.warn(`Enhanced strategy not found: ${id}`);
      return null;
    }
    
    logger.info(`Retrieved enhanced strategy: ${result.rows[0].formal_name}`);
    return result.rows[0];
    
  } catch (error) {
    logger.error(`Error getting enhanced strategy by ID ${id}:`, error);
    throw new Error('Failed to retrieve enhanced strategy');
  }
}

/**
 * Get enhanced strategy by formal name
 * @param {string} formalName - Strategy formal name
 * @returns {Promise<Object|null>} Enhanced strategy or null if not found
 */
async function getEnhancedStrategyByName(formalName) {
  try {
    const query = `
      SELECT 
        id, formal_name, friendly_name, category, timing_category, badge_color, badge_text,
        savings_description, emotional_hook, plain_english_explanation, real_benefits,
        what_to_know, effectiveness_metrics, bottom_line, effectiveness_score,
        is_active, sort_order, created_at, updated_at
      FROM enhanced_strategies 
      WHERE formal_name = $1 AND is_active = true
    `;
    
    const result = await db.query(query, [formalName]);
    
    if (result.rows.length === 0) {
      logger.warn(`Enhanced strategy not found by name: ${formalName}`);
      return null;
    }
    
    logger.info(`Retrieved enhanced strategy by name: ${formalName}`);
    return result.rows[0];
    
  } catch (error) {
    logger.error(`Error getting enhanced strategy by name ${formalName}:`, error);
    throw new Error('Failed to retrieve enhanced strategy by name');
  }
}

/**
 * Map old strategy names to enhanced strategies
 * @param {Array} oldStrategyNames - Array of old strategy names
 * @returns {Promise<Array>} Array of enhanced strategies
 */
async function mapOldStrategiesToEnhanced(oldStrategyNames) {
  try {
    if (!Array.isArray(oldStrategyNames) || oldStrategyNames.length === 0) {
      return [];
    }
    
    const enhancedStrategies = [];
    
    // Strategy name mapping (old names to new formal names)
    const strategyMapping = {
      'Reduce countable assets through exempt purchases or annuities': 'Strategy 3 - ASSET_PLANNING',
      'Transfer excess assets to a community spouse if allowed': 'Strategy 2 - ASSET_PLANNING',
      'Consider setting up a Medicaid asset protection trust': 'Strategy 1 - ASSET_PLANNING',
      'Establish a Qualified Income Trust (Miller Trust) for excess income': 'Strategy 8 - INCOME_PLANNING',
      'Purchase a Medicaid-compliant annuity to convert assets to income stream': 'Strategy 4 - ASSET_PLANNING',
      'Use income to pay down medical expenses and care liability': 'Strategy 9 - INCOME_PLANNING',
      'Irrevocable Trust': 'Strategy 15 - TRUST_PLANNING',
      'Spousal Transfer': 'Strategy 2 - ASSET_PLANNING',
      'Asset Protection Trust': 'Strategy 1 - ASSET_PLANNING',
      'Miller Trust': 'Strategy 8 - INCOME_PLANNING',
      'Medicaid Annuity': 'Strategy 4 - ASSET_PLANNING'
    };
    
    for (const oldName of oldStrategyNames) {
      // Try exact mapping first
      const mappedName = strategyMapping[oldName];
      if (mappedName) {
        const enhanced = await getEnhancedStrategyByName(mappedName);
        if (enhanced) {
          enhancedStrategies.push(enhanced);
          continue;
        }
      }
      
      // Try partial matching
      let found = false;
      for (const [oldPattern, newName] of Object.entries(strategyMapping)) {
        if (oldName.toLowerCase().includes(oldPattern.toLowerCase()) || 
            oldPattern.toLowerCase().includes(oldName.toLowerCase())) {
          const enhanced = await getEnhancedStrategyByName(newName);
          if (enhanced && !enhancedStrategies.find(s => s.id === enhanced.id)) {
            enhancedStrategies.push(enhanced);
            found = true;
            break;
          }
        }
      }
      
      // If no mapping found, log it but don't break
      if (!found) {
        logger.warn(`No enhanced strategy mapping found for: ${oldName}`);
      }
    }
    
    logger.info(`Mapped ${oldStrategyNames.length} old strategies to ${enhancedStrategies.length} enhanced strategies`);
    return enhancedStrategies;
    
  } catch (error) {
    logger.error('Error mapping old strategies to enhanced:', error);
    throw new Error('Failed to map strategies');
  }
}

/**
 * Get strategies for specific client assessment
 * @param {Object} assessment - Client assessment data
 * @returns {Promise<Array>} Array of relevant enhanced strategies
 */
async function getStrategiesForAssessment(assessment) {
  try {
    const strategies = [];
    
    // Determine urgency level for timing-based recommendations
    const urgency = assessment.urgency || 'Medium';
    const isHighUrgency = urgency.toLowerCase().includes('high');
    const hasExcessResources = (assessment.excessResources || 0) > 0;
    const isMarried = assessment.clientInfo?.maritalStatus?.toLowerCase() === 'married';
    const excessAmount = assessment.excessResources || 0;
    
    // 1. ASSET PLANNING STRATEGIES (only if relevant)
    if (hasExcessResources) {
      // Get all relevant asset planning strategies for excess resources
      const assetStrategies = await getAllEnhancedStrategies({ category: 'Asset Planning' });
      strategies.push(...assetStrategies);
    }
    
    // 2. INCOME PLANNING STRATEGIES (only if income is over limit)
    if (!assessment.isIncomeEligible) {
      const incomeStrategies = await getAllEnhancedStrategies({ category: 'Income Planning' });
      strategies.push(...incomeStrategies);
    }
    
    // 3. TRUST PLANNING STRATEGIES (for long-term planning with significant assets)
    if (!isHighUrgency && excessAmount > 50000) {
      const trustStrategies = await getAllEnhancedStrategies({ category: 'Trust Planning' });
      strategies.push(...trustStrategies);
    }
    
    // 4. ANNUITY PLANNING STRATEGIES (for moderate excess assets)
    if (excessAmount > 25000) {
      const annuityStrategies = await getAllEnhancedStrategies({ category: 'Annuity Planning' });
      strategies.push(...annuityStrategies);
    }
    
    // 5. COMMUNITY SPOUSE PLANNING (only if married)
    if (isMarried) {
      const spouseStrategies = await getAllEnhancedStrategies({ category: 'Community Spouse Planning' });
      strategies.push(...spouseStrategies);
    }
    
    // 6. CRISIS PLANNING (only if high urgency situation)
    if (isHighUrgency) {
      const crisisStrategies = await getAllEnhancedStrategies({ category: 'Crisis Planning' });
      strategies.push(...crisisStrategies);
    }
    
    // 7. ESTATE RECOVERY PLANNING (only if they have assets at risk)
    if (hasExcessResources || excessAmount > 10000) {
      const estateStrategies = await getAllEnhancedStrategies({ category: 'Estate Recovery Planning' });
      strategies.push(...estateStrategies);
    }
    
    // 8. POST-ELIGIBILITY PLANNING (always include - helps with preparation)
    const postEligibilityStrategies = await getAllEnhancedStrategies({ category: 'Post-Eligibility Planning' });
    strategies.push(...postEligibilityStrategies);
    
    // 9. SPECIALIZED PLANNING (for complex situations only)
    if (excessAmount > 100000 || isMarried) {
      const specializedStrategies = await getAllEnhancedStrategies({ category: 'Specialized Planning' });
      strategies.push(...specializedStrategies);
    }
    
    // 10. COMPLIANCE & MONITORING (always include - important for all clients)
    const complianceStrategies = await getAllEnhancedStrategies({ category: 'Compliance & Monitoring' });
    strategies.push(...complianceStrategies);
    
    // Remove duplicates and sort by effectiveness and timing
    const uniqueStrategies = strategies.filter((strategy, index, self) => 
      index === self.findIndex(s => s.id === strategy.id)
    );
    
    // Sort by: immediate timing first, then effectiveness score, then sort_order
    uniqueStrategies.sort((a, b) => {
      // Prioritize immediate timing
      if (a.timing_category === 'immediate' && b.timing_category !== 'immediate') return -1;
      if (b.timing_category === 'immediate' && a.timing_category !== 'immediate') return 1;
      
      // Then by effectiveness score
      if (a.effectiveness_score !== b.effectiveness_score) {
        return b.effectiveness_score - a.effectiveness_score;
      }
      
      // Finally by sort order
      return a.sort_order - b.sort_order;
    });
    
    // Return all relevant strategies - no artificial limit
    // The UI can handle pagination or scrolling if needed
    
    logger.info(`Generated ${uniqueStrategies.length} relevant strategies for assessment (from ${strategies.length} total before deduplication)`);
    return uniqueStrategies;
    
  } catch (error) {
    logger.error('Error getting strategies for assessment:', error);
    throw new Error('Failed to get assessment strategies');
  }
}

/**
 * Get strategy categories with counts
 * @returns {Promise<Array>} Array of categories with strategy counts
 */
async function getStrategyCategories() {
  try {
    const query = `
      SELECT 
        category,
        COUNT(*) as strategy_count,
        AVG(effectiveness_score) as avg_effectiveness
      FROM enhanced_strategies 
      WHERE is_active = true
      GROUP BY category
      ORDER BY category
    `;
    
    const result = await db.query(query);
    
    logger.info(`Retrieved ${result.rows.length} strategy categories`);
    return result.rows;
    
  } catch (error) {
    logger.error('Error getting strategy categories:', error);
    throw new Error('Failed to retrieve strategy categories');
  }
}

module.exports = {
  getAllEnhancedStrategies,
  getEnhancedStrategyById,
  getEnhancedStrategyByName,
  mapOldStrategiesToEnhanced,
  getStrategiesForAssessment,
  getStrategyCategories
};