const logger = require('../../config/logger');

/**
 * Assesses post-eligibility needs based on client situation
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's assets
 * @param {Object} income - Client's income sources
 * @param {string} state - Client's state of residence
 * @param {string} maritalStatus - Client's marital status
 * @returns {Object} - Assessed needs
 */
function assessPostEligibilityNeeds(clientInfo, assets, income, state, maritalStatus) {
  logger.debug('Assessing post-eligibility needs');

  return {
    monthlyLiabilityManagement: Object.keys(income || {}).length > 0,
    annualRedetermination: true,
    assetRetitling: maritalStatus === 'married' && (assets?.countable > 2000 || Object.keys(assets || {}).length > 2),
    spousalAllowanceReview: maritalStatus === 'married',
    potentialMove: clientInfo?.potentialRelocation === true
  };
}

/**
 * Determines post-eligibility strategies based on client needs
 * @param {Object} needs - Client's post-eligibility needs assessment
 * @param {Object} additionalContext - Additional context (clientInfo, assets, income, state)
 * @returns {Array} - List of structured post-eligibility strategy objects
 */
function determinePostEligibilityStrategies(needs, additionalContext = {}) {
  logger.debug('Determining post-eligibility strategies');
  const strategies = [];
  let strategyId = 1;
  
  const { clientInfo = {}, assets = {}, income = {}, state = '' } = additionalContext;
  const isMarried = needs.spousalAllowanceReview;
  const totalIncome = Object.values(income).reduce((sum, val) => sum + (val || 0), 0);

  // Always include redetermination strategy
  strategies.push({
    id: `post-${strategyId++}`,
    type: 'redetermination',
    name: 'Annual Medicaid Redetermination Preparation',
    description: 'Establish systematic process for annual Medicaid eligibility redetermination and renewal.',
    pros: [
      'Maintains continuous coverage',
      'Prevents coverage gaps',
      'Ensures compliance with requirements',
      'Reduces stress during renewal'
    ],
    cons: [
      'Annual paperwork burden',
      'Potential eligibility changes',
      'Documentation requirements',
      'Risk of administrative errors'
    ],
    effectiveness: 'Essential',
    timing: 'Ongoing annual requirement',
    estimatedCost: '$0-$500 for assistance',
    monthlyImpact: 'Maintains Medicaid coverage',
    priority: 'Critical',
    deadline: 'Annual renewal date',
    specificActions: [
      'Mark renewal date on calendar',
      'Gather required financial documents',
      'Complete renewal application timely',
      'Submit any requested verifications',
      'Follow up on application status'
    ]
  });

  // Income management strategies
  if (needs.monthlyLiabilityManagement) {
    strategies.push({
      id: `post-${strategyId++}`,
      type: 'income-tracking',
      name: 'Monthly Income Tracking System',
      description: 'Implement systematic monthly income tracking and patient liability management.',
      pros: [
        'Ensures accurate liability calculations',
        'Prevents overpayments to facilities',
        'Maintains Medicaid compliance',
        'Provides clear financial records'
      ],
      cons: [
        'Monthly administrative burden',
        'Requires detailed record-keeping',
        'Income changes need prompt reporting',
        'Calculation complexity'
      ],
      effectiveness: 'High',
      timing: 'Implement immediately',
      estimatedCost: '$0-$200/month for bookkeeping',
      monthlyImpact: `Manages $${totalIncome.toFixed(0)}/month income properly`,
      priority: 'High',
      deadline: 'Monthly by the 10th',
      specificActions: [
        'Set up income tracking spreadsheet',
        'Calculate monthly patient liability',
        'Pay facilities the correct amount',
        'Save payment receipts and records',
        'Report income changes within 10 days'
      ]
    });
    
    strategies.push({
      id: `post-${strategyId++}`,
      type: 'liability-management',
      name: 'Patient Liability Payment Management',
      description: 'Establish consistent process for applying excess income toward patient liability payments.',
      pros: [
        'Maintains Medicaid compliance',
        'Optimizes available personal funds',
        'Prevents facility payment disputes',
        'Supports continued care coverage'
      ],
      cons: [
        'Limits available spending money',
        'Requires precise calculations',
        'Must coordinate with facility billing',
        'Income fluctuations create complexity'
      ],
      effectiveness: 'High',
      timing: 'Monthly payment schedule',
      estimatedCost: 'Amount varies by income',
      monthlyImpact: 'Maintains Medicaid standing',
      priority: 'High',
      deadline: 'Monthly payment due dates'
    });
  }

  // Asset management for married couples
  if (needs.assetRetitling) {
    strategies.push({
      id: `post-${strategyId++}`,
      type: 'asset-retitling',
      name: 'Community Spouse Resource Allowance (CSRA) Management',
      description: 'Properly retitle and manage Community Spouse Resource Allowance assets to maintain eligibility.',
      pros: [
        'Protects allowable spouse assets',
        'Maintains Medicaid compliance',
        'Provides financial security for spouse',
        'Optimizes asset protection'
      ],
      cons: [
        'Complex legal requirements',
        'May require attorney assistance',
        'Asset titling restrictions',
        'Ongoing compliance monitoring'
      ],
      effectiveness: 'High',
      timing: 'Complete within 60 days',
      estimatedCost: '$1,000-$3,000 legal fees',
      monthlyImpact: 'Protects spousal financial security',
      priority: 'High',
      deadline: 'Before next redetermination',
      specificActions: [
        'Inventory all countable assets',
        'Calculate allowable CSRA amount',
        'Retitle assets to community spouse name',
        'Update financial institution records',
        'Document asset transfers properly'
      ]
    });
  }

  // Spousal income strategies
  if (needs.spousalAllowanceReview) {
    strategies.push({
      id: `post-${strategyId++}`,
      type: 'spousal-allowance',
      name: 'Spousal Income Allowance Optimization',
      description: 'Review and optimize spousal income allowances to maximize community spouse financial protection.',
      pros: [
        'Maximizes spouse income protection',
        'May reduce patient liability',
        'Provides legal income shielding',
        'Improves spouse quality of life'
      ],
      cons: [
        'Complex calculations required',
        'May need fair hearing request',
        'Documentation intensive',
        'State-specific rule variations'
      ],
      effectiveness: 'Medium-High',
      timing: 'Review annually or with income changes',
      estimatedCost: '$500-$2,000 for advocacy',
      monthlyImpact: 'Optimizes spousal income retention',
      priority: 'Medium',
      deadline: 'At renewal or income change',
      specificActions: [
        'Calculate current spousal allowances',
        'Assess if allowances can be increased',
        'Gather documentation for any requests',
        'File fair hearing if beneficial',
        'Update Medicaid records with changes'
      ]
    });
  }

  // Relocation planning
  if (needs.potentialMove) {
    strategies.push({
      id: `post-${strategyId++}`,
      type: 'relocation-planning',
      name: 'Interstate Medicaid Transfer Planning',
      description: 'Plan for potential relocation and ensure continuity of Medicaid coverage across state lines.',
      pros: [
        'Maintains healthcare coverage continuity',
        'Prevents coverage gaps during move',
        'Optimizes new state benefits',
        'Reduces relocation stress'
      ],
      cons: [
        'Different state rules and procedures',
        'Potential eligibility re-verification',
        'Coordination complexity between states',
        'Possible coverage interruptions'
      ],
      effectiveness: 'High',
      timing: 'Plan 3-6 months before move',
      estimatedCost: '$1,000-$3,000 planning costs',
      monthlyImpact: 'Ensures continuous coverage',
      priority: 'High',
      deadline: 'Before relocation',
      specificActions: [
        'Research new state Medicaid rules',
        'Contact new state Medicaid office',
        'Prepare transfer documentation',
        'Coordinate with current and new providers',
        'File applications in proper sequence'
      ]
    });
  }
  
  // Additional compliance strategies based on circumstances
  if (clientInfo.age && clientInfo.age > 80) {
    strategies.push({
      id: `post-${strategyId++}`,
      type: 'enhanced-monitoring',
      name: 'Enhanced Compliance Monitoring',
      description: 'Implement enhanced monitoring for older adults to ensure continued compliance and early intervention.',
      pros: [
        'Prevents compliance issues',
        'Early problem identification',
        'Reduces administrative burden',
        'Provides peace of mind'
      ],
      cons: [
        'Additional oversight costs',
        'Requires family coordination',
        'May feel intrusive',
        'Ongoing time commitment'
      ],
      effectiveness: 'Medium',
      timing: 'Ongoing monitoring',
      estimatedCost: '$100-$300/month',
      monthlyImpact: 'Prevents coverage issues',
      priority: 'Medium',
      deadline: 'Ongoing'
    });
  }
  
  // Add care transition planning if institutional care is involved
  if (additionalContext.careLevel === 'nursing' || additionalContext.careLevel === 'assisted') {
    strategies.push({
      id: `post-${strategyId++}`,
      type: 'care-transition',
      name: 'Care Transition Planning',
      description: 'Plan for potential changes in care level and ensure Medicaid coverage continuity across settings.',
      pros: [
        'Smooth care level transitions',
        'Maintains coverage continuity',
        'Optimizes care quality',
        'Reduces family stress'
      ],
      cons: [
        'Complex coordination required',
        'Multiple provider relationships',
        'Potential coverage gaps',
        'Administrative complexity'
      ],
      effectiveness: 'High',
      timing: 'As care needs change',
      estimatedCost: '$500-$1,500 transition costs',
      monthlyImpact: 'Optimized care coordination',
      priority: 'Medium',
      deadline: 'As needed'
    });
  }

  return strategies;
}

