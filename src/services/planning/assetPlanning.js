// src/services/planning/assetPlanning.js
const logger = require('../../config/logger');
const medicaidRulesLoader = require('../utils/medicaidRulesLoader');
const eligibilityUtils = require('../eligibility/eligibilityUtils');

/**
 * Assesses a client's asset situation for Medicaid
 * 
 * @param {Object} assets - Client's assets breakdown by type
 * @param {string} state - State of application (will be converted to uppercase)
 * @param {string} maritalStatus - Client's marital status
 * @returns {Promise<Object>} Asset assessment results
 */
async function assessAssetSituation(assets, state, maritalStatus) {
  // Convert state to uppercase to match test expectations
  const stateUpper = state.toUpperCase();
  logger.debug(`Assessing asset situation for ${stateUpper}, marital status: ${maritalStatus}`);
  
  try {
    // Classify assets
    const { countableAssets, nonCountableAssets } = eligibilityUtils.classifyAssets(assets);
    
    // Get state resource limit
    const resourceLimit = await medicaidRulesLoader.getResourceLimit(stateUpper, maritalStatus);
    
    // Determine if assets exceed limit
    const exceedsLimit = countableAssets > resourceLimit;
    
    // Calculate excess assets
    const excessAssets = exceedsLimit ? countableAssets - resourceLimit : 0;
    
    return {
      countableAssets,
      nonCountableAssets,
      resourceLimit,
      exceedsLimit,
      excessAssets,
      state: stateUpper
    };
  } catch (error) {
    logger.error(`Error assessing asset situation: ${error.message}`);
    throw new Error(`Asset assessment error: ${error.message}`);
  }
}

/**
 * Assesses home equity for Medicaid eligibility
 * 
 * @param {Object} assets - Client's assets including home value
 * @param {string} state - State of application
 * @returns {Promise<Object>} Home equity assessment
 */
async function assessHomeEquity(assets, state) {
  const stateUpper = state.toUpperCase();
  logger.debug(`Assessing home equity for ${stateUpper}`);
  
  try {
    // Extract home value
    const homeValue = assets.home || assets.primary_residence || 0;
    
    // Get mortgage balance
    const mortgageBalance = assets.mortgage_balance || 0;
    
    // Calculate equity
    const equity = Math.max(0, homeValue - mortgageBalance);
    
    // Get state equity limit
    const equityLimit = await medicaidRulesLoader.getHomeEquityLimit(stateUpper);
    
    // Determine if equity exceeds limit
    const exceedsLimit = equity > equityLimit;
    
    return {
      homeValue,
      mortgageBalance,
      equity,
      equityLimit,
      exceedsLimit,
      excessEquity: exceedsLimit ? equity - equityLimit : 0
    };
  } catch (error) {
    logger.error(`Error assessing home equity: ${error.message}`);
    throw new Error(`Home equity assessment error: ${error.message}`);
  }
}

/**
 * Develops asset planning strategies based on assessment
 * 
 * @param {Object} assessment - Asset assessment from assessAssetSituation
 * @param {Object} homeEquity - Home equity assessment from assessHomeEquity
 * @param {Object} clientInfo - Client demographic information
 * @returns {Promise<Object>} Asset planning strategies
 */
async function developAssetStrategies(assessment, homeEquity, clientInfo) {
  logger.debug(`Developing asset strategies for client in ${assessment.state}`);
  
  try {
    const strategies = [];
    const implementationSteps = [];
    
    // If assets exceed limit, recommend appropriate strategies
    if (assessment.exceedsLimit) {
      // Basic strategies
      strategies.push('Spend down excess countable assets on exempt goods/services');
      implementationSteps.push('Pay for immediate care needs and medical expenses');
      
      // More specific strategies based on amount of excess
      if (assessment.excessAssets > 10000) {
        strategies.push('Convert countable assets to non-countable resources');
        implementationSteps.push('Make home improvements if primary residence is owned');
        implementationSteps.push('Purchase irrevocable funeral trust');
        
        // Add more strategies based on marital status
        if (clientInfo.maritalStatus === 'married' && !clientInfo.spouseNeedsLTC) {
          strategies.push('Maximize Community Spouse Resource Allowance (CSRA)');
          implementationSteps.push('Consult with elder law attorney for CSRA planning');
        } else {
          strategies.push('Evaluate Medicaid-compliant annuity purchase');
          implementationSteps.push('Obtain quotes for Medicaid-compliant annuity');
        }
      }
    } else {
      strategies.push('Assets within Medicaid limits, focus on documentation and preservation');
      implementationSteps.push('Document exempt asset status');
      implementationSteps.push('Maintain records of all financial transactions');
    }
    
    // Home equity strategies if applicable
    if (homeEquity && homeEquity.exceedsLimit) {
      strategies.push('Address excess home equity');
      
      // Different strategies based on circumstances
      if (clientInfo.maritalStatus === 'married' && !clientInfo.spouseNeedsLTC) {
        implementationSteps.push('Transfer home to community spouse');
      } else if (clientInfo.dependentRelativeInHome) {
        implementationSteps.push('Document dependent relative\'s residence in the home');          
      } else {
        implementationSteps.push('Consider home equity loan to reduce countable equity');
        implementationSteps.push('Evaluate sale of home and transition to care facility');
      }
    }
    
    return {
      strategies,
      implementationSteps,
      planningTimeframe: assessment.exceedsLimit ? '3-6 months' : 'Immediate',
      needsLegalAssistance: assessment.excessAssets > 10000 || (homeEquity && homeEquity.exceedsLimit)
    };
  } catch (error) {
    logger.error(`Error developing asset strategies: ${error.message}`);
    throw new Error(`Strategy development error: ${error.message}`);
  }
}

