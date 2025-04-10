// src/services/planning/__tests__/divestmentPlanning.test.js
const {
    assessDivestmentSituation,
    determineDivestmentStrategies,
    planDivestmentApproach,
    medicaidDivestmentPlanning
  } = require('../divestmentPlanning');
  
  // Mock the dependencies
  jest.mock('../../../config/logger', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }));
  
  describe('Divestment Planning Module', () => {
    // Sample test data
    const clientInfo = {
      name: 'Test Client',
      age: 75
    };
    
    const assets = {
      countable: 5000,
      home: 150000,
      primary_residence: 0
    };
    
    const state = 'florida';
    
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    describe('assessDivestmentSituation', () => {
      test('should assess divestment situation correctly', () => {
        const situation = assessDivestmentSituation(assets, state);
        
        expect(situation).toHaveProperty('totalAssets');
        expect(situation).toHaveProperty('countableAssets');
        expect(situation).toHaveProperty('excessAssets');
        expect(situation).toHaveProperty('averageNursingHomeCost');
        expect(situation.excessAssets).toBe(3000);
        expect(situation.state).toBe('florida');
      });
      
      test('should calculate countable assets correctly', () => {
        const assetsWithPrimaryResidence = {
          countable: 0,
          home: 0,
          primary_residence: 150000,
          bank: 5000
        };
        
        const situation = assessDivestmentSituation(assetsWithPrimaryResidence, state);
        
        expect(situation.countableAssets).toBe(5000);
        expect(situation.totalAssets).toBe(155000);
      });
    });
    
    describe('determineDivestmentStrategies', () => {
      test('should recommend divestment strategies for excess assets', () => {
        const situation = {
          excessAssets: 3000,
          state: 'florida'
        };
        
        const strategies = determineDivestmentStrategies(situation);
        
        expect(strategies).toContain('Evaluate Modern Half-a-Loaf with Annuity/Promissory Note');
        expect(strategies).toContain('Consider Reverse Half-a-Loaf strategy');
      });
      
      test('should not recommend strategies when no excess assets', () => {
        const situation = {
          excessAssets: 0,
          state: 'florida'
        };
        
        const strategies = determineDivestmentStrategies(situation);
        
        expect(strategies.length).toBe(0);
      });
    });
    
    describe('planDivestmentApproach', () => {
      test('should create detailed plan based on strategies', () => {
        const strategies = [
          'Evaluate Modern Half-a-Loaf with Annuity/Promissory Note',
          'Consider Reverse Half-a-Loaf strategy'
        ];
        
        const situation = {
          excessAssets: 3000,
          averageNursingHomeCost: 8000,
          state: 'florida'
        };
        
        const approach = planDivestmentApproach(strategies, situation);
        
        expect(approach).toContain('Divestment Planning Approach');
        expect(approach).toContain('Evaluate Modern Half-a-Loaf strategy');
        expect(approach).toContain('Evaluate Reverse Half-a-Loaf strategy');
        expect(approach).toContain('Important Considerations');
        expect(approach).toContain('5-year lookback period');
      });
      
      test('should provide appropriate plan when no divestment needed', () => {
        const strategies = [];
        
        const situation = {
          excessAssets: 0,
          state: 'florida'
        };
        
        const approach = planDivestmentApproach(strategies, situation);
        
        expect(approach).toContain('No divestment strategies are recommended');
        expect(approach).toContain('Focus on other planning approaches');
      });
    });
    
    describe('medicaidDivestmentPlanning', () => {
      test('should complete the divestment planning process successfully', async () => {
        const result = await medicaidDivestmentPlanning(clientInfo, assets, state);
        
        expect(result.status).toBe('success');
        expect(result).toHaveProperty('situation');
        expect(result).toHaveProperty('strategies');
        expect(result).toHaveProperty('approach');
      });
      
      test('should handle errors gracefully', async () => {
        // Create a situation that will cause an error
        const invalidAssets = null;
        
        const result = await medicaidDivestmentPlanning(clientInfo, invalidAssets, state);
        
        expect(result.status).toBe('error');
        expect(result).toHaveProperty('error');
      });
    });
  });