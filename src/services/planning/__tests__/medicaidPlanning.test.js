// src/services/planning/__tests__/medicaidPlanning.test.js

const {
    medicaidPlanning,
    generateMedicaidPlanningReport
  } = require('../medicaidPlanning');
  
  // Mock the dependencies
  jest.mock('../../../config/logger', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }));
  
  // Mock the validation service
  jest.mock('../../validation/inputValidation', () => ({
    validateAllInputs: jest.fn().mockResolvedValue({
      valid: true,
      message: 'All inputs are valid',
      normalizedData: {
        clientInfo: { name: 'Test Client', age: 75, maritalStatus: 'single' },
        assets: { countable: 5000, home: 150000 },
        income: { social_security: 1500, pension: 800 },
        expenses: { health_insurance: 200 },
        state: 'florida'
      }
    })
  }));
  
  // Mock the rules loader
  jest.mock('../../utils/medicaidRulesLoader', () => ({
    loadMedicaidRules: jest.fn().mockResolvedValue({
      florida: {
        resourceLimitSingle: 2000,
        homeEquityLimit: 730000
      }
    })
  }));
  
  // Mock all the planning modules
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
      eligibilityResult: { isResourceEligible: false, isIncomeEligible: true },
      eligibilityStrategies: ['Reduce countable assets'],
      eligibilityPlan: 'Eligibility Plan...',
      status: 'success'
    })
  }));
  
  jest.mock('../relatedBenefits', () => ({
    medicaidRelatedBenefitsPlanning: jest.fn().mockResolvedValue({
      eligibility: { socialSecurity: true, vaImprovedPension: true },
      strategies: ['Explore VA benefits'],
      approach: 'Related Benefits Approach...',
      status: 'success'
    })
  }));
  
  jest.mock('../assetPlanning', () => ({
    medicaidAssetPlanning: jest.fn().mockResolvedValue({
      situation: { countableAssets: 5000, excessAssets: 3000 },
      strategies: ['Convert countable assets'],
      approach: 'Asset Planning Approach...',
      status: 'success'
    })
  }));
  
  jest.mock('../incomePlanning', () => ({
    medicaidIncomePlanning: jest.fn().mockResolvedValue({
      incomeSituation: { totalIncome: 2300, incomeLimit: 2901 },
      strategies: ['Monitor income'],
      approach: 'Income Planning Approach...',
      status: 'success'
    })
  }));
  
  jest.mock('../trustPlanning', () => ({
    medicaidTrustPlanning: jest.fn().mockResolvedValue({
      strategies: ['Consider self-settled trust'],
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
  
  // Sample test data
  const clientInfo = {
    name: 'Test Client',
    age: 75,
    maritalStatus: 'single'
  };
  
  const assets = {
    countable: 5000,
    home: 150000
  };
  
  const income = {
    social_security: 1500,
    pension: 800
  };
  
  const expenses = {
    health_insurance: 200
  };
  
  const medicalInfo = {
    diagnoses: ['dementia'],
    adlLimitations: ['bathing', 'toileting']
  };
  
  const livingInfo = {
    currentSetting: 'home',
    caregiverSupport: 'family'
  };
  
  const state = 'florida';
  
  describe('medicaidPlanning', () => {
    test('should return comprehensive planning result with status success', async () => {
      const result = await medicaidPlanning(clientInfo, assets, income, expenses, medicalInfo, livingInfo, state);
  
      expect(result.status).toBe('success');
      expect(result).toHaveProperty('carePlan');
      expect(result).toHaveProperty('eligibilityPlan');
      expect(result).toHaveProperty('assetPlan');
      expect(result).toHaveProperty('incomePlan');
      expect(result).toHaveProperty('trustPlan');
      expect(result).toHaveProperty('applicationPlan');
      expect(result).toHaveProperty('postEligibilityPlan');
      expect(result).toHaveProperty('estateRecoveryPlan');
    });
  
    test('should gracefully handle input validation failure', async () => {
      const { validateAllInputs } = require('../../validation/inputValidation');
      validateAllInputs.mockResolvedValueOnce({
        valid: false,
        message: 'Invalid input test case',
        normalizedData: null
      });
  
      const result = await medicaidPlanning({}, {}, {}, {}, {}, {}, state);
      expect(result.status).toBe('error');
      expect(result.error).toContain('Invalid input test case');
    });
  
    test('should gracefully handle unexpected internal errors', async () => {
      const { medicaidAssetPlanning } = require('../assetPlanning');
      medicaidAssetPlanning.mockRejectedValueOnce(new Error('Mock internal error'));
  
      const result = await medicaidPlanning(clientInfo, assets, income, expenses, medicalInfo, livingInfo, state);
      expect(result.status).toBe('error');
      expect(result.error).toContain('Medicaid planning error: Mock internal error');
    });
  });
  
  describe('generateMedicaidPlanningReport', () => {
    test('should generate a valid text report from planning result', async () => {
      const result = await medicaidPlanning(clientInfo, assets, income, expenses, medicalInfo, livingInfo, state);
      const report = generateMedicaidPlanningReport(result);
  
      expect(report).toContain('COMPREHENSIVE MEDICAID PLANNING REPORT');
      expect(report).toContain('1. CARE PLANNING');
      expect(report).toContain('12. ESTATE RECOVERY PLANNING');
      expect(report).toContain('SUMMARY & RECOMMENDED NEXT STEPS');
    });
  
    test('should return error message in report if planning failed', () => {
      const errorResult = {
        status: 'error',
        error: 'Validation failed'
      };
  
      const report = generateMedicaidPlanningReport(errorResult);
      expect(report).toBe('ERROR: Validation failed');
    });
  });
// src/services/planning/__tests__/medicaidPlanning.test.js

const {
    medicaidPlanning,
    generateMedicaidPlanningReport
  } = require('../medicaidPlanning');
  
  // Mock the dependencies
  jest.mock('../../../config/logger', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }));
  
  // Mock the validation service
  jest.mock('../../validation/inputValidation', () => ({
    validateAllInputs: jest.fn().mockResolvedValue({
      valid: true,
      message: 'All inputs are valid',
      normalizedData: {
        clientInfo: { name: 'Test Client', age: 75, maritalStatus: 'single' },
        assets: { countable: 5000, home: 150000 },
        income: { social_security: 1500, pension: 800 },
        expenses: { health_insurance: 200 },
        state: 'florida'
      }
    })
  }));
  
  // Mock the rules loader
  jest.mock('../../utils/medicaidRulesLoader', () => ({
    loadMedicaidRules: jest.fn().mockResolvedValue({
      florida: {
        resourceLimitSingle: 2000,
        homeEquityLimit: 730000
      }
    })
  }));
  
  // Mock all the planning modules
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
      eligibilityResult: { isResourceEligible: false, isIncomeEligible: true },
      eligibilityStrategies: ['Reduce countable assets'],
      eligibilityPlan: 'Eligibility Plan...',
      status: 'success'
    })
  }));
  
  jest.mock('../relatedBenefits', () => ({
    medicaidRelatedBenefitsPlanning: jest.fn().mockResolvedValue({
      eligibility: { socialSecurity: true, vaImprovedPension: true },
      strategies: ['Explore VA benefits'],
      approach: 'Related Benefits Approach...',
      status: 'success'
    })
  }));
  
  jest.mock('../assetPlanning', () => ({
    medicaidAssetPlanning: jest.fn().mockResolvedValue({
      situation: { countableAssets: 5000, excessAssets: 3000 },
      strategies: ['Convert countable assets'],
      approach: 'Asset Planning Approach...',
      status: 'success'
    })
  }));
  
  jest.mock('../incomePlanning', () => ({
    medicaidIncomePlanning: jest.fn().mockResolvedValue({
      incomeSituation: { totalIncome: 2300, incomeLimit: 2901 },
      strategies: ['Monitor income'],
      approach: 'Income Planning Approach...',
      status: 'success'
    })
  }));
  
  jest.mock('../trustPlanning', () => ({
    medicaidTrustPlanning: jest.fn().mockResolvedValue({
      strategies: ['Consider self-settled trust'],
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
  
  // Sample test data
  const clientInfo = {
    name: 'Test Client',
    age: 75,
    maritalStatus: 'single'
  };
  
  const assets = {
    countable: 5000,
    home: 150000
  };
  
  const income = {
    social_security: 1500,
    pension: 800
  };
  
  const expenses = {
    health_insurance: 200
  };
  
  const medicalInfo = {
    diagnoses: ['dementia'],
    adlLimitations: ['bathing', 'toileting']
  };
  
  const livingInfo = {
    currentSetting: 'home',
    caregiverSupport: 'family'
  };
  
  const state = 'florida';
  
  describe('medicaidPlanning', () => {
    test('should return comprehensive planning result with status success', async () => {
      const result = await medicaidPlanning(clientInfo, assets, income, expenses, medicalInfo, livingInfo, state);
  
      expect(result.status).toBe('success');
      expect(result).toHaveProperty('carePlan');
      expect(result).toHaveProperty('eligibilityPlan');
      expect(result).toHaveProperty('assetPlan');
      expect(result).toHaveProperty('incomePlan');
      expect(result).toHaveProperty('trustPlan');
      expect(result).toHaveProperty('applicationPlan');
      expect(result).toHaveProperty('postEligibilityPlan');
      expect(result).toHaveProperty('estateRecoveryPlan');
    });
  
    test('should gracefully handle input validation failure', async () => {
      const { validateAllInputs } = require('../../validation/inputValidation');
      validateAllInputs.mockResolvedValueOnce({
        valid: false,
        message: 'Invalid input test case',
        normalizedData: null
      });
  
      const result = await medicaidPlanning({}, {}, {}, {}, {}, {}, state);
      expect(result.status).toBe('error');
      expect(result.error).toContain('Invalid input test case');
    });
  
    test('should gracefully handle unexpected internal errors', async () => {
      const { medicaidAssetPlanning } = require('../assetPlanning');
      medicaidAssetPlanning.mockRejectedValueOnce(new Error('Mock internal error'));
  
      const result = await medicaidPlanning(clientInfo, assets, income, expenses, medicalInfo, livingInfo, state);
      expect(result.status).toBe('error');
      expect(result.error).toContain('Medicaid planning error: Mock internal error');
    });
  });
  
  describe('generateMedicaidPlanningReport', () => {
    test('should generate a valid text report from planning result', async () => {
      const result = await medicaidPlanning(clientInfo, assets, income, expenses, medicalInfo, livingInfo, state);
      const report = generateMedicaidPlanningReport(result);
  
      expect(report).toContain('COMPREHENSIVE MEDICAID PLANNING REPORT');
      expect(report).toContain('1. CARE PLANNING');
      expect(report).toContain('12. ESTATE RECOVERY PLANNING');
      expect(report).toContain('SUMMARY & RECOMMENDED NEXT STEPS');
    });
  
    test('should return error message in report if planning failed', () => {
      const errorResult = {
        status: 'error',
        error: 'Validation failed'
      };
  
      const report = generateMedicaidPlanningReport(errorResult);
      expect(report).toBe('ERROR: Validation failed');
    });
  });
    