/**
 * Implements asset planning actions
 * 
 * @param {Object} strategies - Strategies from developAssetStrategies
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assessment - Asset assessment
 * @returns {Promise<Object>} Implementation plan
 */
async function implementAssetPlan(strategies, clientInfo, assessment) {
  logger.debug('Implementing asset planning strategies');
  
  try {
    const spendDownPlan = [];
    const conversionPlan = [];
    const protectionPlan = [];
    
    // Create specific plans based on strategies
    strategies.strategies.forEach(strategy => {
      if (strategy.includes('spend down')) {
        spendDownPlan.push('Pay for care services in advance');
        spendDownPlan.push('Pay off debts and mortgages');
        spendDownPlan.push('Pay for medical devices not covered by insurance');
        
        if (assessment.excessAssets > 5000) {
          spendDownPlan.push('Home modifications for aging in place');
          spendDownPlan.push('Purchase newer vehicle if needed for transportation');
        }
      } else if (strategy.includes('convert')) {
        conversionPlan.push('Purchase irrevocable funeral trust');
        conversionPlan.push('Home repairs and improvements');
        
        if (clientInfo.maritalStatus === 'married') {
          conversionPlan.push('Transfer assets to community spouse within CSRA limits');
        }
      } else if (strategy.includes('Community Spouse Resource Allowance')) {
        protectionPlan.push('Document all assets for CSRA calculation');
        protectionPlan.push('Rearrange asset ownership for maximum protection');
        protectionPlan.push('Consider fair hearing if additional resource protection needed');
      }
    });
    
    // Generate timeline
    const timeline = [
      { month: 1, action: 'Document and categorize all assets' },
      { month: 1, action: 'Begin spend-down of clearly countable assets' },
      { month: 2, action: 'Implement asset conversion strategies' },
      { month: 3, action: 'Review progress and adjust plan' }
    ];
    
    return {
      spendDownPlan,
      conversionPlan,
      protectionPlan,
      timeline,
      documentationRequirements: [
        'Complete financial statements',
        'Receipts for all spend-down transactions',
        'Appraisals of real property and other significant assets',
        'Exempt asset documentation'
      ]
    };
  } catch (error) {
    logger.error(`Error implementing asset plan: ${error.message}`);
    throw new Error(`Implementation error: ${error.message}`);
  }
}

/**
 * Complete asset planning workflow
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's assets
 * @param {string} state - State of application
 * @returns {Promise<Object>} Complete asset planning result
 */
async function assetPlanning(clientInfo, assets, state) {
  logger.info(`Starting asset planning for ${state}`);
  
  try {
    // Run asset situation assessment
    const assessment = await assessAssetSituation(
      assets, 
      state, 
      clientInfo.maritalStatus
    );
    
    // Run home equity assessment if client has a home
    const homeEquity = (assets.home || assets.primary_residence) 
      ? await assessHomeEquity(assets, state) 
      : null;
    
    // Develop strategies based on assessments
    const strategies = await developAssetStrategies(assessment, homeEquity, clientInfo);
    
    // Implement asset plan
    const implementation = await implementAssetPlan(strategies, clientInfo, assessment);
    
    logger.info('Asset planning completed successfully');
    
    return {
      status: 'success',
      assessment,
      homeEquity,
      strategies,
      implementation,
      summary: {
        countableAssets: assessment.countableAssets,
        resourceLimit: assessment.resourceLimit,
        exceedsLimit: assessment.exceedsLimit,
        excessAssets: assessment.excessAssets,
        keyStrategies: strategies.strategies.slice(0, 3)
      }
    };
  } catch (error) {
    logger.error(`Error in asset planning: ${error.message}`);
    return {
      status: 'error',
      error: `Asset planning error: ${error.message}`
    };
  }
}

// Export both function names for compatibility
module.exports = {
  assessAssets,
  assetPlanning,
  assessAssetSituation,
  assessHomeEquity,
  developAssetStrategies,
  implementAssetPlan,
  // For backward compatibility
  medicaidAssetPlanning: assetPlanning,
};