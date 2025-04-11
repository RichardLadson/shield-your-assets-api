// src/services/planning/relatedBenefits.js
const logger = require('../../config/logger');
const medicaidRules = require('../../data/medicaid_rules_2025.json');

/**
 * Assesses the client's eligibility for related benefits
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's asset data
 * @param {Object} income - Client's income data
 * @param {string} state - State of application
 * @returns {Object} Related benefits eligibility assessment
 */
function assessBenefitEligibility(clientInfo, assets, income, state) {
  logger.debug("Assessing related benefits eligibility");

  const rules = medicaidRules[state.toLowerCase()];
  if (!rules) {
    throw new Error(`Medicaid rules not found for state: ${state}`);
  }

  const age = clientInfo.age || 0;
  const veteran = clientInfo.veteran || false;
  const hasLTCInsurance = clientInfo.hasLTCInsurance || false;
  const needsHomeCare = clientInfo.needsHomeCare || false;
  const needsNursingHomeCare = clientInfo.needsNursingHomeCare || false;

  const totalIncome = Object.values(income).reduce((a, b) => a + b, 0);

  return {
    socialSecurity: age >= 62,
    vaImprovedPension: veteran,
    ltcInsurance: hasLTCInsurance,
    medicareSavingsProgram: totalIncome < rules.incomeLimitSingle,
    hcbsWaiver: needsHomeCare,
    pace: age >= 55 && needsNursingHomeCare
  };
}

/**
 * Determines related benefits strategies based on assessment
 * 
 * @param {Object} eligibility - Benefits eligibility from assessBenefitEligibility
 * @returns {Array} Array of strategy strings
 */
function determineBenefitStrategies(eligibility) {
  logger.debug("Determining benefit strategies");
  const strategies = [];

  if (eligibility.socialSecurity) {
    strategies.push("Evaluate Social Security claiming options");
  }

  if (eligibility.vaImprovedPension) {
    strategies.push("Explore VA Improved Pension eligibility and application");
  }

  if (eligibility.ltcInsurance) {
    strategies.push("Coordinate long-term care insurance benefits with Medicaid planning");
  }

  if (eligibility.medicareSavingsProgram) {
    strategies.push("Apply for an appropriate Medicare Savings Program");
  }

  if (eligibility.hcbsWaiver) {
    strategies.push("Investigate Home and Community Based Services waiver programs");
  }

  if (eligibility.pace) {
    strategies.push("Explore PACE (Program of All-inclusive Care for the Elderly)");
  }

  return strategies;
}

/**
 * Creates a detailed related benefits planning approach
 * 
 * @param {Array} strategies - Strategies from determineBenefitStrategies
 * @param {Object} eligibility - Benefits eligibility from assessBenefitEligibility
 * @returns {string} Formatted related benefits planning approach
 */
function planBenefitApproach(strategies, eligibility) {
  logger.debug("Planning related benefits approach");
  let approach = "Related Benefits Planning Approach:\n\n";

  approach += "Based on the client's situation, the following benefit programs should be considered:\n";

  strategies.forEach(strategy => {
    if (strategy.includes("Social Security")) {
      approach += "- Social Security Benefits:\n";
      approach += "  * Evaluate optimal claiming age (62-70) based on life expectancy and financial needs\n";
      approach += "  * Consider impact of claiming decisions on Medicaid eligibility\n";
      approach += "  * Assess potential for maximizing survivor benefits if married\n";
    } else if (strategy.includes("VA")) {
      approach += "- Veterans Benefits:\n";
      approach += "  * Explore VA Improved Pension with Aid & Attendance benefits\n";
      approach += "  * Coordinate VA planning with Medicaid eligibility requirements\n";
      approach += "  * Assess net financial benefit after considering potential impacts on Medicaid\n";
    } else if (strategy.includes("long-term care insurance")) {
      approach += "- Long-Term Care Insurance Coordination:\n";
      approach += "  * Review policy benefits and elimination periods\n";
      approach += "  * Coordinate insurance payments with Medicaid eligibility timeline\n";
      approach += "  * Consider how insurance benefits affect patient liability calculations\n";
    } else if (strategy.includes("Medicare Savings Program")) {
      approach += "- Medicare Savings Programs:\n";
      approach += "  * Evaluate eligibility for QMB, SLMB, or QI programs\n";
      approach += "  * Apply for appropriate program to help cover Medicare premiums and costs\n";
      approach += "  * Coordinate with Medicaid application as needed\n";
    } else if (strategy.includes("HCBS")) {
      approach += "- Home and Community Based Services Waivers:\n";
      approach += "  * Investigate available HCBS waiver programs in the client's state\n";
      approach += "  * Understand any waitlists or limited enrollment periods\n";
      approach += "  * Compare benefits of waiver programs vs. nursing home coverage\n";
    } else if (strategy.includes("PACE")) {
      approach += "- Program of All-inclusive Care for the Elderly (PACE):\n";
      approach += "  * Determine if PACE is available in the client's area\n";
      approach += "  * Evaluate if the comprehensive service model meets care needs\n";
      approach += "  * Understand how PACE would coordinate with other benefits\n";
    }
  });

  approach += "\nNext Steps:\n";
  approach += "- Prioritize application for these benefits based on urgency and potential impact\n";
  approach += "- Coordinate timing of applications to optimize overall benefits\n";
  approach += "- Consult with specialists for each benefit program as needed\n";

  return approach;
}

/**
 * Complete related benefits planning workflow
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's asset data
 * @param {Object} income - Client's income data
 * @param {string} state - The state of application
 * @returns {Promise<Object>} Complete related benefits planning result
 */
async function medicaidRelatedBenefitsPlanning(clientInfo, assets, income, state) {
  logger.info(`Starting related benefits planning for ${state}`);

  try {
    const rules = medicaidRules[state.toLowerCase()];
    if (!rules) {
      throw new Error(`No Medicaid rules found for state: ${state}`);
    }

    const eligibility = assessBenefitEligibility(clientInfo, assets, income, state);
    const strategies = determineBenefitStrategies(eligibility);
    const approach = planBenefitApproach(strategies, eligibility);

    logger.info('Related benefits planning completed successfully');

    return {
      eligibility,
      strategies,
      approach,
      status: 'success'
    };
  } catch (error) {
    logger.error(`Error in related benefits planning: ${error.message}`);
    return {
      error: `Related benefits planning error: ${error.message}`,
      status: 'error'
    };
  }
}

module.exports = {
  assessBenefitEligibility,
  determineBenefitStrategies,
  planBenefitApproach,
  medicaidRelatedBenefitsPlanning
};
