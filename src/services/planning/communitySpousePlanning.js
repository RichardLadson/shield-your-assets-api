// src/services/planning/communitySpousePlanning.js
const logger = require('../../config/logger');
const medicaidRules = require('../../data/medicaid_rules_2025.json');

/**
 * Assesses the community spouse planning situation
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's asset data
 * @param {Object} income - Client's income data
 * @param {Object} expenses - Client's expenses
 * @param {string} state - State of application
 * @returns {Object} Community spouse needs assessment
 */
function assessCommunitySpouseNeeds(clientInfo, assets, income, expenses, state) {
  logger.debug(`Assessing community spouse needs for state ${state}`);

  // Check if client is married with a community spouse
  if (clientInfo.maritalStatus !== 'married' || !clientInfo.spouseInfo) {
    return {
      hasCommunitySpoue: false,
      message: 'Client is not married or has no community spouse'
    };
  }

  // Get state rules
  const rules = medicaidRules[state.toLowerCase()];
  if (!rules) {
    throw new Error(`No Medicaid rules found for state: ${state}`);
  }

  // Basic spouse needs assessment
  const spouseNeeds = {
    housingCosts: expenses.housing + (expenses.utilities || 0),
    incomeGap: calculateIncomeGap(income, expenses, state, rules),
    needsIncomeAllowance: true,
    medicalNeeds: {
      highMedicalExpenses: (expenses.medical || 0) > 500
    }
  };

  if (clientInfo.spouseInfo.age > 80) {
    spouseNeeds.specialConsiderations = ['elderly spouse requires additional support'];
  }

  return {
    spouseNeeds,
    incomeGap: spouseNeeds.incomeGap,
    resourceNeeds: calculateResourceNeeds(assets, income, state, rules)
  };
}

/**
 * Calculate income gap for community spouse
 */
function calculateIncomeGap(income, expenses, state, rules) {
  const spouseIncome = income.spouse_social_security || 0;
  const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + val, 0);
  return Math.max(0, totalExpenses - spouseIncome);
}

/**
 * Calculate resource needs for community spouse
 */
function calculateResourceNeeds(assets, income, state, rules) {
  const totalAssets = Object.values(assets).reduce((sum, val) => 
    typeof val === 'number' ? sum + val : sum, 0);
  return {
    totalAssets,
    needsResourceProtection: totalAssets > 10000
  };
}

/**
 * Calculates the Community Spouse Resource Allowance
 * 
 * @param {number} totalAssets - Total countable assets
 * @param {Object} clientInfo - Client demographic information
 * @param {string} state - State of application
 * @returns {Object} CSRA calculation details
 */
function calculateCSRA(totalAssets, clientInfo, state) {
  logger.debug(`Calculating CSRA for ${state} with total assets: ${totalAssets}`);

  // Get state rules
  const rules = medicaidRules[state.toLowerCase()];
  if (!rules) {
    throw new Error(`No Medicaid rules found for state: ${state}`);
  }

  // Get CSRA limits
  const csraMin = rules.communitySpouseResourceAllowanceMin;
  const csraMax = rules.communitySpouseResourceAllowanceMax;

  if (!csraMin || !csraMax) {
    throw new Error(`Missing CSRA limits for state: ${state}`);
  }

  // Calculate half of assets
  const halfOfAssets = totalAssets / 2;

  // Apply CSRA limits
  let csraAmount;
  if (halfOfAssets < csraMin) {
    csraAmount = csraMin;
  } else if (halfOfAssets > csraMax) {
    csraAmount = csraMax;
  } else {
    csraAmount = halfOfAssets;
  }

  // Calculate remaining assets after CSRA
  const remainingAssets = Math.max(0, totalAssets - csraAmount);

  // Determine if all assets are protected
  const allAssetsProtected = remainingAssets === 0;

  // Check for special circumstances
  const specialCircumstances = [];
  const expandedAllowanceRecommended = false;
  
  if (clientInfo.spouseInfo && clientInfo.spouseInfo.expandedResourceAllowance) {
    specialCircumstances.push(`expanded resource allowance due to ${clientInfo.spouseInfo.expandedResourceReason}`);
  }

  return {
    totalCountableAssets: totalAssets,
    halfOfAssets,
    csraAmount,
    remainingAssets,
    allAssetsProtected,
    specialCircumstances,
    expandedAllowanceRecommended
  };
}

