// Enhanced Medicaid Eligibility Report Generator
// Creates comprehensive HTML reports similar to the example provided

const logger = require('../../config/logger');
const { getMedicaidRules } = require('../utils/medicaidRulesLoader');

/**
 * Generate enhanced Medicaid eligibility report
 * @param {Object} assessment - Complete eligibility assessment
 * @param {Object} clientInfo - Client demographics
 * @param {Object} assets - Asset breakdown
 * @param {Object} income - Income details
 * @param {string} state - State code
 * @returns {Object} Enhanced HTML report data
 */
async function generateEnhancedEligibilityReport(assessment, clientInfo, assets, income, state) {
  try {
    logger.info('Generating enhanced eligibility report');
    
    const stateRules = getMedicaidRules(state);
    const maritalStatus = clientInfo.maritalStatus?.toLowerCase() || 'single';
    const isMarried = maritalStatus === 'married';
    
    // Calculate key metrics
    const excessAssets = Math.max(0, assessment.countableAssets - assessment.resourceLimit);
    const incomeBuffer = assessment.incomeLimit - assessment.totalIncome;
    const monthsUntilBroke = excessAssets > 0 ? Math.ceil(excessAssets / 10450) : 0; // Assuming $10,450/month care cost
    const potentialSavings = Math.floor(excessAssets * 0.5); // Conservative 50% protection estimate
    
    // Determine state-specific advantages
    const stateAdvantages = getStateAdvantages(state);
    const criticalAlerts = getCriticalAlerts(assessment, state);
    
    // Generate report sections
    const reportData = {
      header: {
        title: "Your Medicaid Eligibility Analysis",
        subtitle: `Understanding exactly where you stand in ${getStateName(state)}`
      },
      
      criticalAlert: criticalAlerts,
      
      statusGrid: {
        income: {
          status: assessment.isIncomeEligible ? 'qualified' : 'over',
          amount: assessment.totalIncome,
          limit: assessment.incomeLimit,
          buffer: incomeBuffer,
          message: assessment.isIncomeEligible ? 
            `QUALIFIED! ($${Math.abs(incomeBuffer).toLocaleString()} buffer)` :
            `$${Math.abs(incomeBuffer).toLocaleString()} OVER LIMIT`
        },
        assets: {
          status: assessment.isResourceEligible ? 'qualified' : 'over',
          amount: assessment.countableAssets,
          limit: assessment.resourceLimit,
          excess: excessAssets,
          message: assessment.isResourceEligible ? 
            'QUALIFIED!' :
            `$${excessAssets.toLocaleString()} OVER LIMIT`
        }
      },
      
      assetBreakdown: generateAssetBreakdown(assets, excessAssets, state),
      
      timeline: {
        careCost: 10450, // Monthly care cost
        monthsUntilBroke: monthsUntilBroke,
        breakDate: getBreakDate(monthsUntilBroke),
        potentialSavings: potentialSavings,
        monthlyCost: 10450
      },
      
      stateAdvantages: stateAdvantages,
      
      lookbackPeriod: generateLookbackSection(state, stateRules),
      
      incomeDetails: generateIncomeDetails(assessment, income),
      
      comparison: generateComparisonTable(assessment, potentialSavings),
      
      actionItems: generateActionItems(assessment, clientInfo, state),
      
      stateQA: generateStateQA(state),
      
      bottomLine: generateBottomLine(assessment, potentialSavings, state)
    };
    
    // Generate the HTML reports
    const htmlReports = generateHTMLReport(reportData);
    
    logger.info('Enhanced eligibility report generated successfully');
    
    return {
      reportData,
      htmlReport: htmlReports.fullHTML,
      embeddedReport: htmlReports.embeddedHTML,
      status: 'success'
    };
    
  } catch (error) {
    logger.error('Error generating enhanced eligibility report:', error);
    throw new Error('Failed to generate enhanced eligibility report');
  }
}

/**
 * Get state-specific advantages
 */
