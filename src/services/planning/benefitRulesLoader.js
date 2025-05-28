// src/services/planning/benefitRulesLoader.js
const logger = require('../../config/logger');
const { BenefitRules } = require('../../models');

/**
 * DATABASE-BASED BENEFIT RULES LOADER
 * Loads benefit program rules for different states from PostgreSQL database
 * This replaces the old JSON file-based approach
 */

/**
 * Gets all benefit program rules for a state
 * 
 * @param {string} state - State to get rules for (FL, CA, etc.)
 * @param {number} year - Year (default: 2025)
 * @returns {Object} All benefit rules for the state
 */
async function getBenefitRules(state, year = 2025) {
  logger.debug(`Loading benefit rules for state: ${state}`);
  
  if (!state) {
    throw new Error('State must be provided to get benefit rules');
  }
  
  try {
    const rules = await BenefitRules.findByState(state.toUpperCase(), year);
    
    if (!rules || rules.length === 0) {
      throw new Error(`No benefit rules found for state: ${state}`);
    }
    
    // Transform into the format expected by existing code
    const benefitRules = {};
    rules.forEach(rule => {
      // Map database field names to expected format
      const programName = rule.program === 'veterans' ? 'veteransBenefits' : rule.program;
      
      benefitRules[programName] = {
        // Standard fields
        individual_amount: rule.individual_amount,
        couple_amount: rule.couple_amount,
        income_limit: rule.income_limit,
        resource_limit: rule.resource_limit,
        
        // Program-specific details (from JSONB field)
        ...rule.program_details,
        
        // Legacy field names for backwards compatibility
        ...(rule.program === 'ssi' && {
          individualFBR: rule.individual_amount,
          coupleFBR: rule.couple_amount,
          resourceLimitIndividual: rule.resource_limit,
          resourceLimitCouple: rule.resource_limit * 1.5, // Typical couple multiplier
          stateSupplement: rule.program_details?.stateSupplement || 0
        }),
        
        ...(rule.program === 'snap' && {
          maxBenefitIndividual: rule.individual_amount,
          maxBenefitCouple: rule.couple_amount,
          incomeLimit: rule.income_limit
        })
      };
    });
    
    return benefitRules;
    
  } catch (error) {
    logger.error(`Error loading benefit rules for ${state}: ${error.message}`);
    throw error;
  }
}

/**
 * Gets rules for a specific benefit program in a state
 * 
 * @param {string} state - State to get rules for
 * @param {string} program - Program name (ssi, medicare, snap, veteransBenefits)
 * @param {number} year - Year (default: 2025)
 * @returns {Object} Program-specific rules
 */
async function getProgramRules(state, program, year = 2025) {
  logger.debug(`Loading ${program} rules for state: ${state}`);
  
  if (!program) {
    throw new Error('Program must be specified');
  }
  
  try {
    // Map legacy program names to database names
    const dbProgramName = program === 'veteransBenefits' ? 'veterans' : program;
    
    const rule = await BenefitRules.findByStateAndProgram(state.toUpperCase(), dbProgramName, year);
    
    if (!rule) {
      throw new Error(`No rules found for program: ${program} in state: ${state}`);
    }
    
    // Return in expected format with legacy field names
    const programRules = {
      individual_amount: rule.individual_amount,
      couple_amount: rule.couple_amount,
      income_limit: rule.income_limit,
      resource_limit: rule.resource_limit,
      ...rule.program_details
    };
    
    // Add legacy field names for backwards compatibility
    if (program === 'ssi') {
      programRules.individualFBR = rule.individual_amount;
      programRules.coupleFBR = rule.couple_amount;
      programRules.resourceLimitIndividual = rule.resource_limit;
      programRules.stateSupplement = rule.program_details?.stateSupplement || 0;
    }
    
    if (program === 'snap') {
      programRules.maxBenefitIndividual = rule.individual_amount;
      programRules.maxBenefitCouple = rule.couple_amount;
      programRules.incomeLimit = rule.income_limit;
    }
    
    return programRules;
    
  } catch (error) {
    logger.error(`Error loading ${program} rules for ${state}: ${error.message}`);
    throw error;
  }
}

/**
 * Gets SSI payment standards for a state
 * 
 * @param {string} state - State to get rules for
 * @param {string} livingArrangement - Living arrangement type
 * @param {number} year - Year (default: 2025)
 * @returns {Object} SSI payment standards
 */
async function getSSIPaymentStandards(state, livingArrangement = 'individual', year = 2025) {
  logger.debug(`Getting SSI payment standards for ${state}`);
  
  try {
    const ssiRules = await getProgramRules(state, 'ssi', year);
    
    if (livingArrangement === 'couple') {
      return {
        federalBenefit: ssiRules.coupleFBR || ssiRules.couple_amount,
        stateSupplement: ssiRules.stateSupplement || 0,
        totalBenefit: (ssiRules.coupleFBR || ssiRules.couple_amount) + (ssiRules.stateSupplement || 0)
      };
    } else {
      return {
        federalBenefit: ssiRules.individualFBR || ssiRules.individual_amount,
        stateSupplement: ssiRules.stateSupplement || 0,
        totalBenefit: (ssiRules.individualFBR || ssiRules.individual_amount) + (ssiRules.stateSupplement || 0)
      };
    }
  } catch (error) {
    logger.error(`Error getting SSI payment standards for ${state}: ${error.message}`);
    throw error;
  }
}

