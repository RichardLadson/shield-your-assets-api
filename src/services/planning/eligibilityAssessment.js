// src/services/planning/eligibilityAssessment.js
const logger = require('../../config/logger');

/**
 * Assesses resource and income eligibility for Medicaid
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's asset data
 * @param {Object} income - Client's income data
 * @param {string} state - The state of application
 * @param {string} maritalStatus - Client's marital status
 * @returns {Object} Eligibility assessment result
 */
function assessEligibility(clientInfo, assets, income, state, maritalStatus) {
  logger.debug(`Assessing eligibility for ${clientInfo.name} in ${state}`);

  // Determine countable assets
  const countableAssets = assets.countable || 0;

  // Define resource limit based on marital status
  const resourceLimit = maritalStatus === "single" ? 2000 : 3000;
  const isResourceEligible = countableAssets <= resourceLimit;
  const spenddownAmount = Math.max(0, countableAssets - resourceLimit);

  // Calculate total income
  const totalIncome = Object.values(income).reduce((a, b) => a + b, 0);
  
  // Check income eligibility
  const incomeLimit = 2349; // Example limit - in production would come from rules data
  const isIncomeEligible = totalIncome <= incomeLimit;

  return { 
    isResourceEligible, 
    spenddownAmount, 
    isIncomeEligible, 
    totalIncome,
    incomeLimit,
    resourceLimit
  };
}

/**
 * Determines eligibility strategies based on assessment
 * 
 * @param {Object} eligibilityResult - Result from assessEligibility
 * @returns {Array} Array of strategy strings
 */
function determineEligibilityStrategies(eligibilityResult) {
  logger.debug("Determining eligibility strategies");
  
  const strategies = [];
  
  if (!eligibilityResult.isResourceEligible) {
    strategies.push(`Reduce countable assets by $${eligibilityResult.spenddownAmount.toFixed(2)}`);
    strategies.push("Convert countable assets to exempt assets");
  }
  
  if (!eligibilityResult.isIncomeEligible) {
    strategies.push("Evaluate income management strategies");
    strategies.push("Consider Qualified Income Trust (Miller Trust)");
  }
  
  return strategies;
}

/**
 * Creates a detailed eligibility plan based on assessment and strategies
 * 
 * @param {Array} strategies - Strategies from determineEligibilityStrategies
 * @param {Object} eligibilityResult - Result from assessEligibility
 * @returns {string} Formatted eligibility plan
 */
function planEligibilityApproach(strategies, eligibilityResult) {
  logger.debug("Planning eligibility approach");
  
  let approach = "Medicaid Eligibility Assessment:\n";
  
  // Resource eligibility section
  approach += "\nResource Eligibility:\n";
  approach += `Resource Limit: $${eligibilityResult.resourceLimit.toFixed(2)}\n`;
  approach += `Current Status: ${eligibilityResult.isResourceEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}\n`;
  
  if (!eligibilityResult.isResourceEligible) {
    approach += `Spenddown Amount Needed: $${eligibilityResult.spenddownAmount.toFixed(2)}\n`;
  }
  
  // Income eligibility section
  approach += "\nIncome Eligibility:\n";
  approach += `Income Limit: $${eligibilityResult.incomeLimit.toFixed(2)}\n`;
  approach += `Total Income: $${eligibilityResult.totalIncome.toFixed(2)}\n`;
  approach += `Current Status: ${eligibilityResult.isIncomeEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}\n`;
  
  // Strategies section
  if (strategies.length > 0) {
    approach += "\nRecommended Strategies:\n";
    strategies.forEach(strategy => {
      approach += `- ${strategy}\n`;
    });
  }
  
  return approach;
}

/**
 * Complete eligibility assessment workflow
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's asset data
 * @param {Object} income - Client's income data
 * @param {string} state - The state of application
 * @param {string} maritalStatus - Client's marital status
 * @returns {Object} Complete eligibility assessment result with plan
 */
async function medicaidEligibilityAssessment(clientInfo, assets, income, state, maritalStatus) {
  logger.info(`Starting Medicaid eligibility assessment for ${state}`);
  
  try {
    // In a production version, you'd load rules and validate inputs here
    
    // Assess eligibility
    const eligibilityResult = assessEligibility(clientInfo, assets, income, state, maritalStatus);
    
    // Determine strategies
    const eligibilityStrategies = determineEligibilityStrategies(eligibilityResult);
    
    // Create plan
    const eligibilityPlan = planEligibilityApproach(eligibilityStrategies, eligibilityResult);
    
    logger.info('Eligibility assessment completed successfully');
    
    return {
      eligibilityResult,
      eligibilityStrategies,
      eligibilityPlan,
      status: 'success'
    };
  } catch (error) {
    logger.error(`Error in eligibility assessment: ${error.message}`);
    return {
      error: `Eligibility assessment error: ${error.message}`,
      status: 'error'
    };
  }
}

module.exports = {
  assessEligibility,
  determineEligibilityStrategies,
  planEligibilityApproach,
  medicaidEligibilityAssessment
};