// src/services/planning/assetPlanning.js
const logger = require('../../config/logger');
const { validateAllInputs } = require('../validation/inputValidation');
const { getResourceLimit, getHomeEquityLimit, loadMedicaidRules } = require('../utils/medicaidRulesLoader');
const { classifyAssets } = require('../eligibility/eligibilityUtils');

/**
 * Assess the client's asset situation for Medicaid planning
 * @param {Object} assets - Client assets
 * @param {string} state - Normalized state
 * @param {string} maritalStatus - Client marital status
 * @param {Object} rulesData - Rules data
 * @returns {Promise<Object>} - Asset situation assessment
 */
async function assessAssetSituation(assets, state, maritalStatus, rulesData) {
  logger.debug(`Assessing asset situation for ${state}`);
  
  // Get resource limit from rules data
  const resourceLimit = await getResourceLimit(state, maritalStatus, rulesData);
  
  // Get home equity limit from rules data
  const homeEquityLimit = await getHomeEquityLimit(state, rulesData);
  
  // Classify assets
  const { countableAssets, nonCountableAssets } = classifyAssets(assets);
  
  // Calculate excess assets
  const excessAssets = Math.max(0, countableAssets - resourceLimit);
  
  // Check for home and excess home equity
  const hasHome = assets.home > 0 || assets.primary_residence > 0;
  let homeValue = 0;
  let homeMortgage = 0;
  let homeEquity = 0;
  let excessHomeEquity = 0;
  
  if (hasHome) {
    homeValue = assets.home || assets.primary_residence || 0;
    homeMortgage = assets.mortgage || assets.home_mortgage || 0;
    homeEquity = homeValue - homeMortgage;
    
    if (homeEquityLimit) {
      excessHomeEquity = Math.max(0, homeEquity - homeEquityLimit);
    }
  }
  
  return {
    totalAssets: countableAssets + nonCountableAssets,
    countableAssets,
    nonCountableAssets,
    excessAssets,
    hasHome,
    homeValue,
    homeMortgage,
    homeEquity,
    homeEquityLimit,
    excessHomeEquity,
    resourceLimit,
    state
  };
}

/**
 * Determine asset planning strategies
 * @param {Object} situation - Asset situation assessment
 * @returns {Array} - Asset planning strategies
 */
function determineAssetStrategies(situation) {
  logger.debug('Determining asset planning strategies');
  
  const strategies = [];
  
  if (situation.excessAssets > 0) {
    strategies.push("Convert countable assets to non-countable assets");
  }
  
  if (situation.hasHome) {
    strategies.push("Maximize homestead advantages");
  }
  
  // If state has a home equity limit and we exceed it
  if (situation.excessHomeEquity > 0) {
    strategies.push("Address excess home equity");
  }
  
  strategies.push("Evaluate personal property exemptions");
  strategies.push("Consider fair market value transactions");
  
  return strategies;
}

/**
 * Develop detailed asset planning approach
 * @param {Array} strategies - Asset planning strategies
 * @param {Object} situation - Asset situation assessment
 * @returns {string} - Detailed planning approach
 */
function planAssetApproach(strategies, situation) {
  logger.debug('Developing detailed asset planning approach');
  
  let approach = "Asset Eligibility Planning Approach:\n";
  
  for (const strategy of strategies) {
    if (strategy === "Convert countable assets to non-countable assets") {
      approach += `- Identify $${situation.excessAssets.toFixed(2)} in excess countable assets\n`;
      approach += "- Explore options to convert to exempt assets:\n";
      approach += " * Pay off debt, especially home mortgage\n";
      approach += " * Purchase necessary household items or personal effects\n";
      approach += " * Prepay funeral and burial expenses\n";
    } else if (strategy === "Maximize homestead advantages") {
      approach += "- Consider home renovations or improvements\n";
      if (situation.homeEquityLimit) {
        approach += `- Evaluate options to ensure home equity stays below state limit of $${situation.homeEquityLimit.toFixed(2)}\n`;
      }
    } else if (strategy === "Address excess home equity") {
      approach += `- Current home equity ($${situation.homeEquity.toFixed(2)}) exceeds state limit of $${situation.homeEquityLimit.toFixed(2)}\n`;
      approach += `- Consider home equity loan or reverse mortgage to reduce equity by $${situation.excessHomeEquity.toFixed(2)}\n`;
    } else if (strategy === "Evaluate personal property exemptions") {
      approach += `- Review ${situation.state.replace('_', ' ').toUpperCase()}-specific rules on exempt personal property\n`;
      approach += "- Consider converting cash to exempt personal property where appropriate\n";
    } else if (strategy === "Consider fair market value transactions") {
      approach += "- Explore opportunities for fair market value transactions:\n";
      approach += " * Purchase of life estate in another's home\n";
      approach += " * Buy-in to a continuing care retirement community\n";
    }
  }
  
  approach += "\nConsiderations:\n";
  approach += "- Ensure all transactions are well-documented and at fair market value\n";
  approach += "- Consider potential impact on income and estate planning\n";
  approach += `- Consult with an elder law attorney familiar with ${situation.state.replace('_', ' ').toUpperCase()} Medicaid rules\n`;
  approach += "- Allow for error margin in calculations to ensure eligibility\n";
  
  return approach;
}

/**
 * Process asset planning for Medicaid eligibility
 * @param {Object} clientInfo - Client information
 * @param {Object} assets - Client assets
 * @param {string} state - Client state
 * @returns {Promise<Object>} - Asset planning results
 */
async function medicaidAssetPlanning(clientInfo, assets, state) {
  logger.info(`Starting Medicaid asset planning for ${state}`);
  
  try {
    // Load rules data
    const rulesData = await loadMedicaidRules();
    
    // Validate inputs
    const validationResult = await validateAllInputs(
      clientInfo, assets, {}, {}, null, state
    );
    
    if (!validationResult.valid) {
      logger.error(`Input validation failed: ${validationResult.message}`);
      return {
        error: validationResult.message,
        status: 'error'
      };
    }
    
    // Use normalized data from validation
    const normalizedData = validationResult.normalizedData;
    const normalizedClientInfo = normalizedData.clientInfo;
    const normalizedAssets = normalizedData.assets;
    const normalizedState = normalizedData.state;
    const maritalStatus = normalizedClientInfo.maritalStatus;
    
    // Assess asset situation
    const situation = await assessAssetSituation(
      normalizedAssets, normalizedState, maritalStatus, rulesData
    );
    
    // Determine strategies
    const strategies = determineAssetStrategies(situation);
    
    // Plan approach
    const approach = planAssetApproach(strategies, situation);
    
    logger.info('Asset planning completed successfully');
    
    return {
      situation,
      strategies,
      approach,
      status: 'success'
    };
  } catch (error) {
    logger.error(`Error in asset planning: ${error.message}`);
    return {
      error: `Asset planning error: ${error.message}`,
      status: 'error'
    };
  }
}

module.exports = {
  medicaidAssetPlanning
};