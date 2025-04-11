// src/services/planning/__tests__/eligibilityAssessment.test.js
const {
  assessEligibility,
  determineEligibilityStrategies,
  planEligibilityApproach,
  medicaidEligibilityAssessment
} = require('../eligibilityAssessment');

// Mock the dependencies
jest.mock('../../../config/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock medicaid rules data
jest.mock('../../../data/medicaid_rules_2025.json', () => ({
  florida: {
    assetLimitSingle: 2000,
    assetLimitMarried: 3000,
    incomeLimitSingle: 2901,
    incomeLimitMarried: 5802
  },
  california: {
    assetLimitSingle: 2000,
    assetLimitMarried: 3000,
    incomeLimitSingle: 1561,
    incomeLimitMarried: 2106
  },
  newyork: {
    assetLimitSingle: 15750,
    assetLimitMarried: 23400,
    incomeLimitSingle: 934,
    incomeLimitMarried: 1367
  }
}));

describe('Eligibility Assessment Module', () => {
  // Sample test data
  const clientInfo = {
    name: 'Test Client',
    age: 75,
    maritalStatus: 'single'
  };
  
  const assets = {
    countable: 5000,
    non_countable: 150000
  };
  
  const income = {
    social_security: 1500,
    pension: 800
  };
  
  const state = 'florida';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('assessEligibility', () => {
    test('should assess eligibility correctly for a single client', () => {
      const rules = {
        assetLimitSingle: 2000,
        assetLimitMarried: 3000,
        incomeLimitSingle: 2901,
        incomeLimitMarried: 5802
      };
      
      const eligibility = assessEligibility(clientInfo, assets, income, state, rules);
      
      expect(eligibility).toHaveProperty('isResourceEligible');
      expect(eligibility).toHaveProperty('isIncomeEligible');
      expect(eligibility).toHaveProperty('resourceLimit');
      expect(eligibility).toHaveProperty('incomeLimit');
      expect(eligibility).toHaveProperty('countableAssets');
      expect(eligibility).toHaveProperty('totalIncome');
      
      expect(eligibility.isResourceEligible).toBe(false);
      expect(eligibility.resourceLimit).toBe(2000);
      expect(eligibility.countableAssets).toBe(5000);
      expect(eligibility.isIncomeEligible).toBe(true);
      expect(eligibility.incomeLimit).toBe(2901);
      expect(eligibility.totalIncome).toBe(2300);
    });
    
    test('should use different resource limit for married clients', () => {
      const marriedClientInfo = { ...clientInfo, maritalStatus: 'married' };
      const rules = {
        assetLimitSingle: 2000,
        assetLimitMarried: 3000,
        incomeLimitSingle: 2901,
        incomeLimitMarried: 5802
      };
      
      const eligibility = assessEligibility(marriedClientInfo, assets, income, state, rules);
      
      expect(eligibility.resourceLimit).toBe(3000);
      expect(eligibility.incomeLimit).toBe(5802);
      expect(eligibility.isResourceEligible).toBe(false);
    });
    
    test('should calculate income eligibility correctly with different income levels', () => {
      const rules = {
        assetLimitSingle: 2000,
        assetLimitMarried: 3000,
        incomeLimitSingle: 2901,
        incomeLimitMarried: 5802
      };
      
      const incomeBelowLimit = {
        social_security: 1000,
        pension: 500
      };
      
      const incomeAboveLimit = {
        social_security: 2000,
        pension: 1500
      };
      
      const eligibility1 = assessEligibility(clientInfo, assets, incomeBelowLimit, state, rules);
      const eligibility2 = assessEligibility(clientInfo, assets, incomeAboveLimit, state, rules);
      
      expect(eligibility1.totalIncome).toBe(1500);
      expect(eligibility1.isIncomeEligible).toBe(true);
      
      expect(eligibility2.totalIncome).toBe(3500);
      expect(eligibility2.isIncomeEligible).toBe(false);
    });
    
    test('should handle zero or missing assets and income', () => {
      const rules = {
        assetLimitSingle: 2000,
        assetLimitMarried: 3000,
        incomeLimitSingle: 2901,
        incomeLimitMarried: 5802
      };
      
      const emptyAssets = {};
      const emptyIncome = {};
      
      const eligibility = assessEligibility(clientInfo, emptyAssets, emptyIncome, state, rules);
      
      expect(eligibility.countableAssets).toBe(0);
      expect(eligibility.totalIncome).toBe(0);
      expect(eligibility.isResourceEligible).toBe(true);
      expect(eligibility.isIncomeEligible).toBe(true);
    });
    
    test('should apply correct state-specific limits', () => {
      // Florida rules
      const flRules = {
        assetLimitSingle: 2000,
        assetLimitMarried: 3000,
        incomeLimitSingle: 2901,
        incomeLimitMarried: 5802
      };
      
      // New York rules
      const nyRules = {
        assetLimitSingle: 15750,
        assetLimitMarried: 23400,
        incomeLimitSingle: 934,
        incomeLimitMarried: 1367
      };
      
      const flEligibility = assessEligibility(clientInfo, assets, income, 'florida', flRules);
      const nyEligibility = assessEligibility(clientInfo, assets, income, 'newyork', nyRules);
      
      // Florida: Not resource eligible due to $2000 limit
      expect(flEligibility.isResourceEligible).toBe(false);
      // Florida: Income eligible with $2901 limit
      expect(flEligibility.isIncomeEligible).toBe(true);
      
      // New York: Resource eligible due to $15750 limit
      expect(nyEligibility.isResourceEligible).toBe(true);
      // New York: Not income eligible with $934 limit
      expect(nyEligibility.isIncomeEligible).toBe(false);
    });
  });
  
  describe('determineEligibilityStrategies', () => {
    test('should recommend spend-down for excess resources', () => {
      const eligibilityResult = {
        isResourceEligible: false,
        spenddownAmount: 3000,
        isIncomeEligible: true,
        countableAssets: 5000,
        resourceLimit: 2000
      };
      
      const strategies = determineEligibilityStrategies(eligibilityResult);
      
      expect(strategies).toContain('Reduce countable assets through exempt purchases or annuities');
      expect(strategies).toContain('Transfer excess assets to a community spouse if allowed');
      expect(strategies).toContain('Consider setting up a Medicaid asset protection trust');
    });
    
    test('should recommend income management for excess income', () => {
      const eligibilityResult = {
        isResourceEligible: true,
        spenddownAmount: 0,
        isIncomeEligible: false,
        totalIncome: 3500,
        incomeLimit: 2901
      };
      
      const strategies = determineEligibilityStrategies(eligibilityResult);
      
      expect(strategies).toContain('Establish a Qualified Income Trust (Miller Trust) for excess income');
      expect(strategies).toContain('Use income to pay down medical expenses and care liability');
    });
    
    test('should recommend both resource and income strategies when both are ineligible', () => {
      const eligibilityResult = {
        isResourceEligible: false,
        spenddownAmount: 3000,
        isIncomeEligible: false,
        countableAssets: 5000,
        resourceLimit: 2000,
        totalIncome: 3500,
        incomeLimit: 2901
      };
      
      const strategies = determineEligibilityStrategies(eligibilityResult);
      
      // Should contain both resource and income strategies
      expect(strategies).toContain('Reduce countable assets through exempt purchases or annuities');
      expect(strategies).toContain('Establish a Qualified Income Trust (Miller Trust) for excess income');
    });
    
    test('should not recommend strategies if already eligible', () => {
      const eligibilityResult = {
        isResourceEligible: true,
        spenddownAmount: 0,
        isIncomeEligible: true,
        countableAssets: 1800,
        resourceLimit: 2000,
        totalIncome: 2000,
        incomeLimit: 2901
      };
      
      const strategies = determineEligibilityStrategies(eligibilityResult);
      
      expect(strategies.length).toBe(0);
    });
  });
  
  describe('planEligibilityApproach', () => {
    test('should create detailed plan based on strategies', () => {
      const strategies = [
        'Reduce countable assets through exempt purchases or annuities',
        'Consider setting up a Medicaid asset protection trust'
      ];
      
      const eligibilityResult = {
        isResourceEligible: false,
        isIncomeEligible: true,
        resourceLimit: 2000,
        incomeLimit: 2901,
        countableAssets: 5000,
        totalIncome: 2300,
        state: 'florida'
      };
      
      const plan = planEligibilityApproach(strategies, eligibilityResult);
      
      expect(plan).toContain('Eligibility Plan');
      expect(plan).toContain('Countable Assets: $5000.00');
      expect(plan).toContain('Total Income: $2300.00');
      expect(plan).toContain('Resource Eligible: NO');
      expect(plan).toContain('Income Eligible: YES');
      expect(plan).toContain('Reduce countable assets through exempt purchases or annuities');
      expect(plan).toContain('Consider setting up a Medicaid asset protection trust');
    });
    
    test('should include state-specific guidance', () => {
      const strategies = [
        'Reduce countable assets through exempt purchases or annuities'
      ];
      
      const eligibilityResult = {
        isResourceEligible: false,
        isIncomeEligible: true,
        resourceLimit: 2000,
        incomeLimit: 2901,
        countableAssets: 5000,
        totalIncome: 2300,
        state: 'florida'
      };
      
      const plan = planEligibilityApproach(strategies, eligibilityResult);
      
      expect(plan).toContain('florida');
    });
    
    test('should create appropriate plan when fully eligible', () => {
      const strategies = [];
      
      const eligibilityResult = {
        isResourceEligible: true,
        isIncomeEligible: true,
        resourceLimit: 2000,
        incomeLimit: 2901,
        countableAssets: 1800,
        totalIncome: 2000,
        state: 'florida'
      };
      
      const plan = planEligibilityApproach(strategies, eligibilityResult);
      
      expect(plan).toContain('The client currently meets both income and asset eligibility requirements');
      expect(plan).not.toContain('Recommended Strategies');
    });
  });
  
  describe('medicaidEligibilityAssessment', () => {
    test('should complete the eligibility assessment process successfully', async () => {
      const result = await medicaidEligibilityAssessment(
        clientInfo, 
        assets, 
        income, 
        state, 
        clientInfo.maritalStatus
      );
      
      expect(result.status).toBe('success');
      expect(result).toHaveProperty('eligibilityResult');
      expect(result).toHaveProperty('eligibilityStrategies');
      expect(result).toHaveProperty('eligibilityPlan');
      expect(result.eligibilityResult.isResourceEligible).toBe(false);
      expect(result.eligibilityResult.isIncomeEligible).toBe(true);
    });
    
    test('should handle errors gracefully', async () => {
      // Simulate an error by passing null instead of valid assets
      const result = await medicaidEligibilityAssessment(
        clientInfo, 
        null, 
        income, 
        state, 
        clientInfo.maritalStatus
      );
      
      expect(result.status).toBe('error');
      expect(result).toHaveProperty('error');
    });
    
    test('should process eligibility for different states correctly', async () => {
      // Test Florida eligibility
      const flResult = await medicaidEligibilityAssessment(
        clientInfo, 
        assets, 
        income, 
        'florida', 
        clientInfo.maritalStatus
      );
      
      // Test New York eligibility with the same client data
      const nyResult = await medicaidEligibilityAssessment(
        clientInfo, 
        assets, 
        income, 
        'newyork', 
        clientInfo.maritalStatus
      );
      
      // Florida: Not resource eligible, but income eligible
      expect(flResult.eligibilityResult.isResourceEligible).toBe(false);
      expect(flResult.eligibilityResult.isIncomeEligible).toBe(true);
      
      // New York: Resource eligible (higher resource limits), but not income eligible (lower income limits)
      expect(nyResult.eligibilityResult.isResourceEligible).toBe(true); 
      expect(nyResult.eligibilityResult.isIncomeEligible).toBe(false);
    });
    
    test('should handle different marital statuses', async () => {
      // Single client
      const singleResult = await medicaidEligibilityAssessment(
        { ...clientInfo, maritalStatus: 'single' }, 
        assets, 
        income, 
        state, 
        'single'
      );
      
      // Married client (same assets and income)
      const marriedResult = await medicaidEligibilityAssessment(
        { ...clientInfo, maritalStatus: 'married' }, 
        assets, 
        income, 
        state, 
        'married'
      );
      
      // Different resource limits should be applied
      expect(singleResult.eligibilityResult.resourceLimit).toBe(2000);
      expect(marriedResult.eligibilityResult.resourceLimit).toBe(3000);
      
      // Different income limits should be applied
      expect(singleResult.eligibilityResult.incomeLimit).toBe(2901);
      expect(marriedResult.eligibilityResult.incomeLimit).toBe(5802);
    });
  });
});