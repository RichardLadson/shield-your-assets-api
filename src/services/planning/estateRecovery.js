    // src/services/planning/estateRecovery.js
const logger = require('../../config/logger');

/**
 * Assesses the client's estate recovery risk
 * 
 * @param {Object} assets - Client's asset data
 * @param {string} state - State of application
 * @returns {Object} Estate recovery risk assessment
 */
function assessEstateRecoveryRisk(assets, state) {
  logger.debug(`Assessing estate recovery risk for state ${state}`);
  
  // Calculate total assets
  const totalAssets = Object.values(assets).reduce((a, b) => a + b, 0);
  
  // Determine risk level based on asset value
  let riskLevel = "low";
  if (totalAssets >= 200000) {
    riskLevel = "high";
  } else if (totalAssets >= 50000) {
    riskLevel = "medium";
  }
  
  return {
    totalAssets,
    riskLevel,
    state
  };
}

/**
 * Determines estate recovery planning strategies based on assessment
 * 
 * @param {Object} situation - Estate recovery situation from assessEstateRecoveryRisk
 * @returns {Array} Array of strategy strings
 */
function determineEstateRecoveryStrategies(situation) {
  logger.debug("Determining estate recovery strategies");
  const strategies = [];
  
  if (situation.riskLevel === "medium" || situation.riskLevel === "high") {
    strategies.push("Consider probate estate avoidance techniques");
    strategies.push("Explore options to convert countable assets to non-countable");
    strategies.push("Evaluate methods to protect the home from estate recovery");
    strategies.push("Review state-specific estate recovery rules");
  }
  
  if (situation.riskLevel === "high") {
    strategies.push("Investigate lifetime transfer strategies");
    strategies.push("Consider advanced legal planning with elder law attorney");
  }
  
  return strategies;
}

/**
 * Creates a detailed estate recovery planning approach
 * 
 * @param {Array} strategies - Strategies from determineEstateRecoveryStrategies
 * @param {Object} situation - Estate recovery situation from assessEstateRecoveryRisk
 * @returns {string} Formatted estate recovery planning approach
 */
function planEstateRecoveryApproach(strategies, situation) {
  logger.debug("Planning estate recovery approach");
  
  let approach = `Estate Recovery Planning Approach for ${situation.state}:\n`;
  approach += `Risk Level: ${situation.riskLevel.toUpperCase()}\n`;
  approach += `Total Assets: $${situation.totalAssets.toFixed(2)}\n\n`;
  
  if (strategies.length > 0) {
    approach += "Recommended Strategies:\n";
    
    strategies.forEach(strategy => {
      if (strategy.includes("probate estate avoidance")) {
        approach += "- Consider probate estate avoidance techniques:\n";
        approach += "  * Review titling of assets to avoid probate\n";
        approach += "  * Explore pay-on-death designations for accounts\n";
        approach += "  * Consider transfer-on-death deeds where available\n";
      } else if (strategy.includes("convert countable assets")) {
        approach += "- Explore options to convert countable assets to non-countable or protected assets:\n";
        approach += "  * Evaluate exempt transfers to certain family members\n";
        approach += "  * Consider home improvements or modifications\n";
        approach += "  * Explore purchasing exempt assets that benefit the Medicaid recipient\n";
      } else if (strategy.includes("protect the home")) {
        approach += "- Evaluate methods to protect the home from estate recovery:\n";
        approach += "  * Investigate life estate deeds with powers\n";
        approach += "  * Consider lady bird deeds in states where available\n";
        approach += "  * Explore caregiver child exemption if applicable\n";
      } else if (strategy.includes("state-specific")) {
        approach += "- Review state-specific estate recovery rules:\n";
        approach += `  * Understand ${situation.state}'s specific recovery policies\n`;
        approach += "  * Identify potential exemptions or hardship waivers\n";
        approach += "  * Stay informed about legislative changes affecting recovery\n";
      } else if (strategy.includes("lifetime transfer")) {
        approach += "- Investigate lifetime transfer strategies:\n";
        approach += "  * Consider irrevocable trusts (accounting for 5-year lookback)\n";
        approach += "  * Evaluate partial interest transfers\n";
        approach += "  * Review homestead protection options\n";
      } else if (strategy.includes("advanced legal planning")) {
        approach += "- Consider advanced legal planning with elder law attorney:\n";
        approach += "  * Develop comprehensive estate and Medicaid planning strategy\n";
        approach += "  * Ensure coordination of all planning documents\n";
        approach += "  * Address potential family dynamics issues proactively\n";
      }
    });
  } else {
    approach += "At the current asset level, estate recovery risk is low. However, continue to monitor:\n";
    approach += "- Changes in state estate recovery policies\n";
    approach += "- Any increases in assets through inheritances or other sources\n";
    approach += "- Changes in family situation that might affect recovery exemptions\n";
  }
  
  approach += "\nConsult with an elder law attorney to finalize your estate recovery plan.";
  return approach;
}

/**
 * Complete estate recovery planning workflow
 * 
 * @param {Object} clientInfo - Client demographic information (not directly used but maintained for consistency)
 * @param {Object} assets - Client's asset data
 * @param {string} state - The state of application
 * @returns {Promise<Object>} Complete estate recovery planning result
 */
async function medicaidEstateRecoveryPlanning(clientInfo, assets, state) {
  logger.info(`Starting Medicaid estate recovery planning for ${state}`);
  
  try {
    // Assess estate recovery risk
    const situation = assessEstateRecoveryRisk(assets, state);
    
    // Determine strategies
    const strategies = determineEstateRecoveryStrategies(situation);
    
    // Create detailed plan
    const approach = planEstateRecoveryApproach(strategies, situation);
    
    logger.info('Estate recovery planning completed successfully');
    
    return {
      situation,
      strategies,
      approach,
      status: 'success'
    };
  } catch (error) {
    logger.error(`Error in estate recovery planning: ${error.message}`);
    return {
      error: `Estate recovery planning error: ${error.message}`,
      status: 'error'
    };
  }
}

module.exports = {
  assessEstateRecoveryRisk,
  determineEstateRecoveryStrategies,
  planEstateRecoveryApproach,
  medicaidEstateRecoveryPlanning
};