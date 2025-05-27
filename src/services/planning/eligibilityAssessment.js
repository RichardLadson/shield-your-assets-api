// src/services/eligibility/eligibilityAssessment.js
const logger = require('../../config/logger');
const medicaidRulesLoader = require('../utils/medicaidRulesLoader');
const medicaidRules = require('../../data/medicaid_rules_2025.json');

/**
 * Helper function to safely extract state string
 * 
 * @param {string|Object} state - State input (string or object)
 * @returns {string} Normalized state string
 */
function getStateStr(state) {
  if (typeof state === 'string') {
    return state.toLowerCase();
  } else if (state && typeof state === 'object' && state.state) {
    return state.state.toLowerCase();
  }
  
  // Log error for debugging
  logger.error(`Invalid state parameter: ${JSON.stringify(state)}`);
  throw new Error('Invalid state parameter');
}

/**
 * Assesses Medicaid eligibility based on client income and assets
 * 
 * @param {Object} clientInfo - Demographics including marital status
 * @param {Object} assets - Asset breakdown
 * @param {Object} income - Income breakdown
 * @param {string|Object} state - State of application
 * @param {Object} rules - State-specific medicaid rules
 * @returns {Object} Eligibility assessment result
 */
function assessEligibility(clientInfo, assets, income, state, rules) {
  // Extract state string safely
  const stateStr = getStateStr(state);
  logger.debug(`Assessing eligibility for ${stateStr}`);

  const maritalStatus = clientInfo.maritalStatus?.toLowerCase() || "single";

  const resourceLimit =
    maritalStatus === "married" ? (rules.resourceLimitMarried || rules.assetLimitMarried) : (rules.resourceLimitSingle || rules.assetLimitSingle);

  const incomeLimit =
    maritalStatus === "married" ? (rules.incomeLimitMarried || rules.nursingHomeIncomeLimitMarried) : (rules.incomeLimitSingle || rules.nursingHomeIncomeLimitSingle);

  if (typeof resourceLimit !== "number" || typeof incomeLimit !== "number") {
    throw new Error(`Missing asset or income limits for ${stateStr}`);
  }

  const countableAssets = assets.countable || 0;
  const totalIncome = Object.values(income).reduce((a, b) => a + b, 0);

  const isResourceEligible = countableAssets <= resourceLimit;
  const isIncomeEligible = totalIncome <= incomeLimit;

  return {
    isResourceEligible,
    isIncomeEligible,
    resourceLimit,
    incomeLimit,
    countableAssets,
    totalIncome,
    maritalStatus,
    state: stateStr
  };
}

/**
 * Determines strategies to improve eligibility
 * 
 * @param {Object} assessment - Result of assessEligibility
 * @returns {Array} Strategy list
 */
function determineEligibilityStrategies(assessment) {
  logger.debug("Determining eligibility strategies");

  const strategies = [];

  if (!assessment.isResourceEligible) {
    strategies.push("Reduce countable assets through exempt purchases or annuities");
    strategies.push("Transfer excess assets to a community spouse if allowed");
    strategies.push("Consider setting up a Medicaid asset protection trust");
  }

  if (!assessment.isIncomeEligible) {
    strategies.push("Establish a Qualified Income Trust (Miller Trust) for excess income");
    strategies.push("Use income to pay down medical expenses and care liability");
  }

  return strategies;
}

/**
 * Creates a formatted eligibility plan
 * 
 * @param {Array} strategies - Strategy list
 * @param {Object} assessment - Eligibility context
 * @returns {string} Planning narrative
 */
function planEligibilityApproach(strategies, assessment) {
  logger.debug("Building eligibility approach");

  let plan = "Eligibility Plan:\n\n";

  plan += `- Countable Assets: $${assessment.countableAssets.toFixed(2)} (Limit: $${assessment.resourceLimit})\n`;
  plan += `- Total Income: $${assessment.totalIncome.toFixed(2)} (Limit: $${assessment.incomeLimit})\n`;
  plan += `- Resource Eligible: ${assessment.isResourceEligible ? "YES" : "NO"}\n`;
  plan += `- Income Eligible: ${assessment.isIncomeEligible ? "YES" : "NO"}\n\n`;

  if (strategies.length === 0) {
    plan += "The client currently meets both income and asset eligibility requirements.\n";
  } else {
    plan += "Recommended Strategies:\n";
    strategies.forEach((s) => {
      plan += `- ${s}\n`;
    });
  }

  plan += "\nKey Considerations:\n";
  plan += "- Medicaid financial eligibility is based on monthly income and countable resources.\n";
  plan += "- Eligibility criteria may vary by program type and waiver availability.\n";
  plan += `- Consult with a Medicaid planner or elder law attorney in ${assessment.state} for further guidance.\n`;

  return plan;
}

/**
 * Complete Medicaid eligibility planning workflow
 * 
 * @param {Object} clientInfo - Client demographics
 * @param {Object} assets - Client's assets
 * @param {Object} income - Client's income
 * @param {string|Object} state - State of application
 * @returns {Promise<Object>} Eligibility assessment result
 */
