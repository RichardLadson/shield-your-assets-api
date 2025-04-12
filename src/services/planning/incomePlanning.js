// src/services/planning/incomePlanning.js
const logger = require('../../config/logger');
const medicaidRulesLoader = require('../utils/medicaidRulesLoader');
const eligibilityUtils = require('../eligibility/eligibilityUtils');

/**
 * Assesses a client's income situation for Medicaid
 * 
 * @param {Object} income - Client's income breakdown by source
 * @param {string} state - State of application (case insensitive, will be converted to uppercase)
 * @param {string} maritalStatus - Client's marital status
 * @param {boolean} nursingHome - Whether client is applying for nursing home coverage
 * @returns {Promise<Object>} Income assessment results
 */
async function assessIncomeSituation(income, state, maritalStatus, nursingHome = true) {
  // Convert state to uppercase to match test expectations
  const stateUpper = state.toUpperCase();
  logger.debug(`Assessing income situation for ${stateUpper}, marital status: ${maritalStatus}`);
  
  try {
    // Calculate total income
    const totalIncome = eligibilityUtils.calculateTotalIncome(income);
    
    // Get state income limit
    const incomeLimit = await medicaidRulesLoader.getIncomeLimit(stateUpper, maritalStatus, nursingHome);
    
    // Determine if income exceeds limit
    const exceedsLimit = totalIncome > incomeLimit;
    
    // Get income trust info if needed
    const incomeTrustInfo = exceedsLimit ? await getIncomeTrustInfo(stateUpper) : null;
    
    return {
      totalIncome,
      incomeLimit,
      exceedsLimit,
      needsIncomeTrust: exceedsLimit && incomeTrustInfo?.available,
      incomeTrustInfo,
      state: stateUpper
    };
  } catch (error) {
    logger.error(`Error assessing income situation: ${error.message}`);
    throw new Error(`Income assessment error: ${error.message}`);
  }
}

/**
 * Gets income trust requirements for a state
 * 
 * @param {string} state - State abbreviation or name
 * @returns {Promise<Object>} Income trust requirements
 */
async function getIncomeTrustInfo(state) {
  logger.debug(`Getting income trust info for ${state}`);
  
  try {
    // Get state rules
    const rulesData = await medicaidRulesLoader.loadMedicaidRules();
    const stateKey = state.toLowerCase(); // Normalize to lowercase for lookup
    const rules = rulesData[stateKey];
    
    if (!rules) {
      throw new Error(`No Medicaid rules found for state: ${state}`);
    }
    
    // In real app, you would parse actual rules from rulesData
    return {
      available: rules.hasIncomeTrust === true,
      name: rules.incomeTrustName || 'Qualified Income Trust',
      threshold: rules.incomeTrustThreshold || rules.incomeLimitSingle,
      requirements: rules.incomeTrustRequirements || []
    };
  } catch (error) {
    logger.error(`Error getting income trust info: ${error.message}`);
    return {
      available: false,
      error: error.message
    };
  }
}

/**
 * Develops income planning strategies based on assessment
 * 
 * @param {Object} assessment - Income assessment from assessIncomeSituation
 * @param {Object} clientInfo - Client demographic information
 * @returns {Promise<Object>} Income planning strategies
 */
async function developIncomeStrategies(assessment, clientInfo) {
  logger.debug(`Developing income strategies for client in ${assessment.state}`);
  
  try {
    const strategies = [];
    const implementationSteps = [];
    
    // If income exceeds limit, recommend appropriate strategies
    if (assessment.exceedsLimit) {
      if (assessment.needsIncomeTrust) {
        strategies.push(`Establish ${assessment.incomeTrustInfo.name} (QIT)`);
        implementationSteps.push('Consult with elder law attorney to establish proper trust');
        implementationSteps.push('Set up dedicated bank account for the trust');
        implementationSteps.push('Create process for monthly funding of trust account');
      } else {
        strategies.push('Spend down excess income on qualified medical expenses');
        implementationSteps.push('Document all medical expenses not covered by insurance');
        implementationSteps.push('Establish personal needs allowance tracking');
      }
    } else {
      strategies.push('Income within Medicaid limits, ensure continued compliance');
      implementationSteps.push('Monitor and report any income changes promptly');
    }
    
    // Add special considerations based on client info
    if (clientInfo.age < 65 && clientInfo.disabled) {
      strategies.push('Evaluate ABLE account for resource protection');
      implementationSteps.push('Research ABLE account requirements and limits');
    }
    
    if (clientInfo.maritalStatus === 'married' && !clientInfo.spouseNeedsLTC) {
      strategies.push('Maximize income allocation to community spouse');
      implementationSteps.push('Calculate MMNA (Minimum Monthly Maintenance Needs Allowance)');
    }
    
    return {
      strategies,
      implementationSteps,
      monthlyBudgetRequired: assessment.exceedsLimit,
      needsLegalAssistance: assessment.needsIncomeTrust
    };
  } catch (error) {
    logger.error(`Error developing income strategies: ${error.message}`);
    throw new Error(`Strategy development error: ${error.message}`);
  }
}