/**
 * Gets Medicare premium and cost information for a state
 * 
 * @param {string} state - State to get rules for
 * @param {number} year - Year (default: 2025)
 * @returns {Object} Medicare cost information
 */
async function getMedicareCosts(state, year = 2025) {
  logger.debug(`Getting Medicare costs for ${state}`);
  
  try {
    const medicareRules = await getProgramRules(state, 'medicare', year);
    
    return {
      partAPremium: medicareRules.partAPremium || 0,
      partBPremium: medicareRules.partBPremium || 185,
      partBDeductible: medicareRules.partBDeductible || 257,
      partDAvgPremium: medicareRules.partDAvgPremium || 39,
      totalMonthlyCost: (medicareRules.partAPremium || 0) + (medicareRules.partBPremium || 185) + (medicareRules.partDAvgPremium || 39)
    };
  } catch (error) {
    logger.error(`Error getting Medicare costs for ${state}: ${error.message}`);
    throw error;
  }
}

/**
 * Gets Veterans Benefit rates for a state
 * 
 * @param {string} state - State to get rules for
 * @param {string} benefitType - Type of benefit (basic, aidAndAttendance, housebound, survivor)
 * @param {number} year - Year (default: 2025)
 * @returns {Object} Veterans benefit information
 */
async function getVeteransBenefitRates(state, benefitType = 'basic', year = 2025) {
  logger.debug(`Getting Veterans benefit rates for ${state}`);
  
  try {
    const veteransRules = await getProgramRules(state, 'veteransBenefits', year);
    
    let benefitAmount = 0;
    
    switch (benefitType) {
      case 'aidAndAttendance':
        benefitAmount = veteransRules.aidAndAttendance || 1881;
        break;
      case 'housebound':
        benefitAmount = veteransRules.housebound || 1744;
        break;
      case 'survivor':
        benefitAmount = veteransRules.survivorBenefit || 967;
        break;
      case 'basic':
      default:
        benefitAmount = veteransRules.basicPension || veteransRules.individual_amount || 1425;
    }
    
    return {
      benefitType,
      monthlyAmount: benefitAmount,
      annualAmount: benefitAmount * 12
    };
  } catch (error) {
    logger.error(`Error getting Veterans benefit rates for ${state}: ${error.message}`);
    throw error;
  }
}

/**
 * Gets SNAP (food stamps) benefit information for a state
 * 
 * @param {string} state - State to get rules for
 * @param {string} householdSize - Size of household (individual or couple)
 * @param {number} year - Year (default: 2025)
 * @returns {Object} SNAP benefit information
 */
async function getSNAPBenefits(state, householdSize = 'individual', year = 2025) {
  logger.debug(`Getting SNAP benefits for ${state}`);
  
  try {
    const snapRules = await getProgramRules(state, 'snap', year);
    
    if (householdSize === 'couple') {
      return {
        maxBenefit: snapRules.maxBenefitCouple || snapRules.couple_amount,
        incomeLimit: (snapRules.incomeLimit || snapRules.income_limit) * 1.35
      };
    } else {
      return {
        maxBenefit: snapRules.maxBenefitIndividual || snapRules.individual_amount,
        incomeLimit: snapRules.incomeLimit || snapRules.income_limit
      };
    }
  } catch (error) {
    logger.error(`Error getting SNAP benefits for ${state}: ${error.message}`);
    throw error;
  }
}

/**
 * Lists all available states in the benefit rules
 * 
 * @param {number} year - Year (default: 2025)
 * @returns {Array} List of state codes
 */
async function getAvailableStates(year = 2025) {
  try {
    const rules = await BenefitRules.findAllByProgram('ssi', year); // Use SSI as it's available in all states
    return rules.map(rule => rule.state).sort();
  } catch (error) {
    logger.error(`Error getting available states: ${error.message}`);
    throw error;
  }
}

/**
 * Lists all available programs for a state
 * 
 * @param {string} state - State to check
 * @param {number} year - Year (default: 2025)
 * @returns {Array} List of program names
 */
async function getAvailablePrograms(state, year = 2025) {
  try {
    const rules = await BenefitRules.findByState(state.toUpperCase(), year);
    return rules.map(rule => rule.program === 'veterans' ? 'veteransBenefits' : rule.program).sort();
  } catch (error) {
    logger.error(`Error getting available programs for ${state}: ${error.message}`);
    throw error;
  }
}

// Note: updateBenefitRules removed as database updates should go through proper data management procedures

module.exports = {
  getBenefitRules,
  getProgramRules,
  getSSIPaymentStandards,
  getMedicareCosts,
  getVeteransBenefitRates,
  getSNAPBenefits,
  getAvailableStates,
  getAvailablePrograms
};