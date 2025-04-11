// src/services/planning/__tests__/medicaidPlanning.scenarios.test.js
const { medicaidPlanning, generateMedicaidPlanningReport } = require('../medicaidPlanning');

// Create test fixtures for different client scenarios
const clientScenarios = {
  singleElderly: {
    clientInfo: {
      name: 'Jane Smith',
      age: 82,
      maritalStatus: 'single'
    },
    assets: {
      countable: 45000,
      home: 220000,
      mortgage: 50000
    },
    income: {
      social_security: 1800,
      pension: 1200
    },
    expenses: {
      health_insurance: 350,
      housing: 1200
    },
    medicalInfo: {
      diagnoses: ['dementia', 'hypertension'],
      adlLimitations: ['bathing', 'dressing', 'toileting']
    },
    livingInfo: {
      currentSetting: 'home',
      caregiverSupport: 'part-time'
    },
    state: 'florida'
  },
  
  marriedNursingHome: {
    clientInfo: {
      name: 'Robert Johnson',
      age: 75,
      maritalStatus: 'married'
    },
    assets: {
      countable: 120000,
      home: 350000,
      mortgage: 100000,
      retirement: 250000
    },
    income: {
      social_security: 2200,
      pension: 1800,
      spouse_social_security: 1400,
      spouse_pension: 850
    },
    expenses: {
      health_insurance: 500,
      housing: 1500,
      spouse_health_insurance: 300
    },
    medicalInfo: {
      diagnoses: ['parkinsons', 'diabetes'],
      adlLimitations: ['bathing', 'dressing', 'toileting', 'transferring', 'feeding']
    },
    livingInfo: {
      currentSetting: 'nursing_home',
      caregiverSupport: 'none'
    },
    state: 'florida'
  },
  
  disabledYounger: {
    clientInfo: {
      name: 'Michael Brown',
      age: 55,
      maritalStatus: 'single'
    },
    assets: {
      countable: 8000,
      home: 0
    },
    income: {
      ssdi: 1400
    },
    expenses: {
      health_insurance: 200,
      housing: 900
    },
    medicalInfo: {
      diagnoses: ['multiple sclerosis'],
      adlLimitations: ['bathing', 'dressing']
    },
    livingInfo: {
      currentSetting: 'apartment',
      caregiverSupport: 'none'
    },
    state: 'florida'
  },
  
  lowIncomeNoAssets: {
    clientInfo: {
      name: 'Sarah Williams',
      age: 68,
      maritalStatus: 'single'
    },
    assets: {
      countable: 1800,
      home: 0
    },
    income: {
      social_security: 900
    },
    expenses: {
      health_insurance: 150,
      housing: 700
    },
    medicalInfo: {
      diagnoses: ['copd', 'arthritis'],
      adlLimitations: ['bathing']
    },
    livingInfo: {
      currentSetting: 'apartment',
      caregiverSupport: 'family'
    },
    state: 'florida'
  },
  
  highValueAssets: {
    clientInfo: {
      name: 'Thomas Anderson',
      age: 78,
      maritalStatus: 'married'
    },
    assets: {
      countable: 650000,
      home: 900000,
      mortgage: 200000,
      vacation_home: 400000,
      art_collection: 250000
    },
    income: {
      social_security: 2800,
      pension: 4500,
      rental_income: 2000,
      spouse_social_security: 1800,
      spouse_pension: 2200
    },
    expenses: {
      health_insurance: 600,
      housing: 2500,
      spouse_health_insurance: 400
    },
    medicalInfo: {
      diagnoses: ['alzheimers', 'coronary_artery_disease'],
      adlLimitations: ['bathing', 'dressing', 'toileting', 'transferring']
    },
    livingInfo: {
      currentSetting: 'home',
      caregiverSupport: 'paid'
    },
    state: 'florida'
  }
};

