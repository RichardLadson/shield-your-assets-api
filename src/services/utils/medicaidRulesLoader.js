const logger = require('../../config/logger');
const medicaidRules = require('../../data/medicaid_rules_2025.json');

/**
 * Loads Medicaid rules for a specific state (async for test compatibility)
 * 
 * @param {string} state - State abbreviation or name
 * @returns {Promise<Object>} State-specific Medicaid rules
 */
async function loadMedicaidRules(state) {
  logger.debug(`Loading Medicaid rules for state: ${state}`);
  
  if (!state) {
    throw new Error('State must be provided to load Medicaid rules');
  }

  const stateKey = normalizeStateKey(state);
  
  if (!medicaidRules[stateKey]) {
    throw new Error(`Rules not found for state: ${state}`);
  }
  
  return medicaidRules[stateKey];
}

/**
 * Gets Medicaid rules for a specific state (sync version)
 * 
 * @param {string} state - State abbreviation or name
 * @returns {Object} State-specific Medicaid rules
 */
function getMedicaidRules(state) {
  logger.debug(`Loading Medicaid rules for state: ${state}`);
  
  if (!state) {
    throw new Error('State must be provided to get Medicaid rules');
  }

  const stateKey = normalizeStateKey(state);
  
  if (!medicaidRules[stateKey]) {
    throw new Error(`No Medicaid rules found for state: ${state}`);
  }
  
  return medicaidRules[stateKey];
}

/**
 * Gets state-specific limits based on marital status
 * 
 * @param {string} state - State abbreviation or name
 * @param {string} maritalStatus - Marital status (single or married)
 * @returns {Object} State and marital status specific limits
 */
function getStateSpecificLimits(state, maritalStatus) {
  const rules = getMedicaidRules(state);
  
  const status = maritalStatus && maritalStatus.toLowerCase() === 'married' ? 'married' : 'single';
  
  if (status === 'married') {
    return {
      assetLimit: rules.resourceLimitMarried || rules.resourceLimitSingle * 2,
      incomeLimit: rules.incomeLimitMarried || rules.incomeLimitSingle
    };
  } else if (status === 'single') {
    return {
      assetLimit: rules.resourceLimitSingle,
      incomeLimit: rules.incomeLimitSingle
    };
  } else {
    throw new Error(`Invalid marital status: ${maritalStatus}`);
  }
}

/**
 * Updates rules with new values
 * 
 * @param {Object} baseRules - Original rules
 * @param {Object} updates - Updates to apply
 * @returns {Object} Updated rules
 */
function loadRuleUpdates(baseRules, updates) {
  if (!updates) return baseRules;
  
  const updatedRules = JSON.parse(JSON.stringify(baseRules));
  
  Object.keys(updates).forEach(state => {
    if (!updatedRules[state]) {
      updatedRules[state] = {};
    }
    Object.assign(updatedRules[state], updates[state]);
  });
  
  return updatedRules;
}

/**
 * Gets home equity limit for a state
 * 
 * @param {string} state - State abbreviation or name
 * @returns {number} Home equity limit
 */
function getHomeEquityLimit(state) {
  const rules = getMedicaidRules(state);
  return rules.homeEquityLimit;
}

/**
 * Gets Income Trust requirements for a state
 * 
 * @param {string} state - State abbreviation or name
 * @returns {Object} Income trust requirements
 */
function getIncomeTrustRequirements(state) {
  const rules = getMedicaidRules(state);
  return {
    required: rules.nursingHomeIncomeLimitSingle !== null,
    threshold: rules.nursingHomeIncomeLimitSingle || rules.incomeLimitSingle
  };
}

/**
 * Gets disregard rules for a specific category
 * 
 * @param {string} state - State abbreviation or name
 * @param {string} type - Type of disregard (income, asset, etc.)
 * @returns {Object} Disregard rules
 */
function getDisregardRules(state, type) {
  if (type !== 'income') {
    throw new Error(`Unsupported disregard type: ${type}`);
  }
  
  const rules = getMedicaidRules(state);
  return rules.disregards?.income || {};
}

/**
 * Normalizes state key for lookup
 * 
 * @param {string} state - State input
 * @returns {string} Normalized state key
 */
function normalizeStateKey(state) {
  if (!state) return '';
  
  const stateKey = state.toLowerCase().replace(' ', '_');
  
  const abbreviationMap = {
    'fl': 'florida',
    'ny': 'new_york',
    'ca': 'california'
  };
  
  return abbreviationMap[stateKey] || stateKey;
}

module.exports = {
  loadMedicaidRules,
  getMedicaidRules,
  getStateSpecificLimits,
  loadRuleUpdates,
  getHomeEquityLimit,
  getIncomeTrustRequirements,
  getDisregardRules
};