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
  
  jest.mock('../../utils/medicaidRulesLoader', () => ({
    loadMedicaidRules: jest.fn().mockResolvedValue({
      florida: {
        incomeLimitSingle: 2901,
        monthlyPersonalNeedsAllowance: 160
      }
    }),
    getIncomeLimit: jest.fn().mockResolvedValue(2901),
    getPersonalNeedsAllowance: jest.fn().mockResolvedValue(160),
    getMmmnaLimits: jest.fn().mockResolvedValue({ min: 2555, max: 3948 })
  }));
  
  jest.mock('../../eligibility/eligibilityUtils', () => ({
    calculateTotalIncome: jest.fn().mockReturnValue(2300)
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
    const rulesData = {
      florida: {
        incomeLimitSingle: 2901,
        monthlyPersonalNeedsAllowance: 160
      }
    };
    
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    describe('assessIncomeSituation', () => {
      test('should assess income situation correctly', async () => {
        const incomeSituation = await assessIncomeSituation(clientInfo, income, state, rulesData);
        
        expect(incomeSituation).toHaveProperty('totalIncome');
        expect(incomeSituation).toHaveProperty('incomeLimit');
        expect(incomeSituation).toHaveProperty('overIncomeLimit');
        expect(incomeSituation.state).toBe('florida');
      });
      
      test('should correctly identify income cap states', async () => {
        const result1 = await assessIncomeSituation(clientInfo, income, 'florida', rulesData);
        expect(result1.isIncomeCapState).toBe(true);
        
        const result2 = await assessIncomeSituation(clientInfo, income, 'california', rulesData);
        expect(result2.isIncomeCapState).toBe(false);
      });
    });
    
    describe('calculateShareOfCost', () => {
      test('should calculate share of cost correctly', async () => {
        const incomeSituation = {
          totalIncome: 2300,
          maritalStatus: 'single'
        };
        
        const result = await calculateShareOfCost(incomeSituation, expenses, state, rulesData);
        
        expect(result).toHaveProperty('shareOfCost');
        expect(result).toHaveProperty('deductions');
        expect(result.deductions).toHaveProperty('personalNeedsAllowance');
        expect(result.deductions).toHaveProperty('healthInsurancePremiums');
      });
      
      test('should include spousal allowance for married clients', async () => {
        const marriedSituation = {
          totalIncome: 2300,
          maritalStatus: 'married',
          spouseIncome: 1000
        };
        
        const result = await calculateShareOfCost(marriedSituation, expenses, state, rulesData);
        
        expect(result.deductions).toHaveProperty('spousalAllowance');
        expect(result.deductions.spousalAllowance).toBeGreaterThan(0);
      });
    });
    
    describe('determineIncomeStrategies', () => {
      test('should recommend Miller Trust for income cap states with excess income', () => {
        const incomeSituation = {
          totalIncome: 3000,
          incomeLimit: 2901,
          overIncomeLimit: true,
          isIncomeCapState: true
        };
        
        const strategies = determineIncomeStrategies(incomeSituation, 2000);
        
        expect(strategies).toContain('Consider Qualified Income Trust (Miller Trust)');
      });
      
      test('should recommend income spend-down for non-cap states', () => {
        const incomeSituation = {
          totalIncome: 3000,
          incomeLimit: 2901,
          overIncomeLimit: true,
          isIncomeCapState: false
        };
        
        const strategies = determineIncomeStrategies(incomeSituation, 2000);
        
        expect(strategies).toContain('Plan for income spend-down on allowable expenses');
      });
      
      test('should include spousal strategies for married clients', () => {
        const incomeSituation = {
          totalIncome: 3000,
          incomeLimit: 2901,
          overIncomeLimit: true,
          isIncomeCapState: true,
          maritalStatus: 'married'
        };
        
        const strategies = determineIncomeStrategies(incomeSituation, 2000);
        
        expect(strategies).toContain('Analyze spousal income allowance');
      });
    });
    
    describe('planIncomeApproach', () => {
      test('should create detailed plan based on strategies', () => {
        const strategies = [
          'Consider Qualified Income Trust (Miller Trust)',
          'Explore ways to increase allowable deductions'
        ];
        
        const incomeSituation = {
          totalIncome: 3000,
          incomeLimit: 2901,
          state: 'florida'
        };
        
        const approach = planIncomeApproach(strategies, incomeSituation, 2000);
        
        expect(approach).toContain('Income Eligibility and Share of Cost Planning Approach');
        expect(approach).toContain('Qualified Income Trust');
        expect(approach).toContain('increase allowable deductions');
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
      
      test('should handle validation errors', async () => {
        // Mock the validateAllInputs function to return invalid
        require('../../validation/inputValidation').validateAllInputs.mockResolvedValueOnce({
          valid: false,
          message: 'Invalid input',
          normalizedData: null
        });
        
        const result = await medicaidIncomePlanning(clientInfo, income, expenses, state);
        
        expect(result.status).toBe('error');
        expect(result).toHaveProperty('error');
      });
      
      test('should handle unexpected errors', async () => {
        // Mock loadMedicaidRules to throw an error
        require('../../utils/medicaidRulesLoader').loadMedicaidRules.mockRejectedValueOnce(
          new Error('Database error')
        );
        
        const result = await medicaidIncomePlanning(clientInfo, income, expenses, state);
        
        expect(result.status).toBe('error');
        expect(result).toHaveProperty('error');
      });
    });
  });