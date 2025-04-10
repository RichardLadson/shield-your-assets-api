// src/services/planning/postEligibilityPlanning.js
const logger = require('../../config/logger');
const medicaidRules = require('../../../medicaid_rules_2025.json');

/**
 * Assesses the client's post-eligibility management situation
 * 
 * @param {Object} income - Client's income information
 * @param {Object} expenses - Client's known monthly expenses
 * @param {string} state - State of application
 * @param {Object} rules - Medicaid rules for the state (not yet used)
 * @returns {Object} Post-eligibility income situation
 */
function assessPostEligibilitySituation(income, expenses, state, rules) {
  logger.debug(`Assessing post-eligibility situation for ${state}`);

  const totalIncome = Object.values(income).reduce((a, b) => a + b, 0);
  const totalExpenses = Object.values(expenses).reduce((a, b) => a + b, 0);
  const patientLiability = Math.max(0, totalIncome - totalExpenses);

  return {
    totalIncome,
    totalExpenses,
    patientLiability,
    state
  };
}

/**
 * Determines strategies for managing post-eligibility income and liability
 * 
 * @param {Object} situation - Post-eligibility situation summary
 * @returns {Array} Strategy recommendations
 */
function determinePostEligibilityStrategies(situation) {
  logger.debug("Determining post-eligibility strategies");
  const strategies = [];

  strategies.push("Set up monthly income tracking and review");
  strategies.push("Apply excess income toward patient liability consistently");
  strategies.push("Explore medical expense deductions or personal needs allowances");
  strategies.push("Coordinate with facility billing to ensure timely payments");
  strategies.push("Retain documentation for audit purposes");

  return strategies;
}

/**
 * Builds a detailed post-eligibility planning narrative
 * 
 * @param {Array} strategies - Strategy list
 * @param {Object} situation - Income and liability data
 * @returns {string} Narrative guidance
 */
function planPostEligibilityApproach(strategies, situation) {
  logger.debug("Building post-eligibility planning approach");

  let approach = "Post-Eligibility Planning Approach:\n\n";

  approach += `- Monthly Income: $${situation.totalIncome.toFixed(2)}\n`;
  approach += `- Monthly Expenses: $${situation.totalExpenses.toFixed(2)}\n`;
  approach += `- Estimated Patient Liability: $${situation.patientLiability.toFixed(2)}\n\n`;

  approach += "Recommended Actions:\n";
  strategies.forEach(strategy => {
    approach += `- ${strategy}\n`;
  });

  approach += "\nImportant Considerations:\n";
  approach += "- Patient liability must be paid before Medicaid covers the remaining cost of care.\n";
  approach += "- Some states allow deductions for medical expenses or personal needs allowances.\n";
  approach += `- Check ${situation.state} Medicaid rules or consult an elder law attorney for compliance.\n`;

  return approach;
}

/**
 * Complete post-eligibility planning workflow
 * 
 * @param {Object} clientInfo - Client demographic information (not used)
 * @param {Object} income - Client's income data
 * @param {Object} expenses - Client's monthly expenses
 * @param {string} state - State of application
 * @returns {Promise<Object>} Post-eligibility planning result
 */
async function medicaidPostEligibilityPlanning(clientInfo, income, expenses, state) {
  logger.info(`Starting Medicaid post-eligibility planning for ${state}`);

  try {
    const rules = medicaidRules[state.toLowerCase()] || {}; // Optional for now

    const situation = assessPostEligibilitySituation(income, expenses, state, rules);
    const strategies = determinePostEligibilityStrategies(situation);
    const approach = planPostEligibilityApproach(strategies, situation);

    logger.info('Post-eligibility planning completed successfully');

    return {
      situation,
      strategies,
      approach,
      status: 'success'
    };
  } catch (error) {
    logger.error(`Error in post-eligibility planning: ${error.message}`);
    return {
      error: `Post-eligibility planning error: ${error.message}`,
      status: 'error'
    };
  }
}

module.exports = {
  assessPostEligibilitySituation,
  determinePostEligibilityStrategies,
  planPostEligibilityApproach,
  medicaidPostEligibilityPlanning
};
