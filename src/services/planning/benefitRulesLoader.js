// src/services/planning/benefitRulesLoader.js
const logger = require('../../config/logger');
const benefitRules = require('../../data/benefit_rules_2025.json');

/**
 * Loads benefit program rules for different states
 * This is a utility module to access rules for various benefit programs
 * beyond Medicaid (like SSI, Medicare, Veterans benefits, etc.)
 */

/**
 * Gets all benefit program rules for a state
 * 
 * @param {string} state - State to get rules for
 * @returns {Object} All benefit rules for the state
 */
function getBenefitRules(state) {
  logger.debug(`Loading benefit rules for state: ${state}`);
  
  if (!state) {
    throw new Error('State must be provided to get benefit rules');
  }
  
  // Normalize state name to uppercase and replace spaces with underscores
  const stateKey = state.toUpperCase().replace(/\s+/g, '_');
  
  // Check if we have rules for this state
  if (!benefitRules[stateKey]) {
    throw new Error(`No benefit rules found for state: ${state}`);
  }
  
  return benefitRules[stateKey];
}

/**
 * Gets rules for a specific benefit program in a state
 * 
 * @param {string} state - State to get rules for
 * @param {string} program - Program name (ssi, medicare, snap, veteransBenefits)
 * @returns {Object} Program-specific rules
 */
function getProgramRules(state, program) {
  logger.debug(`Loading ${program} rules for state: ${state}`);
  
  if (!program) {
    throw new Error('Program must be specified');
  }
  
  const stateRules = getBenefitRules(state);
  
  if (!stateRules[program]) {
    throw new Error(`No rules found for program: ${program} in state: ${state}`);
  }
  
  return stateRules[program];
}

/**
 * Gets SSI payment standards for a state
 * 
 * @param {string} state - State to get rules for
 * @param {string} livingArrangement - Living arrangement type
 * @returns {Object} SSI payment standards
 */
function getSSIPaymentStandards(state, livingArrangement = 'individual') {
  logger.debug(`Getting SSI payment standards for ${state}`);
  
  const ssiRules = getProgramRules(state, 'ssi');
  
  // In a real implementation, this would handle different living arrangements
  // For now, we just return basic FBR amounts
  if (livingArrangement === 'couple') {
    return {
      federalBenefit: ssiRules.coupleFBR,
      stateSupplement: ssiRules.stateSupplement || 0,
      totalBenefit: ssiRules.coupleFBR + (ssiRules.stateSupplement || 0)
    };
  } else {
    return {
      federalBenefit: ssiRules.individualFBR,
      stateSupplement: ssiRules.stateSupplement || 0,
      totalBenefit: ssiRules.individualFBR + (ssiRules.stateSupplement || 0)
    };
  }
}

/**
 * Gets Medicare premium and cost information for a state
 * 
 * @param {string} state - State to get rules for
 * @returns {Object} Medicare cost information
 */
function getMedicareCosts(state) {
  logger.debug(`Getting Medicare costs for ${state}`);
  
  const medicareRules = getProgramRules(state, 'medicare');
  
  return {
    partAPremium: medicareRules.partAPremium,
    partBPremium: medicareRules.partBPremium,
    partBDeductible: medicareRules.partBDeductible,
    partDAvgPremium: medicareRules.partDAvgPremium,
    totalMonthlyCost: medicareRules.partAPremium + medicareRules.partBPremium + medicareRules.partDAvgPremium
  };
}

/**
 * Gets Veterans Benefit rates for a state
 * 
 * @param {string} state - State to get rules for
 * @param {string} benefitType - Type of benefit (basic, aidAndAttendance, housebound, survivor)
 * @returns {Object} Veterans benefit information
 */
function getVeteransBenefitRates(state, benefitType = 'basic') {
  logger.debug(`Getting Veterans benefit rates for ${state}`);
  
  const veteransRules = getProgramRules(state, 'veteransBenefits');
  
  let benefitAmount = 0;
  
  switch (benefitType) {
    case 'aidAndAttendance':
      benefitAmount = veteransRules.aidAndAttendance;
      break;
    case 'housebound':
      benefitAmount = veteransRules.housebound;
      break;
    case 'survivor':
      benefitAmount = veteransRules.survivorBenefit;
      break;
    case 'basic':
    default:
      benefitAmount = veteransRules.basicPension;
  }
  
  return {
    benefitType,
    monthlyAmount: benefitAmount,
    annualAmount: benefitAmount * 12
  };
}

/**
 * Gets SNAP (food stamps) benefit information for a state
 * 
 * @param {string} state - State to get rules for
 * @param {string} householdSize - Size of household (individual or couple)
 * @returns {Object} SNAP benefit information
 */
function getSNAPBenefits(state, householdSize = 'individual') {
  logger.debug(`Getting SNAP benefits for ${state}`);
  
  const snapRules = getProgramRules(state, 'snap');
  
  if (householdSize === 'couple') {
    return {
      maxBenefit: snapRules.maxBenefitCouple,
      incomeLimit: snapRules.incomeLimit * 1.35
    };
  } else {
    return {
      maxBenefit: snapRules.maxBenefitIndividual,
      incomeLimit: snapRules.incomeLimit
    };
  }
}

/**
 * Adds or updates benefit rules for a state
 * 
 * @param {string} state - State to update rules for
 * @param {Object} updates - Updated benefit rules
 * @returns {boolean} Success indicator
 */
function updateBenefitRules(state, updates) {
  logger.debug(`Updating benefit rules for ${state}`);
  
  if (!state || !updates) {
    throw new Error('State and updates must be provided');
  }
  
  // Normalize state name
  const stateKey = state.toUpperCase().replace(/\s+/g, '_');
  
  // Note: This only updates the in-memory version
  // In a production system, you would want to persist changes to the JSON file
  
  // Create state entry if it doesn't exist
  if (!benefitRules[stateKey]) {
    benefitRules[stateKey] = {};
  }
  
  // Update each program
  Object.keys(updates).forEach(program => {
    if (!benefitRules[stateKey][program]) {
      benefitRules[stateKey][program] = {};
    }
    
    // Update program rules
    Object.assign(benefitRules[stateKey][program], updates[program]);
  });
  
  return true;
}

/**
 * Lists all available states in the benefit rules
 * 
 * @returns {Array} List of state names
 */
function getAvailableStates() {
  return Object.keys(benefitRules);
}

/**
 * Lists all available programs for a state
 * 
 * @param {string} state - State to check
 * @returns {Array} List of program names
 */
function getAvailablePrograms(state) {
  const stateRules = getBenefitRules(state);
  return Object.keys(stateRules);
}

module.exports = {
  getBenefitRules,
  getProgramRules,
  getSSIPaymentStandards,
  getMedicareCosts,
  getVeteransBenefitRates,
  getSNAPBenefits,
  updateBenefitRules,
  getAvailableStates,
  getAvailablePrograms
};