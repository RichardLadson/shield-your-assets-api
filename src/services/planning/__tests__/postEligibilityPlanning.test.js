// src/services/planning/__tests__/postEligibilityPlanning.test.js
const {
  assessPostEligibilityNeeds,
  determinePostEligibilityStrategies,
  planPostEligibilityApproach,
  medicaidPostEligibilityPlanning
} = require('../postEligibilityPlanning');

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
    incomeLimitMarried: 5802,
    monthlyPersonalNeedsAllowance: 160
  },
  california: {
    assetLimitSingle: 2000,
    assetLimitMarried: 3000,
    incomeLimitSingle: 1561,
    incomeLimitMarried: 2106,
    monthlyPersonalNeedsAllowance: 130
  }
}));

describe('Post-Eligibility Planning Module', () => {
  // Sample test data
  const clientInfo = {
    name: 'Test Client',
    age: 70,
    maritalStatus: 'single',
    homeOwnership: true,
    state: 'florida'
  };
  
  const assets = {
    total: 21000,
    countable: 2000,
    home: 150000
  };
  
  const income = {
    monthly: 2000,
    social_security: 1500,
    pension: 500
  };
  
  const state = 'florida';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('assessPostEligibilityNeeds', () => {
    test('should assess post-eligibility needs correctly for single client', () => {
      const needs = assessPostEligibilityNeeds(clientInfo, assets, income, state, 'single');
      
      expect(needs).toHaveProperty('monthlyLiabilityManagement');
      expect(needs).toHaveProperty('annualRedetermination');
      expect(needs).toHaveProperty('assetRetitling');
      expect(needs).toHaveProperty('spousalAllowanceReview');
      expect(needs).toHaveProperty('potentialMove');
      
      // Single client should not need spousal allowance review
      expect(needs.spousalAllowanceReview).toBe(false);
      
      // Should identify basics for all clients
      expect(needs.monthlyLiabilityManagement).toBe(true);
      expect(needs.annualRedetermination).toBe(true);
    });
    
    test('should identify asset retitling needs for married clients with savings', () => {
      const marriedClient = { ...clientInfo, maritalStatus: 'married' };
      
      const needs = assessPostEligibilityNeeds(marriedClient, assets, income, state, 'married');
      
      expect(needs.assetRetitling).toBe(true);
      expect(needs.spousalAllowanceReview).toBe(true);
    });
    
    test('should identify potential move needs when applicable', () => {
      const clientWithPotentialMove = { 
        ...clientInfo, 
        potentialRelocation: true 
      };
      
      const needs = assessPostEligibilityNeeds(clientWithPotentialMove, assets, income, state, 'single');
      
      expect(needs.potentialMove).toBe(true);
    });
    
    test('should handle clients with no countable assets', () => {
      const noCountableAssets = {
        total: 150000,
        countable: 0,
        home: 150000
      };
      
      const needs = assessPostEligibilityNeeds(clientInfo, noCountableAssets, income, state, 'single');
      
      // Should still identify basic needs
      expect(needs.monthlyLiabilityManagement).toBe(true);
      expect(needs.annualRedetermination).toBe(true);
      expect(needs.assetRetitling).toBe(false); // No assets to retitle
    });
    
    test('should handle clients with no income', () => {
      const noIncome = {};
      
      const needs = assessPostEligibilityNeeds(clientInfo, assets, noIncome, state, 'single');
      
      // Should still identify basic needs
      expect(needs.monthlyLiabilityManagement).toBe(false); // No income, no liability
      expect(needs.annualRedetermination).toBe(true);
    });
  });
  
  describe('determinePostEligibilityStrategies', () => {
    test('should recommend basic strategies for all clients', () => {
      const needs = {
        monthlyLiabilityManagement: true,
        annualRedetermination: true,
        assetRetitling: false,
        spousalAllowanceReview: false,
        potentialMove: false
      };
      
      const strategies = determinePostEligibilityStrategies(needs);
      
      expect(strategies).toContain('Set up monthly income tracking and review');
      expect(strategies).toContain('Apply excess income toward patient liability consistently');
      expect(strategies).toContain('Prepare for annual Medicaid redetermination');
    });
    
    test('should recommend asset retitling when needed', () => {
      const needs = {
        monthlyLiabilityManagement: true,
        annualRedetermination: true,
        assetRetitling: true,
        spousalAllowanceReview: false,
        potentialMove: false
      };
      
      const strategies = determinePostEligibilityStrategies(needs);
      
      expect(strategies).toContain('Retitle Community Spouse Resource Allowance (CSRA) assets');
    });
    
    test('should recommend spousal income allowance review when married', () => {
      const needs = {
        monthlyLiabilityManagement: true,
        annualRedetermination: true,
        assetRetitling: true,
        spousalAllowanceReview: true,
        potentialMove: false
      };
      
      const strategies = determinePostEligibilityStrategies(needs);
      
      expect(strategies).toContain('Review and adjust spousal income allowances if necessary');
    });
    
    test('should recommend relocation planning when applicable', () => {
      const needs = {
        monthlyLiabilityManagement: true,
        annualRedetermination: true,
        assetRetitling: false,
        spousalAllowanceReview: false,
        potentialMove: true
      };
      
      const strategies = determinePostEligibilityStrategies(needs);
      
      expect(strategies).toContain('Plan for potential relocation and review new state Medicaid rules');
    });
    
    test('should handle clients with no liability management needs', () => {
      const needs = {
        monthlyLiabilityManagement: false,
        annualRedetermination: true,
        assetRetitling: false,
        spousalAllowanceReview: false,
        potentialMove: false
      };
      
      const strategies = determinePostEligibilityStrategies(needs);
      
      // Should not contain income management strategies
      expect(strategies).not.toContain('Set up monthly income tracking and review');
      expect(strategies).not.toContain('Apply excess income toward patient liability consistently');
      
      // Should still recommend redetermination
      expect(strategies).toContain('Prepare for annual Medicaid redetermination');
    });
  });
  
  describe('planPostEligibilityApproach', () => {
    test('should create detailed plan based on strategies', () => {
      const strategies = [
        'Set up monthly income tracking and review',
        'Apply excess income toward patient liability consistently',
        'Prepare for annual Medicaid redetermination'
      ];
      
      const situation = {
        totalIncome: 2000,
        totalExpenses: 800,
        patientLiability: 1040, // 2000 - (800 + 160 personal needs allowance)
        state: 'florida'
      };
      
      const plan = planPostEligibilityApproach(strategies, situation);
      
      expect(plan).toContain('Monthly Income: $2000.00');
      expect(plan).toContain('Monthly Expenses: $800.00');
      expect(plan).toContain('Estimated Patient Liability: $1040.00');
      expect(plan).toContain('Set up monthly income tracking and review');
      expect(plan).toContain('Apply excess income toward patient liability consistently');
      expect(plan).toContain('Prepare for annual Medicaid redetermination');
    });
    
    test('should include retitling guidance when needed', () => {
      const strategies = [
        'Retitle Community Spouse Resource Allowance (CSRA) assets'
      ];
      
      const situation = {
        totalIncome: 2000,
        totalExpenses: 800,
        patientLiability: 1040,
        state: 'florida'
      };
      
      const plan = planPostEligibilityApproach(strategies, situation);
      
      expect(plan).toContain('Retitle Community Spouse Resource Allowance (CSRA) assets');
      expect(plan).toContain('transition assets to the community spouse');
      expect(plan).toContain('working with an elder law attorney');
    });
    
    test('should include relocation guidance when needed', () => {
      const strategies = [
        'Plan for potential relocation and review new state Medicaid rules'
      ];
      
      const situation = {
        totalIncome: 2000,
        totalExpenses: 800,
        patientLiability: 1040,
        state: 'florida'
      };
      
      const plan = planPostEligibilityApproach(strategies, situation);
      
      expect(plan).toContain('Plan for potential relocation');
      expect(plan).toContain('research Medicaid rules in the new state');
      expect(plan).toContain('prepare for possible changes in eligibility');
    });
  });
  
  describe('medicaidPostEligibilityPlanning', () => {
    test('should complete the post-eligibility planning process successfully', async () => {
      const result = await medicaidPostEligibilityPlanning(clientInfo, assets, income, state, 'single');
      
      expect(result.status).toBe('success');
      expect(result).toHaveProperty('needs');
      expect(result).toHaveProperty('strategies');
      expect(result).toHaveProperty('approach');
      expect(result).toHaveProperty('situation');
    });
    
    test('should handle different marital statuses', async () => {
      const singleResult = await medicaidPostEligibilityPlanning(
        { ...clientInfo, maritalStatus: 'single' },
        assets,
        income,
        state,
        'single'
      );
      
      const marriedResult = await medicaidPostEligibilityPlanning(
        { ...clientInfo, maritalStatus: 'married' },
        assets,
        income,
        state,
        'married'
      );
      
      expect(singleResult.status).toBe('success');
      expect(marriedResult.status).toBe('success');
      
      // Married client should have spousal strategies
      const hasSpousalStrategy = marriedResult.strategies.some(s => 
        s.includes('spousal income allowances')
      );
      expect(hasSpousalStrategy).toBe(true);
      
      // Single client should not have spousal strategies
      const noSpousalStrategy = !singleResult.strategies.some(s => 
        s.includes('spousal income allowances')
      );
      expect(noSpousalStrategy).toBe(true);
    });
    
    test('should handle different states', async () => {
      const flResult = await medicaidPostEligibilityPlanning(
        clientInfo,
        assets,
        income,
        'florida',
        'single'
      );
      
      const caResult = await medicaidPostEligibilityPlanning(
        clientInfo,
        assets,
        income,
        'california',
        'single'
      );
      
      expect(flResult.status).toBe('success');
      expect(caResult.status).toBe('success');
      
      // Approach should mention the correct state
      expect(flResult.approach).toContain('florida');
      expect(caResult.approach).toContain('california');
    });
    
    test('should handle errors gracefully', async () => {
      // Try with null assets to trigger an error
      const result = await medicaidPostEligibilityPlanning(
        clientInfo,
        null,
        income,
        state,
        'single'
      );
      
      expect(result.status).toBe('error');
      expect(result).toHaveProperty('error');
    });
    
    test('should handle clients with relocation needs', async () => {
      const clientWithRelocation = {
        ...clientInfo,
        potentialRelocation: true
      };
      
      const result = await medicaidPostEligibilityPlanning(
        clientWithRelocation,
        assets,
        income,
        state,
        'single'
      );
      
      expect(result.status).toBe('success');
      // Should include relocation strategy
      const hasRelocationStrategy = result.strategies.some(s => 
        s.includes('relocation')
      );
      expect(hasRelocationStrategy).toBe(true);
    });
    
    test('should handle clients with no income', async () => {
      const result = await medicaidPostEligibilityPlanning(
        clientInfo,
        assets,
        {},
        state,
        'single'
      );
      
      expect(result.status).toBe('success');
      // Should not include income management strategies
      const hasIncomeStrategy = result.strategies.some(s => 
        s.includes('income tracking')
      );
      expect(hasIncomeStrategy).toBe(false);
    });
  });
});