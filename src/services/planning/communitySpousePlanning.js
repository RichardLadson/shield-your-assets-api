// src/services/planning/communitySpousePlanning.js
const logger = require('../../config/logger');
const medicaidRules = require('../../data/medicaid_rules_2025.json');

/**
 * Assesses the community spouse planning situation
 * 
 * @param {Object} assets - Client's asset data
 * @param {string} state - State of application
 * @returns {Object} Community spouse situation assessment
 */
function assessCommunitySpouseSituation(assets, state, rules) {
  logger.debug(`Assessing community spouse situation for state ${state}`);

  if (
    typeof rules.csraMin !== 'number' ||
    typeof rules.csraMax !== 'number' ||
    typeof rules.assetLimitSingle !== 'number'
  ) {
    throw new Error(`Missing CSRA or asset limit values for state: ${state}`);
  }

  const totalAssets = Object.values(assets).reduce((a, b) => a + b, 0);

  const csra = Math.min(Math.max(totalAssets / 2, rules.csraMin), rules.csraMax);
  const assetLimit = rules.assetLimitSingle;

  const excessAssets = Math.max(0, totalAssets - (assetLimit + csra));
  const hasHome = assets.home !== undefined && assets.home > 0;

  return { 
    totalAssets, 
    csra, 
    excessAssets, 
    hasHome, 
    state,
    csraMin: rules.csraMin,
    csraMax: rules.csraMax
  };
}

/**
 * Determines community spouse planning strategies based on assessment
 * 
 * @param {Object} situation - Community spouse situation from assessCommunitySpouseSituation
 * @returns {Array} Array of strategy strings
 */
function determineCommunitySpouseStrategies(situation) {
  logger.debug("Determining community spouse strategies");
  const strategies = [];

  if (situation.excessAssets > 0) {
    strategies.push("Evaluate CSRA increase options");
  }

  if (situation.hasHome) {
    strategies.push("Consider home equity planning strategies");
  }

  strategies.push("Explore snapshot date optimization");

  if (situation.csra < situation.csraMax) {
    strategies.push("Investigate fair hearing for CSRA increase");
  }

  return strategies;
}

/**
 * Creates a detailed community spouse planning approach
 * 
 * @param {Array} strategies - Strategies from determineCommunitySpouseStrategies
 * @param {Object} situation - Community spouse situation from assessCommunitySpouseSituation
 * @returns {string} Formatted community spouse planning approach
 */
function planCommunitySpouseApproach(strategies, situation) {
  logger.debug("Planning community spouse approach");
  let approach = "Community Spouse Asset Planning Approach:\n";

  approach += `- Total Assets: $${situation.totalAssets.toFixed(2)}\n`;
  approach += `- Current CSRA: $${situation.csra.toFixed(2)}\n`;

  if (situation.excessAssets > 0) {
    approach += `- Excess assets: $${situation.excessAssets.toFixed(2)}\n`;
  }

  approach += "\nRecommended Strategies:\n";

  strategies.forEach(strategy => {
    if (strategy.includes("CSRA increase options")) {
      approach += "- Explore options to increase CSRA:\n";
      approach += "  * Convert assets to income-producing forms\n";
      approach += "  * Consider purchasing an annuity with excess assets\n";
      approach += `  * Need to address $${situation.excessAssets.toFixed(2)} in excess assets\n`;
    } else if (strategy.includes("home equity planning")) {
      approach += "- Home equity planning considerations:\n";
      approach += "  * The home is exempt for the community spouse\n";
      approach += "  * Consider home improvements or modifications\n";
      approach += "  * Evaluate mortgage payoff with excess assets if applicable\n";
    } else if (strategy.includes("snapshot date optimization")) {
      approach += "- Optimize the asset snapshot date:\n";
      approach += "  * The snapshot date is typically the first day of continuous institutionalization\n";
      approach += "  * Plan asset transfers and acquisitions with this date in mind\n";
      approach += "  * Ensure proper documentation of assets on the snapshot date\n";
    } else if (strategy.includes("fair hearing for CSRA increase")) {
      approach += "- Consider requesting a fair hearing for CSRA increase:\n";
      approach += `  * Current CSRA is $${situation.csra.toFixed(2)}, maximum is $${situation.csraMax.toFixed(2)}\n`;
      approach += "  * May be possible if community spouse income is below MMMNA\n";
      approach += "  * Will need to demonstrate need for additional assets to generate income\n";
    }
  });

  approach += "\nKey Considerations:\n";
  approach += "- Transfers between spouses are exempt from transfer penalties\n";
  approach += `- State-specific rules in ${situation.state} may affect these strategies\n`;
  approach += "- Consult with an elder law attorney to implement these strategies effectively\n";

  return approach;
}

/**
 * Complete community spouse planning workflow
 * 
 * @param {Object} clientInfo - Client demographic information (not directly used)
 * @param {Object} assets - Client's asset data
 * @param {string} state - The state of application
 * @returns {Promise<Object>} Complete community spouse planning result
 */
async function medicaidCommunitySpousePlanning(clientInfo, assets, state) {
  logger.info(`Starting Medicaid community spouse planning for ${state}`);

  try {
    const rules = medicaidRules[state.toLowerCase()];
    if (!rules) {
      throw new Error(`No Medicaid rules found for state: ${state}`);
    }

    const situation = assessCommunitySpouseSituation(assets, state, rules);
    const strategies = determineCommunitySpouseStrategies(situation);
    const approach = planCommunitySpouseApproach(strategies, situation);

    logger.info('Community spouse planning completed successfully');

    return {
      situation,
      strategies,
      approach,
      status: 'success'
    };
  } catch (error) {
    logger.error(`Error in community spouse planning: ${error.message}`);
    return {
      error: `Community spouse planning error: ${error.message}`,
      status: 'error'
    };
  }
}

module.exports = {
  assessCommunitySpouseSituation,
  determineCommunitySpouseStrategies,
  planCommunitySpouseApproach,
  medicaidCommunitySpousePlanning
};
