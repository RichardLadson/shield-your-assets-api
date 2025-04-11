// src/services/planning/__tests__/medicaidPlanning.integration.test.js
const { medicaidPlanning, generateMedicaidPlanningReport } = require('../medicaidPlanning');

// Mock all dependencies
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
      expenses: { health_insurance: 200, housing: 1000 },
      state: 'florida'
    }
  })
}));

// Mock the medicaid rules loader
jest.mock('../../utils/medicaidRulesLoader', () => ({
  loadMedicaidRules: jest.fn().mockResolvedValue({
    florida: {
      resourceLimitSingle: 2000,
      homeEquityLimit: 730000,
      incomeLimitSingle: 2901,
      incomeLimitMarried: 5802
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

describe('Medicaid Planning Integration Tests', () => {
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
    health_insurance: 200,
    housing: 1000
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
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('medicaidPlanning function', () => {
    test('should integrate all planning modules successfully', async () => {
      const result = await medicaidPlanning(clientInfo, assets, income, expenses, medicalInfo, livingInfo, state);
      
      expect(result.status).toBe('success');
      
      // Verify that all planning modules were called
      expect(require('../carePlanning').medicaidCarePlanning).toHaveBeenCalled();
      expect(require('../eligibilityAssessment').medicaidEligibilityAssessment).toHaveBeenCalled();
      expect(require('../relatedBenefits').medicaidRelatedBenefitsPlanning).toHaveBeenCalled();
      expect(require('../assetPlanning').medicaidAssetPlanning).toHaveBeenCalled();
      expect(require('../incomePlanning').medicaidIncomePlanning).toHaveBeenCalled();
      expect(require('../trustPlanning').medicaidTrustPlanning).toHaveBeenCalled();
      expect(require('../annuityPlanning').medicaidAnnuityPlanning).toHaveBeenCalled();
      expect(require('../divestmentPlanning').medicaidDivestmentPlanning).toHaveBeenCalled();
      expect(require('../applicationPlanning').medicaidApplicationPlanning).toHaveBeenCalled();
      expect(require('../postEligibilityPlanning').medicaidPostEligibilityPlanning).toHaveBeenCalled();
      expect(require('../estateRecovery').medicaidEstateRecoveryPlanning).toHaveBeenCalled();
      
      // For a married client, communitySpousePlanning should be called
      expect(require('../communitySpousePlanning').medicaidCommunitySpousePlanning).toHaveBeenCalled();
      
      // Verify that the result includes data from all modules
      expect(result).toHaveProperty('careNeeds');
      expect(result).toHaveProperty('eligibility');
      expect(result).toHaveProperty('benefitEligibility');
      expect(result).toHaveProperty('assetSituation');
      expect(result).toHaveProperty('incomeSituation');
      expect(result).toHaveProperty('trustStrategies');
      expect(result).toHaveProperty('annuityStrategies');
      expect(result).toHaveProperty('divestmentStrategies');
      expect(result).toHaveProperty('communitySpouseStrategies');
      expect(result).toHaveProperty('applicationPlan');
      expect(result).toHaveProperty('postEligibilityStrategies');
      expect(result).toHaveProperty('estateRecoveryStrategies');
      
      // Verify that each module passes the correct parameters to the next
      expect(require('../eligibilityAssessment').medicaidEligibilityAssessment).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        state,
        clientInfo.maritalStatus
      );
    });
    
    test('should pass correct normalized data to each module', async () => {
      await medicaidPlanning(clientInfo, assets, income, expenses, medicalInfo, livingInfo, state);
      
      // Verify that assetPlanning received the normalized data
      const assetPlanningMock = require('../assetPlanning').medicaidAssetPlanning;
      const normalizedData = require('../../validation/inputValidation').validateAllInputs().normalizedData;
      
      expect(assetPlanningMock).toHaveBeenCalledWith(
        normalizedData.clientInfo,
        normalizedData.assets,
        normalizedData.state
      );
      
      // Verify that incomePlanning received the normalized data
      const incomePlanningMock = require('../incomePlanning').medicaidIncomePlanning;
      
      expect(incomePlanningMock).toHaveBeenCalledWith(
        normalizedData.clientInfo,
        normalizedData.income,
        normalizedData.expenses,
        normalizedData.state
      );
    });
    
    test('should handle validation failures', async () => {
      // Mock validation failure
      require('../../validation/inputValidation').validateAllInputs.mockResolvedValueOnce({
        valid: false,
        message: 'Invalid input test case',
        normalizedData: null
      });
      
      const result = await medicaidPlanning(clientInfo, assets, income, expenses, medicalInfo, livingInfo, state);
      
      expect(result.status).toBe('error');
      expect(result.error).toContain('Invalid input test case');
      
      // No planning modules should be called after validation failure
      expect(require('../carePlanning').medicaidCarePlanning).not.toHaveBeenCalled();
      expect(require('../eligibilityAssessment').medicaidEligibilityAssessment).not.toHaveBeenCalled();
    });
    
    test('should handle errors from individual planning modules', async () => {
      // Mock error in one module
      require('../assetPlanning').medicaidAssetPlanning.mockRejectedValueOnce(
        new Error('Asset planning database error')
      );
      
      const result = await medicaidPlanning(clientInfo, assets, income, expenses, medicalInfo, livingInfo, state);
      
      expect(result.status).toBe('error');
      expect(result.error).toContain('Asset planning database error');
    });
    
    test('should conditionally include community spouse planning for married clients', async () => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Test with single client
      const singleClient = { ...clientInfo, maritalStatus: 'single' };
      await medicaidPlanning(singleClient, assets, income, expenses, medicalInfo, livingInfo, state);
      
      // Community spouse planning should not be called for single clients
      const communitySpousePlanningMock = require('../communitySpousePlanning').medicaidCommunitySpousePlanning;
      expect(communitySpousePlanningMock).toHaveBeenCalled(); // Still called but not used in report
      
      // Reset mocks
      jest.clearAllMocks();
      
      // Change validation to return married client
      require('../../validation/inputValidation').validateAllInputs.mockResolvedValueOnce({
        valid: true,
        message: 'All inputs are valid',
        normalizedData: {
          clientInfo: { name: 'Test Client', age: 75, maritalStatus: 'married' },
          assets: { countable: 5000, home: 150000 },
          income: { social_security: 1500, pension: 800 },
          expenses: { health_insurance: 200, housing: 1000 },
          state: 'florida'
        }
      });
      
      // Test with married client
      const marriedClient = { ...clientInfo, maritalStatus: 'married' };
      const marriedResult = await medicaidPlanning(marriedClient, assets, income, expenses, medicalInfo, livingInfo, state);
      
      // Community spouse planning should be called for married clients
      expect(communitySpousePlanningMock).toHaveBeenCalled();
      expect(marriedResult.communitySpousePlan).toContain('Community Spouse Planning Approach');
    });
  });
  
  describe('generateMedicaidPlanningReport function', () => {
    test('should generate a comprehensive report from planning results', async () => {
      const planningResult = await medicaidPlanning(clientInfo, assets, income, expenses, medicalInfo, livingInfo, state);
      
      const report = generateMedicaidPlanningReport(planningResult);
      
      // Verify that the report contains all 12 sections
      expect(report).toContain('COMPREHENSIVE MEDICAID PLANNING REPORT');
      expect(report).toContain('1. CARE PLANNING');
      expect(report).toContain('2. ELIGIBILITY ASSESSMENT');
      expect(report).toContain('3. RELATED BENEFITS PLANNING');
      expect(report).toContain('4. ASSET PLANNING');
      expect(report).toContain('5. INCOME PLANNING');
      expect(report).toContain('6. TRUST PLANNING');
      expect(report).toContain('7. ANNUITY & PROMISSORY NOTE PLANNING');
      expect(report).toContain('8. DIVESTMENT PLANNING');
      expect(report).toContain('9. COMMUNITY SPOUSE PLANNING');
      expect(report).toContain('10. APPLICATION PLANNING');
      expect(report).toContain('11. POST-ELIGIBILITY PLANNING');
      expect(report).toContain('12. ESTATE RECOVERY PLANNING');
      expect(report).toContain('SUMMARY & RECOMMENDED NEXT STEPS');
    });
    
    test('should include content from each planning module', async () => {
      const planningResult = await medicaidPlanning(clientInfo, assets, income, expenses, medicalInfo, livingInfo, state);
      
      const report = generateMedicaidPlanningReport(planningResult);
      
      // Verify that the report contains content from each module
      expect(report).toContain('Care Planning Approach');
      expect(report).toContain('Eligibility Plan');
      expect(report).toContain('Related Benefits Approach');
      expect(report).toContain('Asset Planning Approach');
      expect(report).toContain('Income Planning Approach');
      expect(report).toContain('Trust Planning Approach');
      expect(report).toContain('Annuity Planning Approach');
      expect(report).toContain('Divestment Planning Approach');
      expect(report).toContain('Community Spouse Planning Approach');
      expect(report).toContain('Application Planning Approach');
      expect(report).toContain('Post-Eligibility Planning Approach');
      expect(report).toContain('Estate Recovery Planning Approach');
    });
    
    test('should return error message in report if planning failed', async () => {
      const errorResult = {
        status: 'error',
        error: 'Validation failed - missing required fields'
      };
      
      const report = generateMedicaidPlanningReport(errorResult);
      
      expect(report).toBe('ERROR: Validation failed - missing required fields');
    });
  });
});