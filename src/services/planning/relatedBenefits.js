// src/services/planning/relatedBenefits.js
const logger = require('../../config/logger');
const benefitRulesLoader = require('./benefitRulesLoader');

/**
 * Identifies related benefits the client may be eligible for
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} income - Client's income data
 * @param {Object} assets - Client's asset data
 * @param {string} state - State of application
 * @returns {Object} Related benefit eligibility
 */
function identifyRelatedBenefits(clientInfo, income, assets, state) {
  logger.debug(`Identifying related benefits for client in ${state}`);
  
  const stateUpper = state.toUpperCase();
  const potentialBenefits = [];
  
  // Consider Medicare if client is 65+ or disabled
  if (clientInfo.age >= 65 || clientInfo.disabled) {
    potentialBenefits.push({
      program: 'Medicare',
      eligible: true,
      notes: clientInfo.age >= 65 ? 'Age-based eligibility' : 'Disability-based eligibility'
    });
    
    // Medicare Savings Programs
    const totalIncome = calculateTotalIncome(income);
    if (totalIncome < 1470) { // Example income limit
      potentialBenefits.push({
        program: 'Medicare Savings Program (QMB)',
        eligible: true,
        notes: 'May help pay Medicare premiums, deductibles, and copayments'
      });
    }
  }
  
  // Consider SSI if low income and resources
  const totalAssets = calculateTotalAssets(assets);
  const totalMonthlyIncome = calculateTotalIncome(income);
  
  if (totalAssets < 2000 && totalMonthlyIncome < 841) {
    potentialBenefits.push({
      program: 'Supplemental Security Income (SSI)',
      eligible: true,
      notes: 'Low income and resources'
    });
  }
  
  // Consider SNAP (food stamps)
  if (totalMonthlyIncome < 1473) {
    potentialBenefits.push({
      program: 'SNAP (Food Stamps)',
      eligible: true,
      notes: 'Income appears to be within program limits'
    });
  }
  
  // Consider Veterans Benefits if applicable
  if (clientInfo.veteranStatus) {
    potentialBenefits.push({
      program: 'Veterans Pension',
      eligible: true,
      notes: 'Veteran status - further assessment needed'
    });
    
    if (clientInfo.needsLTC) {
      potentialBenefits.push({
        program: 'Aid and Attendance',
        eligible: true,
        notes: 'Veteran with care needs'
      });
    }
  }
  
  return {
    potentialBenefits,
    state: stateUpper
  };
}

/**
 * Calculates total monthly income
 * 
 * @param {Object} income - Income breakdown
 * @returns {number} Total monthly income
 */
function calculateTotalIncome(income) {
  return Object.values(income).reduce((sum, value) => sum + (value || 0), 0);
}

/**
 * Calculates total countable assets
 * 
 * @param {Object} assets - Assets breakdown
 * @returns {number} Total countable assets
 */
function calculateTotalAssets(assets) {
  const nonCountableTypes = ['home', 'primary_residence', 'automobile_primary', 'burial_funds'];
  
  // Sum up all assets except non-countable types
  return Object.entries(assets).reduce((sum, [key, value]) => {
    if (!nonCountableTypes.includes(key)) {
      return sum + (value || 0);
    }
    return sum;
  }, 0);
}

/**
 * Gets detailed information about a specific benefit program
 * 
 * @param {string} program - Program name (e.g., 'Medicare', 'SSI')
 * @param {string} state - State of application
 * @returns {Object} Detailed program information
 */