// Create a custom mock for each planning module to handle different scenarios
const createCustomMock = (scenario) => {
  // Reset all mocks first
  jest.resetAllMocks();
  
  // Mock the validation service to return the specific scenario data
  jest.mock('../../validation/inputValidation', () => ({
    validateAllInputs: jest.fn().mockResolvedValue({
      valid: true,
      message: 'All inputs are valid',
      normalizedData: {
        clientInfo: scenario.clientInfo,
        assets: scenario.assets,
        income: scenario.income,
        expenses: scenario.expenses,
        state: scenario.state
      }
    })
  }));
  
  // Custom mocks for each planning module based on scenario
  // Care Planning mock
  jest.mock('../carePlanning', () => {
    const needsNursing = scenario.medicalInfo.adlLimitations.length >= 3 || 
                       scenario.medicalInfo.diagnoses.includes('dementia') ||
                       scenario.medicalInfo.diagnoses.includes('alzheimers') ||
                       scenario.livingInfo.currentSetting === 'nursing_home';
                       
    const needsAssistedLiving = scenario.medicalInfo.adlLimitations.length >= 2;
    
    let recommendedCareLevel = 'in-home';
    if (needsNursing) {
      recommendedCareLevel = 'nursing';
    } else if (needsAssistedLiving) {
      recommendedCareLevel = 'assisted living';
    }
    
    return {
      medicaidCarePlanning: jest.fn().mockResolvedValue({
        careNeeds: { 
          recommendedCareLevel,
          diagnoses: scenario.medicalInfo.diagnoses,
          adlCount: scenario.medicalInfo.adlLimitations.length
        },
        strategies: needsNursing ? 
          ['Plan for skilled nursing facility placement'] : 
          ['Coordinate home care services through local agencies'],
        approach: `Care Planning Approach for ${recommendedCareLevel} level care...`,
        status: 'success'
      })
    };
  });
  
  // Eligibility Assessment mock
  jest.mock('../eligibilityAssessment', () => {
    const countableAssets = scenario.assets.countable || 0;
    const resourceLimit = scenario.clientInfo.maritalStatus === 'married' ? 3000 : 2000;
    const isResourceEligible = countableAssets <= resourceLimit;
    
    const totalIncome = Object.entries(scenario.income)
      .filter(([key]) => !key.startsWith('spouse_'))
      .reduce((sum, [, value]) => sum + value, 0);
      
    const incomeLimit = scenario.clientInfo.maritalStatus === 'married' ? 5802 : 2901;
    const isIncomeEligible = totalIncome <= incomeLimit;
    
    return {
      medicaidEligibilityAssessment: jest.fn().mockResolvedValue({
        eligibilityResult: { 
          isResourceEligible, 
          isIncomeEligible,
          countableAssets,
          resourceLimit,
          totalIncome,
          incomeLimit
        },
        eligibilityStrategies: !isResourceEligible ? 
          ['Reduce countable assets'] : 
          (!isIncomeEligible ? ['Consider Qualified Income Trust'] : []),
        eligibilityPlan: `Eligibility Plan for ${scenario.clientInfo.name}...`,
        status: 'success'
      })
    };
  });
  
  // Asset Planning mock
  jest.mock('../assetPlanning', () => {
    const countableAssets = scenario.assets.countable || 0;
    const resourceLimit = scenario.clientInfo.maritalStatus === 'married' ? 3000 : 2000;
    const excessAssets = Math.max(0, countableAssets - resourceLimit);
    
    return {
      medicaidAssetPlanning: jest.fn().mockResolvedValue({
        situation: { 
          countableAssets, 
          excessAssets,
          resourceLimit,
          hasHome: (scenario.assets.home || 0) > 0
        },
        strategies: excessAssets > 0 ? 
          ['Convert countable assets to exempt assets'] : 
          ['Maintain asset eligibility'],
        approach: `Asset Planning Approach for ${scenario.clientInfo.name} with ${excessAssets} in excess assets...`,
        status: 'success'
      })
    };
  });
  
  // Income Planning mock
  jest.mock('../incomePlanning', () => {
    const totalIncome = Object.entries(scenario.income)
      .filter(([key]) => !key.startsWith('spouse_'))
      .reduce((sum, [, value]) => sum + value, 0);
      
    const incomeLimit = scenario.clientInfo.maritalStatus === 'married' ? 5802 : 2901;
    const overIncomeLimit = totalIncome > incomeLimit;
    
    return {
      medicaidIncomePlanning: jest.fn().mockResolvedValue({
        incomeSituation: { 
          totalIncome, 
          incomeLimit,
          overIncomeLimit,
          isIncomeCapState: true 
        },
        shareOfCost: Math.max(0, totalIncome - 560), // Approximate deductions
        strategies: overIncomeLimit ? 
          ['Consider Qualified Income Trust (Miller Trust)'] : 
          ['Monitor income to maintain eligibility'],
        approach: `Income Planning Approach for ${scenario.clientInfo.name}...`,
        status: 'success'
      })
    };
  });
  
  // Trust Planning mock
  jest.mock('../trustPlanning', () => {
    // Only recommend trusts if significant assets or married
    const hasSignificantAssets = scenario.assets.countable > 20000;
    const isMarried = scenario.clientInfo.maritalStatus === 'married';
    
    return {
      medicaidTrustPlanning: jest.fn().mockResolvedValue({
        strategies: hasSignificantAssets ? 
          ['Consider self-settled irrevocable trust'] : 
          (isMarried ? ['Evaluate spousal trust options'] : []),
        approach: `Trust Planning Approach for ${scenario.clientInfo.name}...`,
        status: 'success'
      })
    };
  });
  
  // Other planning modules - simplified mocks
  jest.mock('../relatedBenefits', () => ({
    medicaidRelatedBenefitsPlanning: jest.fn().mockResolvedValue({
      eligibility: { socialSecurity: true, vaImprovedPension: false },
      strategies: ['Explore Medicare Savings Programs'],
      approach: `Related Benefits Approach for ${scenario.clientInfo.name}...`,
      status: 'success'
    })
  }));
  
  jest.mock('../annuityPlanning', () => ({
    medicaidAnnuityPlanning: jest.fn().mockResolvedValue({
      strategies: scenario.assets.countable > 5000 ? 
        ['Evaluate half-a-loaf with annuity'] : [],
      approach: `Annuity Planning Approach for ${scenario.clientInfo.name}...`,
      status: 'success'
    })
  }));
  
  jest.mock('../divestmentPlanning', () => ({
    medicaidDivestmentPlanning: jest.fn().mockResolvedValue({
      strategies: scenario.assets.countable > 10000 ? 
        ['Consider Reverse Half-a-Loaf strategy'] : [],
      approach: `Divestment Planning Approach for ${scenario.clientInfo.name}...`,
      status: 'success'
    })
  }));
  
  jest.mock('../communitySpousePlanning', () => ({
    medicaidCommunitySpousePlanning: jest.fn().mockResolvedValue({
      strategies: scenario.clientInfo.maritalStatus === 'married' ? 
        ['Evaluate CSRA increase options'] : [],
      approach: scenario.clientInfo.maritalStatus === 'married' ? 
        `Community Spouse Planning Approach for ${scenario.clientInfo.name}...` : 
        'Not applicable (client is not married)',
      status: 'success'
    })
  }));
  
  jest.mock('../applicationPlanning', () => ({
    medicaidApplicationPlanning: jest.fn().mockResolvedValue({
      applicant: scenario.clientInfo.maritalStatus === 'married' ? 'Community Spouse' : 'Patient',
      timingFactors: {
        needsRetroactiveCoverage: scenario.livingInfo.currentSetting === 'nursing_home',
        pendingSpendDown: scenario.assets.countable > (scenario.clientInfo.maritalStatus === 'married' ? 3000 : 2000),
        incomeOverLimit: false
      },
      applicationStrategies: ['Prepare documentation for application'],
      applicationApproach: `Application Planning Approach for ${scenario.clientInfo.name}...`,
      status: 'success'
    })
  }));
  
  jest.mock('../postEligibilityPlanning', () => ({
    medicaidPostEligibilityPlanning: jest.fn().mockResolvedValue({
      strategies: ['Set up monthly liability management'],
      approach: `Post-Eligibility Planning Approach for ${scenario.clientInfo.name}...`,
      status: 'success'
    })
  }));
  
  jest.mock('../estateRecovery', () => ({
    medicaidEstateRecoveryPlanning: jest.fn().mockResolvedValue({
      strategies: (scenario.assets.home || 0) > 0 ? 
        ['Consider probate estate avoidance'] : [],
      approach: `Estate Recovery Planning Approach for ${scenario.clientInfo.name}...`,
      status: 'success'
    })
  }));
}