/**
 * Implements income planning actions
 * 
 * @param {Object} strategies - Strategies from developIncomeStrategies
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} income - Client's income sources
 * @returns {Promise<Object>} Implementation plan
 */
async function implementIncomePlan(strategies, clientInfo, income) {
  logger.debug('Implementing income planning strategies');
  
  try {
    const implementationPlan = {
      actions: [],
      timeline: [],
      documents: [],
      responsibleParties: []
    };
    
    // Convert strategies to concrete actions
    strategies.strategies.forEach(strategy => {
      if (strategy.includes('QIT')) {
        implementationPlan.actions.push({
          step: 'Establish Qualified Income Trust',
          priority: 'High',
          deadline: '30 days'
        });
        implementationPlan.documents.push('QIT trust document', 'QIT bank account statements');
        implementationPlan.responsibleParties.push('Elder law attorney', 'Client/representative');
      } else if (strategy.includes('ABLE account')) {
        implementationPlan.actions.push({
          step: 'Open ABLE account if eligible',
          priority: 'Medium',
          deadline: '60 days'
        });
        implementationPlan.documents.push('ABLE account application', 'Disability documentation');
      } else if (strategy.includes('community spouse')) {
        implementationPlan.actions.push({
          step: 'Document community spouse income needs',
          priority: 'High',
          deadline: '30 days'
        });
        implementationPlan.documents.push('Community spouse expense documentation');
      }
    });
    
    // Generate timeline
    implementationPlan.timeline = [
      { month: 1, action: 'Establish income management system' },
      { month: 1, action: 'Set up any required trusts' },
      { month: 2, action: 'Implement monthly funding process' },
      { month: 3, action: 'First quarterly review' }
    ];
    
    return implementationPlan;
  } catch (error) {
    logger.error(`Error implementing income plan: ${error.message}`);
    throw new Error(`Implementation error: ${error.message}`);
  }
}

/**
 * Complete income planning workflow
 * 
 * @param {Object} clientInfo - Client demographic information 
 * @param {Object} income - Client's income sources
 * @param {string} state - State of application
 * @returns {Promise<Object>} Complete income planning result
 */
async function incomePlanning(clientInfo, income, state) {
  logger.info(`Starting income planning for ${state}`);
  
  try {
    // Run income situation assessment
    const assessment = await assessIncomeSituation(
      income, 
      state, 
      clientInfo.maritalStatus, 
      clientInfo.needsNursingHome
    );
    
    // Develop strategies based on assessment
    const strategies = await developIncomeStrategies(assessment, clientInfo);
    
    // Implement income plan
    const implementation = await implementIncomePlan(strategies, clientInfo, income);
    
    logger.info('Income planning completed successfully');
    
    return {
      status: 'success',
      assessment,
      strategies,
      implementation,
      summary: {
        income: assessment.totalIncome,
        limit: assessment.incomeLimit,
        exceedsLimit: assessment.exceedsLimit,
        needsIncomeTrust: assessment.needsIncomeTrust,
        keyStrategies: strategies.strategies
      }
    };
  } catch (error) {
    logger.error(`Error in income planning: ${error.message}`);
    return {
      status: 'error',
      error: `Income planning error: ${error.message}`
    };
  }
}

// Export both function names for compatibility
module.exports = {
  incomePlanning,
  assessIncomeSituation,
  developIncomeStrategies,
  implementIncomePlan,
  getIncomeTrustInfo,
  // For backward compatibility
  medicaidIncomePlanning: incomePlanning
};