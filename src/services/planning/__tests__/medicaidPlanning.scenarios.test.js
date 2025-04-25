// src/services/planning/__tests__/medicaidPlanning.scenarios.test.js
const { medicaidPlanning, generateMedicaidPlanningReport } = require('../medicaidPlanning');

// Define test scenarios
const clientScenarios = {
  singleElderly: {
    description: 'Single elderly client with excess assets',
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
    state: 'florida',
    expectedResults: {
      careLevel: 'nursing',
      isResourceEligible: false,
      isIncomeEligible: true,
      excessAssets: 43000,
      needsCommunitySpousePlanning: false
    }
  },
  
  marriedNursingHome: {
    description: 'Married client in nursing home with community spouse',
    clientInfo: {
      name: 'Robert Johnson',
      age: 75,
      maritalStatus: 'married',
      spouseInfo: {
        name: 'Mary Johnson',
        age: 73,
        needsLongTermCare: false
      }
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
    state: 'florida',
    expectedResults: {
      careLevel: 'nursing',
      isResourceEligible: false,
      isIncomeEligible: true,
      excessAssets: 117000,
      needsCommunitySpousePlanning: true
    }
  },
  
  lowIncomeEligible: {
    description: 'Low-income eligible client',
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
    state: 'florida',
    expectedResults: {
      careLevel: 'in-home',
      isResourceEligible: true,
      isIncomeEligible: true,
      excessAssets: 0,
      needsCommunitySpousePlanning: false
    }
  },
  
  invalidInputs: {
    description: 'Client with invalid inputs',
    clientInfo: {
      name: 'Invalid Data',
      age: -5, // Invalid age
      maritalStatus: 'unknown' // Invalid marital status
    },
    assets: {
      countable: -1000, // Invalid negative asset
      home: "not a number" // Invalid non-numeric value
    },
    income: {},
    expenses: {},
    medicalInfo: null,
    livingInfo: null,
    state: 'nonexistent_state',
    expectedResults: {
      status: 'error'
    }
  },
  
  highIncomeLowAssets: {
    description: 'Client with high income but low assets',
    clientInfo: {
      name: 'High Income Client',
      age: 70,
      maritalStatus: 'single'
    },
    assets: {
      countable: 1500,
      home: 150000
    },
    income: {
      social_security: 1200,
      pension: 3000
    },
    expenses: {
      health_insurance: 400,
      housing: 1200
    },
    medicalInfo: {
      diagnoses: ['heart disease'],
      adlLimitations: ['bathing']
    },
    livingInfo: {
      currentSetting: 'home',
      caregiverSupport: 'part-time'
    },
    state: 'florida',
    expectedResults: {
      careLevel: 'in-home',
      isResourceEligible: true,
      isIncomeEligible: false,
      excessAssets: 0,
      needsIncomePlanning: true
    }
  }
};

// Mock all dependencies
jest.mock('../../../config/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

jest.mock('../../validation/inputValidation', () => ({
  validateAllInputs: jest.fn()
}));

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

// Mock all planning modules with fixed responses
jest.mock('../carePlanning', () => ({
  medicaidCarePlanning: jest.fn().mockResolvedValue({
    careNeeds: { recommendedCareLevel: 'nursing' },
    strategies: ['Plan for skilled nursing facility placement'],
    approach: 'Care Planning Approach...',
    status: 'success'
  })
}));

jest.mock('../eligibilityAssessment', () => ({
  medicaidEligibilityAssessment: jest.fn().mockResolvedValue({
    eligibilityResult: { 
      isResourceEligible: false, 
      isIncomeEligible: true,
      countableAssets: 45000,
      resourceLimit: 2000
    },
    eligibilityStrategies: ['Reduce countable assets'],
    eligibilityPlan: 'Eligibility Plan...',
    status: 'success'
  })
}));

jest.mock('../relatedBenefits', () => ({
  medicaidRelatedBenefitsPlanning: jest.fn().mockResolvedValue({
    eligibility: { socialSecurity: true, vaImprovedPension: false },
    strategies: ['Explore Medicare Savings Programs'],
    approach: 'Related Benefits Approach...',
    status: 'success'
  })
}));

jest.mock('../assetPlanning', () => ({
  medicaidAssetPlanning: jest.fn().mockResolvedValue({
    situation: { 
      countableAssets: 45000, 
      excessAssets: 43000,
      resourceLimit: 2000
    },
    strategies: ['Convert countable assets to exempt assets'],
    approach: 'Asset Planning Approach...',
    status: 'success'
  })
}));

jest.mock('../incomePlanning', () => ({
  medicaidIncomePlanning: jest.fn().mockResolvedValue({
    incomeSituation: { totalIncome: 3000, incomeLimit: 2901 },
    strategies: ['Consider Qualified Income Trust (Miller Trust)'],
    approach: 'Income Planning Approach...',
    status: 'success'
  })
}));

jest.mock('../trustPlanning', () => ({
  medicaidTrustPlanning: jest.fn().mockResolvedValue({
    strategies: ['Consider self-settled irrevocable trust'],
    approach: 'Trust Planning Approach...',
    status: 'success'
  })
}));

jest.mock('../annuityPlanning', () => ({
  medicaidAnnuityPlanning: jest.fn().mockResolvedValue({
    strategies: ['Evaluate half-a-loaf with annuity'],
    approach: 'Annuity Planning Approach...',
    status: 'success'
  })
}));

jest.mock('../divestmentPlanning', () => ({
  medicaidDivestmentPlanning: jest.fn().mockResolvedValue({
    strategies: ['Consider Reverse Half-a-Loaf strategy'],
    approach: 'Divestment Planning Approach...',
    status: 'success'
  })
}));

jest.mock('../communitySpousePlanning', () => ({
  medicaidCommunitySpousePlanning: jest.fn().mockResolvedValue({
    strategies: ['Evaluate CSRA increase options'],
    approach: 'Community Spouse Planning Approach...',
    status: 'success'
  })
}));

jest.mock('../applicationPlanning', () => ({
  medicaidApplicationPlanning: jest.fn().mockResolvedValue({
    applicationStrategies: ['Prepare documentation for application'],
    applicationApproach: 'Application Planning Approach...',
    status: 'success'
  })
}));

jest.mock('../postEligibilityPlanning', () => ({
  medicaidPostEligibilityPlanning: jest.fn().mockResolvedValue({
    strategies: ['Set up monthly liability management'],
    approach: 'Post-Eligibility Planning Approach...',
    status: 'success'
  })
}));

jest.mock('../estateRecovery', () => ({
  medicaidEstateRecoveryPlanning: jest.fn().mockResolvedValue({
    strategies: ['Consider probate estate avoidance'],
    approach: 'Estate Recovery Planning Approach...',
    status: 'success'
  })
}));

describe('Medicaid Planning Scenario Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Test helper to set up mocks for a specific scenario
  const setupScenarioTest = (scenario) => {
    const { validateAllInputs } = require('../../validation/inputValidation');
    
    // Set up validation mock for this specific test
    if (scenario.expectedResults && scenario.expectedResults.status === 'error') {
      validateAllInputs.mockResolvedValueOnce({
        valid: false,
        message: 'Invalid input data',
        normalizedData: null
      });
    } else {
      validateAllInputs.mockResolvedValueOnce({
        valid: true,
        message: 'All inputs are valid',
        normalizedData: {
          clientInfo: scenario.clientInfo,
          assets: scenario.assets,
          income: scenario.income,
          expenses: scenario.expenses,
          medicalInfo: scenario.medicalInfo,
          livingInfo: scenario.livingInfo,
          state: scenario.state
        }
      });
    }
    
    // Customize mocks for this scenario if needed
    if (scenario.clientInfo.maritalStatus === 'married') {
      const { medicaidCommunitySpousePlanning } = require('../communitySpousePlanning');
      medicaidCommunitySpousePlanning.mockResolvedValueOnce({
        strategies: ['Evaluate CSRA increase options'],
        approach: 'Community Spouse Planning Approach...',
        status: 'success'
      });
    }
    
    if (scenario.expectedResults && scenario.expectedResults.careLevel === 'in-home') {
      const { medicaidCarePlanning } = require('../carePlanning');
      medicaidCarePlanning.mockResolvedValueOnce({
        careNeeds: { recommendedCareLevel: 'in-home' },
        strategies: ['Arrange in-home care services'],
        approach: 'Care Planning Approach for in-home care...',
        status: 'success'
      });
    }
    
    if (scenario.expectedResults && scenario.expectedResults.isResourceEligible) {
      const { medicaidEligibilityAssessment } = require('../eligibilityAssessment');
      medicaidEligibilityAssessment.mockResolvedValueOnce({
        eligibilityResult: { 
          isResourceEligible: true, 
          isIncomeEligible: scenario.expectedResults.isIncomeEligible || false,
          countableAssets: scenario.assets.countable,
          resourceLimit: 2000
        },
        eligibilityStrategies: [],
        eligibilityPlan: 'Eligibility Plan...',
        status: 'success'
      });
    }
    
    if (scenario.expectedResults && scenario.expectedResults.excessAssets === 0) {
      const { medicaidAssetPlanning } = require('../assetPlanning');
      medicaidAssetPlanning.mockResolvedValueOnce({
        situation: { 
          countableAssets: scenario.assets.countable, 
          excessAssets: 0,
          resourceLimit: 2000
        },
        strategies: ['Maintain asset eligibility'],
        approach: 'Asset Planning Approach...',
        status: 'success'
      });
    }
  };
  
  // Process each scenario and create tests
  Object.keys(clientScenarios).forEach(key => {
    const scenario = clientScenarios[key];
    
    test(`${key}: ${scenario.description}`, async () => {
      setupScenarioTest(scenario);
      
      // For error scenarios, handle differently
      if (scenario.expectedResults && scenario.expectedResults.status === 'error') {
        const result = await medicaidPlanning(
          scenario.clientInfo, 
          scenario.assets, 
          scenario.income, 
          scenario.expenses, 
          scenario.medicalInfo, 
          scenario.livingInfo, 
          scenario.state
        );
        
        expect(result.status).toBe('error');
        expect(result.error).toBeDefined();
        return;
      }
      
      const result = await medicaidPlanning(
        scenario.clientInfo, 
        scenario.assets, 
        scenario.income, 
        scenario.expenses, 
        scenario.medicalInfo, 
        scenario.livingInfo, 
        scenario.state
      );
      
      expect(result.status).toBe('success');
      
      // Verify specific expectations for this scenario
      if (scenario.expectedResults.careLevel) {
        expect(result.careNeeds.recommendedCareLevel).toBe(scenario.expectedResults.careLevel);
      }
      
      if (scenario.expectedResults.isResourceEligible !== undefined) {
        expect(result.eligibility.isResourceEligible).toBe(scenario.expectedResults.isResourceEligible);
      }
      
      const report = generateMedicaidPlanningReport(result);
      
      // Community spouse check
      if (scenario.expectedResults.needsCommunitySpousePlanning) {
        expect(result.communitySpousePlan).toContain('Community Spouse Planning Approach');
        expect(report).toContain('COMMUNITY SPOUSE PLANNING');
      }
      
      // Income planning check
      if (scenario.expectedResults.needsIncomePlanning) {
        expect(result.incomeStrategies[0]).toContain('Consider Qualified Income Trust');
      }
      
      // Check report has all expected sections
      expect(report).toContain('COMPREHENSIVE MEDICAID PLANNING REPORT');
      expect(report).toContain('ELIGIBILITY ASSESSMENT');
    });
  });
  
  test('should handle error from a specific module', async () => {
    // Mock validation to succeed but asset planning to fail
    const { validateAllInputs } = require('../../validation/inputValidation');
    validateAllInputs.mockResolvedValueOnce({
      valid: true,
      message: 'All inputs are valid',
      normalizedData: {
        clientInfo: clientScenarios.singleElderly.clientInfo,
        assets: clientScenarios.singleElderly.assets,
        income: clientScenarios.singleElderly.income,
        expenses: clientScenarios.singleElderly.expenses,
        medicalInfo: clientScenarios.singleElderly.medicalInfo,
        livingInfo: clientScenarios.singleElderly.livingInfo,
        state: clientScenarios.singleElderly.state
      }
    });
    
    // Make asset planning throw an error
    const { medicaidAssetPlanning } = require('../assetPlanning');
    medicaidAssetPlanning.mockRejectedValueOnce(new Error('Database connection failed'));
    
    const result = await medicaidPlanning(
      clientScenarios.singleElderly.clientInfo, 
      clientScenarios.singleElderly.assets, 
      clientScenarios.singleElderly.income, 
      clientScenarios.singleElderly.expenses, 
      clientScenarios.singleElderly.medicalInfo, 
      clientScenarios.singleElderly.livingInfo, 
      clientScenarios.singleElderly.state
    );
    
    expect(result.status).toBe('error');
    expect(result.error).toContain('Database connection failed');
  });
  
  test('should handle missing client information', async () => {
    const { validateAllInputs } = require('../../validation/inputValidation');
    validateAllInputs.mockResolvedValueOnce({
      valid: false,
      message: 'Missing required client information',
      normalizedData: null
    });
    
    const result = await medicaidPlanning(
      {}, // Empty client info
      {}, // Empty assets
      {}, // Empty income
      {}, // Empty expenses
      {}, // Empty medical info
      {}, // Empty living info
      'florida'
    );
    
    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required client information');
  });
  
  test('should handle state-specific variations', async () => {
    // Test Florida scenario
    const { validateAllInputs } = require('../../validation/inputValidation');
    validateAllInputs.mockResolvedValueOnce({
      valid: true,
      message: 'All inputs are valid',
      normalizedData: {
        clientInfo: clientScenarios.singleElderly.clientInfo,
        assets: clientScenarios.singleElderly.assets,
        income: clientScenarios.singleElderly.income,
        expenses: clientScenarios.singleElderly.expenses,
        medicalInfo: clientScenarios.singleElderly.medicalInfo,
        livingInfo: clientScenarios.singleElderly.livingInfo,
        state: 'florida'
      }
    });
    
    // Configure eligibility for Florida
    const { medicaidEligibilityAssessment } = require('../eligibilityAssessment');
    medicaidEligibilityAssessment.mockResolvedValueOnce({
      eligibilityResult: { 
        isResourceEligible: false, 
        isIncomeEligible: true,
        countableAssets: 45000,
        resourceLimit: 2000  // Florida limit
      },
      eligibilityStrategies: ['Reduce countable assets'],
      eligibilityPlan: 'Eligibility Plan for Florida...',
      status: 'success'
    });
    
    // Execute Florida test
    const flResult = await medicaidPlanning(
      clientScenarios.singleElderly.clientInfo, 
      clientScenarios.singleElderly.assets,
      clientScenarios.singleElderly.income,
      clientScenarios.singleElderly.expenses,
      clientScenarios.singleElderly.medicalInfo,
      clientScenarios.singleElderly.livingInfo,
      'florida'
    );
    
    expect(flResult.status).toBe('success');
    expect(flResult.eligibilityPlan).toContain('Florida');
    
    // Reset for New York test
    jest.clearAllMocks();
    
    // Setup for New York test
    validateAllInputs.mockResolvedValueOnce({
      valid: true,
      message: 'All inputs are valid',
      normalizedData: {
        clientInfo: clientScenarios.singleElderly.clientInfo,
        assets: clientScenarios.singleElderly.assets,
        income: clientScenarios.singleElderly.income,
        expenses: clientScenarios.singleElderly.expenses,
        medicalInfo: clientScenarios.singleElderly.medicalInfo,
        livingInfo: clientScenarios.singleElderly.livingInfo,
        state: 'newyork'
      }
    });
    
    // Configure eligibility for New York
    medicaidEligibilityAssessment.mockResolvedValueOnce({
      eligibilityResult: { 
        isResourceEligible: false, 
        isIncomeEligible: false,
        countableAssets: 45000,
        resourceLimit: 15750  // New York limit
      },
      eligibilityStrategies: ['Reduce countable assets'],
      eligibilityPlan: 'Eligibility Plan for New York...',
      status: 'success'
    });
    
    // Execute New York test
    const nyResult = await medicaidPlanning(
      clientScenarios.singleElderly.clientInfo, 
      clientScenarios.singleElderly.assets,
      clientScenarios.singleElderly.income,
      clientScenarios.singleElderly.expenses,
      clientScenarios.singleElderly.medicalInfo,
      clientScenarios.singleElderly.livingInfo,
      'newyork'
    );
    
    expect(nyResult.status).toBe('success');
    expect(nyResult.eligibilityPlan).toContain('New York');
  });
  
  test('performance with large dataset', async () => {
    // Create large dataset
    const largeIncome = {};
    for (let i = 0; i < 100; i++) {
      largeIncome[`income_source_${i}`] = 10;
    }
    
    const largeAssets = {
      countable: 45000  // Keep the total the same
    };
    for (let i = 0; i < 100; i++) {
      largeAssets[`asset_${i}`] = 100;
    }
    
    // Mock validation
    const { validateAllInputs } = require('../../validation/inputValidation');
    validateAllInputs.mockResolvedValueOnce({
      valid: true,
      message: 'All inputs are valid',
      normalizedData: {
        clientInfo: clientScenarios.singleElderly.clientInfo,
        assets: largeAssets,
        income: largeIncome,
        expenses: clientScenarios.singleElderly.expenses,
        medicalInfo: clientScenarios.singleElderly.medicalInfo,
        livingInfo: clientScenarios.singleElderly.livingInfo,
        state: clientScenarios.singleElderly.state
      }
    });
    
    const startTime = Date.now();
    
    const result = await medicaidPlanning(
      clientScenarios.singleElderly.clientInfo, 
      largeAssets,
      largeIncome,
      clientScenarios.singleElderly.expenses,
      clientScenarios.singleElderly.medicalInfo,
      clientScenarios.singleElderly.livingInfo,
      clientScenarios.singleElderly.state
    );
    
    const endTime = Date.now();
    
    expect(result.status).toBe('success');
    
    // Test should complete within reasonable time (adjust as needed)
    expect(endTime - startTime).toBeLessThan(1000);
  });
});