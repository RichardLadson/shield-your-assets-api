// Path: src/services/eligibility/eligibilityUtils.js
const logger = require('../../config/logger');

/**
 * Classify assets into countable and non-countable
 * @param {Object} assets - Client assets
 * @returns {Object} - Object with countable and non-countable assets
 */
function classifyAssets(assets) {
  logger.debug('Classifying assets into countable and non-countable');
  
  // Initialize asset categories
  let countableAssets = 0;
  let nonCountableAssets = 0;
  
  // Common non-countable asset keys
  const nonCountableKeys = [
    'home', 'primary_residence', 'primary_home', 'residence',
    'burial_plot', 'prepaid_funeral', 'burial_funds', 
    'life_insurance_no_cash_value'
  ];
  
  // Common partially countable assets
  const partiallyCountableKeys = {
    'vehicle': { exempt: 1, exemptValue: 5000 } // Typically one vehicle up to a certain value is exempt
  };
  
  // Process each asset
  for (const [key, value] of Object.entries(assets)) {
    const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
    
    if (nonCountableKeys.includes(normalizedKey)) {
      nonCountableAssets += value;
    } else if (normalizedKey in partiallyCountableKeys) {
      const rule = partiallyCountableKeys[normalizedKey];
      
      // Handle based on rule type
      if (rule.exempt > 0) {
        // Exempt a certain quantity (e.g., one vehicle)
        nonCountableAssets += Math.min(value, rule.exemptValue || Infinity);
        countableAssets += Math.max(0, value - (rule.exemptValue || Infinity));
      } else {
        countableAssets += value;
      }
    } else {
      // Default to countable
      countableAssets += value;
    }
  }
  
  return {
    countableAssets,
    nonCountableAssets
  };
}

/**
 * Calculate total income
 * @param {Object} income - Client income
 * @returns {number} - Total monthly income
 */
function calculateTotalIncome(income) {
  logger.debug('Calculating total income');
  
  return Object.values(income).reduce((sum, value) => sum + value, 0);
}

/**
 * Determine if a client is resource eligible
 * @param {number} countableAssets - Total countable assets
 * @param {number} resourceLimit - Resource limit
 * @returns {Object} - Eligibility result and spenddown amount
 */
function determineResourceEligibility(countableAssets, resourceLimit) {
  logger.debug(`Determining resource eligibility: assets=${countableAssets}, limit=${resourceLimit}`);
  
  const isEligible = countableAssets <= resourceLimit;
  const spenddownAmount = Math.max(0, countableAssets - resourceLimit);
  
  return {
    isResourceEligible: isEligible,
    spenddownAmount
  };
}

/**
 * Determine if a client is income eligible
 * @param {number} totalIncome - Total monthly income
 * @param {number} incomeLimit - Income limit
 * @returns {boolean} - Whether client is income eligible
 */
function determineIncomeEligibility(totalIncome, incomeLimit) {
  logger.debug(`Determining income eligibility: income=${totalIncome}, limit=${incomeLimit}`);
  
  return totalIncome <= incomeLimit;
}

/**
 * Determine planning urgency level based on client factors
 * @param {Object} clientInfo - Client information
 * @param {boolean} isResourceEligible - Whether client is resource eligible
 * @param {boolean} isIncomeEligible - Whether client is income eligible
 * @param {boolean} isCrisis - Whether client is in crisis situation
 * @returns {string} - Urgency level with explanation
 */
function determinePlanningUrgency(clientInfo, isResourceEligible, isIncomeEligible, isCrisis) {
  logger.debug('Determining planning urgency');
  
  // Default to medium
  let urgency = 'Medium - Begin pre-planning soon';
  
  // Factors that would increase urgency
  if (isCrisis) {
    urgency = 'High - Immediate planning needed';
  } else if (!isResourceEligible && !isIncomeEligible) {
    urgency = 'High - Significant planning needed';
  } else if (clientInfo.healthStatus === 'critical' || clientInfo.healthStatus === 'declining') {
    urgency = 'High - Health situation requires prompt planning';
  } else if (clientInfo.age >= 85) {
    urgency = 'High - Advanced age suggests prompt planning';
  } else if (!isResourceEligible && clientInfo.age >= 75) {
    urgency = 'High - Age and resource status require attention';
  }
  
  // Factors that would decrease urgency
  if (isResourceEligible && isIncomeEligible && clientInfo.healthStatus === 'good') {
    urgency = 'Low - Continue monitoring eligibility status';
  }
  
  return urgency;
}

/**
 * Generate planning strategies based on eligibility assessment
 * @param {boolean} isResourceEligible - Whether client is resource eligible
 * @param {boolean} isIncomeEligible - Whether client is income eligible
 * @param {number} spenddownAmount - Amount needed to spend down
 * @param {string} state - Normalized state
 * @param {Object} clientInfo - Client information
 * @returns {Array} - Array of planning strategies
 */
function generatePlanningStrategies(isResourceEligible, isIncomeEligible, spenddownAmount, state, clientInfo) {
  logger.debug('Generating planning strategies');
  
  const strategies = [];
  
  // Resource-based strategies
  if (!isResourceEligible) {
    strategies.push(
      "Convert countable assets to non-countable assets, e.g., invest in exempt assets (home improvements, vehicle purchase)"
    );
    
    if (spenddownAmount > 10000) {
      strategies.push("Pre-pay funeral expenses to reduce countable assets");
    }
    
    if (clientInfo.maritalStatus === 'married') {
      strategies.push("Consider spousal resource allocation strategies");
    }
  }
  
  // Income-based strategies
  if (!isIncomeEligible) {
    // Income cap states (simplified list)
    const incomeCapStates = ['florida', 'texas', 'alabama', 'mississippi', 'south_carolina'];
    
    if (incomeCapStates.includes(state)) {
      strategies.push("Consider establishing a Miller Trust to manage excess income");
    } else {
      strategies.push("Explore income spend-down options through medical expenses");
    }
  }
  
  // Always consider these strategies
  strategies.push("Review and update advance directives");
  
  if (clientInfo.maritalStatus === 'married') {
    strategies.push("Evaluate spousal impoverishment protections");
  }
  
  return strategies;
}

module.exports = {
  classifyAssets,
  calculateTotalIncome,
  determineResourceEligibility,
  determineIncomeEligibility,
  determinePlanningUrgency,
  generatePlanningStrategies
};