/**
 * Calculates the Minimum Monthly Maintenance Needs Allowance
 * 
 * @param {Object} spouseNeeds - Spouse needs assessment
 * @param {Object} clientInfo - Client demographic information
 * @param {string} state - State of application
 * @returns {Object} MMNA calculation details
 */
function calculateMMNA(spouseNeeds, clientInfo, state) {
  logger.debug(`Calculating MMNA for ${state}`);

  // Get state rules
  const rules = medicaidRules[state.toLowerCase()];
  if (!rules) {
    throw new Error(`No Medicaid rules found for state: ${state}`);
  }

  // Get MMNA limits
  const mmnaMin = rules.monthlyMaintenanceNeedsAllowanceMin;
  const mmnaMax = rules.monthlyMaintenanceNeedsAllowanceMax;
  const excessShelterStandard = rules.monthlyMaintenanceNeedsAllowanceMin / 3; // Typically 1/3 of min MMNA

  if (!mmnaMin || !mmnaMax) {
    throw new Error(`Missing MMNA limits for state: ${state}`);
  }

  // Calculate excess shelter allowance
  const housingCosts = spouseNeeds.housingCosts || 0;
  const excessShelterAllowance = Math.max(0, housingCosts - excessShelterStandard);

  // Calculate total allowance
  let totalAllowance = mmnaMin + excessShelterAllowance;
  
  // Apply cap if needed
  const isCapped = totalAllowance > mmnaMax;
  if (isCapped) {
    totalAllowance = mmnaMax;
  }

  // Handle court-ordered support if applicable
  let courtOrderedAmount = null;
  let courtOrderOverride = false;
  
  if (spouseNeeds.courtOrderedSupport) {
    courtOrderedAmount = spouseNeeds.courtOrderedSupport;
    courtOrderOverride = true;
    totalAllowance = courtOrderedAmount;
  }

  return {
    baseAllowance: mmnaMin,
    excessShelterAllowance,
    totalAllowance,
    isCapped,
    courtOrderedAmount,
    courtOrderOverride
  };
}

/**
 * Develops strategies for community spouse
 * 
 * @param {Object} csraCalculation - CSRA calculation from calculateCSRA
 * @param {Object} mmnaCalculation - MMNA calculation from calculateMMNA
 * @param {Object} spouseNeeds - Spouse needs assessment
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's asset data
 * @param {Object} income - Client's income data
 * @param {string} state - State of application
 * @returns {Object} Community spouse strategies
 */
function developSpouseStrategies(
  csraCalculation,
  mmnaCalculation,
  spouseNeeds,
  clientInfo,
  assets,
  income,
  state
) {
  logger.debug(`Developing community spouse strategies for ${state}`);

  const strategies = [];
  const implementation = [];
  
  // Asset allocation strategies
  if (csraCalculation.remainingAssets > 0) {
    strategies.push('Allocate assets to maximize CSRA protection');
    strategies.push('Retitle Community Spouse Resource Allowance (CSRA) assets');
    implementation.push('Create detailed asset allocation plan with elder law attorney');
  }
  
  // Income maximization strategies
  if (spouseNeeds.incomeGap > 0) {
    strategies.push('Maximize income available to community spouse');
    strategies.push('Review and adjust spousal income allowances if necessary');
    implementation.push('Calculate and document Monthly Maintenance Needs Allowance (MMNA)');
  }
  
  // Expanded resource allowance strategies
  if (csraCalculation.expandedAllowanceRecommended) {
    strategies.push('Pursue expanded resource allowance through fair hearing');
    implementation.push('Prepare documentation showing need for additional resources');
  }
  
  // Housing recommendations
  const housingRecommendations = [];
  if (assets.home && assets.home > 0) {
    if (spouseNeeds.housingCosts > mmnaCalculation.baseAllowance * 0.5) {
      housingRecommendations.push('Evaluate housing cost reduction options');
      housingRecommendations.push('Ensure home is properly titled to community spouse');
    }
  }
  
  // Income maximization plan
  const incomeMaximizationPlan = [];
  if (spouseNeeds.needsIncomeAllowance) {
    incomeMaximizationPlan.push('Document all community spouse expenses to maximize MMNA');
    incomeMaximizationPlan.push(`Target monthly allowance: $${mmnaCalculation.totalAllowance.toFixed(2)}`);
  }
  
  // Asset allocation plan
  const resourceAllocationPlan = [];
  if (csraCalculation.remainingAssets > 0) {
    resourceAllocationPlan.push(`Allocate and retitle $${csraCalculation.csraAmount.toFixed(2)} to community spouse`);
    resourceAllocationPlan.push('Consider converting excess assets to income through Medicaid-compliant annuity');
  }
  
  // Legal action plan if needed
  const legalActionPlan = csraCalculation.expandedAllowanceRecommended ? 
    ['File for fair hearing to request increased resource allowance'] : [];
  
  return {
    strategies,
    implementation,
    housingRecommendations,
    incomeMaximizationPlan,
    resourceAllocationPlan,
    legalActionPlan,
    assetRetitling: csraCalculation.remainingAssets > 0,
    spousalAllowanceReview: spouseNeeds.needsIncomeAllowance
  };
}

