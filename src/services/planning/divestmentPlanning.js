// src/services/planning/divestmentPlanning.js
const logger = require('../../config/logger');
const medicaidRules = require('../../../medicaid_rules_2025.json');

/**
 * Assesses the client's divestment situation
 * 
 * @param {Object} assets - Client's asset data
 * @param {string} state - State of application
 * @param {Object} rules - Medicaid rules for the given state
 * @returns {Object} Divestment situation summary
 */
function assessDivestmentSituation(assets, state, rules) {
  logger.debug(`Assessing divestment situation for ${state}`);

  if (
    typeof rules.assetLimitSingle !== 'number' ||
    typeof rules.averageNursingHomeCost !== 'number'
  ) {
    throw new Error(`Missing asset or nursing home cost values for state: ${state}`);
  }

  const countableAssets = assets.countable || 0;
  const nonCountableAssets = assets.non_countable || 0;
  const totalAssets = countableAssets + nonCountableAssets;
  const excessAssets = Math.max(0, countableAssets - rules.assetLimitSingle);

  return {
    totalAssets,
    countableAssets,
    nonCountableAssets,
    excessAssets,
    averageNursingHomeCost: rules.averageNursingHomeCost,
    state
  };
}

/**
 * Determines recommended divestment strategies
 * 
 * @param {Object} situation - Assessed divestment situation
 * @returns {Array} List of suggested strategies
 */
function determineDivestmentStrategies(situation) {
  logger.debug("Determining divestment strategies");
  const strategies = [];

  if (situation.excessAssets > 0) {
    strategies.push("Evaluate Modern Half-a-Loaf with Annuity/Promissory Note");
    strategies.push("Consider Reverse Half-a-Loaf strategy");
    strategies.push("Explore penalty period collapse strategy using gifts and returns");
  }

  return strategies;
}

/**
 * Builds a detailed divestment approach narrative
 * 
 * @param {Array} strategies - List of applicable strategies
 * @param {Object} situation - Divestment situation summary
 * @returns {string} Narrative guidance
 */
function planDivestmentApproach(strategies, situation) {
  logger.debug("Planning divestment approach");

  if (strategies.length === 0) {
    return "No divestment strategies are recommended at this time. Focus on other planning approaches.";
  }

  let approach = "Divestment Planning Approach:\n";

  strategies.forEach((strategy) => {
    if (strategy.includes("Modern Half-a-Loaf")) {
      const giftAmount = situation.excessAssets / 2;
      const retainedAmount = situation.excessAssets - giftAmount;
      const estimatedPenalty = giftAmount / situation.averageNursingHomeCost;

      approach += "- Consider Modern Half-a-Loaf strategy:\n";
      approach += `  1. Gift $${giftAmount.toFixed(2)} of the excess assets.\n`;
      approach += `  2. Use the remaining $${retainedAmount.toFixed(2)} for a Medicaid-compliant annuity or promissory note.\n`;
      approach += `  3. Estimated penalty period: ${estimatedPenalty.toFixed(2)} months.\n`;
      approach += "  4. Use the annuity/note to cover care during the penalty period.\n\n";
    }

    if (strategy.includes("Reverse Half-a-Loaf")) {
      approach += "- Evaluate Reverse Half-a-Loaf strategy:\n";
      approach += "  1. Gift the entire amount of excess assets.\n";
      approach += "  2. Calculate the initial penalty period.\n";
      approach += "  3. Return a portion of the gift to reduce the penalty period.\n";
      approach += "  4. Apply for Medicaid with the reduced penalty period.\n\n";
    }

    if (strategy.includes("penalty period collapse")) {
      approach += "- Explore penalty period collapse strategy:\n";
      approach += "  * Combine gifting and asset returns to minimize ineligibility periods.\n";
      approach += "  * Useful for rapid transitions into Medicaid coverage.\n\n";
    }
  });

  approach += "Important Considerations:\n";
  approach += "- All divestment strategies must account for the 5-year lookback period.\n";
  approach += "- Consult with an elder law attorney before implementing any divestment strategy.\n";
  approach += `- State-specific rules in ${situation.state} may impact the effectiveness of these strategies.\n`;

  return approach;
}

/**
 * Complete divestment planning workflow
 * 
 * @param {Object} clientInfo - Client demographic info (not used directly)
 * @param {Object} assets - Client's asset profile
 * @param {string} state - State of application
 * @returns {Promise<Object>} Complete divestment planning result
 */
async function medicaidDivestmentPlanning(clientInfo, assets, state) {
  logger.info(`Starting Medicaid divestment planning for ${state}`);

  try {
    const rules = medicaidRules[state.toLowerCase()];
    if (!rules) {
      throw new Error(`No Medicaid rules found for state: ${state}`);
    }

    const situation = assessDivestmentSituation(assets, state, rules);
    const strategies = determineDivestmentStrategies(situation);
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
