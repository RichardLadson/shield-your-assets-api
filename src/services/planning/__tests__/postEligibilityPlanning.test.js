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
  
  describe('Post-Eligibility Planning Module', () => {
    // Sample test data
    const clientInfo = {
      name: 'Test Client',
      age: 75,
      consideringMove: false
    };
    
    const assets = {
      savings: 1500,
      bank: 500
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
    
    describe('assessPostEligibilityNeeds', () => {
      test('should assess post-eligibility needs correctly for single client', () => {
        const needs = assessPostEligibilityNeeds(clientInfo, assets, income, state, 'single');
        
        expect(needs).toHaveProperty('monthlyLiabilityManagement');
        expect(needs).toHaveProperty('annualRedetermination');
        expect(needs).toHaveProperty('assetRetitling');
        expect(needs).toHaveProperty('estatePlanUpdate');
        expect(needs).toHaveProperty('spousalAllowanceReview');
        expect(needs).toHaveProperty('potentialMove');
        expect(needs.monthlyLiabilityManagement).toBe(true);
        expect(needs.spousalAllowanceReview).toBe(false);
        expect(needs.potentialMove).toBe(false);
      });
      
      test('should identify asset retitling needs for married clients with savings', () => {
        const needs = assessPostEligibilityNeeds(clientInfo, assets, income, state, 'married');
        
        expect(needs.assetRetitling).toBe(true);
        expect(needs.spousalAllowanceReview).toBe(true);
      });
      
      test('should identify potential move when applicable', () => {
        const clientInfoWithMove = {
          ...clientInfo,
          consideringMove: true
        };
        
        const needs = assessPostEligibilityNeeds(clientInfoWithMove, assets, income, state, 'single');
        
        expect(needs.potentialMove).toBe(true);
      });
    });
    
    describe('determinePostEligibilityStrategies', () => {
      test('should recommend basic strategies for all clients', () => {
        const needs = {
          monthlyLiabilityManagement: true,
          annualRedetermination: true,
          assetRetitling: false,
          estatePlanUpdate: true,
          spousalAllowanceReview: false,
          potentialMove: false
        };
        
        const strategies = determinePostEligibilityStrategies(needs);
        
        expect(strategies).toContain('Set up a system for managing monthly liabilities and income reporting');
        expect(strategies).toContain('Prepare for the annual Medicaid redetermination process');
        expect(strategies).toContain('Update estate plans in consultation with an elder law attorney');
        expect(strategies).toContain('Establish a system for tracking and reporting changes in client circumstances');
      });
      
      test('should recommend asset retitling when needed', () => {
        const needs = {
          monthlyLiabilityManagement: true,
          annualRedetermination: true,
          assetRetitling: true,
          estatePlanUpdate: true,
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
          estatePlanUpdate: true,
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
          estatePlanUpdate: true,
          spousalAllowanceReview: false,
          potentialMove: true
        };
        
        const strategies = determinePostEligibilityStrategies(needs);
        
        expect(strategies).toContain('Plan for potential relocation and review new state Medicaid rules');
      });
    });
    
    describe('planPostEligibilityApproach', () => {
      test('should create detailed plan based on strategies', () => {
        const strategies = [
          'Set up a system for managing monthly liabilities and income reporting',
          'Prepare for the annual Medicaid redetermination process',
          'Update estate plans in consultation with an elder law attorney'
        ];
        
        const approach = planPostEligibilityApproach(strategies);
        
        expect(approach).toContain('Post-Eligibility Management Approach');
        expect(approach).toContain('system for managing monthly patient liabilities');
        expect(approach).toContain('annual Medicaid redetermination');
        expect(approach).toContain('Update estate plans');
        expect(approach).toContain('Ongoing Monitoring');
      });
      
      test('should include asset retitling guidance when applicable', () => {
        const strategies = [
          'Retitle Community Spouse Resource Allowance (CSRA) assets'
        ];
        
        const approach = planPostEligibilityApproach(strategies);
        
        expect(approach).toContain('Retitle assets according to the approved Community Spouse Resource Allowance');
        expect(approach).toContain('Transfer assets to the community spouse\'s name only');
      });
      
      test('should include relocation planning when applicable', () => {
        const strategies = [
          'Plan for potential relocation and review new state Medicaid rules'
        ];
        
        const approach = planPostEligibilityApproach(strategies);
        
        expect(approach).toContain('Plan carefully for any potential relocation');
        expect(approach).toContain('Research Medicaid rules in the new state before moving');
      });
    });
    
    describe('medicaidPostEligibilityPlanning', () => {
      test('should complete the post-eligibility planning process successfully', async () => {
        const result = await medicaidPostEligibilityPlanning(clientInfo, assets, income, state, maritalStatus);
        
        expect(result.status).toBe('success');
        expect(result).toHaveProperty('needs');
        expect(result).toHaveProperty('strategies');
        expect(result).toHaveProperty('approach');
      });
      
      test('should handle errors gracefully', async () => {
        // Create a situation that will cause an error
        const invalidAssets = null;
        
        const result = await medicaidPostEligibilityPlanning(clientInfo, invalidAssets, income, state, maritalStatus);
        
        expect(result.status).toBe('error');
        expect(result).toHaveProperty('error');
      });
    });
  });