/**
 * Complete community spouse planning workflow
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's asset data
 * @param {Object} income - Client's income data
 * @param {Object} expenses - Client's expense data
 * @param {string} state - The state of application
 * @returns {Promise<Object>} Complete community spouse planning result
 */
async function communitySpousePlanning(clientInfo, assets, income, expenses, state) {
  logger.info(`Starting community spouse planning for ${state}`);

  // Skip if client is not married
  if (clientInfo.maritalStatus !== 'married') {
    logger.info('Client is not married, community spouse planning not applicable');
    return {
      status: 'not applicable',
      message: 'Client is not married, no community spouse planning needed'
    };
  }

  // Skip if both spouses need long-term care
  if (clientInfo.spouseInfo && clientInfo.spouseInfo.needsLongTermCare) {
    logger.info('Both spouses need long-term care, modifying community spouse planning');
    return {
      status: 'modified',
      message: 'Both spouses need long-term care, standard community spouse rules don\'t apply',
      dualApplicationConsiderations: [
        'Both spouses may need separate Medicaid applications',
        'Each spouse is treated as a separate household for eligibility',
        'Different asset allocation strategies apply for dual-applicant couples'
      ]
    };
  }

  try {
    // Perform needs assessment
    const spouseNeeds = assessCommunitySpouseNeeds(clientInfo, assets, income, expenses, state);
    
    // Calculate total countable assets (simplified for this example)
    const totalAssets = Object.values(assets).reduce((sum, val) => 
      typeof val === 'number' ? sum + val : sum, 0);
    
    // Calculate CSRA and MMNA
    const csraCalculation = calculateCSRA(totalAssets, clientInfo, state);
    const mmnaCalculation = calculateMMNA(spouseNeeds.spouseNeeds, clientInfo, state);
    
    // Develop strategies
    const strategiesResult = developSpouseStrategies(
      csraCalculation,
      mmnaCalculation,
      spouseNeeds.spouseNeeds,
      clientInfo,
      assets,
      income,
      state
    );
    
    // Create planning report
    const planningReport = {
      summary: `Community spouse planning for ${clientInfo.name}'s spouse in ${state}`,
      recommendations: strategiesResult.strategies,
      nextSteps: strategiesResult.implementation
    };
    
    logger.info('Community spouse planning completed successfully');

    return {
      status: 'success',
      spouseNeeds,
      csraCalculation,
      mmnaCalculation,
      strategies: strategiesResult.strategies,
      implementation: strategiesResult.implementation,
      planningReport
    };
  } catch (error) {
    logger.error(`Error in community spouse planning: ${error.message}`);
    return {
      status: 'error',
      error: `Community spouse planning error: ${error.message}`
    };
  }
}

// Export both function names for compatibility
module.exports = {
  assessCommunitySpouseNeeds,
  calculateCSRA,
  calculateMMNA,
  developSpouseStrategies,
  communitySpousePlanning,
  // For backward compatibility
  medicaidCommunitySpousePlanning: communitySpousePlanning,
  assessCommunitySpouseSituation: assessCommunitySpouseNeeds
};