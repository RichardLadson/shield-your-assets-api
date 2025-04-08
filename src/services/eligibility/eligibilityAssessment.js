// src/services/eligibility/eligibilityAssessment.js
const logger = require('../../config/logger');
const { 
  loadMedicaidRules, 
  getResourceLimit, 
  getIncomeLimit 
} = require('../utils/medicaidRulesLoader');
const { validateAllInputs } = require('../validation/inputValidation');
const { 
  classifyAssets, 
  calculateTotalIncome, 
  determineUrgency 
} = require('./eligibilityUtils');

/**
 * Develop planning strategies based on client's situation
 * @param {number} countableAssets - Countable assets
 * @param {number} totalIncome - Total monthly income
 * @param {number} spenddownAmount - Amount needed to spend down
 * @param {string} state - State name (normalized)
 * @param {string} maritalStatus - Marital status
 * @param {Object} rulesData - Rules data
 * @returns {Array} - Array of planning strategies
 */
async function developPlan(countableAssets, totalIncome, spenddownAmount, state, maritalStatus, rulesData) {
  logger.debug('Developing planning strategies');
  
  // Get state-specific resource and income limits
  const resourceLimit = await getResourceLimit(state, maritalStatus, rulesData);
  const incomeThreshold = await getIncomeLimit(state, maritalStatus, false, rulesData);
  
  const strategies = [];
  
  // Asset strategies
  if (spenddownAmount > 0) {
    strategies.push("Convert countable assets to non-countable assets, e.g., invest in exempt assets (home improvements, vehicle purchase)");
    strategies.push("Pre-pay funeral expenses to reduce countable assets");
    
    if (spenddownAmount < 50000) {
      strategies.push("Consider gifting strategies (beware of Medicaid look-back rules)");
    }
  }
  
  // Income strategies
  if (totalIncome > incomeThreshold) {
    strategies.push("Consider establishing a Miller Trust to manage excess income");
  }
  
  // Crisis strategies
  if (maritalStatus === 'married') {
    strategies.push("Explore spousal impoverishment protections available in your state");
  }
  
  logger.debug(`Developed ${strategies.length} planning strategies`);
  return strategies;
}

/**
 * Assess Medicaid eligibility based on client information and financial data
 * @param {Object} assets - Client assets
 * @param {Object} income - Client income
 * @param {string} maritalStatus - Client marital status
 * @param {string} state - Client state
 * @param {number} age - Client age
 * @param {string} healthStatus - Client health status
 * @param {boolean} isCrisis - Whether this is a crisis situation
 * @returns {Promise<Object>} - Assessment results
 */
async function assessMedicaidEligibility(assets, income, maritalStatus, state, age, healthStatus, isCrisis = false) {
  logger.info(`Starting Medicaid eligibility assessment for ${state}`);
  
  try {
    // Load rules data
    const rulesData = await loadMedicaidRules();
    
    // Validate inputs
    const clientInfo = {
      name: 'Client',  // Default name if not provided
      age,
      maritalStatus,
      healthStatus
    };
    
    const validationResult = await validateAllInputs(
      clientInfo, assets, income, {}, null, state
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
    const normalizedAssets = normalizedData.assets;
    const normalizedIncome = normalizedData.income;
    const normalizedState = normalizedData.state;
    
    // Classify assets
    const { countableAssets, nonCountableAssets } = classifyAssets(normalizedAssets);
    
    // Calculate total income
    const totalIncome = calculateTotalIncome(normalizedIncome);
    
    // Get resource limit
    const resourceLimit = await getResourceLimit(normalizedState, maritalStatus, rulesData);
    
    // Calculate spenddown amount
    const spenddownAmount = Math.max(0, countableAssets - resourceLimit);
    
    // Determine eligibility
    const isResourceEligible = countableAssets <= resourceLimit;
    
    // Get income limit
    const incomeLimit = await getIncomeLimit(normalizedState, maritalStatus, true, rulesData);
    const isIncomeEligible = totalIncome <= incomeLimit;
    
    // Determine urgency
    const urgency = determineUrgency(age, healthStatus, isCrisis);
    
    // Develop plan
    const planStrategies = await developPlan(
      countableAssets, totalIncome, spenddownAmount, normalizedState, maritalStatus, rulesData
    );
    
    // Define next steps
    const nextSteps = [
      "Complete detailed asset and income verification",
      spenddownAmount > 0 
        ? "Implement spend-down strategies if applicable" 
        : "Prepare for Medicaid application",
      `Consult an elder law attorney for ${normalizedState.replace('_', ' ').toUpperCase()}-specific guidance`,
      "Gather necessary documentation for Medicaid application",
      "File Medicaid application and prepare for verification process",
      "Plan for post-eligibility follow-up and estate planning review"
    ];
    
    // Prepare result
    const result = {
      countableAssets,
      nonCountableAssets,
      totalIncome,
      spenddownAmount,
      resourceLimit,
      incomeLimit,
      isResourceEligible,
      isIncomeEligible,
      isEligible: isResourceEligible && isIncomeEligible,
      planStrategies,
      urgency,
      nextSteps,
      state: normalizedState,
      status: 'success'
    };
    
    // Add warnings if applicable
    const warnings = [];
    
    if (countableAssets > 1000000) {
      warnings.push({
        type: 'high_assets',
        message: 'Unusually high countable assets. Verify values and consider additional tax planning.',
        timestamp: new Date().toISOString()
      });
    }
    
    if (totalIncome > 10000) {
      warnings.push({
        type: 'high_income',
        message: 'Unusually high monthly income. Verify values and consider income management strategies.',
        timestamp: new Date().toISOString()
      });
    }
    
    if (warnings.length > 0) {
      result.warnings = warnings;
    }
    
    logger.info('Medicaid eligibility assessment completed successfully');
    return result;
  } catch (error) {
    logger.error(`Error in eligibility assessment: ${error.message}`);
    return {
      error: `Eligibility assessment error: ${error.message}`,
      status: 'error'
    };
  }
}

module.exports = {
  assessMedicaidEligibility
};