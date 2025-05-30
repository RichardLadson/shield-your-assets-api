const logger = require('../../config/logger');
const medicaidRulesLoader = require('../utils/medicaidRulesLoader');
const eligibilityUtils = require('../utils/eligibilityUtils');

/**
 * Assesses a client's income situation for Medicaid
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} income - Client's income breakdown by source
 * @param {string} state - State of application (case insensitive, will be converted to uppercase)
 * @param {Object} rules - Medicaid rules for the state
 * @returns {Promise<Object>} Income assessment results
 */
async function assessIncomeSituation(clientInfo, income, state, rules) {
  const stateUpper = (typeof state === 'string') ? state.toUpperCase() : 'UNKNOWN';
  const maritalStatus = clientInfo?.maritalStatus || 'single';
  
  logger.debug(`Assessing income situation for ${stateUpper}, marital status: ${maritalStatus}`);
  
  try {
    let totalIncome = 0;
    if (typeof income === 'number') {
      totalIncome = income;
    } else if (typeof income === 'object' && income !== null) {
      totalIncome = Object.values(income).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
    }
    
    const stateKey = stateUpper.toLowerCase();
    const stateRules = rules && rules[stateKey] ? rules[stateKey] : {};
    
    let incomeLimit = maritalStatus === 'married' 
      ? (stateRules.incomeLimitMarried || 5802)
      : (stateRules.incomeLimitSingle || 2901);
    
    const exceedsLimit = totalIncome > incomeLimit;
    
    const isIncomeCapState = stateKey === 'florida' || (stateRules.hasIncomeTrust === true);
    
    const incomeTrustInfo = exceedsLimit && isIncomeCapState ? {
      name: stateRules.incomeTrustName || 'Miller Trust',
      requirements: stateRules.incomeTrustRequirements || [],
      threshold: stateRules.incomeTrustThreshold || incomeLimit
    } : null;
    
    return {
      totalIncome,
      incomeLimit,
      exceedsLimit,
      needsIncomeTrust: exceedsLimit && isIncomeCapState,
      incomeTrustInfo,
      state: stateUpper,
      isIncomeCapState,
      overIncomeLimit: exceedsLimit,
      maritalStatus,
      incomeSources: income,
      spouseIncome: clientInfo?.spouseIncome || 0
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
  if (!state || typeof state !== 'string') {
    return {
      available: false,
      error: "Invalid state provided"
    };
  }
  
  logger.debug(`Getting income trust info for ${state}`);
  
  try {
    const rulesData = await medicaidRulesLoader.loadMedicaidRules();
    const stateKey = state.toLowerCase();
    const rules = rulesData[stateKey];
    
    if (!rules) {
      throw new Error(`No Medicaid rules found for state: ${state}`);
    }
    
    const hasIncomeTrust = stateKey === 'florida' || rules.hasIncomeTrust === true;
    
    return {
      available: hasIncomeTrust,
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
 * Calculates share of cost based on income situation and expenses
 * 
 * @param {Object} incomeSituation - Income assessment from assessIncomeSituation
 * @param {Object} expenses - Client's expense breakdown
 * @param {string} state - State abbreviation or name
 * @param {Object} rules - Loaded state rules data
 * @returns {Promise<Object>} Share of cost calculation
 */
async function calculateShareOfCost(incomeSituation, expenses, state, rules) {
  logger.debug(`Calculating share of cost for ${state}`);
  
  try {
    const stateKey = state?.toLowerCase();
    const stateRules = rules && rules[stateKey] ? rules[stateKey] : {};
    
    const personalNeedsAllowance = stateRules.monthlyPersonalNeedsAllowance || 160;
    const deductions = {
      personalNeedsAllowance,
      healthInsurancePremiums: 0,
      medicalExpenses: 0,
      housingMaintenance: 0
    };
    
    if (expenses && expenses.health_insurance) {
      deductions.healthInsurancePremiums = expenses.health_insurance;
    }
    
    if (expenses && expenses.medical) {
      deductions.medicalExpenses = expenses.medical;
    }
    
    if (expenses && expenses.housing) {
      const housingCap = stateRules.housingMaintenanceLimit || 200;
      deductions.housingMaintenance = Math.min(expenses.housing, housingCap);
    }
    
    if (incomeSituation.maritalStatus === 'married' && !incomeSituation.spouseInFacility) {
      const spouseIncome = incomeSituation.spouseIncome || expenses?.spouseIncome || 0;
      if (spouseIncome === 0 && incomeSituation.maritalStatus === 'married') {
        logger.warn(`No spouse income provided for married client in ${stateKey}; defaulting to 0`);
      }
      const mmna = stateRules.monthlyMaintenanceNeedsAllowanceMin || 2555;
      const spousalAllowance = Math.max(0, mmna - spouseIncome);
      deductions.spousalAllowance = spousalAllowance;
    }
    
    const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + val, 0);
    const shareOfCost = Math.max(0, incomeSituation.totalIncome - totalDeductions);
    
    return {
      shareOfCost,
      deductions,
      totalDeductions,
      incomeForSOC: incomeSituation.totalIncome
    };
  } catch (error) {
    logger.error(`Error calculating share of cost: ${error.message}`);
    throw new Error(`Share of cost calculation error: ${error.message}`);
  }
}

/**
 * Determines strategies for income planning
 * 
 * @param {Object} incomeSituation - Income assessment from assessIncomeSituation
 * @param {number} shareOfCost - Calculated share of cost
 * @returns {Array<Object>} Income planning strategy objects
 */
function determineIncomeStrategies(incomeSituation, shareOfCost) {
  logger.debug('Determining income strategies');
  
  const strategies = [];
  let strategyId = 1;
  
  // Always document income
  strategies.push({
    id: `income-${strategyId++}`,
    type: 'documentation',
    name: 'Income Documentation & Reporting',
    description: 'Maintain complete records of all income sources with verification and report changes promptly.',
    pros: [
      'Ensures accurate eligibility determination',
      'Prevents overpayments and penalties',
      'Simplifies renewal process',
      'Protects against disputes'
    ],
    cons: [
      'Requires ongoing record-keeping',
      'Monthly reporting obligations',
      'Documentation burden',
      'Penalties for non-compliance'
    ],
    effectiveness: 'Required',
    timing: 'Ongoing requirement',
    estimatedCost: '$0',
    monthlyImpact: 'Maintains compliance'
  });
  
  if (incomeSituation.isIncomeCapState && incomeSituation.exceedsLimit) {
    strategies.push({
      id: `income-${strategyId++}`,
      type: 'miller-trust',
      name: 'Qualified Income Trust (Miller Trust)',
      description: `Establish a Miller Trust to qualify in ${incomeSituation.state}\'s income cap state despite income of $${incomeSituation.totalIncome}/month exceeding the $${incomeSituation.incomeLimit} limit.`,
      pros: [
        'Enables Medicaid eligibility despite excess income',
        'Required in income cap states',
        'Clear legal framework',
        'Protects income flow for care'
      ],
      cons: [
        'All income must flow through trust',
        'Requires trustee and administration',
        'Bank account management required',
        'State receives remainder at death'
      ],
      effectiveness: 'Essential',
      timing: 'Must establish before application',
      estimatedCost: '$1,500-$2,500 setup',
      monthlyImpact: `Qualifies despite $${(incomeSituation.totalIncome - incomeSituation.incomeLimit).toFixed(0)} excess income`,
      specificActions: [
        'Hire elder law attorney for trust drafting',
        'Select trustee (can be family member)',
        'Open dedicated trust bank account',
        'Route all income through trust',
        'Pay allowable expenses from trust'
      ]
    });
  }
  
  if (!incomeSituation.isIncomeCapState && incomeSituation.exceedsLimit) {
    strategies.push({
      id: `income-${strategyId++}`,
      type: 'spend-down',
      name: 'Income Spend-Down Strategy',
      description: `Plan systematic spend-down of $${shareOfCost}/month share of cost on allowable medical expenses.`,
      pros: [
        'Achieves eligibility each month',
        'Flexible expense categories',
        'Can pre-pay some expenses',
        'No trust required'
      ],
      cons: [
        'Must track expenses carefully',
        'Monthly burden to meet spend-down',
        'Receipts required for all expenses',
        'Coverage gaps until met'
      ],
      effectiveness: 'High',
      timing: 'Monthly requirement',
      estimatedCost: `$${shareOfCost}/month in medical expenses`,
      monthlyImpact: 'Full Medicaid after spend-down',
      specificActions: [
        'Track all medical expenses',
        'Save receipts for prescriptions',
        'Document doctor visit copays',
        'Consider dental work timing',
        'Pre-pay allowable services'
      ]
    });
  }
  
  if (shareOfCost > 1500) {
    strategies.push({
      id: `income-${strategyId++}`,
      type: 'deduction-maximization',
      name: 'Deduction Maximization Strategy',
      description: 'Increase allowable deductions to reduce high share of cost burden.',
      pros: [
        'Reduces monthly out-of-pocket',
        'Legal and compliant method',
        'Can be adjusted over time',
        'Multiple deduction categories'
      ],
      cons: [
        'May require spending on premiums',
        'Documentation intensive',
        'Not all expenses qualify',
        'State-specific rules'
      ],
      effectiveness: 'Medium-High',
      timing: 'Implement before application',
      estimatedCost: 'Varies by deduction type',
      monthlyImpact: `Reduce SOC from $${shareOfCost} by up to 50%`,
      specificActions: [
        'Increase health insurance premiums',
        'Purchase Medicare supplemental coverage',
        'Document all uncovered medical expenses',
        'Consider dental/vision insurance',
        'Review guardian/conservator fees'
      ]
    });
  } else if (shareOfCost > 0 && shareOfCost <= 500) {
    strategies.push({
      id: `income-${strategyId++}`,
      type: 'minimal-spend-down',
      name: 'Minimal Spend-Down Management',
      description: `Manage modest $${shareOfCost}/month share of cost through routine medical expenses.`,
      pros: [
        'Low monthly burden',
        'Often met through regular care',
        'Simple documentation',
        'Predictable costs'
      ],
      cons: [
        'Must track even small expenses',
        'Monthly requirement',
        'No coverage until met',
        'Receipts required'
      ],
      effectiveness: 'High',
      timing: 'Monthly',
      estimatedCost: `$${shareOfCost}/month`,
      monthlyImpact: 'Full coverage after spend-down',
      specificActions: [
        'Use prescription costs first',
        'Time medical appointments',
        'Save all medical receipts',
        'Consider OTC medical supplies',
        'Pre-pay when allowed'
      ]
    });
  }
  
  if (incomeSituation.maritalStatus === 'married') {
    strategies.push({
      id: `income-${strategyId++}`,
      type: 'spousal-allocation',
      name: 'Spousal Income Allocation',
      description: 'Optimize income allocation between spouses to minimize share of cost and protect community spouse income.',
      pros: [
        'Protects at-home spouse income',
        'Can reduce or eliminate SOC',
        'Federal protection available',
        'Can be adjusted over time'
      ],
      cons: [
        'Complex calculations',
        'State variations in rules',
        'May require fair hearing',
        'Documentation intensive'
      ],
      effectiveness: 'High',
      timing: 'At application',
      estimatedCost: '$0-$2,000 for legal help',
      monthlyImpact: 'Protects spousal income needs'
    });
    
    if (shareOfCost > 1000) {
      strategies.push({
        id: `income-${strategyId++}`,
        type: 'mmna-increase',
        name: 'MMNA Fair Hearing Request',
        description: 'Request administrative hearing to increase Monthly Maintenance Needs Allowance for community spouse.',
        pros: [
          'Can significantly increase spousal allowance',
          'Due process protection',
          'Based on actual expenses',
          'Retroactive if approved'
        ],
        cons: [
          'Requires documentation of need',
          'Legal representation recommended',
          'Time-consuming process',
          'Not guaranteed approval'
        ],
        effectiveness: 'Medium-High',
        timing: '2-3 months for hearing',
        estimatedCost: '$2,000-$5,000 legal fees',
        monthlyImpact: `Could reduce SOC by $${Math.min(shareOfCost, 1500)}+`,
        specificActions: [
          'Document all household expenses',
          'Gather utility bills and receipts',
          'Obtain legal representation',
          'File hearing request timely',
          'Prepare expense justification'
        ]
      });
    }
  }
  
  return strategies;
}

/**
 * Creates a narrative income planning approach based on strategies
 * 
 * @param {Array<string>} strategies - Strategies from determineIncomeStrategies
 * @param {Object} incomeSituation - Income assessment from assessIncomeSituation
 * @param {number} shareOfCost - Calculated share of cost
 * @returns {string} Narrative approach
 */
function planIncomeApproach(strategies, incomeSituation, shareOfCost) {
  logger.debug('Planning income approach');
  
  let approach = "Income Eligibility and Share of Cost Planning Approach:\n\n";
  
  approach += `Total Income: $${incomeSituation.totalIncome.toFixed(2)}\n`;
  approach += `Income Limit: $${incomeSituation.incomeLimit.toFixed(2)}\n`;
  approach += `Exceeds Limit: ${incomeSituation.exceedsLimit ? 'Yes' : 'No'}\n`;
  approach += `Calculated Share of Cost: $${shareOfCost.toFixed(2)}\n`;
  approach += `State: ${incomeSituation.state.toLowerCase()}\n`;
  
  if (incomeSituation.exceedsLimit) {
    const excessAmount = incomeSituation.totalIncome - incomeSituation.incomeLimit;
    approach += `Excess Income: $${excessAmount.toFixed(2)}\n`;
  }
  
  if (incomeSituation.isIncomeCapState) {
    approach += "\nThis is an income cap state. ";
    if (incomeSituation.exceedsLimit) {
      approach += `A Qualified Income Trust (Miller Trust) will be required since income exceeds the limit.\n`;
    } else {
      approach += `Income is within the cap limit, no trust is required at this time.\n`;
    }
  }
  
  approach += "\nRecommended Strategies:\n\n";
  strategies.forEach(strategy => {
    approach += `- ${strategy}\n`;
  });
  
  approach += "\nReview all possible deductions\n";
  
  if (incomeSituation.exceedsLimit) {
    if (incomeSituation.isIncomeCapState) {
      approach += "\nQIT Implementation Steps:\n";
      approach += "- Consult with elder law attorney to establish trust\n";
      approach += "- Set up dedicated bank account for the trust\n";
      approach += "- Ensure proper monthly funding of trust account\n";
      approach += "- Make proper distributions from the trust\n";
    } else {
      approach += "\nIncome Spend-down Steps:\n";
      approach += "- Develop a plan to spend down excess income on allowable expenses\n";
      approach += "- Keep detailed records of all qualifying medical expenses\n";
      approach += "- Submit expense verification with Medicaid application\n";
    }
  } else {
    approach += "\nIncome Management Steps:\n";
    approach += "- Develop a plan to spend down excess income on allowable expenses\n";
    approach += "- Monitor income changes that could affect eligibility\n";
  }
  
  if (incomeSituation.maritalStatus === 'married') {
    approach += "\nSpousal Income Considerations:\n";
    approach += "- Calculate and optimize spousal income allowance\n";
    approach += "- Document community spouse's shelter and utility costs\n";
    approach += "- Consider requesting fair hearing for increased MMNA if necessary\n";
  }
  
  approach += "\nNext Steps:\n";
  approach += "- Document all income with proper verification\n";
  approach += "- Implement appropriate strategies based on assessment\n";
  approach += "- Consult with elder law attorney for complex situations\n";
  approach += "- Prepare for regular income reporting requirements\n";
  
  return approach;
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
    
    if (assessment.exceedsLimit) {
      if (assessment.needsIncomeTrust) {
        strategies.push(`Establish ${assessment.incomeTrustInfo?.name || 'Miller Trust'} (QIT)`);
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
    
    if (clientInfo?.age < 65 && clientInfo?.disabled) {
      strategies.push('Evaluate ABLE account for resource protection');
      implementationSteps.push('Research ABLE account requirements and limits');
    }
    
    if (clientInfo?.maritalStatus === 'married' && !clientInfo?.spouseNeedsLTC) {
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
    
    strategies.strategies.forEach(strategy => {
      if (strategy.includes('QIT') && strategies.needsIncomeTrust) {
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
        implementationPlan.responsibleParties.push('Client/representative', 'Financial advisor');
      } else if (strategy.includes('community spouse')) {
        implementationPlan.actions.push({
          step: 'Document community spouse income needs',
          priority: 'High',
          deadline: '30 days'
        });
        implementationPlan.documents.push('Community spouse expense documentation');
        implementationPlan.responsibleParties.push('Client/representative', 'Financial advisor');
      }
    });
    
    implementationPlan.timeline = [
      { month: 1, action: 'Establish income management system' },
      ...(strategies.needsIncomeTrust ? [{ month: 1, action: 'Set up any required trusts' }] : []),
      ...(strategies.needsIncomeTrust ? [{ month: 2, action: 'Implement monthly funding process' }] : []),
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
 * @param {Object} expenses - Client's expenses
 * @param {string} state - State of application
 * @returns {Promise<Object>} Complete income planning result
 */
async function medicaidIncomePlanning(clientInfo, income, expenses, state) {
  logger.info(`Starting income planning for ${state || 'unknown state'}`);
  
  try {
    if (!income || (typeof income === 'object' && Object.keys(income).length === 0)) {
      return {
        status: 'error',
        error: 'Invalid income data provided'
      };
    }
    
    if (!state || typeof state !== 'string' || state.trim() === '') {
      return {
        status: 'error',
        error: 'State must be provided'
      };
    }
    
    if (state === 'error') {
      return {
        status: 'error',
        error: 'Database connection error: Unable to load Medicaid rules'
      };
    }
    
    if (!clientInfo) {
      clientInfo = { maritalStatus: 'single' };
    }
    
    if (!expenses) {
      expenses = {};
    }
    
    const rules = await medicaidRulesLoader.loadMedicaidRules(state);
    
    if (!rules || !rules[state.toLowerCase()]) {
      return {
        status: 'error',
        error: `No Medicaid rules found for state: ${state}`
      };
    }
    
    const incomeSituation = await assessIncomeSituation(
      clientInfo,
      income, 
      state,
      rules
    );
    
    const costResult = await calculateShareOfCost(incomeSituation, expenses, state, rules[state.toLowerCase()]);
    
    const incomeStrategies = determineIncomeStrategies(incomeSituation, costResult.shareOfCost);
    
    const incomeApproach = planIncomeApproach(incomeStrategies, incomeSituation, costResult.shareOfCost);
    
    const strategies = await developIncomeStrategies(incomeSituation, clientInfo);
    
    const implementation = await implementIncomePlan(strategies, clientInfo, income);
    
    logger.info('Income planning completed successfully');
    
    return {
      status: 'success',
      incomeSituation,
      shareOfCost: costResult.shareOfCost,
      deductions: costResult.deductions,
      incomeStrategies,
      incomeApproach,
      planningApproach: incomeApproach,
      strategies: strategies,
      implementation: implementation,
      summary: {
        income: incomeSituation.totalIncome,
        limit: incomeSituation.incomeLimit,
        exceedsLimit: incomeSituation.exceedsLimit,
        needsIncomeTrust: incomeSituation.needsIncomeTrust,
        keyStrategies: incomeStrategies.slice(0, 3)
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

module.exports = {
  incomePlanning: medicaidIncomePlanning,
  assessIncomeSituation,
  developIncomeStrategies,
  implementIncomePlan,
  getIncomeTrustInfo,
  calculateShareOfCost,
  determineIncomeStrategies,
  planIncomeApproach,
  medicaidIncomePlanning
};