function getStateAdvantages(state) {
  const advantages = {
    'FL': [
      { icon: '✓', text: '<strong>Higher home equity limit</strong> ($688,000 vs $636,000 national) - protects more valuable homes' },
      { icon: '✓', text: '<strong>Lady Bird deeds available</strong> - Transfer home with retained life estate (avoids probate AND recovery)' },
      { icon: '✓', text: '<strong>Probate-only recovery</strong> - Trusts and joint property are safer from estate recovery' },
      { icon: '✓', text: '<strong>Strong homestead protections</strong> - Constitutional protection for primary residence' },
      { icon: '✓', text: '<strong>No state income tax</strong> - Retirement income goes further' }
    ],
    'TX': [
      { icon: '✓', text: 'Unlimited homestead exemption - No cap on home equity protection' },
      { icon: '✓', text: 'Strong asset protection laws - Business and professional exemptions' },
      { icon: '✓', text: 'No state income tax - Keep more of your retirement income' },
      { icon: '✓', text: 'Transfer on Death Deeds available - Avoid probate and recovery' }
    ],
    'CA': [
      { icon: '✓', text: 'Higher income limits in some counties - More flexibility for qualification' },
      { icon: '✓', text: 'Strong consumer protections - Regulated Medicaid planning industry' },
      { icon: '✓', text: 'Community property state - Simplified spousal planning' }
    ]
  };
  
  return advantages[state] || [
    { icon: '✓', text: 'Federal protections apply - Basic homestead and exemption protections' },
    { icon: '✓', text: 'Standard planning strategies available - Trust and annuity options' }
  ];
}

/**
 * Generate critical alerts based on state and situation
 */
function getCriticalAlerts(assessment, state) {
  const incomeCapStates = ['FL', 'TX', 'AL', 'AK', 'AR', 'AZ', 'CO', 'DE', 'GA', 'ID', 'IA', 'KS', 'LA', 'MS', 'MO', 'MT', 'NV', 'NM', 'NC', 'ND', 'OK', 'OR', 'SC', 'SD', 'TN', 'UT', 'WV', 'WY'];
  
  if (incomeCapStates.includes(state)) {
    if (assessment.isIncomeEligible) {
      return {
        type: 'income_cap_good',
        title: `⚠️ CRITICAL FOR ${getStateName(state)}: You're in an "Income Cap State"`,
        message: `This means if you're even $1 over the income limit, you're completely disqualified UNLESS you set up a Miller Trust (QIT).`,
        goodNews: `Good news: Your income is under the cap! You just saved $2,000+ in trust setup costs.`
      };
    } else {
      return {
        type: 'income_cap_bad',
        title: `🚨 URGENT FOR ${getStateName(state)}: Income Cap Crisis`,
        message: `You're in an income cap state and your income exceeds the limit. You need a Miller Trust (QIT) immediately or you're completely disqualified.`,
        urgentAction: `You must set up a Miller Trust before applying for Medicaid.`
      };
    }
  }
  
  return {
    type: 'general',
    title: `💡 Important for ${getStateName(state)} Planning`,
    message: `Your state uses a "medically needy" pathway, which provides more flexibility for income qualification.`,
    advantage: `This gives you additional planning options beyond the federal minimums.`
  };
}

/**
 * Generate asset breakdown
 */
function generateAssetBreakdown(assets, excessAssets, state) {
  const atRisk = excessAssets;
  const protected = getProtectedAssets(state);
  
  return {
    atRisk: {
      amount: atRisk,
      description: 'needs protection strategy'
    },
    protected: protected
  };
}

/**
 * Get protected assets by state
 */
