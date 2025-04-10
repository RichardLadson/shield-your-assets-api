// src/services/planning/__tests__/trustPlanning.test.js
const {
    assessTrustSituation,
    determineTrustStrategies,
    planTrustApproach,
    medicaidTrustPlanning
  } = require('../trustPlanning');
  
  // Mock the dependencies
  jest.mock('../../../config/logger', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }));
  
  describe('Trust Planning Module', () => {
    // Sample test data
    const clientInfo = {
      name: 'Test Client',
      age: 75,
      hasDisabledChild: true,
      hasDisabledUnder65: false
    };
    
    const assets = {
      countable: 5000,
      non_countable: 150000
    };
    
    const state = 'florida';
    
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    describe('assessTrustSituation', () => {
      test('should assess trust situation correctly', () => {
        const situation = assessTrustSituation(clientInfo, assets, state);
        
        expect(situation).toHaveProperty('totalAssets');
        expect(situation).toHaveProperty('countableAssets');
        expect(situation).toHaveProperty('hasDisabledChild');
        expect(situation.totalAssets).toBe(155000);
        expect(situation.hasDisabledChild).toBe(true);
        expect(situation.state).toBe('florida');
      });
    });
    
    describe('determineTrustStrategies', () => {
      test('should recommend self-settled trust for excess assets', () => {
        const situation = {
          countableAssets: 5000,
          hasDisabledChild: false,
          hasDisabledUnder65: false
        };
        
        const strategies = determineTrustStrategies(situation);
        
        expect(strategies).toContain('Evaluate self-settled irrevocable trust options');
        expect(strategies).toContain('Consider Qualified Income Trust (Miller Trust)');
      });
      
      test('should recommend trust for disabled child when applicable', () => {
        const situation = {
          countableAssets: 5000,
          hasDisabledChild: true,
          hasDisabledUnder65: false
        };
        
        const strategies = determineTrustStrategies(situation);
        
        expect(strategies).toContain('Consider a trust for the sole benefit of a disabled child');
      });
      
      test('should recommend trust for disabled under 65 when applicable', () => {
        const situation = {
          countableAssets: 5000,
          hasDisabledChild: false,
          hasDisabledUnder65: true
        };
        
        const strategies = determineTrustStrategies(situation);
        
        expect(strategies).toContain('Consider a trust for the sole benefit of a disabled person under 65');
      });
    });
    
    describe('planTrustApproach', () => {
      test('should create detailed plan based on strategies', () => {
        const strategies = [
          'Evaluate self-settled irrevocable trust options',
          'Consider a trust for the sole benefit of a disabled child'
        ];
        
        const situation = {
          countableAssets: 5000,
          hasDisabledChild: true,
          hasDisabledUnder65: false,
          state: 'florida'
        };
        
        const approach = planTrustApproach(strategies, situation);
        
        expect(approach).toContain('Trust Planning Approach');
        expect(approach).toContain('establishing a self-settled irrevocable trust');
        expect(approach).toContain('Establish a trust solely for the benefit of a disabled child');
      });
    });
    
    describe('medicaidTrustPlanning', () => {
      test('should complete the trust planning process successfully', async () => {
        const result = await medicaidTrustPlanning(clientInfo, assets, state);
        
        expect(result.status).toBe('success');
        expect(result).toHaveProperty('situation');
        expect(result).toHaveProperty('strategies');
        expect(result).toHaveProperty('approach');
      });
      
      test('should handle errors gracefully', async () => {
        // Create a situation that will cause an error
        const invalidAssets = null;
        
        const result = await medicaidTrustPlanning(clientInfo, invalidAssets, state);
        
        expect(result.status).toBe('error');
        expect(result).toHaveProperty('error');
      });
    });
  });
  