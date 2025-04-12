// src/services/planning/medicaidRulesLoader.js
const logger = require('../../config/logger');
const medicaidRules = require('../../data/medicaid_rules_2025.json');

/**
 * Gets Medicaid rules for a specific state
 * 
 * @param {string} state - State abbreviation or name
 * @returns {Object} State-specific Medicaid rules
 */
function getMedicaidRules(state) {
  logger.debug(`Loading Medicaid rules for state: ${state}`);
  
  if (!state) {
    throw new Error('State must be provided to get Medicaid rules');
  }

  // Normalize state to lowercase for case-insensitive comparison
  const stateKey = normalizeStateKey(state);
  
  // Check if we have rules for this state
  if (!medicaidRules[stateKey]) {
    throw new Error(`No Medicaid rules found for state: ${state}`);
  }
  
  // Return the rules for the state
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
  
  // Default to single if maritalStatus is not provided or invalid
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
  
  // Create a deep copy to avoid modifying the original
  const updatedRules = JSON.parse(JSON.stringify(baseRules));
  
  // Apply updates for each state
  Object.keys(updates).forEach(state => {
    if (!updatedRules[state]) {
      updatedRules[state] = {};
    }
    
    // Apply state updates
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
  // Create a default structure if not defined in rules
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
  // Return empty object if disregards not defined
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
  
  // Handle state abbreviations
  const stateKey = state.toLowerCase().replace(' ', '_');
  
  // Map abbreviations to full names if needed
  const abbreviationMap = {
    'fl': 'florida',
    'ny': 'new_york',
    'ca': 'california',
    // Add other abbreviations as needed
  };
  
  return abbreviationMap[stateKey] || stateKey;
}

module.exports = {
  getMedicaidRules,
  getStateSpecificLimits,
  loadRuleUpdates,
  getHomeEquityLimit,
  getIncomeTrustRequirements,
  getDisregardRules
};