function getProtectedAssets(state) {
  const baseProtected = [
    'Personal Belongings - Furniture, jewelry, family heirlooms',
    'Prepaid Funeral/Burial - Irrevocable contracts exempt',
    'Personal Needs Allowance - $2,000 you can always keep'
  ];
  
  const stateSpecific = {
    'FL': [
      'Your Home - Up to $688,000 in equity (Florida\'s limit is $52,000 higher than federal minimum!)',
      'One Vehicle - Unlimited value (no cap in Florida)',
      ...baseProtected
    ],
    'TX': [
      'Your Home - Unlimited equity protection (Texas homestead exemption)',
      'One Vehicle - No value limit in Texas',
      ...baseProtected
    ],
    'CA': [
      'Your Home - Up to $636,000 in equity',
      'One Vehicle - Up to reasonable value',
      ...baseProtected
    ]
  };
  
  return stateSpecific[state] || [
    'Your Home - Up to state limit in equity',
    'One Vehicle - Up to reasonable value',
    ...baseProtected
  ];
}

/**
 * Generate lookback section
 */
function generateLookbackSection(state, rules) {
  const currentDate = new Date();
  const lookbackDate = new Date(currentDate.getFullYear() - 5, currentDate.getMonth(), currentDate.getDate());
  
  return {
    period: `${lookbackDate.toLocaleDateString()} - ${currentDate.toLocaleDateString()}`,
    penaltyDivisor: rules?.penaltyDivisor || 9500,
    explanation: [
      'Any gifts to family in the last 5 years may create penalties',
      'But many transfers are EXEMPT (spouse, disabled child, caregiver child)',
      'Planning NOW can still protect significant assets using compliant strategies'
    ]
  };
}

/**
 * Generate income details
 */
function generateIncomeDetails(assessment, income) {
  return {
    currentIncome: assessment.totalIncome,
    incomeLimit: assessment.incomeLimit,
    buffer: assessment.incomeLimit - assessment.totalIncome,
    qualified: assessment.isIncomeEligible,
    millerTrustNeeded: !assessment.isIncomeEligible,
    strategies: [
      'Medical expense deductions can further reduce countable income',
      'Medicare premiums are fully deductible',
      'If income ever increases, a Miller Trust fixes everything'
    ]
  };
}

/**
 * Generate comparison table
 */
function generateComparisonTable(assessment, potentialSavings) {
  return {
    current: {
      assets: assessment.countableAssets,
      home: 'Protected',
      monthlyOutOfPocket: 10450,
      familyLegacy: 'At Risk',
      timeToBroke: Math.ceil((assessment.countableAssets - assessment.resourceLimit) / 10450)
    },
    withoutPlanning: {
      assets: assessment.resourceLimit,
      home: 'At Risk from Recovery',
      monthlyOutOfPocket: 10450,
      familyLegacy: 'Nothing',
      timeToBroke: Math.ceil((assessment.countableAssets - assessment.resourceLimit) / 10450)
    },
    withPlanning: {
      assets: potentialSavings,
      home: 'Protected Forever',
      monthlyOutOfPocket: 0,
      familyLegacy: 'Preserved',
      timeToBroke: 'Never'
    }
  };
}

/**
 * Generate action items
 */
function generateActionItems(assessment, clientInfo, state) {
  const isMarried = clientInfo.maritalStatus?.toLowerCase() === 'married';
  const actions = [];
  
  if (assessment.isIncomeEligible) {
    actions.push({
      type: 'success',
      title: '✅ Income Qualified',
      description: 'No Miller Trust needed (save $2,000!)'
    });
  } else {
    actions.push({
      type: 'urgent',
      title: '🚨 Miller Trust Required',
      description: 'Must set up Qualified Income Trust immediately'
    });
  }
  
  if (!assessment.isResourceEligible) {
    actions.push({
      type: 'action',
      title: '🔴 Asset Reduction Needed',
      description: 'Multiple strategies available',
      strategies: [
        'Medicaid Compliant Annuity (protect 50-80% immediately)',
        'Asset Conversion (home improvements, new car, funeral)',
        state === 'FL' ? 'Lady Bird Deed for your home (Florida advantage!)' : 'State-specific deed strategies',
        'If you have a disabled child - unlimited transfers allowed',
        'Caregiver child exception if applicable'
      ]
    });
  }
  
  actions.push({
    type: 'next_step',
    title: '📞 Schedule Strategy Session',
    strategies: [
      `Choose best ${getStateName(state)}-specific strategies`,
      'Calculate exact protection amounts',
      'Begin implementation immediately'
    ]
  });
  
  return actions;
}