/**
 * Creates detailed implementation plan based on recommended strategies
 * @param {Array} strategies - List of recommended strategies
 * @param {Object} situation - Client's current situation details
 * @returns {Array} - Detailed implementation plan
 */
function planPostEligibilityApproach(strategies, situation) {
  logger.debug('Planning post-eligibility approach');
  const plan = [];

  // Add situation summary
  const monthlyIncome = situation?.totalIncome || 0;
  const monthlyExpenses = situation?.totalExpenses || 0;
  const personalNeedsAllowance = situation?.state.toLowerCase() === 'florida' ? 160 : 130;
  const patientLiability = Math.max(0, monthlyIncome - monthlyExpenses - personalNeedsAllowance);

  plan.push(`Monthly Income: $${monthlyIncome.toFixed(2)}`);
  plan.push(`Monthly Expenses: $${monthlyExpenses.toFixed(2)}`);
  plan.push(`Estimated Patient Liability: $${patientLiability.toFixed(2)}`);

  // Create implementation steps for each strategy
  strategies.forEach(strategy => {
    // Handle both structured objects and legacy strings
    const strategyName = typeof strategy === 'object' ? strategy.name : strategy;
    const strategyType = typeof strategy === 'object' ? strategy.type : 'unknown';
    
    plan.push(strategyName);

    // Add specific implementation steps based on strategy type
    if (strategyType === 'asset-retitling' || (typeof strategy === 'string' && strategy.includes('Retitle Community Spouse Resource Allowance'))) {
      plan.push('- Transition assets to the community spouse');
      plan.push('- Work with an elder law attorney');
      plan.push('- Update asset documentation for Medicaid annual review');
    }

    if (strategyType === 'relocation-planning' || (typeof strategy === 'string' && strategy.includes('Plan for potential relocation'))) {
      plan.push('- Research Medicaid rules in the new state');
      plan.push('- Prepare for possible changes in eligibility');
      plan.push('- Coordinate with new state Medicaid office');
    }

    if (strategyType === 'redetermination' || (typeof strategy === 'string' && strategy.includes('annual Medicaid redetermination'))) {
      plan.push('- Create calendar reminders for renewal deadlines');
      plan.push('- Gather updated financial documentation regularly');
      plan.push('- Submit renewal application timely');
    }
    
    if (strategyType === 'income-tracking') {
      plan.push('- Set up monthly income tracking system');
      plan.push('- Calculate patient liability accurately');
      plan.push('- Report income changes promptly');
    }
    
    if (strategyType === 'spousal-allowance') {
      plan.push('- Review current spousal allowances');
      plan.push('- Assess opportunities for increases');
      plan.push('- File fair hearing if beneficial');
    }
  });

  return plan;
}

