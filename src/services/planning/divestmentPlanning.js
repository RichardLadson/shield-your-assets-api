// src/services/planning/divestmentPlanning.js
const logger = require('../../config/logger');

/**
 * Assesses the client's divestment planning situation
 * 
 * @param {Object} assets - Client's asset data
 * @param {string} state - State of application
 * @returns {Object} Divestment situation assessment
 */
function assessDivestmentSituation(assets, state) {
  logger.debug(`Assessing divestment situation for state ${state}`);
  
  // Calculate countable assets (excluding home)
  const countableAssets = Object.entries(assets)
    .filter(([key]) => key !== "home" && key !== "primary_residence")
    .reduce((sum, [, value]) => sum + value, 0);
  
  // Calculate total assets
  const totalAssets = Object.values(assets).reduce((a, b) => a + b, 0);
  
  // Assume $2000 is the exempt threshold
  const assetLimit = 2000;
  const excessAssets = Math.max(0, countableAssets - assetLimit);
  
  // Average monthly nursing home cost (state-specific in production)
  const averageNursingHomeCost = 8000;
  
  return { 
    totalAssets, 
    countableAssets, 
    excessAssets, 
    state, 
    averageNursingHomeCost 
  };
}

/**
 * Determines divestment planning strategies based on assessment
 * 
 * @param {Object} situation - Divestment situation from assessDivestmentSituation
 * @returns {Array} Array of strategy strings
 */
function determineDivestmentStrategies(situation) {
  logger.debug("Determining divestment strategies");
  const strategies = [];
  
  // Only recommend divestment strategies if there are excess assets
  if (situation.excessAssets > 0) {
    strategies.push("Evaluate Modern Half-a-Loaf with Annuity/Promissory Note");
    strategies.push("Consider Reverse Half-a-Loaf strategy");
    strategies.push("Assess potential for Collapsing Penalty Period strategy");
  }
  
  return strategies;
}

/**
 * Creates a detailed divestment planning approach
 * 
 * @param {Array} strategies - Strategies from determineDivestmentStrategies
 * @param {Object} situation - Divestment situation from assessDivestmentSituation
 * @returns {string} Formatted divestment planning approach
 */
function planDivestmentApproach(strategies, situation) {
  logger.debug("Planning divestment approach");
  let approach = "Divestment Planning Approach:\n";
  
  strategies.forEach(strategy => {
    if (strategy.includes("Reverse Half-a-Loaf")) {
      approach += "- Evaluate Reverse Half-a-Loaf strategy:\n";
      approach += "  1. Gift the entire amount of excess assets.\n";
      approach += "  2. Calculate the initial penalty period.\n";
      approach += "  3. Return a portion of the gift to reduce the penalty period.\n";
      approach += "  4. Apply for Medicaid with the reduced penalty period.\n";
    } else if (strategy.includes("Modern Half-a-Loaf")) {
      const giftAmount = situation.excessAssets / 2;
      const penaltyPeriod = giftAmount / situation.averageNursingHomeCost;
      
      approach += "- Consider Modern Half-a-Loaf strategy:\n";
      approach += `  1. Gift $${giftAmount.toFixed(2)} of the excess assets.\n`;
      approach += `  2. Use the remaining $${(situation.excessAssets - giftAmount).toFixed(2)} for a Medicaid-compliant annuity or promissory note.\n`;
      approach += `  3. Estimated penalty period: ${penaltyPeriod.toFixed(2)} months.\n`;
      approach += "  4. Use the annuity/note to cover care during the penalty period.\n";
    } else if (strategy.includes("Collapsing Penalty Period")) {
      approach += "- Evaluate Collapsing Penalty Period strategy:\n";
      approach += "  1. Gift assets to create an initial penalty period.\n";
      approach += "  2. Return a portion of the gift to reduce the penalty period.\n";
      approach += "  3. Repeat the process to minimize the overall penalty period.\n";
    }
  });
  
  if (strategies.length === 0) {
    approach += "- No divestment strategies are recommended at this time as there are no excess assets.\n";
    approach += "- Focus on other planning approaches for Medicaid eligibility.\n";
  } else {
    approach += "\nImportant Considerations:\n";
    approach += "- All divestment strategies must account for the 5-year lookback period.\n";
    approach += "- Consult with an elder law attorney before implementing any divestment strategy.\n";
    approach += `- State-specific rules in ${situation.state} may impact the effectiveness of these strategies.\n`;
  }
  
  return approach;
}

/**
 * Complete divestment planning workflow
 * 
 * @param {Object} clientInfo - Client demographic information (not directly used but maintained for consistency)
 * @param {Object} assets - Client's asset data
 * @param {string} state - The state of application
 * @returns {Promise<Object>} Complete divestment planning result
 */
async function medicaidDivestmentPlanning(clientInfo, assets, state) {
  logger.info(`Starting Medicaid divestment planning for ${state}`);
  
  try {
    // Assess divestment situation
    const situation = assessDivestmentSituation(assets, state);
    
    // Determine strategies
    const strategies = determineDivestmentStrategies(situation);
    
    // Create detailed plan
    const approach = planDivestmentApproach(strategies, situation);
    
    logger.info('Divestment planning completed successfully');
    
    return {
      situation,
      strategies,
      approach,
      status: 'success'
    };
  } catch (error) {
    logger.error(`Error in divestment planning: ${error.message}`);
    return {
      error: `Divestment planning error: ${error.message}`,
      status: 'error'
    };
  }
}

module.exports = {
  assessDivestmentSituation,
  determineDivestmentStrategies,
  planDivestmentApproach,
  medicaidDivestmentPlanning
};