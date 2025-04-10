// src/services/eligibility/eligibilityAssessment.js
const logger = require('../../config/logger');
const medicaidRules = require('../../../medicaid_rules_2025.json');

/**
 * Assesses Medicaid eligibility based on client income and assets
 * 
 * @param {Object} clientInfo - Demographics including marital status
 * @param {Object} assets - Asset breakdown
 * @param {Object} income - Income breakdown
 * @param {string} state - State of application
 * @returns {Object} Eligibility assessment result
 */
function assessEligibility(clientInfo, assets, income, state, rules) {
  logger.debug(`Assessing eligibility for ${state}`);

  const maritalStatus = clientInfo.maritalStatus?.toLowerCase() || "single";

  const resourceLimit =
    maritalStatus === "married" ? rules.assetLimitMarried : rules.assetLimitSingle;

  const incomeLimit =
    maritalStatus === "married" ? rules.incomeLimitMarried : rules.incomeLimitSingle;

  if (typeof resourceLimit !== "number" || typeof incomeLimit !== "number") {
    throw new Error(`Missing asset or income limits for ${state}`);
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
    state
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
 * @param {string} state - State of application
 * @returns {Promise<Object>} Eligibility assessment result
 */
async function medicaidEligibilityAssessment(clientInfo, assets, income, state) {
  logger.info(`Starting eligibility assessment for ${state}`);

  try {
    const rules = medicaidRules[state.toLowerCase()];
    if (!rules) {
      throw new Error(`No Medicaid rules found for state: ${state}`);
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
      error: `Eligibility assessment error: ${error.message}`,
      status: "error"
    };
  }
}

module.exports = {
  assessEligibility,
  determineEligibilityStrategies,
  planEligibilityApproach,
  medicaidEligibilityAssessment
};
