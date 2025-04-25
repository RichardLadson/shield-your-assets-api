// src/services/planning/__tests__/estateRecovery.test.js

jest.mock('../../../config/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

// Update the path to the correct location of medicaid_rules_2025.json
jest.mock('../../../data/medicaid_rules_2025.json', () => ({
  florida: {
    estateRecovery: {
      applies: true,
      homeExempt: false,
      homeExemptWithIntent: true,
      recoveryExemptions: ['low value estate', 'hardship waiver']
    },
    homeEquityLimit: 636000,
    averageNursingHomeCost: 8000,
    resourceLimitSingle: 2000
  },
  california: {
    estateRecovery: {
      applies: true,
      homeExempt: true,
      homeExemptWithIntent: true,
      recoveryExemptions: ['surviving spouse', 'dependent child', 'hardship waiver']
    },
    homeEquityLimit: 1000000,
    averageNursingHomeCost: 8000,
    resourceLimitSingle: 2000
  }
}));

// Also update the path to the estateRecovery module
jest.mock('../../../data/estateRecovery', () => ({
  getStateEstateRecovery: jest.fn().mockImplementation((state) => {
    const mockData = {
      florida: {
        state: "Florida",
        homeExemptions: {
          primary: true,
          conditions: ["homestead status under Article X, Section 4 of the Florida Constitution"]
        },
        recoveryScope: {
          aggressiveness: "none"
        },
        recoveryWaivers: {
          exemptHeirs: []
        },
        strategicConsiderations: {
          effectiveStrategies: [
            "claim homestead protection under Florida Constitution",
            "use revocable living trusts and TOD deeds freely"
          ]
        }
      },
      california: {
        state: "California",
        homeExemptions: {
          primary: true,
          conditions: ["spouse resides", "minor child resides"]
        },
        recoveryScope: {
          aggressiveness: "limited"
        },
        recoveryWaivers: {
          exemptHeirs: ["surviving spouse", "child under 21", "blind or disabled child"]
        },
        strategicConsiderations: {
          effectiveStrategies: [
            "avoid probate using TOD deeds or revocable trusts",
            "use beneficiary designations for financial accounts"
          ]
        }
      }
    };
    return mockData[state] || null;
  })
}));

const { 
  assessEstateRecoveryRisk,
  developEstateRecoveryPlan,
  estateRecoveryPlanning
} = require('../estateRecovery');

describe('Estate Recovery Planning Module', () => {
  const baseClientInfo = {
    name: 'Test Client',
    age: 75,
    maritalStatus: 'single'
  };

  const baseAssets = {
    home: 200000,
    countable: 1500,
    automobile: 10000,
    life_insurance: 5000,
    funeral_plan: 5000
  };

  const baseState = 'florida';

  describe('assessEstateRecoveryRisk', () => {
    test('should correctly identify risk level based on state recovery data', () => {
      const assets = { ...baseAssets };
      const state = 'florida';

      const result = assessEstateRecoveryRisk(assets, state);
      
      expect(result).toBeDefined();
      expect(result.riskLevel).toBe('low'); // Florida has no recovery
      expect(result.hasHome).toBe(true);
      expect(result.totalAssets).toBeGreaterThan(0);
    });

    test('should identify risk in states with recovery programs', () => {
      const assets = { ...baseAssets, home: 100000 };
      const state = 'california';

      const result = assessEstateRecoveryRisk(assets, state);
      
      expect(result.riskLevel).toBe('low'); // California has limited recovery
    });

    test('should handle missing assets data', () => {
      const assets = {};
      const state = 'florida';

      const result = assessEstateRecoveryRisk(assets, state);
      
      expect(result).toBeDefined();
      expect(result.riskLevel).toBeDefined();
      expect(result.totalAssets).toBe(0);
    });
  });

  describe('developEstateRecoveryPlan', () => {
    test('should generate appropriate strategies based on state data', () => {
      const riskAssessment = {
        riskLevel: 'high',
        hasHome: true,
        totalAssets: 200000,
        state: 'florida'
      };
      
      const result = developEstateRecoveryPlan(riskAssessment, baseClientInfo, baseAssets, 'florida');
      
      expect(result).toBeDefined();
      expect(result.strategies).toBeInstanceOf(Array);
      expect(result.strategies.length).toBeGreaterThan(0);
      expect(result.implementationSteps).toBeInstanceOf(Array);
    });
  });

  describe('estateRecoveryPlanning', () => {
    test('should perform complete estate recovery planning process', async () => {
      const clientInfo = { ...baseClientInfo };
      const assets = { ...baseAssets };
      
      const result = await estateRecoveryPlanning(clientInfo, assets, 'florida');
      
      expect(result).toBeDefined();
      expect(result.riskAssessment).toBeDefined();
      expect(result.strategies).toBeInstanceOf(Array);
      expect(result.status).toBe('success');
    });

    test('should handle errors from rule loading gracefully', async () => {
      const clientInfo = { ...baseClientInfo };
      const assets = { ...baseAssets };
      
      const result = await estateRecoveryPlanning(clientInfo, assets, 'nonexistent');
      
      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
    });
  });
});