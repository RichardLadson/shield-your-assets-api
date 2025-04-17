const logger = require('../../config/logger');

/**
 * Assesses post-eligibility needs based on client situation
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's assets
 * @param {Object} income - Client's income sources
 * @param {string} state - Client's state of residence
 * @param {string} maritalStatus - Client's marital status
 * @returns {Object} - Assessed needs
 */
function assessPostEligibilityNeeds(clientInfo, assets, income, state, maritalStatus) {
  logger.debug('Assessing post-eligibility needs');

  return {
    monthlyLiabilityManagement: Object.keys(income || {}).length > 0,
    annualRedetermination: true,
    assetRetitling: maritalStatus === 'married' && (assets?.countable > 2000 || Object.keys(assets || {}).length > 2),
    spousalAllowanceReview: maritalStatus === 'married',
    potentialMove: clientInfo?.potentialRelocation === true
  };
}

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
  if (needs.monthlyLiabilityManagement) {
    strategies.push('Set up monthly income tracking and review');
    strategies.push('Apply excess income toward patient liability consistently');
  }

  // Asset management for married couples
  if (needs.assetRetitling) {
    strategies.push('Retitle Community Spouse Resource Allowance (CSRA) assets');
  }

  // Spousal income strategies
  if (needs.spousalAllowanceReview) {
    strategies.push('Review and adjust spousal income allowances if necessary');
  }

  // Relocation planning
  if (needs.potentialMove) {
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

  // Add situation summary
  const monthlyIncome = situation?.totalIncome || 0;
  const monthlyExpenses = situation?.totalExpenses || 0;
  const personalNeedsAllowance = situation?.state.toLowerCase() === 'florida' ? 160 : 130;
  const patientLiability = Math.max(0, monthlyIncome - monthlyExpenses - personalNeedsAllowance);

  plan.push(`Monthly Income: $${monthlyIncome.toFixed(2)}`);
  plan.push(`Monthly Expenses: $${monthlyExpenses.toFixed(2)}`);
  plan.push(`Estimated Patient Liability: $${patientLiability.toFixed(2)}`);

  // Create implementation steps for each strategy
  strategies.forEach(strategy => {
    plan.push(strategy);

    if (strategy.includes('Retitle Community Spouse Resource Allowance')) {
      plan.push('transition assets to the community spouse');
      plan.push('working with an elder law attorney');
      plan.push('Update asset documentation for Medicaid annual review');
    }

    if (strategy.includes('Plan for potential relocation')) {
      plan.push('Plan for potential relocation');
      plan.push('research Medicaid rules in the new state');
      plan.push('prepare for possible changes in eligibility');
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

    // Assess needs
    const needs = assessPostEligibilityNeeds(clientInfo, assets, income, state, maritalStatus);

    // Determine strategies
    const strategies = determinePostEligibilityStrategies(needs);

    // Create situation object
    const situation = {
      totalIncome: Object.values(income || {}).reduce((sum, value) => sum + value, 0),
      totalExpenses: clientInfo.monthlyExpenses || 800,
      assets: assets.total || 0,
      maritalStatus: maritalStatus || clientInfo.maritalStatus,
      state: state.toLowerCase()
    };

    // Create plan
    const plan = planPostEligibilityApproach(strategies, situation);

    // Format approach as a string
    const approach = `POST-ELIGIBILITY PLANNING APPROACH\n\n` +
      `State: ${situation.state}\n` +
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
  assessPostEligibilityNeeds,
  determinePostEligibilityStrategies,
  planPostEligibilityApproach,
  medicaidPostEligibilityPlanning
};