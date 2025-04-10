// src/services/planning/trustPlanning.js
const logger = require('../../config/logger');
const medicaidRules = require('../../../medicaid_rules_2025.json');

/**
 * Assesses whether trust planning is necessary based on asset limits
 * 
 * @param {Object} assets - Client's asset data
 * @param {string} state - State of application
 * @param {Object} rules - Medicaid rules for the state
 * @returns {Object} Trust planning situation
 */
function assessTrustSituation(assets, state, rules) {
  logger.debug(`Assessing trust planning situation for ${state}`);

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
 * Determines appropriate trust strategies
 * 
 * @param {Object} situation - Trust assessment
 * @returns {Array} Array of trust-related strategy recommendations
 */
function determineTrustStrategies(situation) {
  logger.debug("Determining trust strategies");
  const strategies = [];

  if (situation.excessAssets > 0) {
    strategies.push("Consider self-settled special needs trust for disabled individual");
    strategies.push("Explore use of irrevocable Medicaid asset protection trust");
    strategies.push("Investigate pooled income trust where applicable");
  }

  return strategies;
}

/**
 * Builds the trust planning narrative
 * 
 * @param {Array} strategies - Strategy recommendations
 * @param {Object} situation - Trust situation context
 * @returns {string} Narrative guidance for planning
 */
function planTrustApproach(strategies, situation) {
  logger.debug("Building trust planning approach");

  if (strategies.length === 0) {
    return "No trust-based asset protection strategies are required at this time.";
  }

  let approach = "Trust Planning Approach:\n\n";

  strategies.forEach(strategy => {
    if (strategy.includes("special needs trust")) {
      approach += "- Self-Settled Special Needs Trust:\n";
      approach += "  * Available to individuals under age 65 who are disabled.\n";
      approach += "  * Trust must be irrevocable and administered by a third party.\n";
      approach += "  * Must name the state Medicaid agency as primary remainder beneficiary.\n\n";
    }

    if (strategy.includes("irrevocable")) {
      approach += "- Irrevocable Medicaid Asset Protection Trust:\n";
      approach += "  * Transfer assets into trust to remove them from countable estate.\n";
      approach += "  * 5-year lookback period applies.\n";
      approach += "  * Trustee cannot be the applicant.\n";
      approach += "  * Useful for estate planning and long-term protection.\n\n";
    }

    if (strategy.includes("pooled income trust")) {
      approach += "- Pooled Income Trust:\n";
      approach += "  * Useful for individuals over income or asset limits who are disabled.\n";
      approach += "  * Funds can be used for supplemental needs.\n";
      approach += "  * Administered by non-profit and must comply with Medicaid requirements.\n\n";
    }
  });

  approach += "Key Considerations:\n";
  approach += "- Trusts must be properly structured to avoid Medicaid penalties.\n";
  approach += "- Timing and documentation of transfers is critical.\n";
  approach += `- Review trust language with an elder law attorney familiar with ${situation.state} Medicaid rules.\n`;

  return approach;
}

/**
 * Complete trust planning workflow
 * 
 * @param {Object} clientInfo - Client demographic data (not used here)
 * @param {Object} assets - Client's asset data
 * @param {string} state - State of application
 * @returns {Promise<Object>} Trust planning output
 */
async function medicaidTrustPlanning(clientInfo, assets, state) {
  logger.info(`Starting Medicaid trust planning for ${state}`);

  try {
    const rules = medicaidRules[state.toLowerCase()];
    if (!rules) {
      throw new Error(`No Medicaid rules found for state: ${state}`);
    }

    const situation = assessTrustSituation(assets, state, rules);
    const strategies = determineTrustStrategies(situation);
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
