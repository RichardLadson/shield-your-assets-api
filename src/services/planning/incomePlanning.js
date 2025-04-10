// src/services/planning/incomePlanning.js
const logger = require('../../config/logger');
const { validateAllInputs } = require('../validation/inputValidation');
const { 
  getIncomeLimit, 
  getPersonalNeedsAllowance, 
  getMmmnaLimits, 
  loadMedicaidRules 
} = require('../utils/medicaidRulesLoader');
const { calculateTotalIncome } = require('../eligibility/eligibilityUtils');

/**
 * Assess the client's income situation for Medicaid planning
 * @param {Object} clientInfo - Client information
 * @param {Object} income - Client income
 * @param {string} state - Normalized state
 * @param {Object} rulesData - Rules data
 * @returns {Promise<Object>} - Income situation assessment
 */
async function assessIncomeSituation(clientInfo, income, state, rulesData) {
  logger.debug(`Assessing income situation for ${state}`);
  
  const maritalStatus = clientInfo.maritalStatus;
  
  // Get income limit from rules data
  const incomeLimit = await getIncomeLimit(state, maritalStatus, true, rulesData);
  
  // Calculate total income
  const totalIncome = calculateTotalIncome(income);
  
  // Simple check if it's an income cap state (simplified)
  // In a full implementation, this would be determined from the JSON data
  const incomeCapStates = ['florida', 'texas', 'alabama'];
  const isIncomeCapState = incomeCapStates.includes(state);
  
  return {
    totalIncome,
    isIncomeCapState,
    incomeLimit,
    maritalStatus,
    incomeSources: Object.keys(income),
    overIncomeLimit: totalIncome > incomeLimit,
    state
  };
}

/**
 * Calculate the share of cost based on income and allowable deductions
 * @param {Object} incomeSituation - Income situation assessment
 * @param {Object} expenses - Client expenses
 * @param {string} state - Normalized state
 * @param {Object} rulesData - Rules data
 * @returns {Promise<Object>} - Share of cost calculation and deductions
 */
async function calculateShareOfCost(incomeSituation, expenses, state, rulesData) {
  logger.debug('Calculating share of cost');
  
  const grossIncome = incomeSituation.totalIncome;
  
  // Get personal needs allowance from rules data
  const personalNeedsAllowance = await getPersonalNeedsAllowance(state, rulesData);
  
  // Calculate deductions
  const deductions = {
    personalNeedsAllowance,
    healthInsurancePremiums: expenses.health_insurance || expenses.healthInsurance || 0,
    preEligibilityMedical: expenses.pre_eligibility_medical || expenses.preEligibilityMedical || 0,
    guardianExpense: expenses.guardian || 0,
    housingMaintenance: Math.min(expenses.housing || 0, 200) // Example limit
  };
  
  let totalDeductions = Object.values(deductions).reduce((sum, val) => sum + val, 0);
  
  // Add spousal allowance if married
  if (incomeSituation.maritalStatus === 'married') {
    // Get MMMNA (Minimum Monthly Maintenance Needs Allowance) from rules data
    const { min: minMmmna } = await getMmmnaLimits(state, rulesData);
    
    // Calculate spousal allowance (simplified)
    const spouseIncome = incomeSituation.spouseIncome || 0;
    const spousalAllowance = Math.max(0, minMmmna - spouseIncome);
    
    deductions.spousalAllowance = spousalAllowance;
    totalDeductions += spousalAllowance;
  }
  
  // Calculate share of cost
  const shareOfCost = Math.max(0, grossIncome - totalDeductions);
  
  return { shareOfCost, deductions, totalDeductions };
}

/**
 * Determine income planning strategies
 * @param {Object} incomeSituation - Income situation assessment
 * @param {number} shareOfCost - Share of cost
 * @returns {Array} - Income planning strategies
 */
function determineIncomeStrategies(incomeSituation, shareOfCost) {
  logger.debug('Determining income planning strategies');
  
  const strategies = [];
  
  if (incomeSituation.overIncomeLimit) {
    if (incomeSituation.isIncomeCapState) {
      strategies.push("Consider Qualified Income Trust (Miller Trust)");
    } else {
      strategies.push("Plan for income spend-down on allowable expenses");
    }
  }
  
  if (shareOfCost > 0) {
    strategies.push("Explore ways to increase allowable deductions");
    strategies.push("Consider increasing health insurance premiums");
    strategies.push("Evaluate options to increase shelter expenses");
  }
  
  if (incomeSituation.maritalStatus === 'married') {
    strategies.push("Analyze spousal income allowance");
    strategies.push("Consider fair hearing or court order for increased MMMNA");
  }
  
  strategies.push("Review spend-down opportunities, such as pre-paid funeral or home modifications");
  
  return strategies;
}

