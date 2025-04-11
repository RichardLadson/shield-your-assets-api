// src/services/planning/__tests__/estateRecovery.test.js

const { 
  assessEstateRecoveryRisk,
  developEstateRecoveryPlan,
  estateRecoveryPlanning
} = require('../estateRecovery');

describe('Estate Recovery Planning Module', () => {
  // Basic client setup for tests
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

  // Mock rules
  const mockRules = {
    florida: {
      estateRecovery: {
        applies: true,
        homeExempt: false,
        homeExemptWithIntent: true,
        recoveryExemptions: ['low value estate', 'hardship waiver']
      },
      homeEquityLimit: 636000
    },
    california: {
      estateRecovery: {
        applies: true,
        homeExempt: true,
        homeExemptWithIntent: true,
        recoveryExemptions: ['surviving spouse', 'dependent child', 'hardship waiver']
      },
      homeEquityLimit: 1000000
    }
  };

  // Mock the rules loader to return our test rules
  jest.mock('../medicaidRulesLoader', () => ({
    getMedicaidRules: jest.fn((state) => {
      if (state === 'florida') {
        return mockRules.florida;
      } else if (state === 'california') {
        return mockRules.california;
      } else {
        throw new Error(`Rules not found for state: ${state}`);
      }
    })
  }));

  // Unit tests for assessEstateRecoveryRisk
  describe('assessEstateRecoveryRisk', () => {
    test('should correctly identify high risk for single person with home as primary asset', () => {
      const clientInfo = { ...baseClientInfo };
      const assets = { ...baseAssets };
      const rules = mockRules.florida;

      const result = assessEstateRecoveryRisk(clientInfo, assets, 'florida', rules);
      
      expect(result).toBeDefined();
      expect(result.riskLevel).toBe('high');
      expect(result.atRiskAssets).toContain('home');
      expect(result.estimatedRecoveryAmount).toBeGreaterThan(0);
    });

    test('should identify low risk in states with home exemptions', () => {
      const clientInfo = { ...baseClientInfo };
      const assets = { ...baseAssets };
      const rules = mockRules.california;

      const result = assessEstateRecoveryRisk(clientInfo, assets, 'california', rules);
      
      expect(result.riskLevel).toBe('low');
      expect(result.atRiskAssets).not.toContain('home');
    });

    test('should handle scenario with married couple where spouse is living in home', () => {
      const clientInfo = {
        ...baseClientInfo,
        maritalStatus: 'married',
        spouseInfo: {
          name: 'Spouse Name',
          age: 70,
          livesInHome: true
        }
      };
      const assets = { ...baseAssets };
      const rules = mockRules.florida;

      const result = assessEstateRecoveryRisk(clientInfo, assets, 'florida', rules);
      
      expect(result.riskLevel).toBe('low');
      expect(result.protectedAssets).toContain('home');
      expect(result.exemptionReason).toContain('surviving spouse');
    });

    test('should consider dependent children as exemption for estate recovery', () => {
      const clientInfo = {
        ...baseClientInfo,
        dependents: [{
          relationship: 'child',
          age: 17,
          livesInHome: true,
          disabled: false
        }]
      };
      const assets = { ...baseAssets };
      const rules = mockRules.florida;

      const result = assessEstateRecoveryRisk(clientInfo, assets, 'florida', rules);
      
      expect(result.riskLevel).toBe('low');
      expect(result.exemptionReason).toContain('dependent child');
    });

    test('should handle disabled child exemption for estate recovery', () => {
      const clientInfo = {
        ...baseClientInfo,
        dependents: [{
          relationship: 'child',
          age: 30,
          livesInHome: true,
          disabled: true
        }]
      };
      const assets = { ...baseAssets };
      const rules = mockRules.florida;

      const result = assessEstateRecoveryRisk(clientInfo, assets, 'florida', rules);
      
      expect(result.riskLevel).toBe('low');
      expect(result.exemptionReason).toContain('disabled child');
    });

    test('should handle missing assets data', () => {
      const clientInfo = { ...baseClientInfo };
      const assets = {}; // Empty assets object
      const rules = mockRules.florida;

      const result = assessEstateRecoveryRisk(clientInfo, assets, 'florida', rules);
      
      expect(result).toBeDefined();
      expect(result.riskLevel).toBeDefined();
      expect(result.error).toContain('incomplete asset data');
    });
  });

  // Unit tests for developEstateRecoveryPlan
  describe('developEstateRecoveryPlan', () => {
    test('should generate appropriate strategies for high-risk scenario', () => {
      const riskAssessment = {
        riskLevel: 'high',
        atRiskAssets: ['home'],
        estimatedRecoveryAmount: 150000
      };
      const clientInfo = { ...baseClientInfo };
      const assets = { ...baseAssets };
      
      const result = developEstateRecoveryPlan(riskAssessment, clientInfo, assets, 'florida');
      
      expect(result).toBeDefined();
      expect(result.strategies).toBeInstanceOf(Array);
      expect(result.strategies.length).toBeGreaterThan(0);
      expect(result.strategies).toContain(expect.stringMatching(/trust/i));
    });

    test('should include life estate strategies when home is at risk', () => {
      const riskAssessment = {
        riskLevel: 'high',
        atRiskAssets: ['home'],
        estimatedRecoveryAmount: 180000
      };
      const clientInfo = { ...baseClientInfo };
      const assets = { ...baseAssets };
      
      const result = developEstateRecoveryPlan(riskAssessment, clientInfo, assets, 'florida');
      
      expect(result.strategies).toContain(expect.stringMatching(/life estate/i));
    });

    test('should suggest LTC insurance or partnership policy when applicable', () => {
      const riskAssessment = {
        riskLevel: 'medium',
        atRiskAssets: ['home', 'investments'],
        estimatedRecoveryAmount: 100000
      };
      const clientInfo = {
        ...baseClientInfo,
        age: 65 // Younger client
      };
      const assets = {
        ...baseAssets,
        investments: 100000
      };
      
      const result = developEstateRecoveryPlan(riskAssessment, clientInfo, assets, 'florida');
      
      // Should suggest LTC insurance for younger clients
      expect(result.strategies).toContain(expect.stringMatching(/long-term care insurance/i));
    });

    test('should provide minimal strategies for low-risk scenarios', () => {
      const riskAssessment = {
        riskLevel: 'low',
        atRiskAssets: [],
        estimatedRecoveryAmount: 0,
        exemptionReason: ['surviving spouse']
      };
      const clientInfo = {
        ...baseClientInfo,
        maritalStatus: 'married'
      };
      const assets = { ...baseAssets };
      
      const result = developEstateRecoveryPlan(riskAssessment, clientInfo, assets, 'florida');
      
      expect(result.strategies.length).toBeLessThan(3); // Fewer strategies needed
      expect(result.strategies).toContain(expect.stringMatching(/document/i)); // Documentation is always good advice
    });
    
    test('should handle multiple types of assets at risk', () => {
      const riskAssessment = {
        riskLevel: 'high',
        atRiskAssets: ['home', 'rental property', 'investments'],
        estimatedRecoveryAmount: 350000
      };
      const clientInfo = { ...baseClientInfo };
      const assets = {
        ...baseAssets,
        rental_property: 150000,
        investments: 50000
      };
      
      const result = developEstateRecoveryPlan(riskAssessment, clientInfo, assets, 'florida');
      
      // Should have diverse strategies for different asset types
      expect(result.strategies.length).toBeGreaterThan(5);
      expect(result.strategies).toContain(expect.stringMatching(/rental property/i));
    });
  });

  // Integration tests for estateRecoveryPlanning
  describe('estateRecoveryPlanning', () => {
    test('should perform complete estate recovery planning process', async () => {
      const clientInfo = { ...baseClientInfo };
      const assets = { ...baseAssets };
      
      const result = await estateRecoveryPlanning(clientInfo, assets, 'florida');
      
      expect(result).toBeDefined();
      expect(result.riskAssessment).toBeDefined();
      expect(result.plan).toBeDefined();
      expect(result.strategies).toBeInstanceOf(Array);
    });

    test('should return state-specific plan based on different state rules', async () => {
      const clientInfo = { ...baseClientInfo };
      const assets = { ...baseAssets };
      
      const resultFL = await estateRecoveryPlanning(clientInfo, assets, 'florida');
      const resultCA = await estateRecoveryPlanning(clientInfo, assets, 'california');
      
      // Should produce different risk levels based on state rules
      expect(resultFL.riskAssessment.riskLevel).not.toEqual(resultCA.riskAssessment.riskLevel);
      
      // Should have different strategies based on state
      const flStrategySet = new Set(resultFL.strategies);
      const caStrategySet = new Set(resultCA.strategies);
      
      // At least some strategies should be different
      expect([...flStrategySet].some(strategy => !caStrategySet.has(strategy))).toBe(true);
    });

    test('should handle client with no recoverable assets', async () => {
      const clientInfo = { ...baseClientInfo };
      const assets = {
        countable: 1500,
        automobile: 5000,
        personal_items: 2000
        // No home or other significant recoverable assets
      };
      
      const result = await estateRecoveryPlanning(clientInfo, assets, 'florida');
      
      expect(result.riskAssessment.riskLevel).toBe('low');
      expect(result.strategies.length).toBeLessThan(3); // Minimal strategies needed
    });

    test('should handle errors from rule loading gracefully', async () => {
      const clientInfo = { ...baseClientInfo };
      const assets = { ...baseAssets };
      
      // Trying to use a state without defined rules
      const result = await estateRecoveryPlanning(clientInfo, assets, 'nonexistent');
      
      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
    });

    test('should handle complex family situation for estate recovery planning', async () => {
      const clientInfo = {
        ...baseClientInfo,
        maritalStatus: 'married',
        spouseInfo: {
          name: 'Spouse Name',
          age: 73,
          livesInHome: true,
          needsCare: false
        },
        dependents: [
          {
            relationship: 'child',
            age: 50,
            livesInHome: false,
            disabled: true
          },
          {
            relationship: 'sibling',
            age: 70,
            livesInHome: true,
            caregiverYears: 5 // Sibling has been caregiver for 5+ years
          }
        ]
      };
      
      const assets = { ...baseAssets };
      
      const result = await estateRecoveryPlanning(clientInfo, assets, 'florida');
      
      expect(result).toBeDefined();
      expect(result.riskAssessment).toBeDefined();
      
      // Should recognize exemptions due to dependent disabled child or caregiver sibling
      expect(result.riskAssessment.exemptionReason).toBeDefined();
      expect(result.riskAssessment.exemptionReason.length).toBeGreaterThan(0);
    });
  });
});