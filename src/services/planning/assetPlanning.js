const logger = require('../../config/logger');
const medicaidRulesLoader = require('../utils/medicaidRulesLoader');
const eligibilityUtils = require('../utils/eligibilityUtils');
const inputValidation = require('../validation/inputValidation');

/**
 * Assesses a client's asset situation for Medicaid
 * 
 * @param {Object} assets - Client's assets breakdown by type
 * @param {string} state - State of application (will be converted to uppercase)
 * @param {string} maritalStatus - Client's marital status
 * @param {Object} rulesData - Medicaid rules data (optional, for testing)
 * @returns {Promise<Object>} Asset assessment results
 */
async function assessAssetSituation(assets, state, maritalStatus, rulesData) {
  if (!state) {
    throw new Error('State must be provided to assess asset situation');
  }
  const stateUpper = state.toUpperCase();
  logger.debug(`Assessing asset situation for ${stateUpper}, marital status: ${maritalStatus}`);
  
  try {
    // Classify assets
    const { countableAssets, nonCountableAssets } = eligibilityUtils.classifyAssets(assets);
    
    // Load rules or use provided rulesData
    const rules = rulesData || await medicaidRulesLoader.loadMedicaidRules(state); // Pass state
    const stateKey = state.toLowerCase();
    const stateRules = rules[stateKey] || {};
    const resourceLimit = maritalStatus === 'married'
      ? (stateRules.assetLimitMarried || 3000)
      : (stateRules.assetLimitSingle || 2000);
    
    // Determine if assets exceed limit
    const exceedsLimit = countableAssets > resourceLimit;
    const excessAssets = exceedsLimit ? countableAssets - resourceLimit : 0;
    
    // Assess home equity
    const homeValue = assets.home || assets.primary_residence || 0;
    const homeMortgage = assets.mortgage || assets.mortgage_balance || 0;
    const homeEquity = Math.max(0, homeValue - homeMortgage);
    const homeEquityLimit = stateRules.homeEquityLimit || 636000;
    const excessHomeEquity = homeEquity > homeEquityLimit ? homeEquity - homeEquityLimit : 0;
    
    return {
      countableAssets,
      nonCountableAssets,
      resourceLimit,
      exceedsLimit,
      excessAssets,
      state: stateUpper,
      hasHome: !!homeValue,
      homeValue,
      homeMortgage,
      homeEquity,
      homeEquityLimit,
      excessHomeEquity
    };
  } catch (error) {
    logger.error(`Error assessing asset situation: ${error.message}`);
    throw new Error(`Asset assessment error: ${error.message}`);
  }
}

/**
 * Assesses home equity for Medicaid eligibility
 * 
 * @param {Object} assets - Client's assets including home value
 * @param {string} state - State of application
 * @returns {Promise<Object>} Home equity assessment
 */
async function assessHomeEquity(assets, state) {
  const stateUpper = state.toUpperCase();
  logger.debug(`Assessing home equity for ${stateUpper}`);
  
  try {
    const homeValue = assets.home || assets.primary_residence || 0;
    const mortgageBalance = assets.mortgage || assets.mortgage_balance || 0;
    const equity = Math.max(0, homeValue - mortgageBalance);
    const equityLimit = await medicaidRulesLoader.getHomeEquityLimit(stateUpper);
    
    return {
      homeValue,
      mortgageBalance,
      equity,
      equityLimit,
      exceedsLimit: equity > equityLimit,
      excessEquity: equity > equityLimit ? equity - equityLimit : 0
    };
  } catch (error) {
    logger.error(`Error assessing home equity: ${error.message}`);
    throw new Error(`Home equity assessment error: ${error.message}`);
  }
}

/**
 * Determines asset planning strategies based on assessment
 * 
 * @param {Object} situation - Asset assessment from assessAssetSituation
 * @returns {Array<string>} Asset planning strategies
 */
function determineAssetStrategies(situation) {
  logger.debug(`Determining asset strategies for client in ${situation.state}`);
  
  const strategies = [];
  
  // Infer exceedsLimit if not provided
  const exceedsLimit = situation.exceedsLimit !== undefined
    ? situation.exceedsLimit
    : situation.countableAssets > situation.resourceLimit;
  
  if (exceedsLimit) {
    strategies.push('Convert countable assets to non-countable assets');
    if (situation.hasHome) {
      strategies.push('Maximize homestead advantages');
    }
    if (situation.excessAssets > 10000) {
      strategies.push('Evaluate Medicaid-compliant annuity purchase');
    }
  } else {
    strategies.push('Evaluate personal property exemptions');
    strategies.push('Assets within Medicaid limits, focus on documentation');
  }
  
  if (situation.excessHomeEquity > 0) {
    strategies.push('Address excess home equity');
  }
  
  return strategies;
}

/**
 * Creates a narrative asset planning approach
 * 
 * @param {Array<string>} strategies - Strategies from determineAssetStrategies
 * @param {Object} situation - Asset assessment
 * @returns {string} Narrative plan
 */
