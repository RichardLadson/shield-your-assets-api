// src/services/planning/__tests__/communitySpousePlanning.test.js
const {
    assessCommunitySpouseSituation,
    determineCommunitySpouseStrategies,
    planCommunitySpouseApproach,
    medicaidCommunitySpousePlanning
  } = require('../communitySpousePlanning');
  
  // Mock the dependencies
  jest.mock('../../../config/logger', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }));
  
  describe('Community Spouse Planning Module', () => {
    // Sample test data
    const clientInfo = {
      name: 'Test Client',
      age: 75
    };
    
    const assets = {
      countable: 100000,
      home: 150000
    };
    
    const state = 'florida';
    
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    describe('assessCommunitySpouseSituation', () => {
      test('should assess community spouse situation correctly', () => {
        const situation = assessCommunitySpouseSituation(assets, state);
        
        expect(situation).toHaveProperty('totalAssets');
        expect(situation).toHaveProperty('csra');
        expect(situation).toHaveProperty('excessAssets');
        expect(situation).toHaveProperty('hasHome');
        expect(situation.hasHome).toBe(true);
        expect(situation.state).toBe('florida');
      });
      
      test('should calculate CSRA within allowed limits', () => {
        const smallAssets = { countable: 20000 };
        const mediumAssets = { countable: 120000 };
        const largeAssets = { countable: 400000 };
        
        const situation1 = assessCommunitySpouseSituation(smallAssets, state);
        const situation2 = assessCommunitySpouseSituation(mediumAssets, state);
        const situation3 = assessCommunitySpouseSituation(largeAssets, state);
        
        // Should be at minimum CSRA
        expect(situation1.csra).toBe(situation1.csraMin);
        
        // Should be 50% of assets (between min and max)
        expect(situation2.csra).toBe(60000);
        
        // Should be at maximum CSRA
        expect(situation3.csra).toBe(situation3.csraMax);
      });
    });
    
    describe('determineCommunitySpouseStrategies', () => {
      test('should recommend CSRA increase options for excess assets', () => {
        const situation = {
          excessAssets: 40000,
          hasHome: true,
          csra: 60000,
          csraMax: 130380
        };
        
        const strategies = determineCommunitySpouseStrategies(situation);
        
        expect(strategies).toContain('Evaluate CSRA increase options');
        expect(strategies).toContain('Consider home equity planning strategies');
      });
      
      test('should recommend fair hearing when CSRA below maximum', () => {
        const situation = {
          excessAssets: 40000,
          hasHome: false,
          csra: 60000,
          csraMax: 130380
        };
        
        const strategies = determineCommunitySpouseStrategies(situation);
        
        expect(strategies).toContain('Investigate fair hearing for CSRA increase');
      });
      
      test('should not recommend fair hearing when CSRA at maximum', () => {
        const situation = {
          excessAssets: 40000,
          hasHome: false,
          csra: 130380,
          csraMax: 130380
        };
        
        const strategies = determineCommunitySpouseStrategies(situation);
        
        expect(strategies).not.toContain('Investigate fair hearing for CSRA increase');
      });
    });
    
    describe('planCommunitySpouseApproach', () => {
      test('should create detailed plan based on strategies', () => {
        const strategies = [
          'Evaluate CSRA increase options',
          'Consider home equity planning strategies',
          'Explore snapshot date optimization'
        ];
        
        const situation = {
          totalAssets: 250000,
          csra: 125000,
          excessAssets: 40000,
          hasHome: true,
          state: 'florida',
          csraMax: 130380
        };
        
        const approach = planCommunitySpouseApproach(strategies, situation);
        
        expect(approach).toContain('Community Spouse Asset Planning Approach');
        expect(approach).toContain('Total Assets: $250000.00');
        expect(approach).toContain('Current CSRA: $125000.00');
        expect(approach).toContain('Excess assets: $40000.00');
        expect(approach).toContain('Explore options to increase CSRA');
        expect(approach).toContain('Home equity planning considerations');
        expect(approach).toContain('Optimize the asset snapshot date');
      });
      
      test('should include fair hearing discussion when recommended', () => {
        const strategies = [
          'Investigate fair hearing for CSRA increase'
        ];
        
        const situation = {
          totalAssets: 250000,
          csra: 100000,
          excessAssets: 40000,
          hasHome: true,
          state: 'florida',
          csraMax: 130380
        };
        
        const approach = planCommunitySpouseApproach(strategies, situation);
        
        expect(approach).toContain('Consider requesting a fair hearing for CSRA increase');
        expect(approach).toContain('Current CSRA is $100000.00, maximum is $130380.00');
      });
    });
    
    describe('medicaidCommunitySpousePlanning', () => {
      test('should complete the community spouse planning process successfully', async () => {
        const result = await medicaidCommunitySpousePlanning(clientInfo, assets, state);
        
        expect(result.status).toBe('success');
        expect(result).toHaveProperty('situation');
        expect(result).toHaveProperty('strategies');
        expect(result).toHaveProperty('approach');
      });
      
      test('should handle errors gracefully', async () => {
        // Create a situation that will cause an error
        const invalidAssets = null;
        
        const result = await medicaidCommunitySpousePlanning(clientInfo, invalidAssets, state);
        
        expect(result.status).toBe('error');
        expect(result).toHaveProperty('error');
      });
    });
  });