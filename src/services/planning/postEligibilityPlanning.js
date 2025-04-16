// src/services/planning/postEligibilityPlanning.js
const logger = require('../../config/logger');

/**
 * Determines post-eligibility strategies based on client needs
 * @param {Object} needs - Client's post-eligibility needs assessment
 * @returns {Array} - List of recommended strategies
 */
function determinePostEligibilityStrategies(needs) {
  logger.debug('Determining post-eligibility strategies');
  const strategies = [];

  // Always include redetermination strategy
  strategies.push('Prepare for annual Medicaid redetermination');

  // Income management strategies
  if (needs.incomeManagement) {
    strategies.push('Set up monthly income tracking and review');
    strategies.push('Establish patient liability payment system');
  }

  // Asset management for married couples
  if (needs.assetRetitling) {
    strategies.push('Retitle Community Spouse Resource Allowance (CSRA) assets');
  }

  // Spousal income strategies
  if (needs.maritalStatus === 'married') {
    strategies.push('Review and adjust spousal income allowances if necessary');
  }

  // Relocation planning
  if (needs.relocationPlanning) {
    strategies.push('Plan for potential relocation and review new state Medicaid rules');
  }

  return strategies;
}

/**
 * Creates detailed implementation plan based on recommended strategies
 * @param {Array} strategies - List of recommended strategies
 * @param {Object} situation - Client's current situation details
 * @returns {Array} - Detailed implementation plan
 */
function planPostEligibilityApproach(strategies, situation) {
  logger.debug('Planning post-eligibility approach');
  const plan = [];

  // Add situation summary to the plan with null/undefined checks
  plan.push(`Monthly Income: $${(situation?.monthlyIncome || 0).toFixed(2)}`);
  plan.push(`Monthly Expenses: $${(situation?.monthlyExpenses || 0).toFixed(2)}`);
  
  // Create implementation steps for each strategy
  strategies.forEach(strategy => {
    plan.push(strategy);
    
    // Add specific steps for different strategies
    if (strategy.includes('Retitle Community Spouse Resource Allowance')) {
      plan.push('Work with attorney to transition assets to the community spouse');
      plan.push('Update asset documentation for Medicaid annual review');
    }
    
    if (strategy.includes('Plan for potential relocation')) {
      plan.push('Consult with Medicaid planner to research Medicaid rules in the new state');
      plan.push('Develop timeline for transition and maintaining eligibility');
    }

    if (strategy.includes('annual Medicaid redetermination')) {
      plan.push('Create calendar reminders for renewal deadlines');
      plan.push('Gather updated financial documentation regularly');
    }
  });
  
  return plan;
}

/**
 * Comprehensive post-eligibility planning process
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's assets
 * @param {Object} income - Client's income sources
 * @param {string} state - Client's state of residence
 * @param {string} maritalStatus - Client's marital status
 * @returns {Object} - Complete post-eligibility plan
 */
async function medicaidPostEligibilityPlanning(clientInfo, assets, income, state, maritalStatus) {
  logger.debug('Starting post-eligibility planning process');
  
  try {
    // Validate inputs
    if (!clientInfo || !assets || !income || !state) {
      throw new Error('Missing required information for post-eligibility planning');
    }
    
    // Assess post-eligibility needs
    const needs = {
      incomeManagement: Object.keys(income || {}).length > 0,
      assetRetitling: maritalStatus === 'married' && (assets.totalValue > 10000 || Object.keys(assets || {}).length > 2),
      maritalStatus: maritalStatus || clientInfo.maritalStatus,
      relocationPlanning: clientInfo.relocationPlans === true || clientInfo.planningToRelocate === true
    };
    
    // Determine strategies
    const strategies = determinePostEligibilityStrategies(needs);
    
    // Create situation object
    const situation = {
      monthlyIncome: Object.values(income || {}).reduce((sum, value) => sum + value, 0),
      monthlyExpenses: clientInfo.monthlyExpenses || 800, // Use actual expenses if available
      assets: assets.totalValue || 0,
      maritalStatus: maritalStatus || clientInfo.maritalStatus,
      state: state.toLowerCase()
    };
    
    // Create plan
    const plan = planPostEligibilityApproach(strategies, situation);
    
    // Format approach as a string for display
    const approach = `POST-ELIGIBILITY PLANNING APPROACH\n\n` +
      `State: ${state.toUpperCase()}\n` +
      `Marital Status: ${situation.maritalStatus}\n\n` +
      plan.join('\n');
    
    return {
      status: 'success',
      needs,
      strategies,
      plan,
      approach,
      situation
    };
  } catch (error) {
    logger.error(`Post-eligibility planning error: ${error.message}`);
    return {
      status: 'error',
      error: error.message
    };
  }
}

module.exports = {
  determinePostEligibilityStrategies,
  planPostEligibilityApproach,
  medicaidPostEligibilityPlanning
};