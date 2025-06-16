// Enhanced Strategy Service
// Handles all operations for the new enhanced strategy system

const { Pool } = require('pg');
const logger = require('../../config/logger');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

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
    
    const result = await pool.query(query, queryParams);
    
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
    
    const result = await pool.query(query, [id]);
    
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
    
    const result = await pool.query(query, [formalName]);
    
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
      'Reduce countable assets through exempt purchases or annuities': 'Asset Conversion Strategy',
      'Transfer excess assets to a community spouse if allowed': 'Spousal Transfer Strategy',
      'Consider setting up a Medicaid asset protection trust': 'Irrevocable Trust Planning',
      'Establish a Qualified Income Trust (Miller Trust) for excess income': 'Qualified Income Trust (Miller Trust)',
      'Purchase a Medicaid-compliant annuity to convert assets to income stream': 'Medicaid-Compliant Annuity',
      'Irrevocable Trust': 'Irrevocable Trust Planning',
      'Spousal Transfer': 'Spousal Transfer Strategy',
      'Asset Protection Trust': 'Irrevocable Trust Planning',
      'Miller Trust': 'Qualified Income Trust (Miller Trust)',
      'Medicaid Annuity': 'Medicaid-Compliant Annuity'
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
    
    // Asset planning strategies
    if (assessment.excessResources > 0) {
      if (assessment.clientInfo && assessment.clientInfo.maritalStatus === 'married') {
        // Married - prioritize spousal transfer
        const spousalStrategy = await getEnhancedStrategyByName('Spousal Transfer Strategy');
        if (spousalStrategy) strategies.push(spousalStrategy);
      }
      
      // Always include asset conversion for excess resources
      const conversionStrategy = await getEnhancedStrategyByName('Asset Conversion Strategy');
      if (conversionStrategy) strategies.push(conversionStrategy);
      
      // For larger amounts, suggest annuity
      if (assessment.excessResources > 50000) {
        const annuityStrategy = await getEnhancedStrategyByName('Medicaid-Compliant Annuity');
        if (annuityStrategy) strategies.push(annuityStrategy);
      }
      
      // For long-term planning, suggest trust
      if (assessment.urgency !== 'High' && assessment.excessResources > 100000) {
        const trustStrategy = await getEnhancedStrategyByName('Irrevocable Trust Planning');
        if (trustStrategy) strategies.push(trustStrategy);
      }
    }
    
    // Income planning strategies
    if (!assessment.isIncomeEligible) {
      const millerTrust = await getEnhancedStrategyByName('Qualified Income Trust (Miller Trust)');
      if (millerTrust) strategies.push(millerTrust);
    }
    
    // Remove duplicates and sort by effectiveness
    const uniqueStrategies = strategies.filter((strategy, index, self) => 
      index === self.findIndex(s => s.id === strategy.id)
    );
    
    uniqueStrategies.sort((a, b) => b.effectiveness_score - a.effectiveness_score);
    
    logger.info(`Generated ${uniqueStrategies.length} strategies for assessment`);
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
    
    const result = await pool.query(query);
    
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