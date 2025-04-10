// src/services/planning/postEligibilityPlanning.js
const logger = require('../../config/logger');

/**
 * Assesses the client's post-eligibility planning needs
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's asset data
 * @param {Object} income - Client's income data
 * @param {string} state - State of application
 * @param {string} maritalStatus - Client's marital status
 * @returns {Object} Post-eligibility needs assessment
 */
function assessPostEligibilityNeeds(clientInfo, assets, income, state, maritalStatus) {
  logger.debug("Assessing post-eligibility needs");
  
  // Determine if client has savings (for potential retitling)
  const hasSavings = assets.savings > 0 || assets.bank > 0;
  
  // Check if the client is considering a move (would be in clientInfo in a complete implementation)
  const consideringMove = clientInfo.consideringMove || false;
  
  return {
    monthlyLiabilityManagement: true, // Almost always needed
    annualRedetermination: true, // Required in all states
    assetRetitling: maritalStatus === "married" && hasSavings,
    estatePlanUpdate: true, // Good practice for all clients
    spousalAllowanceReview: maritalStatus === "married",
    potentialMove: consideringMove
  };
}

/**
 * Determines post-eligibility planning strategies based on assessment
 * 
 * @param {Object} needs - Post-eligibility needs from assessPostEligibilityNeeds
 * @returns {Array} Array of strategy strings
 */
function determinePostEligibilityStrategies(needs) {
  logger.debug("Determining post-eligibility strategies");
  const strategies = [];
  
  if (needs.monthlyLiabilityManagement) {
    strategies.push("Set up a system for managing monthly liabilities and income reporting");
  }
  
  if (needs.annualRedetermination) {
    strategies.push("Prepare for the annual Medicaid redetermination process");
  }
  
  if (needs.assetRetitling) {
    strategies.push("Retitle Community Spouse Resource Allowance (CSRA) assets");
  }
  
  if (needs.estatePlanUpdate) {
    strategies.push("Update estate plans in consultation with an elder law attorney");
  }
  
  if (needs.spousalAllowanceReview) {
    strategies.push("Review and adjust spousal income allowances if necessary");
  }
  
  if (needs.potentialMove) {
    strategies.push("Plan for potential relocation and review new state Medicaid rules");
  }
  
  // Always include a strategy to monitor changes
  strategies.push("Establish a system for tracking and reporting changes in client circumstances");
  
  return strategies;
}

/**
 * Creates a detailed post-eligibility planning approach
 * 
 * @param {Array} strategies - Strategies from determinePostEligibilityStrategies
 * @returns {string} Formatted post-eligibility planning approach
 */
function planPostEligibilityApproach(strategies) {
  logger.debug("Planning post-eligibility approach");
  let approach = "Post-Eligibility Management Approach:\n\n";
  
  approach += "After Medicaid approval, you will need to:\n";
  
  strategies.forEach(strategy => {
    if (strategy.includes("monthly liabilities")) {
      approach += "- Establish a system for managing monthly patient liabilities:\n";
      approach += "  * Set up appropriate payment methods for the nursing home or care provider\n";
      approach += "  * Track income changes that may affect the monthly liability amount\n";
      approach += "  * Keep receipts for medical expenses that might offset liability\n";
    } else if (strategy.includes("redetermination")) {
      approach += "- Prepare for annual Medicaid redetermination:\n";
      approach += "  * Mark your calendar for the annual review date\n";
      approach += "  * Gather updated financial statements and medical documentation\n";
      approach += "  * Respond promptly to all Medicaid correspondence\n";
    } else if (strategy.includes("Retitle")) {
      approach += "- Retitle assets according to the approved Community Spouse Resource Allowance:\n";
      approach += "  * Transfer assets to the community spouse's name only\n";
      approach += "  * Update account designations and property titles\n";
      approach += "  * Ensure proper documentation of all transfers\n";
    } else if (strategy.includes("estate plans")) {
      approach += "- Update estate plans to address Medicaid considerations:\n";
      approach += "  * Review and update wills, trusts, and powers of attorney\n";
      approach += "  * Consider estate recovery implications\n";
      approach += "  * Update beneficiary designations on any remaining assets\n";
    } else if (strategy.includes("spousal income")) {
      approach += "- Monitor and optimize spousal income allowances:\n";
      approach += "  * Track changes in community spouse's income and expenses\n";
      approach += "  * Request adjustments to MMMNA if circumstances change\n";
      approach += "  * Consider requesting a fair hearing if additional income is needed\n";
    } else if (strategy.includes("relocation")) {
      approach += "- Plan carefully for any potential relocation:\n";
      approach += "  * Research Medicaid rules in the new state before moving\n";
      approach += "  * Understand the transfer process between state Medicaid programs\n";
      approach += "  * Plan for potential gaps in coverage during transition\n";
    } else if (strategy.includes("tracking and reporting changes")) {
      approach += "- Establish a comprehensive change reporting system:\n";
      approach += "  * Monitor and report any changes in income, assets, or healthcare needs\n";
      approach += "  * Keep a calendar of reporting deadlines\n";
      approach += "  * Maintain detailed records of all communications with Medicaid\n";
    }
  });
  
  approach += "\nOngoing Monitoring:\n";
  approach += "- Schedule regular reviews of the Medicaid maintenance plan\n";
  approach += "- Monitor legislative changes that might affect Medicaid eligibility\n";
  approach += "- Consider working with a Medicaid planning professional for annual check-ins\n";
  
  return approach;
}

/**
 * Complete post-eligibility planning workflow
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's asset data
 * @param {Object} income - Client's income data
 * @param {string} state - The state of application
 * @param {string} maritalStatus - Client's marital status
 * @returns {Promise<Object>} Complete post-eligibility planning result
 */
async function medicaidPostEligibilityPlanning(clientInfo, assets, income, state, maritalStatus) {
  logger.info(`Starting Medicaid post-eligibility planning for ${state}`);
  
  try {
    // Assess post-eligibility needs
    const needs = assessPostEligibilityNeeds(clientInfo, assets, income, state, maritalStatus);
    
    // Determine strategies
    const strategies = determinePostEligibilityStrategies(needs);
    
    // Create detailed plan
    const approach = planPostEligibilityApproach(strategies);
    
    logger.info('Post-eligibility planning completed successfully');
    
    return {
      needs,
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
  assessPostEligibilityNeeds,
  determinePostEligibilityStrategies,
  planPostEligibilityApproach,
  medicaidPostEligibilityPlanning
};