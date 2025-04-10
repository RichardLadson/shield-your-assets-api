// src/services/planning/__tests__/relatedBenefits.test.js
const {
    assessBenefitEligibility,
    determineBenefitStrategies,
    planBenefitApproach,
    medicaidRelatedBenefitsPlanning
  } = require('../relatedBenefits');
  
  // Mock the dependencies
  jest.mock('../../../config/logger', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }));
  
  describe('Related Benefits Planning Module', () => {
    // Sample test data
    const clientInfo = {
      name: 'Test Client',
      age: 75,
      veteran: true,
      hasLTCInsurance: false,
      needsHomeCare: true,
      needsNursingHomeCare: false
    };
    
    const assets = {
      countable: 5000,
      non_countable: 150000
    };
    
    const income = {
      social_security: 1200,
      pension: 800
    };
    
    const state = 'florida';
    
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    describe('assessBenefitEligibility', () => {
      test('should assess benefit eligibility correctly', () => {
        const eligibility = assessBenefitEligibility(clientInfo, assets, income, state);
        
        expect(eligibility).toHaveProperty('socialSecurity');
        expect(eligibility).toHaveProperty('vaImprovedPension');
        expect(eligibility).toHaveProperty('ltcInsurance');
        expect(eligibility).toHaveProperty('medicareSavingsProgram');
        expect(eligibility).toHaveProperty('hcbsWaiver');
        expect(eligibility).toHaveProperty('pace');
        expect(eligibility.socialSecurity).toBe(true);
        expect(eligibility.vaImprovedPension).toBe(true);
        expect(eligibility.ltcInsurance).toBe(false);
        expect(eligibility.hcbsWaiver).toBe(true);
      });
      
      test('should identify PACE eligibility for older clients needing nursing home care', () => {
        const clientWithNursingHome = {
          ...clientInfo,
          needsNursingHomeCare: true
        };
        
        const eligibility = assessBenefitEligibility(clientWithNursingHome, assets, income, state);
        
        expect(eligibility.pace).toBe(true);
      });
      
      test('should correctly identify Medicare Savings Program eligibility', () => {
        const highIncome = {
          social_security: 1800,
          pension: 1200
        };
        
        const eligibility1 = assessBenefitEligibility(clientInfo, assets, income, state);
        const eligibility2 = assessBenefitEligibility(clientInfo, assets, highIncome, state);
        
        expect(eligibility1.medicareSavingsProgram).toBe(true);
        expect(eligibility2.medicareSavingsProgram).toBe(false);
      });
    });
    
    describe('determineBenefitStrategies', () => {
      test('should recommend VA benefits for veterans', () => {
        const eligibility = {
          socialSecurity: true,
          vaImprovedPension: true,
          ltcInsurance: false,
          medicareSavingsProgram: true,
          hcbsWaiver: true,
          pace: false
        };
        
        const strategies = determineBenefitStrategies(eligibility);
        
        expect(strategies).toContain('Explore VA Improved Pension eligibility and application');
      });
      
      test('should recommend LTC insurance coordination when applicable', () => {
        const eligibility = {
          socialSecurity: true,
          vaImprovedPension: false,
          ltcInsurance: true,
          medicareSavingsProgram: true,
          hcbsWaiver: true,
          pace: false
        };
        
        const strategies = determineBenefitStrategies(eligibility);
        
        expect(strategies).toContain('Coordinate long-term care insurance benefits with Medicaid planning');
      });
      
      test('should recommend Medicare Savings Program when eligible', () => {
        const eligibility = {
          socialSecurity: true,
          vaImprovedPension: false,
          ltcInsurance: false,
          medicareSavingsProgram: true,
          hcbsWaiver: false,
          pace: false
        };
        
        const strategies = determineBenefitStrategies(eligibility);
        
        expect(strategies).toContain('Apply for an appropriate Medicare Savings Program');
      });
      
      test('should recommend HCBS waiver when applicable', () => {
        const eligibility = {
          socialSecurity: true,
          vaImprovedPension: false,
          ltcInsurance: false,
          medicareSavingsProgram: false,
          hcbsWaiver: true,
          pace: false
        };
        
        const strategies = determineBenefitStrategies(eligibility);
        
        expect(strategies).toContain('Investigate Home and Community Based Services waiver programs');
      });
      
      test('should recommend PACE when eligible', () => {
        const eligibility = {
          socialSecurity: true,
          vaImprovedPension: false,
          ltcInsurance: false,
          medicareSavingsProgram: false,
          hcbsWaiver: false,
          pace: true
        };
        
        const strategies = determineBenefitStrategies(eligibility);
        
        expect(strategies).toContain('Explore PACE (Program of All-inclusive Care for the Elderly)');
      });
    });
    
    describe('planBenefitApproach', () => {
      test('should create detailed plan based on strategies', () => {
        const strategies = [
          'Explore VA Improved Pension eligibility and application',
          'Apply for an appropriate Medicare Savings Program',
          'Investigate Home and Community Based Services waiver programs'
        ];
        
        const eligibility = {
          socialSecurity: true,
          vaImprovedPension: true,
          ltcInsurance: false,
          medicareSavingsProgram: true,
          hcbsWaiver: true,
          pace: false
        };
        
        const approach = planBenefitApproach(strategies, eligibility);
        
        expect(approach).toContain('Related Benefits Planning Approach');
        expect(approach).toContain('Veterans Benefits');
        expect(approach).toContain('Medicare Savings Programs');
        expect(approach).toContain('Home and Community Based Services Waivers');
        expect(approach).toContain('Next Steps');
      });
      
      test('should include LTC insurance guidance when applicable', () => {
        const strategies = [
          'Coordinate long-term care insurance benefits with Medicaid planning'
        ];
        
        const eligibility = {
          socialSecurity: true,
          vaImprovedPension: false,
          ltcInsurance: true,
          medicareSavingsProgram: false,
          hcbsWaiver: false,
          pace: false
        };
        
        const approach = planBenefitApproach(strategies, eligibility);
        
        expect(approach).toContain('Long-Term Care Insurance Coordination');
        expect(approach).toContain('Review policy benefits and elimination periods');
      });
      
      test('should include PACE guidance when applicable', () => {
        const strategies = [
          'Explore PACE (Program of All-inclusive Care for the Elderly)'
        ];
        
        const eligibility = {
          socialSecurity: true,
          vaImprovedPension: false,
          ltcInsurance: false,
          medicareSavingsProgram: false,
          hcbsWaiver: false,
          pace: true
        };
        
        const approach = planBenefitApproach(strategies, eligibility);
        
        expect(approach).toContain('Program of All-inclusive Care for the Elderly (PACE)');
        expect(approach).toContain('Determine if PACE is available in the client\'s area');
      });
    });
    
    describe('medicaidRelatedBenefitsPlanning', () => {
      test('should complete the related benefits planning process successfully', async () => {
        const result = await medicaidRelatedBenefitsPlanning(clientInfo, assets, income, state);
        
        expect(result.status).toBe('success');
        expect(result).toHaveProperty('eligibility');
        expect(result).toHaveProperty('strategies');
        expect(result).toHaveProperty('approach');
      });
      
      test('should handle errors gracefully', async () => {
        // Create a situation that will cause an error
        const invalidAssets = null;
        
        const result = await medicaidRelatedBenefitsPlanning(clientInfo, invalidAssets, income, state);
        
        expect(result.status).toBe('error');
        expect(result).toHaveProperty('error');
      });
    });
  });