/**
 * Generate state Q&A
 */
function generateStateQA(state) {
  const qa = {
    'FL': [
      {
        question: 'Q: "Can I keep my Florida home?"',
        answer: 'A: Yes! Florida protects up to $688,000 in home equity - among the highest in the nation. Plus, Florida\'s homestead laws and Lady Bird deeds offer extra protection.'
      },
      {
        question: 'Q: "What about my retirement accounts?"',
        answer: 'A: IRAs and 401(k)s in payout status may be protected. Florida follows federal bankruptcy exemptions which can protect retirement accounts. We\'ll analyze yours specifically.'
      },
      {
        question: 'Q: "Will the state take my home when I die?"',
        answer: 'A: Florida only recovers through probate. Proper planning with trusts or Lady Bird deeds avoids this entirely. Joint ownership with rights of survivorship also avoids probate.'
      },
      {
        question: 'Q: "What\'s this Miller Trust I keep hearing about?"',
        answer: 'A: Since Florida is an "income cap" state, if your income exceeds $2,901, you need a Qualified Income Trust (Miller Trust). Good news - you don\'t need one!'
      }
    ]
  };
  
  return qa[state] || [
    {
      question: 'Q: "Can I keep my home?"',
      answer: `A: Yes! ${getStateName(state)} protects home equity up to federal limits. We\'ll review your state\'s specific protections.`
    },
    {
      question: 'Q: "What about estate recovery?"',
      answer: `A: ${getStateName(state)} follows federal recovery rules. Proper planning can minimize or avoid recovery entirely.`
    }
  ];
}

/**
 * Generate bottom line summary
 */
function generateBottomLine(assessment, potentialSavings, state) {
  const excessAssets = assessment.countableAssets - assessment.resourceLimit;
  const monthlyCost = 10450;
  
  return {
    keyPoints: [
      `You're losing $${monthlyCost.toLocaleString()} every month without Medicaid`,
      assessment.isIncomeEligible ? 
        'Your income already qualifies (that\'s the hard part!)' :
        'Income qualification needs immediate attention with Miller Trust',
      excessAssets > 0 ? 
        'Your "excess" assets CAN be protected with proper planning' :
        'You\'re close to qualification - fine-tuning needed',
      `${getStateName(state)}'s rules are actually FAVORABLE for protection`,
      'Every day you wait is money lost forever'
    ],
    goodNews: {
      title: '✅ The Good News:',
      message: assessment.isIncomeEligible ?
        `With your income already qualified and multiple protection strategies available in ${getStateName(state)}, you're in an EXCELLENT position to preserve $${potentialSavings.toLocaleString()}+ while getting the care you need.` :
        `Even with income issues, ${getStateName(state)} provides solutions. With proper planning, you can still preserve significant assets while getting qualified for benefits.`
    }
  };
}

/**
 * Generate HTML report
 */
function generateHTMLReport(data) {
  const { generateEnhancedEligibilityHTML, generateEmbeddedEligibilityHTML } = require('./htmlTemplates');
  
  return {
    fullHTML: generateEnhancedEligibilityHTML(data),
    embeddedHTML: generateEmbeddedEligibilityHTML(data)
  };
}

/**
 * Utility functions
 */
function getStateName(stateCode) {
  const stateNames = {
    'FL': 'Florida',
    'TX': 'Texas',
    'CA': 'California',
    'NY': 'New York'
    // Add more as needed
  };
  return stateNames[stateCode] || stateCode;
}

function getBreakDate(monthsUntilBroke) {
  const breakDate = new Date();
  breakDate.setMonth(breakDate.getMonth() + monthsUntilBroke);
  return breakDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

module.exports = {
  generateEnhancedEligibilityReport
};