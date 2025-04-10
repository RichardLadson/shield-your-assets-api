// src/services/planning/annuityPlanning.js
const logger = require('../../config/logger');

/**
 * Assesses the client's annuity planning situation
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's asset data
 * @param {string} state - State of application
 * @returns {Object} Annuity situation assessment
 */
function assessAnnuitySituation(clientInfo, assets, state) {
  logger.debug(`Assessing annuity situation for ${clientInfo.name}`);
  
  // Calculate excess countable assets
  const countableAssets = assets.countable || 0;
  const excessAssets = Math.max(0, countableAssets - 2000); // Using $2000 as a simple threshold
  
  // Check for qualified retirement accounts
  const hasQualifiedAccounts = !!(
    assets.ira || 
    assets.retirementAccounts || 
    assets["401k"] || 
    assets.qualifiedAccounts
  );
  
  return {
    excessAssets,
    hasQualifiedAccounts,
    state,
    age: clientInfo.age
  };
}

/**
 * Determines annuity planning strategies based on assessment
 * 
 * @param {Object} situation - Annuity situation from assessAnnuitySituation
 * @returns {Array} Array of strategy strings
 */
function determineAnnuityStrategies(situation) {
  logger.debug("Determining annuity strategies");
  const strategies = [];
  
  // Recommend strategies based on assessment
  if (situation.excessAssets > 0) {
    strategies.push("Evaluate half-a-loaf strategy with annuity");
    strategies.push("Consider promissory note strategy");
  }
  
  if (situation.hasQualifiedAccounts) {
    strategies.push("Assess Qualified Medicaid SPIA options");
  }
  
  // Texas-specific strategy
  if (situation.state.toLowerCase() === "tx") {
    strategies.push("Explore Qualified Deferred Annuities option");
  }
  
  // Always include this option
  strategies.push("Evaluate personal service contract option");
  
  return strategies;
}

/**
 * Creates a detailed annuity planning approach
 * 
 * @param {Array} strategies - Strategies from determineAnnuityStrategies
 * @param {Object} situation - Annuity situation from assessAnnuitySituation
 * @returns {string} Formatted annuity planning approach
 */
function planAnnuityApproach(strategies, situation) {
  logger.debug("Planning annuity approach");
  let approach = "Annuity and Promissory Note Planning Approach:\n";
  
  strategies.forEach(strategy => {
    if (strategy.includes("half-a-loaf")) {
      const giftAmount = situation.excessAssets / 2;
      const remainingAmount = situation.excessAssets - giftAmount;
      
      approach += "- Consider gifting half of the excess assets and using the remainder for a Medicaid-compliant annuity.\n";
      approach += `  * Gift amount: $${giftAmount.toFixed(2)}\n`;
      approach += `  * Annuity amount: $${remainingAmount.toFixed(2)}\n`;
      approach += "  * This creates a penalty period but provides income to cover care during that period.\n";
    } else if (strategy.includes("promissory note")) {
      approach += "- Evaluate using a promissory note to convert excess assets into compliant income streams.\n";
      approach += "  * Must be actuarially sound and have equal payments (no balloon payments).\n";
      approach += "  * Ensure the note is non-assignable and non-transferable.\n";
    } else if (strategy.includes("SPIA")) {
      approach += "- Explore options for a Single Premium Immediate Annuity (SPIA) to generate steady income.\n";
      approach += "  * Must be irrevocable, non-assignable, and have the state as remainder beneficiary.\n";
      approach += `  * Given the client's age (${situation.age}), estimate appropriate term parameters.\n`;
    } else if (strategy.includes("Deferred Annuities")) {
      approach += "- Investigate Texas-specific rules for Qualified Deferred Annuities.\n";
      approach += "  * Texas has unique provisions that may allow certain annuities to be exempt assets.\n";
    } else if (strategy.includes("personal service contract")) {
      approach += "- Consider establishing a personal service contract for caregiver compensation.\n";
      approach += "  * Must be for fair market value and services must actually be provided.\n";
      approach += "  * Should be properly documented and executed before services begin.\n";
    }
  });
  
  approach += "\nReview all annuity options thoroughly for fees, tax implications, and compliance with Medicaid rules.";
  return approach;
}

/**
 * Complete annuity planning workflow
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's asset data
 * @param {string} state - The state of application
 * @returns {Promise<Object>} Complete annuity planning result
 */
async function medicaidAnnuityPlanning(clientInfo, assets, state) {
  logger.info(`Starting Medicaid annuity planning for ${state}`);
  
  try {
    // Assess annuity situation
    const situation = assessAnnuitySituation(clientInfo, assets, state);
    
    // Determine strategies
    const strategies = determineAnnuityStrategies(situation);
    
    // Create detailed plan
    const approach = planAnnuityApproach(strategies, situation);
    
    logger.info('Annuity planning completed successfully');
    
    return {
      situation,
      strategies,
      approach,
      status: 'success'
    };
  } catch (error) {
    logger.error(`Error in annuity planning: ${error.message}`);
    return {
      error: `Annuity planning error: ${error.message}`,
      status: 'error'
    };
  }
}

module.exports = {
  assessAnnuitySituation,
  determineAnnuityStrategies,
  planAnnuityApproach,
  medicaidAnnuityPlanning
};