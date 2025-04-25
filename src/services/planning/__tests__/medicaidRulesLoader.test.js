const {
  getMedicaidRules,
  getStateSpecificLimits,
  loadRuleUpdates,
  getHomeEquityLimit,
  getIncomeTrustRequirements,
  getDisregardRules
} = require('../../utils/medicaidRulesLoader');

// Mock the medicaid rules
jest.mock('../../../data/medicaid_rules_2025.json', () => ({
  florida: {
    resourceLimitSingle: 2000,
    resourceLimitMarried: 3000,
    incomeLimitSingle: 2742,
    incomeLimitMarried: 5484,
    homeEquityLimit: 713000,  // Updated to match expected value
    nursingHomeIncomeLimitSingle: 2901 // Updated to match expected value
  },
  texas: {
    resourceLimitSingle: 2000,
    resourceLimitMarried: 3000,
    incomeLimitSingle: 2500,
    incomeLimitMarried: 5000,
    homeEquityLimit: 700000
  },
  california: {
    resourceLimitSingle: 3000,
    resourceLimitMarried: 6000,
    incomeLimitSingle: 2900,
    incomeLimitMarried: 5800,
    homeEquityLimit: 800000,
    nursingHomeIncomeLimitSingle: null
  }
}));

// Mock logger to prevent console output during tests
jest.mock('../../../config/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Medicaid Rules Loader Module', () => {
  describe('getMedicaidRules', () => {
    test('should return complete rules for valid state', () => {
      const rules = getMedicaidRules('florida');
      
      expect(rules).toBeDefined();
      expect(rules.programName).toBe('Florida Medicaid');
      expect(rules.resourceLimitSingle).toBe(2000);
      expect(rules.incomeLimitSingle).toBe(2742);
    });
    
    test('should throw error for invalid state', () => {
      expect(() => {
        getMedicaidRules('invalid');
      }).toThrow('No Medicaid rules found for state: invalid');
    });
    
    test('should handle case-insensitive state names', () => {
      const rules = getMedicaidRules('FLORIDA');
      
      expect(rules).toBeDefined();
      expect(rules.programName).toBe('Florida Medicaid');
    });
    
    test('should handle state abbreviations', () => {
      const rules = getMedicaidRules('FL');
      
      expect(rules).toBeDefined();
      expect(rules.programName).toBe('Florida Medicaid');
    });
    
    test('should apply rule updates when retrieving rules', () => {
      const updates = {
        florida: {
          resourceLimitSingle: 3000
        }
      };
      
      const rules = getMedicaidRules('florida', updates);
      expect(rules.resourceLimitSingle).toBe(3000);
      expect(rules.incomeLimitSingle).toBe(2742); // Unchanged
    });
  });
  
  describe('getStateSpecificLimits', () => {
    test('should return correct asset limits for single individual', () => {
      const limits = getStateSpecificLimits('florida', 'single');
      expect(limits.assetLimit).toBe(2000);
    });
    
    test('should return correct asset limits for married couple', () => {
      const limits = getStateSpecificLimits('florida', 'married');
      expect(limits.assetLimit).toBe(3000);
    });
    
    test('should include income limit in returned limits', () => {
      const limits = getStateSpecificLimits('florida', 'single');
      expect(limits.incomeLimit).toBe(2742);
    });
    
    test('should throw error for invalid marital status', () => {
      expect(() => {
        getStateSpecificLimits('florida', 'divorced');
      }).toThrow('Invalid marital status: divorced');
    });
    
    test('should handle null or undefined marital status by defaulting to single', () => {
      const limitsNull = getStateSpecificLimits('florida', null);
      const limitsUndefined = getStateSpecificLimits('florida');
      
      expect(limitsNull.assetLimit).toBe(2000);
      expect(limitsUndefined.assetLimit).toBe(2000);
    });
  });
  
  describe('loadRuleUpdates', () => {
    test('should correctly apply updates to existing rules', () => {
      const baseRules = {
        florida: {
          resourceLimitSingle: 2000
        }
      };
      
      const updates = {
        florida: {
          resourceLimitSingle: 3000
        }
      };
      
      const result = loadRuleUpdates(baseRules, updates);
      expect(result.florida.resourceLimitSingle).toBe(3000);
    });
    
    test('should handle updates for new states not in base rules', () => {
      const baseRules = {
        florida: {
          resourceLimitSingle: 2000
        }
      };
      
      const updates = {
        california: {
          resourceLimitSingle: 3000
        }
      };
      
      const result = loadRuleUpdates(baseRules, updates);
      expect(result.california.resourceLimitSingle).toBe(3000);
    });
    
    test('should handle deep property updates', () => {
      const baseRules = {
        florida: {
          disregards: {
            income: {
              earned: 0.5
            }
          }
        }
      };
      
      const updates = {
        florida: {
          disregards: {
            income: {
              earned: 0.75
            }
          }
        }
      };
      
      const result = loadRuleUpdates(baseRules, updates);
      expect(result.florida.disregards.income.earned).toBe(0.75);
    });
    
    test('should handle null or undefined updates gracefully', () => {
      const baseRules = {
        florida: {
          resourceLimitSingle: 2000
        }
      };
      
      const result = loadRuleUpdates(baseRules, null);
      expect(result).toEqual(baseRules);
    });
  });
  
  describe('getHomeEquityLimit', () => {
    test('should return correct home equity limit for a state', () => {
      const limit = getHomeEquityLimit('florida');
      
      expect(limit).toBeDefined();
      expect(typeof limit).toBe('number');
      expect(limit).toBe(713000);
    });
    
    test('should return different limits for different states', () => {
      const floridaLimit = getHomeEquityLimit('florida');
      const californiaLimit = getHomeEquityLimit('california');
      
      expect(floridaLimit).not.toBe(californiaLimit);
    });
    
    test('should throw error for invalid state', () => {
      expect(() => {
        getHomeEquityLimit('invalid');
      }).toThrow('No Medicaid rules found for state: invalid');
    });
    
    test('should return updated value if home equity limit has been updated', () => {
      const updates = {
        florida: {
          homeEquityLimit: 800000
        }
      };
      
      const limit = getHomeEquityLimit('florida', updates);
      expect(limit).toBe(800000);
    });
  });
  
  describe('getIncomeTrustRequirements', () => {
    test('should return income trust requirements for a state that requires them', () => {
      const requirements = getIncomeTrustRequirements('florida');
      
      expect(requirements).toBeDefined();
      expect(requirements.required).toBe(true);
      expect(requirements.threshold).toBe(2901);
    });
    
    test('should return requirements showing trust not required for states that don\'t use them', () => {
      const requirements = getIncomeTrustRequirements('california');
      
      expect(requirements).toBeDefined();
      expect(requirements.required).toBe(false);
    });
    
    test('should handle states with varying QIT thresholds', () => {
      const requirements = getIncomeTrustRequirements('texas');
      
      expect(requirements.threshold).toBe(2349);
    });
    
    test('should throw error for invalid state', () => {
      expect(() => {
        getIncomeTrustRequirements('invalid');
      }).toThrow('No Medicaid rules found for state: invalid');
    });
  });
  
  describe('getDisregardRules', () => {
    test('should return disregard rules for income', () => {
      const disregards = getDisregardRules('florida');
      
      expect(disregards).toBeDefined();
      expect(disregards.earned).toBe(0.5);
      expect(disregards.unearned).toBe(20);
    });
    
    test('should handle request for unsupported disregard type', () => {
      expect(() => {
        getDisregardRules('florida', 'asset');
      }).toThrow('Unsupported disregard type: asset');
    });
    
    test('should throw error for invalid state', () => {
      expect(() => {
        getDisregardRules('invalid');
      }).toThrow('No Medicaid rules found for state: invalid');
    });
    
    test('should handle state with no disregard rules defined', () => {
      // This assumes your implementation handles undefined disregard rules gracefully
      const disregards = getDisregardRules('texas');
      expect(disregards).toEqual({});
    });
  });
});