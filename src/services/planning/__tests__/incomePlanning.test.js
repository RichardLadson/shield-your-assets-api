// src/services/planning/__tests__/incomePlanning.test.js
const {
  assessIncomeSituation,
  calculateShareOfCost,
  determineIncomeStrategies,
  planIncomeApproach,
  medicaidIncomePlanning
} = require('../incomePlanning');

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
      income: { social_security: 1500, pension: 800 },
      expenses: { health_insurance: 200, housing: 1000 },
      state: 'florida'
    }
  })
}));

// Mock the medicaid rules loader with actual state data structure
jest.mock('../../utils/medicaidRulesLoader', () => ({
  getIncomeLimit: jest.fn().mockResolvedValue(2901),
  getPersonalNeedsAllowance: jest.fn().mockResolvedValue(160),
  getMmmnaLimits: jest.fn().mockResolvedValue({ min: 2555, max: 3948 }),
  loadMedicaidRules: jest.fn().mockResolvedValue({
    florida: {
      incomeLimitSingle: 2901,
      incomeLimitMarried: 5802,
      monthlyPersonalNeedsAllowance: 160,
      hasIncomeTrust: true,
      incomeTrustName: 'Miller Trust',
      monthlyMaintenanceNeedsAllowanceMin: 2555,
      monthlyMaintenanceNeedsAllowanceMax: 3948,
      housingMaintenanceLimit: 200
    },
    california: {
      incomeLimitSingle: 1561,
      incomeLimitMarried: 2106,
      monthlyPersonalNeedsAllowance: 130,
      hasIncomeTrust: false
    }
  })
}));

// Mock the eligibility utils
jest.mock('../../eligibility/eligibilityUtils', () => ({
  calculateTotalIncome: jest.fn().mockImplementation(income => {
    if (typeof income === 'object' && income !== null) {
      return Object.values(income).reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);
    }
    return 0;
  })
}));

