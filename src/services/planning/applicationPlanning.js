// src/services/planning/applicationPlanning.js
const logger = require('../../config/logger');

/**
 * Plans the Medicaid application approach based on client information
 * 
 * @param {Object} input - Application planning input with clientInfo, assets, income, state, and maritalStatus
 * @returns {Object} Application planning result
 */
function planApplication(input) {
  logger.debug(`Planning Medicaid application for ${input.clientInfo.name}`);
  
  // Determine the appropriate applicant
  let applicant;
  if (input.clientInfo.age >= 65) {
    applicant = input.maritalStatus === "married" ? "Community Spouse" : "Patient";
  } else {
    applicant = "Authorized Representative";
  }
  
  // Assess timing factors
  const totalAssets = (input.assets.countable || 0) + (input.assets.non_countable || 0);
  const totalIncome = Object.values(input.income).reduce((a, b) => a + b, 0);
  
  const timingFactors = {
    needsRetroactiveCoverage: totalAssets > 2000, // Placeholder threshold
    recentTransfers: false, // Placeholder - implement actual check if needed
    pendingSpendDown: totalAssets > 2000,
    incomeOverLimit: totalIncome > 2349, // Example income limit
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
    applicationApproach += `- Asset spend-down needs to be completed (excess assets: $${(totalAssets - 2000).toFixed(2)})\n`;
  }
  
  if (timingFactors.incomeOverLimit) {
    applicationApproach += `- Income exceeds the limit by $${(totalIncome - 2349).toFixed(2)}, income management needed\n`;
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
    applicationApproach,
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
    // Prepare input for planning
    const input = {
      clientInfo,
      assets,
      income,
      state,
      maritalStatus
    };
    
    // Plan the application
    const result = planApplication(input);
    
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