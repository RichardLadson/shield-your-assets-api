// src/services/planning/annuityPlanning.js
const logger = require('../../config/logger');
const medicaidRules = require('../../../medicaid_rules_2025.json');

/**
 * Assesses whether annuity planning is applicable based on asset limits
 * 
 * @param {Object} assets - Client's asset data
 * @param {string} state - State of application
 * @param {Object} rules - Medicaid rules for the state
 * @returns {Object} Assessment result with excess assets
 */
function assessAnnuitySituation(assets, state, rules) {
  logger.debug(`Assessing annuity planning situation for ${state}`);

  if (typeof rules.assetLimitSingle !== 'number') {
    throw new Error(`Missing asset limit value for state: ${state}`);
  }

  const countableAssets = assets.countable || 0;
  const nonCountableAssets = assets.non_countable || 0;
  const totalAssets = countableAssets + nonCountableAssets;
  const excessAssets = Math.max(0, countableAssets - rules.assetLimitSingle);

  return {
    countableAssets,
    nonCountableAssets,
    totalAssets,
    excessAssets,
    state
  };
}

/**
 * Determines strategies for Medicaid-compliant annuities
 * 
 * @param {Object} situation - Output from assessAnnuitySituation
 * @returns {Array} List of annuity strategy recommendations
 */
function determineAnnuityStrategies(situation) {
  logger.debug("Determining annuity strategies");
  const strategies = [];

  if (situation.excessAssets > 0) {
    strategies.push("Evaluate half-a-loaf with annuity");
    strategies.push("Consider full annuitization of excess countable assets");
    strategies.push("Explore use of promissory notes or short-term annuities");
  }

  return strategies;
}

/**
 * Creates a detailed annuity planning approach narrative
 * 
 * @param {Array} strategies - Strategy list
 * @param {Object} situation - Client’s annuity planning situation
 * @returns {string} Narrative guidance
 */
function planAnnuityApproach(strategies, situation) {
  logger.debug("Planning annuity approach");

  if (strategies.length === 0) {
    return "No annuity-based asset protection strategies are required at this time.";
  }

  let approach = "Annuity Planning Approach:\n\n";

  strategies.forEach(strategy => {
    if (strategy.includes("half-a-loaf")) {
      const giftAmount = situation.excessAssets / 2;
      const retainedAmount = situation.excessAssets - giftAmount;

      approach += "- Evaluate Half-a-Loaf with Annuity:\n";
      approach += `  * Gift $${giftAmount.toFixed(2)} of excess assets.\n`;
      approach += `  * Use the remaining $${retainedAmount.toFixed(2)} to purchase a Medicaid-compliant annuity.\n`;
      approach += "  * Annuitized funds cover care during the penalty period.\n\n";
    }

    if (strategy.includes("full annuitization")) {
      approach += "- Consider Full Annuitization:\n";
      approach += "  * Convert all excess countable assets into a short-term annuity.\n";
      approach += "  * Annuity must be irrevocable, non-transferable, and actuarially sound.\n";
      approach += "  * Payments must begin immediately and be made in equal amounts.\n\n";
    }

    if (strategy.includes("promissory note")) {
      approach += "- Explore Promissory Note or Short-Term Annuity:\n";
      approach += "  * Structured repayment contracts can preserve asset value.\n";
      approach += "  * Must meet Medicaid rules to avoid being treated as transfers.\n";
      approach += "  * Legal drafting and state-specific compliance required.\n\n";
    }
  });

  approach += "Key Considerations:\n";
  approach += "- Timing of annuity purchases is critical relative to application.\n";
  approach += "- Annuities must name the state Medicaid agency as the remainder beneficiary.\n";
  approach += "- Review state-specific requirements with an elder law attorney.\n";

  return approach;
}

/**
 * Complete annuity planning workflow
 * 
 * @param {Object} clientInfo - Client demographic info (not used)
 * @param {Object} assets - Client's asset data
 * @param {string} state - The state of application
 * @returns {Promise<Object>} Annuity planning output
 */
async function medicaidAnnuityPlanning(clientInfo, assets, state) {
  logger.info(`Starting Medicaid annuity planning for ${state}`);

  try {
    const rules = medicaidRules[state.toLowerCase()];
    if (!rules) {
      throw new Error(`No Medicaid rules found for state: ${state}`);
    }

    const situation = assessAnnuitySituation(assets, state, rules);
    const strategies = determineAnnuityStrategies(situation);
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
