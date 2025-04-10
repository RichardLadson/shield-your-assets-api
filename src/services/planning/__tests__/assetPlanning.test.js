// src/services/planning/__tests__/assetPlanning.test.js
const {
    assessAssetSituation,
    determineAssetStrategies,
    planAssetApproach,
    medicaidAssetPlanning
  } = require('../assetPlanning');
  
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
        assets: { bank: 5000, home: 150000 },
        state: 'florida'
      }
    })
  }));
  
  jest.mock('../../utils/medicaidRulesLoader', () => ({
    loadMedicaidRules: jest.fn().mockResolvedValue({
      florida: {
        resourceLimitSingle: 2000,
        homeEquityLimit: 730000
      }
    }),
    getResourceLimit: jest.fn().mockResolvedValue(2000),
    getHomeEquityLimit: jest.fn().mockResolvedValue(730000)
  }));
  
  jest.mock('../../eligibility/eligibilityUtils', () => ({
    classifyAssets: jest.fn().mockReturnValue({
      countableAssets: 5000,
      nonCountableAssets: 150000
    })
  }));
  
  describe('Asset Planning Module', () => {
    // Sample test data
    const assets = {
      bank: 5000,
      home: 150000,
      car: 10000
    };
    
    const state = 'florida';
    const maritalStatus = 'single';
    const rulesData = {
      florida: {
        resourceLimitSingle: 2000,
        homeEquityLimit: 730000
      }
    };
    
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    describe('assessAssetSituation', () => {
      test('should assess asset situation correctly', async () => {
        const situation = await assessAssetSituation(assets, state, maritalStatus, rulesData);
        
        expect(situation).toHaveProperty('countableAssets');
        expect(situation).toHaveProperty('excessAssets');
        expect(situation).toHaveProperty('hasHome');
        expect(situation.excessAssets).toBeGreaterThan(0);
        expect(situation.state).toBe('florida');
      });
      
      test('should handle missing home property', async () => {
        const assetsWithoutHome = { bank: 5000, car: 10000 };
        const situation = await assessAssetSituation(assetsWithoutHome, state, maritalStatus, rulesData);
        
        expect(situation.hasHome).toBe(false);
        expect(situation.homeValue).toBe(0);
      });
    });
    
    describe('determineAssetStrategies', () => {
      test('should recommend strategies for excess assets', () => {
        const situation = {
          countableAssets: 5000,
          resourceLimit: 2000,
          excessAssets: 3000,
          hasHome: true
        };
        
        const strategies = determineAssetStrategies(situation);
        
        expect(strategies).toContain('Convert countable assets to non-countable assets');
        expect(strategies).toContain('Maximize homestead advantages');
      });
      
      test('should not recommend excess home equity strategy when no excess', () => {
        const situation = {
          countableAssets: 5000,
          resourceLimit: 2000,
          excessAssets: 3000,
          hasHome: true,
          homeEquity: 200000,
          homeEquityLimit: 730000,
          excessHomeEquity: 0
        };
        
        const strategies = determineAssetStrategies(situation);
        
        expect(strategies).not.toContain('Address excess home equity');
      });
      
      test('should recommend excess home equity strategy when needed', () => {
        const situation = {
          countableAssets: 5000,
          resourceLimit: 2000,
          excessAssets: 3000,
          hasHome: true,
          homeEquity: 800000,
          homeEquityLimit: 730000,
          excessHomeEquity: 70000
        };
        
        const strategies = determineAssetStrategies(situation);
        
        expect(strategies).toContain('Address excess home equity');
      });
    });
    
    describe('planAssetApproach', () => {
      test('should create detailed plan based on strategies', () => {
        const strategies = [
          'Convert countable assets to non-countable assets',
          'Maximize homestead advantages'
        ];
        
        const situation = {
          countableAssets: 5000,
          resourceLimit: 2000,
          excessAssets: 3000,
          hasHome: true,
          state: 'florida'
        };
        
        const approach = planAssetApproach(strategies, situation);
        
        expect(approach).toContain('Asset Eligibility Planning Approach');
        expect(approach).toContain('$3000.00 in excess countable assets');
        expect(approach).toContain('Consider home renovations or improvements');
      });
    });
    
    describe('medicaidAssetPlanning', () => {
      test('should complete the asset planning process successfully', async () => {
        const clientInfo = { name: 'Test Client', age: 75, maritalStatus: 'single' };
        
        const result = await medicaidAssetPlanning(clientInfo, assets, state);
        
        expect(result.status).toBe('success');
        expect(result).toHaveProperty('situation');
        expect(result).toHaveProperty('strategies');
        expect(result).toHaveProperty('approach');
      });
      
      test('should handle errors gracefully', async () => {
        // Mock the validateAllInputs function to throw an error
        require('../../validation/inputValidation').validateAllInputs.mockRejectedValueOnce(
          new Error('Validation error')
        );
        
        const clientInfo = { name: 'Test Client', age: 75, maritalStatus: 'single' };
        
        const result = await medicaidAssetPlanning(clientInfo, assets, state);
        
        expect(result.status).toBe('error');
        expect(result).toHaveProperty('error');
      });
    });
  });