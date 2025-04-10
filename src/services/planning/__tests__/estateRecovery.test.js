    // src/services/planning/__tests__/estateRecovery.test.js
const {
    assessEstateRecoveryRisk,
    determineEstateRecoveryStrategies,
    planEstateRecoveryApproach,
    medicaidEstateRecoveryPlanning
  } = require('../estateRecovery');
  
  // Mock the dependencies
  jest.mock('../../../config/logger', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }));
  
  describe('Estate Recovery Planning Module', () => {
    // Sample test data
    const clientInfo = {
      name: 'Test Client',
      age: 75
    };
    
    const assets = {
      home: 150000,
      bank: 5000,
      investments: 50000
    };
    
    const state = 'florida';
    
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    describe('assessEstateRecoveryRisk', () => {
      test('should assess estate recovery risk correctly', () => {
        const risk = assessEstateRecoveryRisk(assets, state);
        
        expect(risk).toHaveProperty('totalAssets');
        expect(risk).toHaveProperty('riskLevel');
        expect(risk).toHaveProperty('state');
        expect(risk.totalAssets).toBe(205000);
        expect(risk.riskLevel).toBe('high');
        expect(risk.state).toBe('florida');
      });
      
      test('should calculate medium risk level correctly', () => {
        const mediumAssets = {
          home: 50000,
          bank: 5000
        };
        
        const risk = assessEstateRecoveryRisk(mediumAssets, state);
        
        expect(risk.riskLevel).toBe('medium');
      });
      
      test('should calculate low risk level correctly', () => {
        const lowAssets = {
          home: 20000,
          bank: 1000
        };
        
        const risk = assessEstateRecoveryRisk(lowAssets, state);
        
        expect(risk.riskLevel).toBe('low');
      });
    });
    
    describe('determineEstateRecoveryStrategies', () => {
      test('should recommend strategies for high risk', () => {
        const situation = {
          totalAssets: 205000,
          riskLevel: 'high'
        };
        
        const strategies = determineEstateRecoveryStrategies(situation);
        
        expect(strategies).toContain('Consider probate estate avoidance techniques');
        expect(strategies).toContain('Explore options to convert countable assets to non-countable');
        expect(strategies).toContain('Evaluate methods to protect the home from estate recovery');
        expect(strategies).toContain('Investigate lifetime transfer strategies');
        expect(strategies).toContain('Consider advanced legal planning with elder law attorney');
      });
      
      test('should recommend strategies for medium risk', () => {
        const situation = {
          totalAssets: 55000,
          riskLevel: 'medium'
        };
        
        const strategies = determineEstateRecoveryStrategies(situation);
        
        expect(strategies).toContain('Consider probate estate avoidance techniques');
        expect(strategies).toContain('Explore options to convert countable assets to non-countable');
        expect(strategies).not.toContain('Investigate lifetime transfer strategies');
      });
      
      test('should not recommend strategies for low risk', () => {
        const situation = {
          totalAssets: 21000,
          riskLevel: 'low'
        };
        
        const strategies = determineEstateRecoveryStrategies(situation);
        
        expect(strategies.length).toBe(0);
      });
    });
    
    describe('planEstateRecoveryApproach', () => {
      test('should create detailed plan based on strategies', () => {
        const strategies = [
          'Consider probate estate avoidance techniques',
          'Explore options to convert countable assets to non-countable',
          'Evaluate methods to protect the home from estate recovery'
        ];
        
        const situation = {
          totalAssets: 205000,
          riskLevel: 'high',
          state: 'florida'
        };
        
        const approach = planEstateRecoveryApproach(strategies, situation);
        
        expect(approach).toContain('Estate Recovery Planning Approach for florida');
        expect(approach).toContain('Risk Level: HIGH');
        expect(approach).toContain('Consider probate estate avoidance techniques');
        expect(approach).toContain('Explore options to convert countable assets');
        expect(approach).toContain('Evaluate methods to protect the home');
      });
      
      test('should include advanced strategies for high risk', () => {
        const strategies = [
          'Investigate lifetime transfer strategies',
          'Consider advanced legal planning with elder law attorney'
        ];
        
        const situation = {
          totalAssets: 205000,
          riskLevel: 'high',
          state: 'florida'
        };
        
        const approach = planEstateRecoveryApproach(strategies, situation);
        
        expect(approach).toContain('Investigate lifetime transfer strategies');
        expect(approach).toContain('Consider irrevocable trusts');
        expect(approach).toContain('Consider advanced legal planning with elder law attorney');
      });
      
      test('should provide monitoring advice for low risk', () => {
        const strategies = [];
        
        const situation = {
          totalAssets: 21000,
          riskLevel: 'low',
          state: 'florida'
        };
        
        const approach = planEstateRecoveryApproach(strategies, situation);
        
        expect(approach).toContain('At the current asset level, estate recovery risk is low');
        expect(approach).toContain('continue to monitor');
      });
    });
    
    describe('medicaidEstateRecoveryPlanning', () => {
      test('should complete the estate recovery planning process successfully', async () => {
        const result = await medicaidEstateRecoveryPlanning(clientInfo, assets, state);
        
        expect(result.status).toBe('success');
        expect(result).toHaveProperty('situation');
        expect(result).toHaveProperty('strategies');
        expect(result).toHaveProperty('approach');
      });
      
      test('should handle errors gracefully', async () => {
        // Create a situation that will cause an error
        const invalidAssets = null;
        
        const result = await medicaidEstateRecoveryPlanning(clientInfo, invalidAssets, state);
        
        expect(result.status).toBe('error');
        expect(result).toHaveProperty('error');
      });
    });
  });