function planAssetApproach(strategies, situation) {
  logger.debug('Planning asset approach');
  
  let approach = "Asset Eligibility Planning Approach\n\n";
  
  // Use defaults to prevent TypeError
  const countableAssets = situation.countableAssets || 0;
  const resourceLimit = situation.resourceLimit || 0;
  const excessAssets = situation.excessAssets || 0;
  const state = situation.state ? situation.state.toLowerCase() : 'unknown';
  const homeEquity = situation.homeEquity || 0;
  const homeEquityLimit = situation.homeEquityLimit || 636000;
  const excessHomeEquity = situation.excessHomeEquity || 0;
  
  approach += `Countable Assets: $${countableAssets.toFixed(2)}\n`;
  approach += `Resource Limit: $${resourceLimit.toFixed(2)}\n`;
  approach += `Excess Assets: $${excessAssets.toFixed(2)}\n`;
  approach += `State: ${state}\n`;
  
  if (situation.hasHome) {
    approach += `Home Equity: $${homeEquity.toFixed(2)}\n`;
    if (excessHomeEquity > 0) {
      approach += `Current home equity ($${homeEquity.toFixed(2)}) exceeds state limit of $${homeEquityLimit.toFixed(2)}\n`;
    }
  }
  
  approach += "\nStrategies:\n";
  strategies.forEach(strategy => {
    approach += `- ${strategy}\n`;
  });
  
  approach += "\nAction Plan:\n";
  if (excessAssets > 0) {
    approach += `- Identify $${excessAssets.toFixed(2)} in excess countable assets\n`;
    approach += `- Pay off debt, especially home mortgage\n`;
    approach += `- Consider home renovations or improvements\n`;
    approach += `- Review ${state}-specific rules on exempt personal property\n`;
  }
  if (excessHomeEquity > 0) {
    approach += `- Consider home equity loan or reverse mortgage to reduce equity by $${excessHomeEquity.toFixed(2)}\n`;
  }
  
  return approach;
}

/**
 * Complete asset planning workflow - updated with additional validation and debugging
 * This is the main function that handles asset planning for Medicaid
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's assets
 * @param {Object} income - Client's income (optional)
 * @param {Object} expenses - Client's expenses (optional)
 * @param {Object} homeInfo - Home information (optional)
 * @param {string} state - State of application
 * @returns {Promise<Object>} Complete asset planning result
 */
async function assetPlanning(clientInfo, assets, income, expenses, homeInfo, state) {
  try {
    // Log inputs for debugging
    logger.info(`Starting asset planning for client in ${state}`);
    logger.debug(`Client info received: ${JSON.stringify(clientInfo)}`);
    logger.debug(`Assets received: ${JSON.stringify(assets)}`);
    
    // Ensure basic required parameters exist before validation
    if (!clientInfo) {
      logger.error('Client info is missing');
      return { status: 'error', error: 'Client information is required' };
    }
    
    if (!assets) {
      logger.error('Assets are missing');
      return { status: 'error', error: 'Asset information is required' };
    }
    
    if (!state) {
      logger.error('State is missing');
      return { status: 'error', error: 'State information is required' };
    }
    
    // Add additional check for client info required fields
    if (!clientInfo.name || !clientInfo.age || !clientInfo.maritalStatus) {
      logger.error('Client info missing required fields');
      return { 
        status: 'error', 
        error: 'Invalid client info: Client name, age, and marital status are required' 
      };
    }
    
    // Validate inputs
    const validation = await inputValidation.validateAllInputs(clientInfo, assets, income, expenses, homeInfo, state);
    
    if (!validation.valid) {
      logger.error(`Validation failed: ${validation.message}`);
      return { status: 'error', error: validation.message };
    }
    
    // Log normalized data for debugging
    logger.debug(`Validated client info: ${JSON.stringify(validation.normalizedData.clientInfo)}`);
    
    // Use normalized data
    const { clientInfo: validatedClientInfo, assets: validatedAssets, state: validatedState } = validation.normalizedData;
    
    // Double-check that validatedClientInfo exists and has required fields
    if (!validatedClientInfo || !validatedClientInfo.name || !validatedClientInfo.age || !validatedClientInfo.maritalStatus) {
      logger.error('Required fields missing in validated client info');
      return { 
        status: 'error', 
        error: 'Required client information is missing after validation' 
      };
    }
    
    const maritalStatus = validatedClientInfo.maritalStatus;
    
    // Run asset situation assessment
    const situation = await assessAssetSituation(
      validatedAssets,
      validatedState,
      maritalStatus
    );
    
    // Determine strategies
    const strategies = determineAssetStrategies(situation);
    
    // Create narrative approach
    const approach = planAssetApproach(strategies, situation);
    
    logger.info('Asset planning completed successfully');
    
    return {
      status: 'success',
      situation,
      strategies,
      approach,
      summary: {
        countableAssets: situation.countableAssets,
        resourceLimit: situation.resourceLimit,
        exceedsLimit: situation.exceedsLimit,
        excessAssets: situation.excessAssets,
        keyStrategies: strategies.slice(0, 3)
      }
    };
  } catch (error) {
    logger.error(`Error in asset planning: ${error.message}`);
    return {
      status: 'error',
      error: `Asset planning error: ${error.message}`
    };
  }
}

/**
 * Medicaid asset planning entry point that matches controller's expected interface
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's assets
 * @param {Object} income - Client's income (optional)
 * @param {Object} expenses - Client's expenses (optional)
 * @param {Object} homeInfo - Home information (optional)
 * @param {string} state - State of application
 * @returns {Promise<Object>} Complete asset planning result
 */
async function medicaidAssetPlanning(clientInfo, assets, income, expenses, homeInfo, state) {
  return await assetPlanning(clientInfo, assets, income, expenses, homeInfo, state);
}

/**
 * Additional function for assessing assets
 * 
 * @param {string} state - State abbreviation
 * @param {string} maritalStatus - Client's marital status
 * @returns {Promise<Object>} Asset assessment
 */
async function assessAssets(state, maritalStatus) {
  const rules = await medicaidRulesLoader.loadMedicaidRules(state);
  // Implementation would go here
  return rules;
}

// Export all functions
module.exports = {
  assetPlanning,
  assessAssetSituation,
  assessHomeEquity,
  determineAssetStrategies,
  planAssetApproach,
  medicaidAssetPlanning,
  assessAssets
};