const logger = require('../../config/logger');
const medicaidRulesLoader = require('../utils/medicaidRulesLoader');
const eligibilityUtils = require('../utils/eligibilityUtils');
const inputValidation = require('../validation/inputValidation');

/**
 * Assesses a client's asset situation for Medicaid
 * 
 * @param {Object} assets - Client's assets breakdown by type
 * @param {string} state - State of application (will be converted to uppercase)
 * @param {string} maritalStatus - Client's marital status
 * @param {Object} rulesData - Medicaid rules data (optional, for testing)
 * @returns {Promise<Object>} Asset assessment results
 */
async function assessAssetSituation(assets, state, maritalStatus, rulesData) {
  if (!state) {
    throw new Error('State must be provided to assess asset situation');
  }
  const stateUpper = state.toUpperCase();
  logger.debug(`Assessing asset situation for ${stateUpper}, marital status: ${maritalStatus}`);
  
  try {
    // Classify assets
    const { countableAssets, nonCountableAssets } = eligibilityUtils.classifyAssets(assets);
    
    // Load rules or use provided rulesData
    const rules = rulesData || await medicaidRulesLoader.loadMedicaidRules(state); // Pass state
    const stateKey = state.toLowerCase();
    const stateRules = rules[stateKey] || {};
    const resourceLimit = maritalStatus === 'married'
      ? (stateRules.assetLimitMarried || 3000)
      : (stateRules.assetLimitSingle || 2000);
    
    // Determine if assets exceed limit
    const exceedsLimit = countableAssets > resourceLimit;
    const excessAssets = exceedsLimit ? countableAssets - resourceLimit : 0;
    
    // Assess home equity
    const homeValue = assets.home || assets.primary_residence || 0;
    const homeMortgage = assets.mortgage || assets.mortgage_balance || 0;
    const homeEquity = Math.max(0, homeValue - homeMortgage);
    const homeEquityLimit = stateRules.homeEquityLimit || 636000;
    const excessHomeEquity = homeEquity > homeEquityLimit ? homeEquity - homeEquityLimit : 0;
    
    return {
      countableAssets,
      nonCountableAssets,
      resourceLimit,
      exceedsLimit,
      excessAssets,
      state: stateUpper,
      hasHome: !!homeValue,
      homeValue,
      homeMortgage,
      homeEquity,
      homeEquityLimit,
      excessHomeEquity
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
    const homeValue = assets.home || assets.primary_residence || 0;
    const mortgageBalance = assets.mortgage || assets.mortgage_balance || 0;
    const equity = Math.max(0, homeValue - mortgageBalance);
    const equityLimit = await medicaidRulesLoader.getHomeEquityLimit(stateUpper);
    
    return {
      homeValue,
      mortgageBalance,
      equity,
      equityLimit,
      exceedsLimit: equity > equityLimit,
      excessEquity: equity > equityLimit ? equity - equityLimit : 0
    };
  } catch (error) {
    logger.error(`Error assessing home equity: ${error.message}`);
    throw new Error(`Home equity assessment error: ${error.message}`);
  }
}

/**
 * Determines asset planning strategies based on assessment
 * 
 * @param {Object} situation - Asset assessment from assessAssetSituation
 * @param {Object} additionalContext - Additional context (clientInfo, income, assets)
 * @returns {Array<Object>} Asset planning strategy objects
 */
function determineAssetStrategies(situation, additionalContext = {}) {
  logger.debug(`Determining asset strategies for client in ${situation.state}`);
  
  const strategies = [];
  const { clientInfo = {}, income = {}, assets = {} } = additionalContext;
  let strategyId = 1;
  
  // Infer exceedsLimit if not provided
  const exceedsLimit = situation.exceedsLimit !== undefined
    ? situation.exceedsLimit
    : situation.countableAssets > situation.resourceLimit;
  
  // Check for rental property
  if (assets.otherRealEstate > 0 || assets.rentalProperty > 0 || income.rental > 0) {
    strategies.push({
      id: `asset-${strategyId++}`,
      type: 'rental-property',
      name: 'Rental Property Restructuring',
      description: 'Transfer rental property to LLC or income-producing trust to protect asset while maintaining income stream.',
      pros: [
        'Protects property from Medicaid estate recovery',
        'Maintains rental income for expenses',
        'May qualify as non-countable business asset',
        'Provides liability protection'
      ],
      cons: [
        'LLC setup and maintenance costs',
        'May affect property tax exemptions',
        'Requires ongoing compliance',
        'Income still counts toward eligibility'
      ],
      effectiveness: 'High',
      timing: 'Implement 3-6 months before application',
      estimatedCost: '$2,000-$5,000',
      monthlyImpact: `Preserves $${income.rental || 0}/month rental income`
    });
  }
  
  // Check for veterans
  if (clientInfo.veteranStatus === 'yes' || clientInfo.isVeteran) {
    strategies.push({
      id: `asset-${strategyId++}`,
      type: 'va-benefits',
      name: 'VA Aid & Attendance Coordination',
      description: 'Coordinate VA Aid & Attendance benefits with Medicaid planning to maximize total benefits.',
      pros: [
        'Additional $1,200-$2,200/month in benefits',
        'Less restrictive asset limits than Medicaid',
        'Can be used while spending down for Medicaid',
        'No look-back period for transfers'
      ],
      cons: [
        'Cannot receive both VA A&A and Medicaid simultaneously',
        'Application process takes 3-6 months',
        'Must have wartime service',
        'Income and asset limits apply'
      ],
      effectiveness: 'High',
      timing: 'Apply immediately while planning Medicaid',
      estimatedCost: '$0-$2,500 for assistance',
      monthlyImpact: 'Up to $2,200/month additional benefits'
    });
  }
  
  // Check for LTC insurance
  if (clientInfo.hasLTCInsurance || clientInfo.longTermCareInsurance || 
      (clientInfo.insuranceDetails && clientInfo.insuranceDetails.length > 0)) {
    strategies.push({
      id: `asset-${strategyId++}`,
      type: 'ltc-insurance',
      name: 'Long-Term Care Insurance Optimization',
      description: 'Maximize LTC insurance benefits before transitioning to Medicaid coverage.',
      pros: [
        'Delays need for Medicaid by 2-3 years typically',
        'Preserves assets during insurance benefit period',
        'No spend-down required while using LTC benefits',
        'May cover services Medicaid doesn\'t'
      ],
      cons: [
        'Benefits eventually exhaust',
        'May have waiting periods',
        'Coordination with facilities required',
        'Premium payments may continue'
      ],
      effectiveness: 'High',
      timing: 'Use immediately upon care need',
      estimatedCost: 'Already paid via premiums',
      monthlyImpact: clientInfo.insuranceDetails || '$150-$300/day benefit'
    });
  }
  
  if (exceedsLimit) {
    // Asset conversion strategies based on excess amount
    if (situation.excessAssets < 50000) {
      strategies.push({
        id: `asset-${strategyId++}`,
        type: 'spend-down',
        name: 'Strategic Spend-Down Plan',
        description: `Reduce countable assets by $${situation.excessAssets.toLocaleString()} through exempt purchases and prepayments.`,
        pros: [
          'Immediate pathway to eligibility',
          'Improves quality of life',
          'No penalty period',
          'Flexible timing'
        ],
        cons: [
          'Assets are spent, not preserved',
          'Must be for exempt items only',
          'Requires careful documentation',
          'Limited to specific categories'
        ],
        effectiveness: 'Medium',
        timing: '2-4 months before application',
        estimatedCost: `$${situation.excessAssets.toLocaleString()}`,
        monthlyImpact: 'Achieves eligibility within 2-4 months',
        specificActions: [
          'Prepay funeral and burial ($15,000)',
          'Home repairs and modifications ($10,000-$25,000)',
          'Vehicle purchase or repair',
          'Dental work and medical equipment',
          'Household goods and personal items'
        ]
      });
    } else if (situation.excessAssets < 200000) {
      strategies.push({
        id: `asset-${strategyId++}`,
        type: 'asset-conversion',
        name: 'Countable to Non-Countable Asset Conversion',
        description: 'Convert liquid assets into exempt categories while maintaining value and utility.',
        pros: [
          'Preserves asset value',
          'Immediate eligibility possible',
          'No look-back period for conversions',
          'Improves living situation'
        ],
        cons: [
          'Assets become illiquid',
          'May limit future flexibility',
          'Requires proper documentation',
          'Some conversions irreversible'
        ],
        effectiveness: 'High',
        timing: '1-3 months before application',
        estimatedCost: '$500-$2,000 in transaction fees',
        monthlyImpact: 'Immediate eligibility achievement',
        specificActions: [
          'Pay off mortgage on primary residence',
          'Purchase exempt annuity for community spouse',
          'Buy new primary residence if renting',
          'Invest in income-producing property',
          'Purchase life insurance with cash value'
        ]
      });
    } else {
      strategies.push({
        id: `asset-${strategyId++}`,
        type: 'irrevocable-trust',
        name: 'Irrevocable Asset Protection Trust',
        description: 'Transfer excess assets to an irrevocable trust for long-term protection and legacy planning.',
        pros: [
          'Protects assets for heirs',
          'Removes assets from estate',
          'Professional management available',
          'Can include special provisions'
        ],
        cons: [
          '5-year look-back period applies',
          'Loss of direct control',
          'Cannot be modified easily',
          'Setup and maintenance costs'
        ],
        effectiveness: 'High',
        timing: 'Implement 5+ years before need',
        estimatedCost: '$3,000-$10,000 setup plus annual fees',
        monthlyImpact: 'Eligibility after 5-year period',
        specificActions: [
          'Choose experienced elder law attorney',
          'Select appropriate trustees',
          'Define distribution terms',
          'Include Medicaid protection language',
          'Consider retained life estate'
        ]
      });
    }
    
    // Homestead specific strategies
    if (situation.hasHome) {
      if (clientInfo.intendToReturnHome || clientInfo.intentToReturnHome) {
        strategies.push({
          id: `asset-${strategyId++}`,
          type: 'homestead-intent',
          name: 'Homestead Intent Documentation',
          description: 'Formally document intent to return home to preserve unlimited home equity exemption.',
          pros: [
            'Protects unlimited home value',
            'Preserves home for spouse/family',
            'No equity limit applies',
            'Can rent home for income'
          ],
          cons: [
            'Must maintain home',
            'Property taxes continue',
            'Must genuinely intend return',
            'State may verify intent'
          ],
          effectiveness: 'High',
          timing: 'Document before application',
          estimatedCost: '$500-$1,000 legal fees',
          monthlyImpact: 'Protects home regardless of value'
        });
      }
    }
    
    // Annuity strategies
    if (situation.excessAssets > 10000) {
      const annuityStrategy = {
        id: `asset-${strategyId++}`,
        type: 'medicaid-annuity',
        name: clientInfo.maritalStatus === 'married' 
          ? 'Spousal Medicaid-Compliant Annuity' 
          : 'Medicaid-Compliant Annuity',
        description: clientInfo.maritalStatus === 'married'
          ? 'Convert excess resources to income stream for community spouse protection.'
          : 'Convert countable assets to income stream meeting Medicaid requirements.',
        pros: clientInfo.maritalStatus === 'married' 
          ? [
              'Protects resources for at-home spouse',
              'Immediate Medicaid eligibility',
              'Guaranteed income for spouse',
              'No transfer penalty'
            ]
          : [
              'Converts resources to income',
              'Actuarially sound',
              'Immediate eligibility possible',
              'Structured payout'
            ],
        cons: [
          'Irrevocable decision',
          'Must name state as beneficiary',
          'Income affects eligibility',
          'Limited flexibility'
        ],
        effectiveness: 'High',
        timing: 'Immediately before application',
        estimatedCost: '$0-$1,000 in fees',
        monthlyImpact: `Converts $${situation.excessAssets.toLocaleString()} to income`
      };
      strategies.push(annuityStrategy);
    }
  } else {
    // Under resource limit strategies
    strategies.push({
      id: `asset-${strategyId++}`,
      type: 'asset-preservation',
      name: 'Asset Preservation & Documentation',
      description: 'Maintain eligibility while maximizing use of allowed resources.',
      pros: [
        'Already eligible for benefits',
        'Can keep $2,000-$3,000 in assets',
        'Focus on quality of life',
        'No complex planning needed'
      ],
      cons: [
        'Limited financial flexibility',
        'Must monitor asset levels',
        'Cannot accumulate savings',
        'Ongoing reporting required'
      ],
      effectiveness: 'Medium',
      timing: 'Ongoing monitoring',
      estimatedCost: '$0',
      monthlyImpact: 'Maintain current eligibility',
      specificActions: [
        'Set up dedicated account for personal needs',
        'Document all exempt assets',
        'Establish ABLE account if applicable',
        'Monitor monthly statements',
        'Plan for periodic purchases'
      ]
    });
  }
  
  // Home equity strategies
  if (situation.excessHomeEquity > 0) {
    strategies.push({
      id: `asset-${strategyId++}`,
      type: 'home-equity',
      name: 'Excess Home Equity Resolution',
      description: `Address $${situation.excessHomeEquity.toLocaleString()} in home equity exceeding state limit.`,
      pros: [
        'Maintains home ownership',
        'Can generate income',
        'Preserves asset for heirs',
        'Multiple options available'
      ],
      cons: [
        'May require monthly payments',
        'Reduces inheritance',
        'Complex transactions',
        'Professional help needed'
      ],
      effectiveness: 'High',
      timing: '2-3 months to implement',
      estimatedCost: '$3,000-$5,000 in fees',
      monthlyImpact: 'Resolves equity barrier to eligibility',
      specificActions: [
        'Reverse mortgage to reduce equity',
        'Home equity loan to reduce countable equity',
        'Sale to child with life estate retained',
        'Transfer to sibling with equity interest',
        'Outright sale and purchase of new home'
      ]
    });
  }
  
  // State-specific strategies
  if (situation.state === 'FL' && income && (income.socialSecurity + income.pension + income.annuity) > 2829) {
    strategies.push({
      id: `asset-${strategyId++}`,
      type: 'income-trust',
      name: 'Qualified Income Trust (Miller Trust)',
      description: 'Establish QIT to qualify in Florida\'s income cap state despite excess income.',
      pros: [
        'Enables eligibility despite excess income',
        'Required for Florida Medicaid',
        'Protects income flow',
        'Clear legal framework'
      ],
      cons: [
        'All income must flow through trust',
        'Requires ongoing administration',
        'Bank account management',
        'State payback provision'
      ],
      effectiveness: 'Required',
      timing: 'Must establish before application',
      estimatedCost: '$1,500-$2,500 setup',
      monthlyImpact: 'Enables eligibility despite income'
    });
  }
  
  return strategies;
}

/**
 * Creates a narrative asset planning approach
 * 
 * @param {Array<string>} strategies - Strategies from determineAssetStrategies
 * @param {Object} situation - Asset assessment
 * @returns {string} Narrative plan
 */
function planAssetApproach(strategies, situation) {
  logger.debug('Planning asset approach');
  
  let approach = "Asset Eligibility Planning Approach\n\n";
  
  // Use defaults to prevent TypeError
  const countableAssets = situation.countableAssets || 0;
  const resourceLimit = situation.resourceLimit || 0;
  const excessAssets = situation.excessAssets || 0;
  const state = situation.state ? situation.state.toLowerCase() : 'unknown';
  const homeEquity = situation.homeEquity || 0;
  const homeEquityLimit = situation.homeEquityLimit || 636000;
  const excessHomeEquity = situation.excessHomeEquity || 0;
  
  approach += `Countable Assets: $${countableAssets.toFixed(2)}\n`;
  approach += `Resource Limit: $${resourceLimit.toFixed(2)}\n`;
  approach += `Excess Assets: $${excessAssets.toFixed(2)}\n`;
  approach += `State: ${state}\n`;
  
  if (situation.hasHome) {
    approach += `Home Equity: $${homeEquity.toFixed(2)}\n`;
    if (excessHomeEquity > 0) {
      approach += `Current home equity ($${homeEquity.toFixed(2)}) exceeds state limit of $${homeEquityLimit.toFixed(2)}\n`;
    }
  }
  
  approach += "\nStrategies:\n";
  strategies.forEach(strategy => {
    approach += `- ${strategy}\n`;
  });
  
  approach += "\nAction Plan:\n";
  if (excessAssets > 0) {
    approach += `- Identify $${excessAssets.toFixed(2)} in excess countable assets\n`;
    approach += `- Pay off debt, especially home mortgage\n`;
    approach += `- Consider home renovations or improvements\n`;
    approach += `- Review ${state}-specific rules on exempt personal property\n`;
  }
  if (excessHomeEquity > 0) {
    approach += `- Consider home equity loan or reverse mortgage to reduce equity by $${excessHomeEquity.toFixed(2)}\n`;
  }
  
  return approach;
}

/**
 * Complete asset planning workflow - updated with additional validation and debugging
 * This is the main function that handles asset planning for Medicaid
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's assets
 * @param {Object} income - Client's income (optional)
 * @param {Object} expenses - Client's expenses (optional)
 * @param {Object} homeInfo - Home information (optional)
 * @param {string} state - State of application
 * @returns {Promise<Object>} Complete asset planning result
 */
async function assetPlanning(clientInfo, assets, income, expenses, homeInfo, state) {
  try {
    // Log inputs for debugging
    logger.info(`Starting asset planning for client in ${state}`);
    logger.debug(`Client info received: ${JSON.stringify(clientInfo)}`);
    logger.debug(`Assets received: ${JSON.stringify(assets)}`);
    
    // Ensure basic required parameters exist before validation
    if (!clientInfo) {
      logger.error('Client info is missing');
      return { status: 'error', error: 'Client information is required' };
    }
    
    if (!assets) {
      logger.error('Assets are missing');
      return { status: 'error', error: 'Asset information is required' };
    }
    
    if (!state) {
      logger.error('State is missing');
      return { status: 'error', error: 'State information is required' };
    }
    
    // Add additional check for client info required fields
    if (!clientInfo.name || !clientInfo.age || !clientInfo.maritalStatus) {
      logger.error('Client info missing required fields');
      return { 
        status: 'error', 
        error: 'Invalid client info: Client name, age, and marital status are required' 
      };
    }
    
    // Validate inputs
    const validation = await inputValidation.validateAllInputs(clientInfo, assets, income, expenses, homeInfo, state);
    
    if (!validation.valid) {
      logger.error(`Validation failed: ${validation.message}`);
      return { status: 'error', error: validation.message };
    }
    
    // Log normalized data for debugging
    logger.debug(`Validated client info: ${JSON.stringify(validation.normalizedData.clientInfo)}`);
    
    // Use normalized data
    const { clientInfo: validatedClientInfo, assets: validatedAssets, state: validatedState } = validation.normalizedData;
    
    // Double-check that validatedClientInfo exists and has required fields
    if (!validatedClientInfo || !validatedClientInfo.name || !validatedClientInfo.age || !validatedClientInfo.maritalStatus) {
      logger.error('Required fields missing in validated client info');
      return { 
        status: 'error', 
        error: 'Required client information is missing after validation' 
      };
    }
    
    const maritalStatus = validatedClientInfo.maritalStatus;
    
    // Run asset situation assessment
    const situation = await assessAssetSituation(
      validatedAssets,
      validatedState,
      maritalStatus
    );
    
    // Determine strategies with full context
    const strategies = determineAssetStrategies(situation, {
      clientInfo: validatedClientInfo,
      income: income || {},
      assets: validatedAssets,
      state: validatedState
    });
    
    // Create narrative approach
    const approach = planAssetApproach(strategies, situation);
    
    logger.info('Asset planning completed successfully');
    
    return {
      status: 'success',
      situation,
      strategies,
      approach,
      summary: {
        countableAssets: situation.countableAssets,
        resourceLimit: situation.resourceLimit,
        exceedsLimit: situation.exceedsLimit,
        excessAssets: situation.excessAssets,
        keyStrategies: strategies.slice(0, 3)
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

/**
 * Medicaid asset planning entry point that matches controller's expected interface
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's assets
 * @param {Object} income - Client's income (optional)
 * @param {Object} expenses - Client's expenses (optional)
 * @param {Object} homeInfo - Home information (optional)
 * @param {string} state - State of application
 * @returns {Promise<Object>} Complete asset planning result
 */
async function medicaidAssetPlanning(clientInfo, assets, income, expenses, homeInfo, state) {
  return await assetPlanning(clientInfo, assets, income, expenses, homeInfo, state);
}

/**
 * Additional function for assessing assets
 * 
 * @param {string} state - State abbreviation
 * @param {string} maritalStatus - Client's marital status
 * @returns {Promise<Object>} Asset assessment
 */
async function assessAssets(state, maritalStatus) {
  const rules = await medicaidRulesLoader.loadMedicaidRules(state);
  // Implementation would go here
  return rules;
}

// Export all functions
module.exports = {
  assetPlanning,
  assessAssetSituation,
  assessHomeEquity,
  determineAssetStrategies,
  planAssetApproach,
  medicaidAssetPlanning,
  assessAssets
};