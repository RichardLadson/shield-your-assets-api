// src/services/planning/trustPlanning.js
const logger = require('../../config/logger');

/**
 * Assesses the client's trust planning situation
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's asset data
 * @param {string} state - State of application
 * @returns {Object} Trust situation assessment
 */
function assessTrustSituation(clientInfo, assets, state) {
  logger.debug(`Assessing trust situation for ${clientInfo.name}`);
  
  // Calculate countable and total assets
  const countableAssets = assets.countable || 0;
  const totalAssets = (assets.countable || 0) + (assets.non_countable || 0);
  
  // Check for disability-related factors
  // In a real implementation, these would be properties of clientInfo
  const hasDisabledChild = clientInfo.hasDisabledChild || false;
  const hasDisabledUnder65 = clientInfo.hasDisabledUnder65 || false;
  
  return {
    totalAssets,
    countableAssets,
    hasDisabledChild,
    hasDisabledUnder65,
    state
  };
}

/**
 * Determines trust planning strategies based on assessment
 * 
 * @param {Object} situation - Trust situation from assessTrustSituation
 * @returns {Array} Array of strategy strings
 */
function determineTrustStrategies(situation) {
  logger.debug("Determining trust strategies");
  const strategies = [];
  
  // Determine appropriate trust strategies based on situation
  if (situation.countableAssets > 2000) {
    strategies.push("Evaluate self-settled irrevocable trust options");
  }
  
  if (situation.hasDisabledChild) {
    strategies.push("Consider a trust for the sole benefit of a disabled child");
  }
  
  if (situation.hasDisabledUnder65) {
    strategies.push("Consider a trust for the sole benefit of a disabled person under 65");
  }
  
  // Always consider a Miller Trust for income management
  strategies.push("Consider Qualified Income Trust (Miller Trust)");
  
  return strategies;
}

/**
 * Creates a detailed trust planning approach
 * 
 * @param {Array} strategies - Strategies from determineTrustStrategies
 * @param {Object} situation - Trust situation from assessTrustSituation
 * @returns {string} Formatted trust planning approach
 */
function planTrustApproach(strategies, situation) {
  logger.debug("Planning trust approach");
  let approach = "Trust Planning Approach:\n";
  
  for (const strategy of strategies) {
    if (strategy.includes("irrevocable trust")) {
      approach += "- Consider establishing a self-settled irrevocable trust to protect assets.\n";
      approach += `  * This might help protect up to $${situation.countableAssets.toFixed(2)} of countable assets.\n`;
      approach += "  * Plan for the 5-year lookback period for asset transfers to the trust.\n";
    } else if (strategy.includes("disabled child")) {
      approach += "- Establish a trust solely for the benefit of a disabled child.\n";
      approach += "  * This is an exempt transfer that does not trigger a penalty period.\n";
      approach += "  * Ensure the trust meets specific Medicaid requirements.\n";
    } else if (strategy.includes("disabled person under 65")) {
      approach += "- Explore trust options for disabled persons under 65.\n";
      approach += "  * Consider a d4A or d4C special needs trust based on circumstances.\n";
      approach += "  * These trusts allow the disabled person to maintain benefits eligibility.\n";
    } else if (strategy.includes("Miller Trust")) {
      approach += "- Evaluate the need for a Miller Trust based on income levels.\n";
      approach += "  * This trust helps manage excess income above the Medicaid income cap.\n";
      approach += `  * Particularly relevant in ${situation.state} for income management.\n`;
    }
  }
  
  approach += "\nConsult with an elder law attorney for personalized trust planning recommendations.";
  return approach;
}

/**
 * Complete trust planning workflow
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's asset data
 * @param {string} state - The state of application
 * @returns {Promise<Object>} Complete trust planning result
 */
async function medicaidTrustPlanning(clientInfo, assets, state) {
  logger.info(`Starting Medicaid trust planning for ${state}`);
  
  try {
    // Assess trust situation
    const situation = assessTrustSituation(clientInfo, assets, state);
    
    // Determine strategies
    const strategies = determineTrustStrategies(situation);
    
    // Create detailed plan
    const approach = planTrustApproach(strategies, situation);
    
    logger.info('Trust planning completed successfully');
    
    return {
      situation,
      strategies,
      approach,
      status: 'success'
    };
  } catch (error) {
    logger.error(`Error in trust planning: ${error.message}`);
    return {
      error: `Trust planning error: ${error.message}`,
      status: 'error'
    };
  }
}

module.exports = {
  assessTrustSituation,
  determineTrustStrategies,
  planTrustApproach,
  medicaidTrustPlanning
};