describe('Income Planning Module', () => {
  // Sample test data
  const clientInfo = {
    name: 'Test Client',
    age: 75,
    maritalStatus: 'single'
  };
  
  const income = {
    social_security: 1500,
    pension: 800
  };
  
  const expenses = {
    health_insurance: 200,
    housing: 1000
  };
  
  const state = 'florida';
  
  // Mock rules data for tests
  const rulesData = {
    florida: {
      incomeLimitSingle: 2901,
      incomeLimitMarried: 5802,
      monthlyPersonalNeedsAllowance: 160,
      hasIncomeTrust: true,
      incomeTrustName: 'Miller Trust',
      monthlyMaintenanceNeedsAllowanceMin: 2555,
      monthlyMaintenanceNeedsAllowanceMax: 3948,
      housingMaintenanceLimit: 200
    },
    california: {
      incomeLimitSingle: 1561,
      incomeLimitMarried: 2106,
      monthlyPersonalNeedsAllowance: 130,
      hasIncomeTrust: false
    }
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('assessIncomeSituation', () => {
    test('should assess income situation correctly', async () => {
      const incomeSituation = await assessIncomeSituation(clientInfo, income, state, rulesData);
      
      expect(incomeSituation).toHaveProperty('totalIncome');
      expect(incomeSituation).toHaveProperty('isIncomeCapState');
      expect(incomeSituation).toHaveProperty('incomeLimit');
      expect(incomeSituation).toHaveProperty('maritalStatus');
      expect(incomeSituation).toHaveProperty('incomeSources');
      expect(incomeSituation).toHaveProperty('overIncomeLimit');
      expect(incomeSituation).toHaveProperty('state');
      
      expect(incomeSituation.totalIncome).toBe(2300);
      expect(incomeSituation.incomeLimit).toBe(2901);
      expect(incomeSituation.overIncomeLimit).toBe(false);
    });
    
    test('should correctly identify income cap states', async () => {
      const flResult = await assessIncomeSituation(clientInfo, income, 'florida', rulesData);
      const caResult = await assessIncomeSituation(clientInfo, income, 'california', rulesData);
      
      expect(flResult.isIncomeCapState).toBe(true); // Florida is a cap state
      expect(caResult.isIncomeCapState).toBe(false); // California is not a cap state
    });
    
    test('should assess over-income status correctly with different income levels', async () => {
      const lowIncome = {
        social_security: 1000,
        pension: 500
      };
      
      const highIncome = {
        social_security: 2000,
        pension: 1500
      };
      
      const lowIncomeResult = await assessIncomeSituation(clientInfo, lowIncome, state, rulesData);
      const highIncomeResult = await assessIncomeSituation(clientInfo, highIncome, state, rulesData);
      
      expect(lowIncomeResult.totalIncome).toBe(1500);
      expect(lowIncomeResult.overIncomeLimit).toBe(false);
      
      expect(highIncomeResult.totalIncome).toBe(3500);
      expect(highIncomeResult.overIncomeLimit).toBe(true);
    });
    
    test('should apply different income limits for different marital statuses', async () => {
      const singleClientInfo = { ...clientInfo, maritalStatus: 'single' };
      const marriedClientInfo = { ...clientInfo, maritalStatus: 'married' };
      
      const singleResult = await assessIncomeSituation(singleClientInfo, income, state, rulesData);
      const marriedResult = await assessIncomeSituation(marriedClientInfo, income, state, rulesData);
      
      expect(singleResult.incomeLimit).toBe(2901);
      expect(marriedResult.incomeLimit).toBe(5802);
    });
  });
  
  describe('calculateShareOfCost', () => {
    test('should calculate share of cost correctly for single client', async () => {
      const incomeSituation = {
        totalIncome: 2300,
        maritalStatus: 'single'
      };
      
      const result = await calculateShareOfCost(incomeSituation, expenses, state, rulesData.florida);
      
      expect(result).toHaveProperty('shareOfCost');
      expect(result).toHaveProperty('deductions');
      expect(result).toHaveProperty('totalDeductions');
      
      // Expected deductions: personal needs allowance ($160) + health insurance ($200) + limited housing ($200)
      expect(result.deductions.personalNeedsAllowance).toBe(160);
      expect(result.deductions.healthInsurancePremiums).toBe(200);
      expect(result.deductions.housingMaintenance).toBe(200); // Housing is capped
      
      // Expected total deductions: $560
      expect(result.totalDeductions).toBe(560);
      
      // Expected share of cost: income - deductions = $2300 - $560 = $1740
      expect(result.shareOfCost).toBe(1740);
    });
    
    test('should include spousal allowance for married clients', async () => {
      const marriedIncomeSituation = {
        totalIncome: 2300,
        maritalStatus: 'married',
        spouseIncome: 1000,
        spouseInFacility: false
      };
      
      const result = await calculateShareOfCost(marriedIncomeSituation, expenses, state, rulesData.florida);
      
      expect(result.deductions).toHaveProperty('spousalAllowance');
      
      // Expected spousal allowance: min MMMNA - spouse income = $2555 - $1000 = $1555
      expect(result.deductions.spousalAllowance).toBe(1555);
      
      // Total deductions should include spousal allowance
      expect(result.totalDeductions).toBeGreaterThan(560); // More than single client deductions
      expect(result.totalDeductions).toBe(2115); // 560 + 1555
      
      // Share of cost should account for spousal allowance
      expect(result.shareOfCost).toBe(185); // 2300 - 2115
    });
    
    test('should handle zero expenses gracefully', async () => {
      const incomeSituation = {
        totalIncome: 2300,
        maritalStatus: 'single'
      };
      
      const emptyExpenses = {};
      
      const result = await calculateShareOfCost(incomeSituation, emptyExpenses, state, rulesData.florida);
      
      // Should still include personal needs allowance
      expect(result.deductions.personalNeedsAllowance).toBe(160);
      expect(result.totalDeductions).toBe(160);
      expect(result.shareOfCost).toBe(2140); // 2300 - 160
    });
  });
  
  describe('determineIncomeStrategies', () => {
    test('should recommend Miller Trust for income cap states with excess income', () => {
      const incomeSituation = {
        totalIncome: 3500,
        incomeLimit: 2901,
        exceedsLimit: true,
        isIncomeCapState: true
      };
      
      const strategies = determineIncomeStrategies(incomeSituation, 1740);
      
      expect(strategies).toContain('Consider Qualified Income Trust (Miller Trust)');
    });
    
    test('should recommend income spend-down for non-cap states', () => {
      const incomeSituation = {
        totalIncome: 3500,
        incomeLimit: 2901,
        exceedsLimit: true,
        isIncomeCapState: false
      };
      
      const strategies = determineIncomeStrategies(incomeSituation, 1740);
      
      expect(strategies).toContain('Plan for income spend-down on allowable expenses');
    });
    
    test('should recommend deduction increase strategies when share of cost is high', () => {
      const incomeSituation = {
        totalIncome: 2500,
        incomeLimit: 2901,
        exceedsLimit: false,
        isIncomeCapState: true
      };
      
      const highShareOfCost = 2000;
      
      const strategies = determineIncomeStrategies(incomeSituation, highShareOfCost);
      
      expect(strategies).toContain('Explore ways to increase allowable deductions');
      expect(strategies).toContain('Consider increasing health insurance premiums');
    });
    
    test('should include spousal strategies for married clients', () => {
      const incomeSituation = {
        totalIncome: 3500,
        incomeLimit: 5802,
        exceedsLimit: false,
        isIncomeCapState: true,
        maritalStatus: 'married'
      };
      
      const strategies = determineIncomeStrategies(incomeSituation, 2000);
      
      expect(strategies).toContain('Analyze spousal income allowance');
    });
    
    test('should recommend minimal strategies when income is within limits', () => {
      const incomeSituation = {
        totalIncome: 2300,
        incomeLimit: 2901,
        exceedsLimit: false,
        isIncomeCapState: true
      };
      
      const lowShareOfCost = 500;
      
      const strategies = determineIncomeStrategies(incomeSituation, lowShareOfCost);
      
      // Should still include some basic recommendations
      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies).toContain('Review spend-down opportunities, such as pre-paid funeral or home modifications');
    });
  });
  
  describe('planIncomeApproach', () => {
    test('should develop detailed planning approach based on strategies', () => {
      const strategies = [
        'Consider Qualified Income Trust (Miller Trust)',
        'Explore ways to increase allowable deductions'
      ];
      
      const incomeSituation = {
        totalIncome: 3500,
        incomeLimit: 2901,
        exceedsLimit: true,
        state: 'FLORIDA'
      };
      
      const shareOfCost = 2000;
      
      const approach = planIncomeApproach(strategies, incomeSituation, shareOfCost);
      
      expect(approach).toContain('Income Eligibility and Share of Cost Planning Approach');
      expect(approach).toContain('Total Income: $3500.00');
      expect(approach).toContain('Income Limit: $2901.00');
      expect(approach).toContain('Calculated Share of Cost: $2000.00');
      
      // Check for content related to Miller Trust
      expect(approach).toContain('Qualified Income Trust');
      
      // State name should be in lowercase for the output
      expect(approach).toContain('florida');
      
      // Should have general reminder
      expect(approach).toContain('Review all possible deductions');
    });
    
    test('should include appropriate recommendations for income spend-down', () => {
      const strategies = [
        'Plan for income spend-down on allowable expenses'
      ];
      
      const incomeSituation = {
        totalIncome: 3500,
        incomeLimit: 2901,
        exceedsLimit: true,
        state: 'CALIFORNIA'
      };
      
      const shareOfCost = 2000;
      
      const approach = planIncomeApproach(strategies, incomeSituation, shareOfCost);
      
      expect(approach).toContain('Develop a plan to spend down excess income on allowable expenses');
    });
    
    test('should include spousal allowance guidance when applicable', () => {
      const strategies = [
        'Analyze spousal income allowance',
        'Consider fair hearing for increased MMNA if needed'
      ];
      
      const incomeSituation = {
        totalIncome: 4000,
        incomeLimit: 5802,
        exceedsLimit: false,
        state: 'FLORIDA',
        maritalStatus: 'married'
      };
      
      const shareOfCost = 1500;
      
      const approach = planIncomeApproach(strategies, incomeSituation, shareOfCost);
      
      expect(approach).toContain('Calculate and optimize spousal income allowance');
      expect(approach).toContain('fair hearing');
    });
  });
  
  describe('medicaidIncomePlanning', () => {
    test('should complete the income planning process successfully', async () => {
      const result = await medicaidIncomePlanning(clientInfo, income, expenses, state);
      
      expect(result.status).toBe('success');
      expect(result).toHaveProperty('incomeSituation');
      expect(result).toHaveProperty('shareOfCost');
      expect(result).toHaveProperty('deductions');
      expect(result).toHaveProperty('incomeStrategies');
      expect(result).toHaveProperty('incomeApproach');
    });
    
    test('should handle validation failures', async () => {
      // Test with empty income object - should be considered invalid
      const emptyIncome = {};
      
      const result = await medicaidIncomePlanning(clientInfo, emptyIncome, expenses, state);
      
      expect(result.status).toBe('error');
      expect(result.error).toContain('Invalid income data');
    });
    
    test('should handle errors in rules loading', async () => {
      // Test with special 'error' state value that triggers the database error
      const result = await medicaidIncomePlanning(clientInfo, income, expenses, 'error');
      
      expect(result.status).toBe('error');
      expect(result.error).toContain('Database connection error');
    });
    
    test('should process different states correctly', async () => {
      const flResult = await medicaidIncomePlanning(clientInfo, income, expenses, 'florida');
      const caResult = await medicaidIncomePlanning(clientInfo, income, expenses, 'california');
      
      expect(flResult.status).toBe('success');
      expect(caResult.status).toBe('success');
    });
    
    test('should handle different marital statuses', async () => {
      const singleClient = { ...clientInfo, maritalStatus: 'single' };
      const marriedClient = { ...clientInfo, maritalStatus: 'married' };
      
      const singleResult = await medicaidIncomePlanning(singleClient, income, expenses, state);
      const marriedResult = await medicaidIncomePlanning(marriedClient, income, expenses, state);
      
      expect(singleResult.status).toBe('success');
      expect(marriedResult.status).toBe('success');
    });
    
    test('should handle high income scenarios correctly', async () => {
      const highIncome = {
        social_security: 2000,
        pension: 1500
      };
      
      const result = await medicaidIncomePlanning(clientInfo, highIncome, expenses, state);
      
      expect(result.status).toBe('success');
      expect(result.incomeSituation.overIncomeLimit).toBe(true);
      
      // Since Florida is configured as an income cap state in our mocks,
      // and the income exceeds the limit, it should recommend a Miller Trust
      const hasTrustStrategy = result.incomeStrategies.some(strategy => 
        strategy.includes('Qualified Income Trust') || strategy.includes('Miller Trust')
      );
      expect(hasTrustStrategy).toBe(true);
    });
  });
});