function getBenefitDetails(program, state) {
  logger.debug(`Getting details for ${program} in ${state}`);
  
  const stateUpper = state.toUpperCase();
  
  // Get state-specific benefit rules
  try {
    // Mapping from program name to benefitRulesLoader function
    const programMapping = {
      'Medicare': () => benefitRulesLoader.getMedicareCosts(stateUpper),
      'SSI': () => benefitRulesLoader.getSSIPaymentStandards(stateUpper),
      'SNAP': () => benefitRulesLoader.getSNAPBenefits(stateUpper),
      'Veterans Pension': () => benefitRulesLoader.getVeteransBenefitRates(stateUpper, 'basic'),
      'Aid and Attendance': () => benefitRulesLoader.getVeteransBenefitRates(stateUpper, 'aidAndAttendance')
    };
    
    // Look up in our mapping
    if (programMapping[program]) {
      return {
        program,
        details: programMapping[program](),
        applicationProcess: getBenefitApplicationProcess(program),
        resourceLimits: getBenefitResourceLimits(program, stateUpper)
      };
    } else {
      return {
        program,
        details: {},
        error: `Program details not available for: ${program}`
      };
    }
  } catch (error) {
    logger.error(`Error getting benefit details: ${error.message}`);
    return {
      program,
      error: `Error retrieving benefit details: ${error.message}`
    };
  }
}

/**
 * Gets application process details for a benefit
 * 
 * @param {string} program - Program name
 * @returns {Object} Application process details
 */
function getBenefitApplicationProcess(program) {
  // Mock data for application processes
  const applicationProcesses = {
    'Medicare': {
      where: 'Social Security Administration',
      how: 'Online at ssa.gov, by phone, or in person at SSA office',
      requirements: ['Birth certificate', 'Social Security card', 'Proof of citizenship/residency'],
      timeline: '3-5 months for processing'
    },
    'SSI': {
      where: 'Social Security Administration',
      how: 'In person at SSA office, or by phone appointment',
      requirements: ['Birth certificate', 'Social Security card', 'Financial statements', 'Medical records if disabled'],
      timeline: '3-5 months for processing'
    },
    'SNAP': {
      where: 'State Department of Health/Human Services',
      how: 'Online through state portal or in person at local office',
      requirements: ['Proof of identity', 'Proof of residency', 'Income verification', 'Asset verification'],
      timeline: '30 days for processing'
    },
    'Veterans Pension': {
      where: 'Department of Veterans Affairs',
      how: 'Online at va.gov or in person at VA office',
      requirements: ['DD-214 discharge papers', 'Financial statements', 'Medical evidence if claiming health issues'],
      timeline: '3-6 months for processing'
    },
    'Aid and Attendance': {
      where: 'Department of Veterans Affairs',
      how: 'Submit VA Form 21-2680 with pension application or separately',
      requirements: ['Medical evidence of need for regular aid', 'DD-214 discharge papers', 'Financial statements'],
      timeline: '6-8 months for processing'
    }
  };
  
  return applicationProcesses[program] || {
    note: 'Application process details not available'
  };
}

/**
 * Gets resource limits for a benefit program
 * 
 * @param {string} program - Program name
 * @param {string} state - State code
 * @returns {Object} Resource limits
 */
function getBenefitResourceLimits(program, state) {
  try {
    // Use benefitRulesLoader for programs it supports
    if (program === 'SSI') {
      const ssiRules = benefitRulesLoader.getProgramRules(state, 'ssi');
      return {
        individual: ssiRules.resourceLimitIndividual,
        couple: ssiRules.resourceLimitCouple
      };
    }
    
    // Hardcoded values for other programs
    const resourceLimits = {
      'Medicare': {
        note: 'No resource limits for basic Medicare, but some programs like Extra Help have limits'
      },
      'SNAP': {
        individual: 2750,
        elderly_disabled: 4250,
        note: 'Limits may vary by state and household size'
      },
      'Veterans Pension': {
        net_worth: 150538,
        note: 'Combined assets and annual income must be below net worth limit'
      },
      'Aid and Attendance': {
        net_worth: 150538,
        note: 'Same net worth limit as Veterans Pension'
      }
    };
    
    return resourceLimits[program] || {
      note: 'Resource limit information not available'
    };
  } catch (error) {
    logger.error(`Error getting resource limits: ${error.message}`);
    return {
      error: `Error retrieving resource limits: ${error.message}`
    };
  }
}

/**
 * Develops strategies for maximizing related benefits
 * 
 * @param {Object} benefitEligibility - Results from identifyRelatedBenefits
 * @param {Object} clientInfo - Client demographic information
 * @returns {Object} Benefit maximization strategies
 */
