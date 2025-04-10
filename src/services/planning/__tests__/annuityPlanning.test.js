// src/services/planning/__tests__/annuityPlanning.test.js
const {
    assessAnnuitySituation,
    determineAnnuityStrategies,
    planAnnuityApproach,
    medicaidAnnuityPlanning
  } = require('../annuityPlanning');
  
  // Mock the dependencies
  jest.mock('../../../config/logger', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }));
  
  describe('Annuity Planning Module', () => {
    // Sample test data
    const clientInfo = {
      name: 'Test Client',
      age: 75
    };
    
    const assets = {
      countable: 5000,
      ira: 50000,
      qualifiedAccounts: 25000
    };
    
    const state = 'florida';
    
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    describe('assessAnnuitySituation', () => {
      test('should assess annuity situation correctly', () => {
        const situation = assessAnnuitySituation(clientInfo, assets, state);
        
        expect(situation).toHaveProperty('excessAssets');
        expect(situation).toHaveProperty('hasQualifiedAccounts');
        expect(situation.excessAssets).toBe(3000);
        expect(situation.hasQualifiedAccounts).toBe(true);
        expect(situation.state).toBe('florida');
        expect(situation.age).toBe(75);
      });
      
      test('should identify when no qualified accounts exist', () => {
        const assetsWithoutQualified = {
          countable: 5000
        };
        
        const situation = assessAnnuitySituation(clientInfo, assetsWithoutQualified, state);
        
        expect(situation.hasQualifiedAccounts).toBe(false);
      });
    });
    
    describe('determineAnnuityStrategies', () => {
      test('should recommend half-a-loaf with annuity for excess assets', () => {
        const situation = {
          excessAssets: 3000,
          hasQualifiedAccounts: false,
          state: 'florida'
        };
        
        const strategies = determineAnnuityStrategies(situation);
        
        expect(strategies).toContain('Evaluate half-a-loaf strategy with annuity');
        expect(strategies).toContain('Consider promissory note strategy');
      });
      
      test('should recommend Qualified SPIA when qualified accounts exist', () => {
        const situation = {
          excessAssets: 3000,
          hasQualifiedAccounts: true,
          state: 'florida'
        };
        
        const strategies = determineAnnuityStrategies(situation);
        
        expect(strategies).toContain('Assess Qualified Medicaid SPIA options');
      });
      
      test('should include Texas-specific strategy for Texas clients', () => {
        const situation = {
          excessAssets: 3000,
          hasQualifiedAccounts: true,
          state: 'tx'
        };
        
        const strategies = determineAnnuityStrategies(situation);
        
        expect(strategies).toContain('Explore Qualified Deferred Annuities option');
      });
    });
    
    describe('planAnnuityApproach', () => {
      test('should create detailed plan based on strategies', () => {
        const strategies = [
          'Evaluate half-a-loaf strategy with annuity',
          'Consider promissory note strategy'
        ];
        
        const situation = {
          excessAssets: 3000,
          hasQualifiedAccounts: false,
          state: 'florida',
          age: 75
        };
        
        const approach = planAnnuityApproach(strategies, situation);
        
        expect(approach).toContain('Annuity and Promissory Note Planning Approach');
        expect(approach).toContain('Consider gifting half of the excess assets');
        expect(approach).toContain('Evaluate using a promissory note');
      });
      
      test('should include SPIA planning when recommended', () => {
        const strategies = [
          'Assess Qualified Medicaid SPIA options'
        ];
        
        const situation = {
          excessAssets: 3000,
          hasQualifiedAccounts: true,
          state: 'florida',
          age: 75
        };
        
        const approach = planAnnuityApproach(strategies, situation);
        
        expect(approach).toContain('Explore options for a Single Premium Immediate Annuity');
        expect(approach).toContain('Given the client\'s age (75)');
      });
    });
    
    describe('medicaidAnnuityPlanning', () => {
      test('should complete the annuity planning process successfully', async () => {
        const result = await medicaidAnnuityPlanning(clientInfo, assets, state);
        
        expect(result.status).toBe('success');
        expect(result).toHaveProperty('situation');
        expect(result).toHaveProperty('strategies');
        expect(result).toHaveProperty('approach');
      });
      
      test('should handle errors gracefully', async () => {
        // Create a situation that will cause an error
        const invalidAssets = null;
        
        const result = await medicaidAnnuityPlanning(clientInfo, invalidAssets, state);
        
        expect(result.status).toBe('error');
        expect(result).toHaveProperty('error');
      });
    });
  });