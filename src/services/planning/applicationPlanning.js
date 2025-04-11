// src/services/planning/applicationPlanning.js
const logger = require('../../config/logger');
const medicaidRules = require('../../data/medicaid_rules_2025.json');

/**
 * Plans the Medicaid application approach based on client information
 * 
 * @param {Object} input - Application planning input with clientInfo, assets, income, state, and maritalStatus
 * @param {Object} rules - Medicaid rule values for the specific state
 * @returns {Object} Application planning result
 */
function planApplication(input, rules) {
  logger.debug(`Planning Medicaid application for ${input.clientInfo.name}`);

  // Validate essential rule values
  if (
    typeof rules.assetLimitSingle !== 'number' ||
    typeof rules.incomeLimitSingle !== 'number'
  ) {
    throw new Error(`Missing Medicaid thresholds for ${input.state}`);
  }

  // Determine the appropriate applicant
  let applicant;
  if (input.clientInfo.age >= 65) {
    applicant = input.maritalStatus === "married" ? "Community Spouse" : "Patient";
  } else {
    applicant = "Authorized Representative";
  }

  // Assess timing factors using dynamic rule values
  const totalAssets = (input.assets.countable || 0) + (input.assets.non_countable || 0);
  const totalIncome = Object.values(input.income).reduce((a, b) => a + b, 0);

  const timingFactors = {
    needsRetroactiveCoverage: totalAssets > rules.assetLimitSingle,
    recentTransfers: false, // Placeholder – implement if data becomes available
    pendingSpendDown: totalAssets > rules.assetLimitSingle,
    incomeOverLimit: totalIncome > rules.incomeLimitSingle
  };

  // Generate application strategies
  const applicationStrategies = [
    `Prepare ${applicant} to submit the Medicaid application.`
  ];

  if (timingFactors.needsRetroactiveCoverage) {
    applicationStrategies.push("Request retroactive coverage for up to 3 months.");
  }

  if (timingFactors.pendingSpendDown) {
    applicationStrategies.push("Plan and document spend-down of excess assets.");
  }

  if (timingFactors.incomeOverLimit) {
    applicationStrategies.push("Consider setting up a Qualified Income Trust (Miller Trust).");
  }

  applicationStrategies.push("Determine the optimal month to submit the application.");

  // Build the detailed approach
  let applicationApproach = "Medicaid Application Planning Approach:\n";

  applicationApproach += `- Identified applicant: ${applicant}\n\n`;
  applicationApproach += "Application timing considerations:\n";

  if (timingFactors.needsRetroactiveCoverage) {
    applicationApproach += "- Retroactive coverage should be requested (up to 3 months)\n";
  }

  if (timingFactors.pendingSpendDown) {
    const excess = totalAssets - rules.assetLimitSingle;
    applicationApproach += `- Asset spend-down needs to be completed (excess assets: $${excess.toFixed(2)})\n`;
  }

  if (timingFactors.incomeOverLimit) {
    const incomeExcess = totalIncome - rules.incomeLimitSingle;
    applicationApproach += `- Income exceeds the limit by $${incomeExcess.toFixed(2)}, income management needed\n`;
  }

  applicationApproach += "\nRecommended application strategies:\n";

  applicationStrategies.forEach((strategy) => {
    applicationApproach += `- ${strategy}\n`;
  });

  applicationApproach += "\nApplication preparation steps:\n";
  applicationApproach += "- Gather all necessary documentation\n";
  applicationApproach += `- Prepare for verification of assets and income in ${input.state}\n`;
  applicationApproach += "- Plan for potential fair hearings if needed\n";
  applicationApproach += "- Create a timeline for application submission and follow-up\n";

  return {
    applicant,
    timingFactors,
    applicationStrategies,
    applicationApproach
  };
}

/**
 * Complete application planning workflow
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's asset data
 * @param {Object} income - Client's income data
 * @param {string} state - The state of application
 * @param {string} maritalStatus - Client's marital status
 * @returns {Promise<Object>} Complete application planning result
 */
async function medicaidApplicationPlanning(clientInfo, assets, income, state, maritalStatus) {
  logger.info(`Starting Medicaid application planning for ${state}`);

  try {
    const rules = medicaidRules[state.toLowerCase()];
    if (!rules) {
      throw new Error(`No Medicaid rules found for state: ${state}`);
    }

    const input = {
      clientInfo,
      assets,
      income,
      state,
      maritalStatus
    };

    const result = planApplication(input, rules);

    logger.info('Application planning completed successfully');

    return {
      ...result,
      status: 'success'
    };
  } catch (error) {
    logger.error(`Error in application planning: ${error.message}`);
    return {
      error: `Application planning error: ${error.message}`,
      status: 'error'
    };
  }
}

module.exports = {
  planApplication,
  medicaidApplicationPlanning
};