/**
 * Develop detailed income planning approach
 * @param {Array} strategies - Income planning strategies
 * @param {Object} incomeSituation - Income situation assessment
 * @param {number} shareOfCost - Share of cost
 * @returns {string} - Detailed planning approach
 */
function planIncomeApproach(strategies, incomeSituation, shareOfCost) {
  logger.debug('Developing detailed income planning approach');
  
  let approach = "Income Eligibility and Share of Cost Planning Approach:\n";
  approach += `Total Income: $${incomeSituation.totalIncome.toFixed(2)}\n`;
  approach += `Income Limit: $${incomeSituation.incomeLimit.toFixed(2)}\n`;
  approach += `Calculated Share of Cost: $${shareOfCost.toFixed(2)}\n\n`;
  
  for (const strategy of strategies) {
    if (strategy === "Consider Qualified Income Trust (Miller Trust)") {
      approach += `- Evaluate setting up a Qualified Income Trust to manage excess income ($${(incomeSituation.totalIncome - incomeSituation.incomeLimit).toFixed(2)})\n`;
      approach += `- Consult with an elder law attorney for ${incomeSituation.state.replace('_', ' ').toUpperCase()}-specific trust setup and compliance\n`;
    } else if (strategy === "Plan for income spend-down on allowable expenses") {
      approach += "- Develop a plan to spend down excess income on allowable expenses, such as medical or dental care\n";
    } else if (strategy === "Explore ways to increase allowable deductions") {
      approach += "- Review all possible deductions and maximize where possible to lower share of cost\n";
    } else if (strategy === "Consider increasing health insurance premiums") {
      approach += "- Evaluate options for increasing health insurance coverage to reduce countable income\n";
    } else if (strategy === "Evaluate options to increase shelter expenses") {
      approach += "- Analyze current shelter expenses and identify opportunities to increase allowable deductions\n";
    } else if (strategy === "Analyze spousal income allowance") {
      approach += "- Calculate and optimize spousal income allowance to increase the community spouse income\n";
    } else if (strategy.startsWith("Consider fair hearing or court order for increased MMMNA")) {
      approach += "- Evaluate need for and feasibility of requesting increased MMMNA through a fair hearing\n";
    } else if (strategy === "Review spend-down opportunities, such as pre-paid funeral or home modifications") {
      approach += "- Use excess income to fund pre-paid funeral arrangements or home modifications to meet eligibility\n";
    }
  }
  
  return approach;
}

/**
 * Process income planning for Medicaid eligibility
 * @param {Object} clientInfo - Client information
 * @param {Object} income - Client income
 * @param {Object} expenses - Client expenses
 * @param {string} state - Client state
 * @returns {Promise<Object>} - Income planning results
 */
async function medicaidIncomePlanning(clientInfo, income, expenses, state) {
  logger.info(`Starting Medicaid income planning for ${state}`);
  
  try {
    // Load rules data
    const rulesData = await loadMedicaidRules();
    
    // Validate inputs
    const validationResult = await validateAllInputs(
      clientInfo, {}, income, expenses, null, state
    );
    
    if (!validationResult.valid) {
      logger.error(`Input validation failed: ${validationResult.message}`);
      return {
        error: validationResult.message,
        status: 'error'
      };
    }
    
    // Use normalized data from validation
    const normalizedData = validationResult.normalizedData;
    const normalizedClientInfo = normalizedData.clientInfo;
    const normalizedIncome = normalizedData.income;
    const normalizedExpenses = normalizedData.expenses;
    const normalizedState = normalizedData.state;
    
    // Assess income situation
    const incomeSituation = await assessIncomeSituation(
      normalizedClientInfo, normalizedIncome, normalizedState, rulesData
    );
    
    // Calculate share of cost
    const { shareOfCost, deductions } = await calculateShareOfCost(
      incomeSituation, normalizedExpenses, normalizedState, rulesData
    );
    
    // Determine strategies
    const incomeStrategies = determineIncomeStrategies(incomeSituation, shareOfCost);
    
    // Plan approach
    const incomeApproach = planIncomeApproach(incomeStrategies, incomeSituation, shareOfCost);
    
    logger.info('Income planning completed successfully');
    
    return {
      incomeSituation,
      shareOfCost,
      deductions,
      incomeStrategies,
      incomeApproach,
      status: 'success'
    };
  } catch (error) {
    logger.error(`Error in income planning: ${error.message}`);
    return {
      error: `Income planning error: ${error.message}`,
      status: 'error'
    };
  }
}

// Export all functions for more flexibility and testability
module.exports = {
  assessIncomeSituation,
  calculateShareOfCost,
  determineIncomeStrategies,
  planIncomeApproach,
  medicaidIncomePlanning
};