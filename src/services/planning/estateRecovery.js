// src/services/planning/estateRecovery.js
const logger = require('../../config/logger');
const medicaidRules = require('../../data/medicaid_rules_2025.json');

/**
 * Assesses estate recovery risk based on asset value and home ownership
 * 
 * @param {Object} assets - Client's asset data
 * @param {string} state - State of application
 * @returns {Object} Estate recovery risk assessment
 */
function assessEstateRecoveryRisk(assets, state) {
  logger.debug(`Assessing estate recovery risk for ${state}`);

  const rules = medicaidRules[state.toLowerCase()];
  if (!rules) {
    throw new Error(`No Medicaid rules found for state: ${state}`);
  }

  const {
    estateRecoveryHighRiskThreshold,
    estateRecoveryMediumRiskThreshold,
    estateRecoveryHomeThreshold
  } = rules;

  if (
    typeof estateRecoveryHighRiskThreshold !== 'number' ||
    typeof estateRecoveryMediumRiskThreshold !== 'number' ||
    typeof estateRecoveryHomeThreshold !== 'number'
  ) {
    throw new Error(`Missing estate recovery thresholds in rules for ${state}`);
  }

  const totalAssets = Object.values(assets).reduce((a, b) => a + b, 0);
  const hasHome = assets.home !== undefined && assets.home > 0;

  let riskLevel = "low";
  if (totalAssets >= estateRecoveryHighRiskThreshold) {
    riskLevel = "high";
  } else if (totalAssets >= estateRecoveryMediumRiskThreshold) {
    riskLevel = "medium";
  }

  return {
    totalAssets,
    hasHome,
    riskLevel,
    state
  };
}

/**
 * Determines estate recovery mitigation strategies based on risk
 * 
 * @param {Object} riskAssessment - Result from assessEstateRecoveryRisk
 * @param {Object} rules - Medicaid rules for the state
 * @returns {Array} Array of strategy strings
 */
function determineEstateRecoveryStrategies(riskAssessment, rules) {
  logger.debug("Determining estate recovery strategies");
  const strategies = [];

  const { totalAssets, hasHome, riskLevel, state } = riskAssessment;
  const { estateRecoveryHomeThreshold } = rules;

  if (riskLevel === "high") {
    strategies.push("Consider creating an irrevocable trust to shelter assets");
    strategies.push("Consult with an elder law attorney for advanced asset protection planning");
  } else if (riskLevel === "medium") {
    strategies.push("Evaluate converting assets into exempt forms (e.g. annuities)");
    strategies.push("Consider gifting strategies within allowable Medicaid guidelines");
  } else {
    strategies.push("Maintain current asset structure with annual reviews");
  }

  if (hasHome && totalAssets >= estateRecoveryHomeThreshold) {
    strategies.push("Explore strategies to protect the home from estate recovery");
  }

  return strategies;
}

/**
 * Builds a detailed estate recovery planning approach
 * 
 * @param {Array} strategies - Recommended planning strategies
 * @param {Object} assessment - Risk assessment object
 * @returns {string} Formatted estate recovery planning approach
 */
function planEstateRecoveryApproach(strategies, assessment) {
  logger.debug("Building estate recovery planning approach");
  let approach = "Estate Recovery Planning Approach:\n\n";

  approach += `- Total Assets: $${assessment.totalAssets.toFixed(2)}\n`;
  approach += `- Risk Level: ${assessment.riskLevel.toUpperCase()}\n`;
  approach += `- Home Ownership: ${assessment.hasHome ? "Yes" : "No"}\n\n`;

  approach += "Recommended Strategies:\n";
  strategies.forEach(strategy => {
    approach += `- ${strategy}\n`;
  });

  approach += "\nImportant Considerations:\n";
  approach += "- Medicaid estate recovery applies to certain assets after the recipient's death\n";
  approach += "- Some states expand recovery beyond mandatory limits — check your local laws\n";
  approach += `- Always consult with a qualified elder law attorney in ${assessment.state}\n`;

  return approach;
}

/**
 * Complete estate recovery planning workflow
 * 
 * @param {Object} clientInfo - Client demographic information (not directly used)
 * @param {Object} assets - Client's asset data
 * @param {string} state - The state of application
 * @returns {Promise<Object>} Complete estate recovery planning result
 */
async function medicaidEstateRecoveryPlanning(clientInfo, assets, state) {
  logger.info(`Starting estate recovery planning for ${state}`);

  try {
    const rules = medicaidRules[state.toLowerCase()];
    if (!rules) {
      throw new Error(`No Medicaid rules found for state: ${state}`);
    }

    const riskAssessment = assessEstateRecoveryRisk(assets, state);
    const strategies = determineEstateRecoveryStrategies(riskAssessment, rules);
    const approach = planEstateRecoveryApproach(strategies, riskAssessment);

    logger.info('Estate recovery planning completed successfully');

    return {
      riskAssessment,
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