async function medicaidEligibilityAssessment(clientInfo, assets, income, state) {
  try {
    // Safely extract state string
    const stateStr = getStateStr(state);
    logger.info(`Starting eligibility assessment for ${stateStr}`);

    // Use normalizeStateKey to convert abbreviations to full state names
    const normalizedState = medicaidRulesLoader.normalizeStateKey(stateStr);
    const rules = medicaidRules[normalizedState];
    if (!rules) {
      throw new Error(`No Medicaid rules found for state: ${stateStr}`);
    }

    const assessment = assessEligibility(clientInfo, assets, income, state, rules);
    const strategies = determineEligibilityStrategies(assessment);
    const eligibilityPlan = planEligibilityApproach(strategies, assessment);

    logger.info("Eligibility assessment completed successfully");

    return {
      eligibilityResult: assessment,
      eligibilityStrategies: strategies,
      eligibilityPlan,
      status: "success"
    };
  } catch (error) {
    logger.error(`Error in eligibility assessment: ${error.message}`);
    return {
      error: error.message,
      status: "error"
    };
  }
}

/**
 * Assesses Medicaid eligibility for long-term care
 * 
 * @param {Object} clientInfo - Client demographics
 * @param {Object} assets - Assets like savings, investments, home
 * @param {Object} income - Income sources
 * @param {Object} medicalNeeds - Care level requirements
 * @param {string|Object} state - State of residence
 * @param {boolean} crisis - Whether there's an immediate need
 * @returns {Promise<Object>} Comprehensive eligibility assessment
 */
async function assessMedicaidEligibility(clientInfo, assets, income, medicalNeeds, state, crisis = false) {
  try {
    // Safely extract state string
    const stateStr = getStateStr(state);
    logger.info(`Starting comprehensive Medicaid eligibility assessment for ${stateStr}`);
    
    // Validate inputs
    if (!clientInfo || !assets || !income || !state) {
      throw new Error("Missing required parameters for eligibility assessment");
    }
    
    // Extract asset details - handle both formats (countable/non_countable and specific assets)
    let countableAssets = 0;
    let nonCountableAssets = 0;
    
    // If assets has a countable property, use that structure
    if (assets.hasOwnProperty('countable')) {
      countableAssets = assets.countable || 0;
      nonCountableAssets = assets.non_countable || 0;
    } else {
      // Otherwise, calculate from specific asset types
      const savings = assets.savings || 0;
      const investments = assets.investments || 0;
      const home = assets.home || 0;
      const vehicle = assets.vehicle || 0;
      
      // Calculate countable and non-countable assets
      countableAssets = savings + investments;
      nonCountableAssets = home + vehicle;
    }
    
    // Extract income details - standardize property names
    let totalIncome = 0;
    
    // If income is an object with specific properties
    if (typeof income === 'object') {
      // Handle both formats (social_security and socialSecurity)
      const socialSecurity = income.social_security || income.socialSecurity || 0;
      const pension = income.pension || 0;
      // Add any other income sources
      const otherIncome = income.other || 0;
      
      totalIncome = socialSecurity + pension + otherIncome;
    } else if (typeof income === 'number') {
      // If income is just a number
      totalIncome = income;
    }
    
    // Get state-specific limits - FIX: Use normalizeStateKey to convert abbreviations
    const normalizedState = medicaidRulesLoader.normalizeStateKey(stateStr);
    const stateRules = medicaidRules[normalizedState];
    if (!stateRules) {
      throw new Error(`Rules not found for state: ${stateStr}`);
    }
    
    // Determine limits based on marital status
    const maritalStatus = clientInfo.maritalStatus?.toLowerCase() || 'single';
    const assetLimit = maritalStatus === 'married' ? 
      stateRules.resourceLimitMarried : stateRules.resourceLimitSingle;
    
    const incomeLimit = maritalStatus === 'married' ? 
      stateRules.incomeLimitMarried : stateRules.incomeLimitSingle;
    
    // Assess eligibility
    const isResourceEligible = countableAssets <= assetLimit;
    const isIncomeEligible = totalIncome <= incomeLimit;
    
    // Calculate excess resources
    const excessResources = isResourceEligible ? 0 : countableAssets - assetLimit;
    
    // Determine urgency level
    let urgency = "Low - Standard planning timeline applicable";
    
    if (crisis) {
      urgency = "High - Immediate crisis planning required";
    } else if (medicalNeeds && medicalNeeds.criticalHealth) {
      urgency = "High - Critical health situation requires expedited planning";
    } else if (!isResourceEligible && excessResources > 50000) {
      urgency = "Medium - Significant excess resources require planning";
    } else if (!isIncomeEligible) {
      urgency = "Medium - Income exceeds limits, income planning required";
    }
    
    // Return comprehensive assessment
    logger.info('Comprehensive Medicaid eligibility assessment completed successfully');
    return {
      countableAssets,
      nonCountableAssets,
      totalIncome,
      resourceLimit: assetLimit,
      incomeLimit,
      isResourceEligible,
      isIncomeEligible,
      excessResources,
      urgency,
      status: 'success'
    };
    
  } catch (error) {
    logger.error(`Error in comprehensive Medicaid eligibility assessment: ${error.message}`);
    return {
      error: error.message,
      status: 'error'
    };
  }
}

module.exports = {
  assessEligibility,
  determineEligibilityStrategies,
  planEligibilityApproach,
  medicaidEligibilityAssessment,
  assessMedicaidEligibility
};