describe('Medicaid Planning Scenario Tests', () => {
  // These tests will run real code for medicaidPlanning and generateMedicaidPlanningReport
  // but with customized mocks for each scenario
  
  beforeEach(() => {
    // Base mock for the rules loader
    jest.mock('../../utils/medicaidRulesLoader', () => ({
      loadMedicaidRules: jest.fn().mockResolvedValue({
        florida: {
          resourceLimitSingle: 2000,
          resourceLimitMarried: 3000,
          homeEquityLimit: 730000,
          incomeLimitSingle: 2901,
          incomeLimitMarried: 5802
        }
      })
    }));
    
    // General logger mock
    jest.mock('../../../config/logger', () => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }));
  });
  
  test('should generate appropriate plan for single elderly client with excess assets', async () => {
    // Set up mocks for this scenario
    createCustomMock(clientScenarios.singleElderly);
    
    const { 
      clientInfo, assets, income, expenses, medicalInfo, livingInfo, state 
    } = clientScenarios.singleElderly;
    
    const result = await medicaidPlanning(
      clientInfo, assets, income, expenses, medicalInfo, livingInfo, state
    );
    
    expect(result.status).toBe('success');
    
    // This elderly client with dementia should need nursing home care
    expect(result.careNeeds.recommendedCareLevel).toBe('nursing');
    
    // Should have excess assets requiring spend-down
    expect(result.eligibility.isResourceEligible).toBe(false);
    expect(result.assetSituation.excessAssets).toBeGreaterThan(0);
    
    // Should recommend asset conversion strategies
    expect(result.assetStrategies).toContain('Convert countable assets to exempt assets');
    
    // Generate and check the report
    const report = generateMedicaidPlanningReport(result);
    expect(report).toContain('CARE PLANNING');
    expect(report).toContain('ASSET PLANNING');
    expect(report).toContain('Plan for skilled nursing facility placement');
  });
  
  test('should generate appropriate plan for married client in nursing home', async () => {
    // Set up mocks for this scenario
    createCustomMock(clientScenarios.marriedNursingHome);
    
    const { 
      clientInfo, assets, income, expenses, medicalInfo, livingInfo, state 
    } = clientScenarios.marriedNursingHome;
    
    const result = await medicaidPlanning(
      clientInfo, assets, income, expenses, medicalInfo, livingInfo, state
    );
    
    expect(result.status).toBe('success');
    
    // This client is already in a nursing home
    expect(result.careNeeds.recommendedCareLevel).toBe('nursing');
    
    // Should have substantial community spouse planning
    expect(result.communitySpouseStrategies).toContain('Evaluate CSRA increase options');
    
    // Generate and check the report
    const report = generateMedicaidPlanningReport(result);
    expect(report).toContain('COMMUNITY SPOUSE PLANNING');
    expect(report).toContain('Application Planning');
  });
  
  test('should generate appropriate plan for younger disabled client', async () => {
    // Set up mocks for this scenario
    createCustomMock(clientScenarios.disabledYounger);
    
    const { 
      clientInfo, assets, income, expenses, medicalInfo, livingInfo, state 
    } = clientScenarios.disabledYounger;
    
    const result = await medicaidPlanning(
      clientInfo, assets, income, expenses, medicalInfo, livingInfo, state
    );
    
    expect(result.status).toBe('success');
    
    // This client has MS but moderate ADL needs
    expect(result.careNeeds.recommendedCareLevel).toBe('assisted living');
    
    // Should have excess assets requiring spend-down
    expect(result.eligibility.isResourceEligible).toBe(false);
    
    // Generate and check the report
    const report = generateMedicaidPlanningReport(result);
    expect(report).toContain('ELIGIBILITY ASSESSMENT');
    expect(report).toContain('ASSET PLANNING');
  });
  
  test('should generate appropriate plan for low-income eligible client', async () => {
    // Set up mocks for this scenario
    createCustomMock(clientScenarios.lowIncomeNoAssets);
    
    const { 
      clientInfo, assets, income, expenses, medicalInfo, livingInfo, state 
    } = clientScenarios.lowIncomeNoAssets;
    
    const result = await medicaidPlanning(
      clientInfo, assets, income, expenses, medicalInfo, livingInfo, state
    );
    
    expect(result.status).toBe('success');
    
    // This client is already eligible
    expect(result.eligibility.isResourceEligible).toBe(true);
    expect(result.eligibility.isIncomeEligible).toBe(true);
    
    // Should focus on maintaining eligibility and application
    expect(result.assetStrategies).toContain('Maintain asset eligibility');
    
    // Generate and check the report
    const report = generateMedicaidPlanningReport(result);
    expect(report).toContain('already eligible');
  });
  
  test('should generate appropriate plan for high-value asset client', async () => {
    // Set up mocks for this scenario
    createCustomMock(clientScenarios.highValueAssets);
    
    const { 
      clientInfo, assets, income, expenses, medicalInfo, livingInfo, state 
    } = clientScenarios.highValueAssets;
    
    const result = await medicaidPlanning(
      clientInfo, assets, income, expenses, medicalInfo, livingInfo, state
    );
    
    expect(result.status).toBe('success');
    
    // This client has Alzheimer's and significant ADL needs
    expect(result.careNeeds.recommendedCareLevel).toBe('nursing');
    
    // Should have substantial excess assets
    expect(result.eligibility.isResourceEligible).toBe(false);
    expect(result.assetSituation.excessAssets).toBeGreaterThan(100000);
    
    // Should recommend trust and divestment strategies
    expect(result.trustStrategies).toContain('Consider self-settled irrevocable trust');
    expect(result.divestmentStrategies).toContain('Consider Reverse Half-a-Loaf strategy');
    
    // Generate and check the report
    const report = generateMedicaidPlanningReport(result);
    expect(report).toContain('TRUST PLANNING');
    expect(report).toContain('DIVESTMENT PLANNING');
    expect(report).toContain('COMMUNITY SPOUSE PLANNING');
  });
  
  test('should handle state-specific variations in planning', async () => {
    // Create a Florida scenario
    const floridaScenario = { ...clientScenarios.singleElderly, state: 'florida' };
    
    // Create a New York variant with different rules
    const newYorkScenario = { ...clientScenarios.singleElderly, state: 'newyork' };
    
    // Customize rules loader to include New York
    jest.mock('../../utils/medicaidRulesLoader', () => ({
      loadMedicaidRules: jest.fn().mockResolvedValue({
        florida: {
          resourceLimitSingle: 2000,
          resourceLimitMarried: 3000,
          homeEquityLimit: 730000,
          incomeLimitSingle: 2901,
          incomeLimitMarried: 5802
        },
        newyork: {
          resourceLimitSingle: 15750,
          resourceLimitMarried: 23400,
          homeEquityLimit: 906000,
          incomeLimitSingle: 934,
          incomeLimitMarried: 1367
        }
      })
    }));
    
    // Run planning for both states
    createCustomMock(floridaScenario);
    const flResult = await medicaidPlanning(
      floridaScenario.clientInfo, 
      floridaScenario.assets, 
      floridaScenario.income, 
      floridaScenario.expenses, 
      floridaScenario.medicalInfo, 
      floridaScenario.livingInfo, 
      floridaScenario.state
    );
    
    createCustomMock(newYorkScenario);
    const nyResult = await medicaidPlanning(
      newYorkScenario.clientInfo, 
      newYorkScenario.assets, 
      newYorkScenario.income, 
      newYorkScenario.expenses, 
      newYorkScenario.medicalInfo, 
      newYorkScenario.livingInfo, 
      newYorkScenario.state
    );
    
    // Different recommendations based on state rules
    expect(flResult.eligibility.resourceLimit).toBe(2000);
    expect(nyResult.eligibility.resourceLimit).toBe(15750);
    
    // Verify state names in reports
    const flReport = generateMedicaidPlanningReport(flResult);
    const nyReport = generateMedicaidPlanningReport(nyResult);
    
    expect(flReport).toContain('florida');
    expect(nyReport).toContain('newyork');
  });
});