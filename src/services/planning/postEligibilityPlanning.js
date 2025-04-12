// src/services/planning/postEligibilityPlanning.js
const logger = require('../../config/logger');
const medicaidRules = require('../../data/medicaid_rules_2025.json');

/**
 * Assesses the client's post-eligibility management situation
 * 
 * @param {Object} income - Client's income information
 * @param {Object} expenses - Client's known monthly expenses
 * @param {string} state - State of application
 * @param {Object} rules - Medicaid rules for the state (optional)
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
 * Develops maintenance plan for post-eligibility period
 * 
 * @param {Object} needs - Post-eligibility needs assessment
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's assets
 * @param {Object} income - Client's income
 * @param {string} state - State of application
 * @returns {Object} Maintenance plan details
 */
function developMaintenancePlan(needs, clientInfo, assets, income, state) {
  logger.debug(`Developing maintenance plan for ${state}`);
  
  const strategies = [];
  
  // Standard maintenance strategies
  if (needs.monthlyLiabilityManagement) {
    strategies.push("Set up monthly income tracking and review");
    strategies.push("Apply excess income to patient liability");
  }
  
  // QIT management if applicable
  if (needs.needsQIT) {
    strategies.push("Establish and manage Qualified Income Trust (QIT)");
    strategies.push("Set up monthly QIT funding process");
  }
  
  // Special needs trust if applicable
  if (clientInfo.age < 65 && needs.specialNeeds) {
    strategies.push("Consider Special Needs Trust for supplemental needs");
  }
  
  // Spend-down planning
  if (needs.patientLiability > 500) {
    strategies.push("Evaluate allowable spend-down options for patient liability");
  }
  
  // Create implementation steps
  const implementationSteps = [];
  strategies.forEach(strategy => {
    if (strategy.includes("income tracking")) {
      implementationSteps.push("Create monthly income tracking spreadsheet");
    } else if (strategy.includes("QIT")) {
      implementationSteps.push("Work with attorney to establish proper QIT");
      implementationSteps.push("Set up banking automation for QIT funding");
    } else if (strategy.includes("Special Needs Trust")) {
      implementationSteps.push("Consult with special needs attorney");
    } else if (strategy.includes("spend-down")) {
      implementationSteps.push("Document allowable expense categories");
      implementationSteps.push("Track and report all qualifying expenses");
    }
  });
  
  return {
    strategies,
    implementationSteps,
    monthlyReview: true,
    annualReassessment: true,
    documentationRequirements: [
      "Monthly income records",
      "Medical expense receipts",
      "QIT statements (if applicable)"
    ]
  };
}

/**
 * Develops strategy for managing post-eligibility patient liability
 * 
 * @param {number} liability - Monthly patient liability amount
 * @param {Object} expenses - Current and potential expenses
 * @param {Object} clientInfo - Client demographic information
 * @returns {Object} Patient liability management strategies
 */
function manageLiability(liability, expenses, clientInfo) {
  logger.debug(`Managing patient liability of $${liability}`);
  
  // Skip if no liability
  if (!liability || liability <= 0) {
    return {
      strategies: ["No patient liability to manage"],
      impact: 0
    };
  }
  
  const strategies = [];
  let potentialReduction = 0;
  
  // Medical expense deductions
  const potentialMedicalExpenses = expenses.potentialMedical || 0;
  if (potentialMedicalExpenses > 0) {
    strategies.push("Identify and document uncovered medical expenses");
    potentialReduction += Math.min(liability, potentialMedicalExpenses);
  }
  
  // Health insurance premiums
  if (clientInfo.healthInsurance && !expenses.healthInsurancePremium) {
    strategies.push("Ensure health insurance premiums are deducted from patient liability");
    potentialReduction += clientInfo.healthInsurance.monthlyCost || 0;
  }
  
  // Guardian/conservator fees if applicable
  if (clientInfo.hasGuardian && !expenses.guardianFees) {
    strategies.push("Document and apply for guardian fee deduction");
    potentialReduction += 100; // Estimated amount
  }
  
  return {
    strategies,
    potentialReduction,
    netLiability: Math.max(0, liability - potentialReduction)
  };
}

/**
 * Calculates ongoing maintenance needs after Medicaid eligibility
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} income - Client's income sources
 * @param {Object} expenses - Client's expenses
 * @param {string} state - State of application
 * @returns {Object} Ongoing maintenance needs assessment
 */
function assessOngoingNeeds(clientInfo, income, expenses, state) {
  logger.debug(`Assessing ongoing needs for ${state}`);
  
  // Get state rules
  const rules = medicaidRules[state.toLowerCase()];
  if (!rules) {
    throw new Error(`No Medicaid rules found for state: ${state}`);
  }
  
  const personalNeedsAllowance = rules.monthlyPersonalNeedsAllowance || 0;
  const totalIncome = Object.values(income).reduce((a, b) => a + b, 0);
  
  // Determine if QIT is needed
  const needsQIT = totalIncome > (rules.nursingHomeIncomeLimitSingle || rules.incomeLimitSingle);
  
  // Calculate patient liability
  const basicDeductions = personalNeedsAllowance + (expenses.healthInsurancePremium || 0);
  const patientLiability = Math.max(0, totalIncome - basicDeductions);
  
  // Special considerations
  const specialConsiderations = [];
  
  if (clientInfo.age < 65) {
    specialConsiderations.push("Under 65 - may qualify for additional programs");
  }
  
  if (clientInfo.hasDisability) {
    specialConsiderations.push("Disability status may qualify for additional deductions");
  }
  
  return {
    personalNeedsAllowance,
    totalIncome,
    basicDeductions,
    patientLiability,
    needsQIT,
    specialConsiderations,
    monthlyLiabilityManagement: patientLiability > 0,
    specialNeeds: clientInfo.hasDisability
  };
}

/**
 * Main function for post-eligibility planning
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} income - Client's income sources
 * @param {Object} expenses - Client's expenses
 * @param {Object} assets - Client's remaining assets
 * @param {string} state - State of application
 * @returns {Object} Complete post-eligibility planning result
 */
async function postEligibilityPlanning(clientInfo, income, expenses, assets, state) {
  logger.info(`Starting post-eligibility planning for ${state}`);
  
  try {
    // Assess ongoing needs
    const ongoingNeeds = assessOngoingNeeds(clientInfo, income, expenses, state);
    
    // Assess post-eligibility situation
    const situationAssessment = assessPostEligibilitySituation(income, expenses, state);
    
    // Manage liability
    const liabilityPlan = manageLiability(ongoingNeeds.patientLiability, expenses, clientInfo);
    
    // Develop maintenance plan
    const maintenancePlan = developMaintenancePlan(ongoingNeeds, clientInfo, assets, income, state);
    
    logger.info('Post-eligibility planning completed successfully');
    
    return {
      status: 'success',
      ongoingNeeds,
      situationAssessment,
      liabilityPlan,
      maintenancePlan,
      summary: {
        monthlyLiability: ongoingNeeds.patientLiability,
        needsQIT: ongoingNeeds.needsQIT,
        keyStrategies: maintenancePlan.strategies
      }
    };
  } catch (error) {
    logger.error(`Error in post-eligibility planning: ${error.message}`);
    return {
      status: 'error',
      error: `Post-eligibility planning error: ${error.message}`
    };
  }
}

module.exports = {
  postEligibilityPlanning,
  assessPostEligibilitySituation,
  assessOngoingNeeds,
  manageLiability,
  developMaintenancePlan
};