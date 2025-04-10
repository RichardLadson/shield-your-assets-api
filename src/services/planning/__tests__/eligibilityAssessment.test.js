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
  
  describe('Eligibility Assessment Module', () => {
    // Sample test data
    const clientInfo = {
      name: 'Test Client',
      age: 75
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
    const maritalStatus = 'single';
    
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    describe('assessEligibility', () => {
      test('should assess eligibility correctly for a single client', () => {
        const eligibility = assessEligibility(clientInfo, assets, income, state, 'single');
        
        expect(eligibility).toHaveProperty('isResourceEligible');
        expect(eligibility).toHaveProperty('spenddownAmount');
        expect(eligibility).toHaveProperty('isIncomeEligible');
        expect(eligibility.spenddownAmount).toBe(3000); // 5000 - 2000
      });
      
      test('should use different resource limit for married clients', () => {
        const eligibility = assessEligibility(clientInfo, assets, income, state, 'married');
        
        expect(eligibility.resourceLimit).toBe(3000);
        expect(eligibility.spenddownAmount).toBe(2000); // 5000 - 3000
      });
      
      test('should calculate income eligibility correctly', () => {
        const incomeBelowLimit = {
          social_security: 1000,
          pension: 500
        };
        
        const incomeAboveLimit = {
          social_security: 2000,
          pension: 1500
        };
        
        const eligibility1 = assessEligibility(clientInfo, assets, incomeBelowLimit, state, 'single');
        const eligibility2 = assessEligibility(clientInfo, assets, incomeAboveLimit, state, 'single');
        
        expect(eligibility1.isIncomeEligible).toBe(true);
        expect(eligibility2.isIncomeEligible).toBe(false);
      });
    });
    
    describe('determineEligibilityStrategies', () => {
      test('should recommend spend-down for excess resources', () => {
        const eligibilityResult = {
          isResourceEligible: false,
          spenddownAmount: 3000,
          isIncomeEligible: true
        };
        
        const strategies = determineEligibilityStrategies(eligibilityResult);
        
        expect(strategies).toContain('Reduce countable assets by $3000.00');
        expect(strategies).toContain('Convert countable assets to exempt assets');
      });
      
      test('should recommend income management for excess income', () => {
        const eligibilityResult = {
          isResourceEligible: true,
          spenddownAmount: 0,
          isIncomeEligible: false
        };
        
        const strategies = determineEligibilityStrategies(eligibilityResult);
        
        expect(strategies).toContain('Evaluate income management strategies');
        expect(strategies).toContain('Consider Qualified Income Trust (Miller Trust)');
      });
      
      test('should not recommend strategies if eligible', () => {
        const eligibilityResult = {
          isResourceEligible: true,
          spenddownAmount: 0,
          isIncomeEligible: true
        };
        
        const strategies = determineEligibilityStrategies(eligibilityResult);
        
        expect(strategies.length).toBe(0);
      });
    });
    
    describe('planEligibilityApproach', () => {
      test('should create detailed plan based on strategies', () => {
        const strategies = [
          'Reduce countable assets by $3000.00',
          'Convert countable assets to exempt assets'
        ];
        
        const eligibilityResult = {
          isResourceEligible: false,
          spenddownAmount: 3000,
          isIncomeEligible: true,
          totalIncome: 2300,
          incomeLimit: 2901,
          resourceLimit: 2000
        };
        
        const approach = planEligibilityApproach(strategies, eligibilityResult);
        
        expect(approach).toContain('Medicaid Eligibility Assessment');
        expect(approach).toContain('Resource Limit: $2000.00');
        expect(approach).toContain('Spenddown Amount Needed: $3000.00');
        expect(approach).toContain('Reduce countable assets by $3000.00');
      });
      
      test('should include both resource and income sections', () => {
        const strategies = [
          'Reduce countable assets by $3000.00',
          'Evaluate income management strategies'
        ];
        
        const eligibilityResult = {
          isResourceEligible: false,
          spenddownAmount: 3000,
          isIncomeEligible: false,
          totalIncome: 3500,
          incomeLimit: 2901,
          resourceLimit: 2000
        };
        
        const approach = planEligibilityApproach(strategies, eligibilityResult);
        
        expect(approach).toContain('Resource Eligibility');
        expect(approach).toContain('Income Eligibility');
        expect(approach).toContain('Income Limit: $2901.00');
        expect(approach).toContain('Total Income: $3500.00');
      });
    });
    
    describe('medicaidEligibilityAssessment', () => {
      test('should complete the eligibility assessment process successfully', async () => {
        const result = await medicaidEligibilityAssessment(clientInfo, assets, income, state, maritalStatus);
        
        expect(result.status).toBe('success');
        expect(result).toHaveProperty('eligibilityResult');
        expect(result).toHaveProperty('eligibilityStrategies');
        expect(result).toHaveProperty('eligibilityPlan');
      });
      
      test('should handle errors gracefully', async () => {
        // Create a situation that will cause an error
        const invalidIncome = null;
        
        const result = await medicaidEligibilityAssessment(clientInfo, assets, invalidIncome, state, maritalStatus);
        
        expect(result.status).toBe('error');
        expect(result).toHaveProperty('error');
      });
    });
  });