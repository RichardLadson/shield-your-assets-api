// src/services/planning/__tests__/medicaidRulesLoader.test.js

const { 
  getMedicaidRules, 
  getStateSpecificLimits, 
  loadRuleUpdates,
  getHomeEquityLimit,
  getIncomeTrustRequirements,
  getDisregardRules
} = require('../medicaidRulesLoader');

describe('Medicaid Rules Loader Module', () => {
  // Basic mocking for tests
  const mockStateRules = {
    florida: {
      programName: 'Florida Medicaid',
      assetLimitSingle: 2000,
      assetLimitMarried: 3000,
      incomeLimit: 2742,
      homeEquityLimit: 636000,
      lookbackPeriod: 60,
      incomeTrust: {
        required: true,
        threshold: 2742
      },
      disregards: {
        income: {
          earned: 0.5,
          unearned: 20
        }
      }
    },
    california: {
      programName: 'Medi-Cal',
      assetLimitSingle: 2000, 
      assetLimitMarried: 3000,
      incomeLimit: 1564,
      homeEquityLimit: 1000000,
      lookbackPeriod: 30,
      incomeTrust: {
        required: false
      },
      disregards: {
        income: {
          earned: 0.5,
          unearned: 20
        }
      }
    }
  };

  // Mock external data loading to return our test rules
  jest.mock('../../data/medicaidRules', () => ({
    loadRules: jest.fn(() => mockStateRules)
  }));

  jest.mock('../../data/ruleUpdates', () => ({
    checkForUpdates: jest.fn(() => ({
      florida: {
        incomeLimit: 2823 // Updated value
      }
    }))
  }));

  // Unit tests for getMedicaidRules
  describe('getMedicaidRules', () => {
    test('should return complete rules for valid state', () => {
      const rules = getMedicaidRules('florida');
      
      expect(rules).toBeDefined();
      expect(rules.programName).toBe('Florida Medicaid');
      expect(rules.assetLimitSingle).toBe(2000);
      expect(rules.incomeLimit).toBe(2823); // Should return updated value
    });

    test('should throw error for invalid state', () => {
      expect(() => {
        getMedicaidRules('invalid');
      }).toThrow();
    });

    test('should handle case-insensitive state names', () => {
      const rules = getMedicaidRules('FloRiDa');
      
      expect(rules).toBeDefined();
      expect(rules.programName).toBe('Florida Medicaid');
    });

    test('should handle state abbreviations', () => {
      const rules = getMedicaidRules('FL');
      
      expect(rules).toBeDefined();
      expect(rules.programName).toBe('Florida Medicaid');
    });

    test('should apply rule updates when retrieving rules', () => {
      // Re-mock the checkForUpdates to return a different update
      require('../../data/ruleUpdates').checkForUpdates.mockReturnValueOnce({
        florida: {
          homeEquityLimit: 700000 // Updated value
        }
      });
      
      const rules = getMedicaidRules('florida');
      
      expect(rules.homeEquityLimit).toBe(700000);
    });
  });

  // Unit tests for getStateSpecificLimits
  describe('getStateSpecificLimits', () => {
    test('should return correct asset limits for single individual', () => {
      const limits = getStateSpecificLimits('florida', 'single');
      
      expect(limits).toBeDefined();
      expect(limits.assetLimit).toBe(2000);
    });

    test('should return correct asset limits for married couple', () => {
      const limits = getStateSpecificLimits('florida', 'married');
      
      expect(limits).toBeDefined();
      expect(limits.assetLimit).toBe(3000);
    });

    test('should include income limit in returned limits', () => {
      const limits = getStateSpecificLimits('florida', 'single');
      
      expect(limits.incomeLimit).toBe(2823); // Updated value
    });

    test('should throw error for invalid marital status', () => {
      expect(() => {
        getStateSpecificLimits('florida', 'divorced');
      }).toThrow(/invalid marital status/i);
    });

    test('should handle null or undefined marital status by defaulting to single', () => {
      const limits = getStateSpecificLimits('florida', null);
      
      expect(limits.assetLimit).toBe(2000); // Single limit
    });
  });

  // Unit tests for loadRuleUpdates
  describe('loadRuleUpdates', () => {
    test('should correctly apply updates to existing rules', () => {
      // Base rules to update
      const baseRules = { 
        florida: {
          assetLimitSingle: 2000,
          incomeLimit: 2742
        }
      };
      
      // Updates to apply
      const updates = {
        florida: {
          incomeLimit: 2900
        }
      };
      
      const updatedRules = loadRuleUpdates(baseRules, updates);
      
      expect(updatedRules.florida.incomeLimit).toBe(2900);
      expect(updatedRules.florida.assetLimitSingle).toBe(2000); // Unchanged
    });

    test('should handle updates for new states not in base rules', () => {
      // Base rules to update
      const baseRules = { 
        florida: {
          assetLimitSingle: 2000
        }
      };
      
      // Updates with new state
      const updates = {
        newyork: {
          assetLimitSingle: 15750,
          incomeLimit: 934
        }
      };
      
      const updatedRules = loadRuleUpdates(baseRules, updates);
      
      expect(updatedRules.newyork).toBeDefined();
      expect(updatedRules.newyork.assetLimitSingle).toBe(15750);
      expect(updatedRules.florida.assetLimitSingle).toBe(2000); // Unchanged
    });

    test('should handle deep property updates', () => {
      // Base rules with nested properties
      const baseRules = { 
        florida: {
          disregards: {
            income: {
              earned: 0.5,
              unearned: 20
            }
          }
        }
      };
      
      // Updates with nested properties
      const updates = {
        florida: {
          disregards: {
            income: {
              earned: 0.65 // Only updating earned income disregard
            }
          }
        }
      };
      
      const updatedRules = loadRuleUpdates(baseRules, updates);
      
      expect(updatedRules.florida.disregards.income.earned).toBe(0.65);
      expect(updatedRules.florida.disregards.income.unearned).toBe(20); // Should be preserved
    });

    test('should handle null or undefined updates gracefully', () => {
      const baseRules = { 
        florida: {
          assetLimitSingle: 2000
        }
      };
      
      const updatedRules = loadRuleUpdates(baseRules, null);
      
      expect(updatedRules).toEqual(baseRules);
    });
  });

  // Unit tests for getHomeEquityLimit
  describe('getHomeEquityLimit', () => {
    test('should return correct home equity limit for a state', () => {
      const limit = getHomeEquityLimit('florida');
      
      expect(limit).toBeDefined();
      expect(typeof limit).toBe('number');
      expect(limit).toBe(636000);
    });

    test('should return different limits for different states', () => {
      const flLimit = getHomeEquityLimit('florida');
      const caLimit = getHomeEquityLimit('california');
      
      expect(flLimit).not.toEqual(caLimit);
    });

    test('should throw error for invalid state', () => {
      expect(() => {
        getHomeEquityLimit('invalid');
      }).toThrow();
    });

    test('should return updated value if home equity limit has been updated', () => {
      // Re-mock the checkForUpdates to return a specific update
      require('../../data/ruleUpdates').checkForUpdates.mockReturnValueOnce({
        florida: {
          homeEquityLimit: 700000 // Updated value
        }
      });
      
      const limit = getHomeEquityLimit('florida');
      
      expect(limit).toBe(700000);
    });
  });

  // Unit tests for getIncomeTrustRequirements
  describe('getIncomeTrustRequirements', () => {
    test('should return income trust requirements for a state that requires them', () => {
      const requirements = getIncomeTrustRequirements('florida');
      
      expect(requirements).toBeDefined();
      expect(requirements.required).toBe(true);
      expect(requirements.threshold).toBe(2823); // Updated value
    });

    test('should return requirements showing trust not required for states that don\'t use them', () => {
      const requirements = getIncomeTrustRequirements('california');
      
      expect(requirements).toBeDefined();
      expect(requirements.required).toBe(false);
    });

    test('should handle states with varying QIT thresholds', () => {
      // Mock a state with a different threshold
      require('../../data/medicaidRules').loadRules.mockReturnValueOnce({
        ...mockStateRules,
        texas: {
          incomeTrust: {
            required: true,
            threshold: 2349
          }
        }
      });
      
      const requirements = getIncomeTrustRequirements('texas');
      
      expect(requirements.threshold).toBe(2349);
    });

    test('should throw error for invalid state', () => {
      expect(() => {
        getIncomeTrustRequirements('invalid');
      }).toThrow();
    });
  });

  // Unit tests for getDisregardRules
  describe('getDisregardRules', () => {
    test('should return disregard rules for income', () => {
      const disregards = getDisregardRules('florida', 'income');
      
      expect(disregards).toBeDefined();
      expect(disregards.earned).toBe(0.5);
      expect(disregards.unearned).toBe(20);
    });

    test('should handle request for unsupported disregard type', () => {
      expect(() => {
        getDisregardRules('florida', 'assets');
      }).toThrow(/unsupported disregard type/i);
    });

    test('should throw error for invalid state', () => {
      expect(() => {
        getDisregardRules('invalid', 'income');
      }).toThrow();
    });

    test('should handle state with no disregard rules defined', () => {
      // Mock a state with no disregards
      require('../../data/medicaidRules').loadRules.mockReturnValueOnce({
        ...mockStateRules,
        nevada: {
          programName: 'Nevada Medicaid'
          // No disregards defined
        }
      });
      
      const disregards = getDisregardRules('nevada', 'income');
      
      // Should return default empty disregards
      expect(disregards).toEqual({});
    });
  });
});