function developBenefitStrategies(benefitEligibility, clientInfo) {
  logger.debug(`Developing benefit strategies for ${benefitEligibility.state}`);
  
  const strategies = [];
  const implementationSteps = [];
  
  // For each potential benefit, add relevant strategies
  benefitEligibility.potentialBenefits.forEach(benefit => {
    if (!benefit.eligible) return;
    
    switch (benefit.program) {
      case 'Medicare':
        strategies.push('Evaluate Medicare Savings Programs (MSP) eligibility');
        strategies.push('Review Medicare Part D prescription plans annually');
        implementationSteps.push('Apply for appropriate Medicare Savings Program');
        implementationSteps.push('Schedule Medicare plan review during open enrollment');
        break;
        
      case 'Medicare Savings Program (QMB)':
        strategies.push('Apply for QMB to cover Medicare costs');
        implementationSteps.push('Submit QMB application to state Medicaid office');
        break;
        
      case 'SSI':
        strategies.push('Apply for SSI as supplemental income');
        implementationSteps.push('Schedule appointment with SSA for SSI application');
        break;
        
      case 'SNAP':
        strategies.push('Apply for SNAP benefits to support nutrition needs');
        implementationSteps.push('Complete SNAP application with state human services department');
        break;
        
      case 'Veterans Pension':
        strategies.push('Evaluate eligibility for enhanced VA pension benefits');
        implementationSteps.push('Gather military service records and medical documentation');
        implementationSteps.push('Apply for VA pension benefits');
        break;
        
      case 'Aid and Attendance':
        strategies.push('Apply for Aid and Attendance benefit to help cover care costs');
        implementationSteps.push('Obtain physician statement documenting care needs');
        implementationSteps.push('Submit VA Form 21-2680 with pension application');
        break;
    }
  });
  
  // Add general strategies
  if (strategies.length > 0) {
    strategies.push('Coordinate all benefits to maximize coverage and income');
    implementationSteps.push('Create benefits calendar with important review dates');
    implementationSteps.push('Document all benefit applications and approvals');
  }
  
  return {
    strategies,
    implementationSteps,
    benefitCoordination: strategies.length > 1,
    priorityApps: strategies.length > 0 ? benefitEligibility.potentialBenefits.slice(0, 2).map(b => b.program) : []
  };
}

/**
 * Complete related benefits planning workflow
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} income - Client's income sources
 * @param {Object} assets - Client's assets
 * @param {string} state - State of application
 * @returns {Object} Complete related benefits planning result
 */
function relatedBenefitsPlanning(clientInfo, income, assets, state) {
  logger.info(`Starting related benefits planning for ${state}`);
  
  try {
    // Identify potential related benefits
    const benefitEligibility = identifyRelatedBenefits(clientInfo, income, assets, state);
    
    // Get details for each eligible benefit
    const benefitDetails = {};
    benefitEligibility.potentialBenefits.forEach(benefit => {
      if (benefit.eligible) {
        benefitDetails[benefit.program] = getBenefitDetails(benefit.program, state);
      }
    });
    
    // Develop strategies
    const strategies = developBenefitStrategies(benefitEligibility, clientInfo);
    
    logger.info('Related benefits planning completed successfully');
    
    return {
      status: 'success',
      benefitEligibility,
      benefitDetails,
      strategies,
      summary: {
        eligiblePrograms: benefitEligibility.potentialBenefits.filter(b => b.eligible).map(b => b.program),
        topStrategies: strategies.strategies.slice(0, 3)
      }
    };
  } catch (error) {
    logger.error(`Error in related benefits planning: ${error.message}`);
    return {
      status: 'error',
      error: `Related benefits planning error: ${error.message}`
    };
  }
}

// Export both function names for compatibility
module.exports = {
  relatedBenefitsPlanning,
  identifyRelatedBenefits,
  getBenefitDetails,
  developBenefitStrategies,
  // For backward compatibility
  medicaidRelatedBenefitsPlanning: relatedBenefitsPlanning
};