/**
 * Comprehensive post-eligibility planning process
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's assets
 * @param {Object} income - Client's income sources
 * @param {string} state - Client's state of residence
 * @param {string} maritalStatus - Client's marital status
 * @returns {Object} - Complete post-eligibility plan
 */
async function medicaidPostEligibilityPlanning(clientInfo, assets, income, state, maritalStatus) {
  logger.debug('Starting post-eligibility planning process');

  try {
    // Validate inputs
    if (!clientInfo || !assets || !income || !state) {
      throw new Error('Missing required information for post-eligibility planning');
    }

    // Assess needs
    const needs = assessPostEligibilityNeeds(clientInfo, assets, income, state, maritalStatus);

    // Determine strategies with additional context
    const strategies = determinePostEligibilityStrategies(needs, {
      clientInfo,
      assets,
      income,
      state,
      careLevel: clientInfo.careLevel || 'unknown'
    });

    // Create situation object
    const situation = {
      totalIncome: Object.values(income || {}).reduce((sum, value) => sum + value, 0),
      totalExpenses: clientInfo.monthlyExpenses || 800,
      assets: assets.total || 0,
      maritalStatus: maritalStatus || clientInfo.maritalStatus,
      state: state.toLowerCase()
    };

    // Create plan
    const plan = planPostEligibilityApproach(strategies, situation);

    // Format approach as a string
    const approach = `POST-ELIGIBILITY PLANNING APPROACH\n\n` +
      `State: ${situation.state}\n` +
      `Marital Status: ${situation.maritalStatus}\n\n` +
      plan.join('\n');

    return {
      status: 'success',
      needs,
      strategies,
      plan,
      approach,
      situation
    };
  } catch (error) {
    logger.error(`Post-eligibility planning error: ${error.message}`);
    return {
      status: 'error',
      error: error.message
    };
  }
}

module.exports = {
  assessPostEligibilityNeeds,
  determinePostEligibilityStrategies,
  planPostEligibilityApproach,
  medicaidPostEligibilityPlanning
};