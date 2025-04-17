const { 
  assessAnnuityOptions,
  calculateAnnuityParameters,
  developAnnuityRecommendations,
  annuityPlanning
} = require('../annuityPlanning');

describe('Annuity Planning Module', () => {
  // Basic client setup for tests
  const baseClientInfo = {
    name: 'Test Client',
    age: 75,
    maritalStatus: 'single',
    gender: 'female',
    lifeExpectancy: 87
  };

  const baseAssets = {
    countable: 100000,
    home: 250000,
    investments: 80000,
    retirement: 150000,
    automobile: 15000
  };

  const baseIncome = {
    social_security: 1800,
    pension: 1200,
    investment: 500
  };

  const baseState = 'florida';

  // Mock eligibility assessment results
  const baseEligibilityResults = {
    isResourceEligible: false,
    isIncomeEligible: true,
    excessResources: 98000,
    resourceLimit: 2000
  };

  // Mock rules
  const mockRules = {
    florida: {
      assetLimitSingle: 2000,
      assetLimitMarried: 3000,
      incomeLimit: 2523,
      lookbackPeriod: 60,
      annuityRules: {
        mustBeIrrevocable: true,
        mustBeActuariallySound: true,
        mustNameStateRemainder: true,
        maximumTerm: 'lifeExpectancy'
      }
    },
    newyork: {
      assetLimitSingle: 16800,
      assetLimitMarried: 24600,
      incomeLimit: 1563,
      lookbackPeriod: 60,
      annuityRules: {
        mustBeIrrevocable: true,
        mustBeActuariallySound: true,
        mustNameStateRemainder: true,
        maximumTerm: 'lifeExpectancy'
      }
    }
  };

  // Mock the rules loader
// Mock the rules loader
jest.mock('../../utils/medicaidRulesLoader', () => ({
  loadMedicaidRules: jest.fn().mockImplementation((state) => {
    if (state === 'florida') {
      return mockRules.florida;
    } else if (state === 'newyork') {
      return mockRules.newyork;
    } else if (state === 'default') {
      return mockRules.florida; // Use Florida rules for default state
    } else {
      throw new Error(`Rules not found for state: ${state}`);
    }
  })
}));

  // Unit tests for assessAnnuityOptions
  describe('assessAnnuityOptions', () => {
    test('should correctly identify if annuity is appropriate for single person', async () => {
      const result = await assessAnnuityOptions(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseEligibilityResults,
        baseState
      );
      
      expect(result).toBeDefined();
      expect(result.isAppropriate).toBeDefined();
      expect(result.reasons).toBeInstanceOf(Array);
    });

    test('should recommend annuity for excess resources', async () => {
      const result = await assessAnnuityOptions(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseEligibilityResults, // Has excess resources
        baseState
      );
      
      expect(result.isAppropriate).toBe(true);
      expect(result.reasons).toContainEqual(expect.stringMatching(/excess resources/i));
    });

    test('should not recommend annuity when already eligible', async () => {
      const eligResults = {
        isResourceEligible: true,
        isIncomeEligible: true,
        excessResources: 0,
        resourceLimit: 2000
      };
      
      const result = await assessAnnuityOptions(
        baseClientInfo,
        baseAssets,
        baseIncome,
        eligResults, // Already eligible
        baseState
      );
      
      expect(result.isAppropriate).toBe(false);
      expect(result.reasons).toContainEqual(expect.stringMatching(/already eligible/i));
    });

    test('should consider appropriate assets for annuity conversion', async () => {
      const result = await assessAnnuityOptions(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseEligibilityResults,
        baseState
      );
      
      expect(result.suitableAssets).toBeDefined();
      expect(result.suitableAssets).toBeInstanceOf(Array);
      
      // IRA/retirement funds should be identified as suitable
      const hasRetirement = result.suitableAssets.some(asset => 
        asset.type === 'retirement' || asset.type.includes('retirement')
      );
      expect(hasRetirement).toBe(true);
    });

    test('should recommend annuity for community spouse', async () => {
      const clientInfo = {
        ...baseClientInfo,
        maritalStatus: 'married',
        spouseInfo: {
          name: 'Spouse Name',
          age: 70,
          gender: 'male',
          lifeExpectancy: 84,
          needsLongTermCare: false
        }
      };
      
      const result = await assessAnnuityOptions(
        clientInfo,
        baseAssets,
        baseIncome,
        baseEligibilityResults,
        baseState
      );
      
      expect(result.isAppropriate).toBe(true);
      expect(result.spouseConsiderations).toBeDefined();
      expect(result.spouseConsiderations).toContainEqual(expect.stringMatching(/community spouse/i));
    });

    test('should adjust recommendations based on client age', async () => {
      const youngerClient = {
        ...baseClientInfo,
        age: 60
      };
      
      const olderClient = {
        ...baseClientInfo,
        age: 90
      };
      
      const resultYounger = await assessAnnuityOptions(
        youngerClient,
        baseAssets,
        baseIncome,
        baseEligibilityResults,
        baseState
      );
      
      const resultOlder = await assessAnnuityOptions(
        olderClient,
        baseAssets,
        baseIncome,
        baseEligibilityResults,
        baseState
      );
      
      // Age should impact the recommendation
      expect(resultYounger.ageConsiderations).toBeDefined();
      expect(resultOlder.ageConsiderations).toBeDefined();
      expect(resultYounger.ageConsiderations).not.toEqual(resultOlder.ageConsiderations);
    });

    test('should identify tax implications of annuity conversion', async () => {
      const result = await assessAnnuityOptions(
        baseClientInfo,
        {
          ...baseAssets,
          retirement: 250000 // Large retirement account
        },
        baseIncome,
        baseEligibilityResults,
        baseState
      );
      
      expect(result.taxConsiderations).toBeDefined();
      expect(result.taxConsiderations).toContainEqual(expect.stringMatching(/tax/i));
    });
  });

  // Unit tests for calculateAnnuityParameters
  describe('calculateAnnuityParameters', () => {
    test('should calculate appropriate annuity parameters for client', () => {
      const options = {
        isAppropriate: true,
        suitableAssets: [
          { type: 'countable', amount: 100000 },
          { type: 'retirement', amount: 150000 }
        ],
        recommendedAmount: 100000
      };
      
      const result = calculateAnnuityParameters(
        options,
        baseClientInfo,
        baseIncome,
        baseEligibilityResults,
        baseState
      );
      
      expect(result).toBeDefined();
      expect(result.principal).toBeDefined();
      expect(result.term).toBeDefined();
      expect(result.monthlyPayment).toBeDefined();
    });

    test('should use appropriate term based on life expectancy', () => {
      const options = {
        isAppropriate: true,
        suitableAssets: [{ type: 'countable', amount: 100000 }],
        recommendedAmount: 100000
      };
      
      const result = calculateAnnuityParameters(
        options,
        baseClientInfo, // Age 75, life expectancy 87
        baseIncome,
        baseEligibilityResults,
        baseState
      );
      
      // Term should be based on life expectancy (87 - 75 = 12 years)
      expect(result.term).toBeCloseTo(12, 1);
      expect(result.termMonths).toBe(144); // 12 years * 12 months
    });

    test('should calculate monthly payment correctly', () => {
      const options = {
        isAppropriate: true,
        suitableAssets: [{ type: 'countable', amount: 120000 }],
        recommendedAmount: 120000
      };
      
      const result = calculateAnnuityParameters(
        options,
        baseClientInfo,
        baseIncome,
        baseEligibilityResults,
        baseState
      );
      
      // Principal $120,000 over 12 years (144 months) would be approximately $833/month
      // not accounting for interest
      expect(result.monthlyPayment).toBeGreaterThan(800);
    });

    test('should adjust parameters based on income eligibility', () => {
      const options = {
        isAppropriate: true,
        suitableAssets: [{ type: 'countable', amount: 100000 }],
        recommendedAmount: 100000
      };
      
      // Client has excess income
      const eligResults = {
        isResourceEligible: false,
        isIncomeEligible: false,
        excessResources: 98000,
        excessIncome: 500,
        resourceLimit: 2000,
        incomeLimit: 2500
      };
      
      const result = calculateAnnuityParameters(
        options,
        baseClientInfo,
        baseIncome,
        eligResults,
        baseState
      );
      
      expect(result.incomeConsiderations).toBeDefined();
      expect(result.incomeConsiderations).toContainEqual(expect.stringMatching(/excess income/i));
    });

    test('should provide minimum state-compliant term', () => {
      const options = {
        isAppropriate: true,
        suitableAssets: [{ type: 'countable', amount: 100000 }],
        recommendedAmount: 100000
      };
      
      const result = calculateAnnuityParameters(
        options,
        baseClientInfo,
        baseIncome,
        baseEligibilityResults,
        baseState
      );
      
      expect(result.minimumCompliantTerm).toBeDefined();
      expect(result.isCompliant).toBe(true);
    });

    test('should warn if term exceeds life expectancy', () => {
      const options = {
        isAppropriate: true,
        suitableAssets: [{ type: 'countable', amount: 100000 }],
        recommendedAmount: 100000,
        suggestedTerm: 25 // Longer than life expectancy
      };
      
      const result = calculateAnnuityParameters(
        options,
        baseClientInfo, // Age 75, life expectancy 87 (12 years)
        baseIncome,
        baseEligibilityResults,
        baseState
      );
      
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContainEqual(expect.stringMatching(/exceeds life expectancy/i));
      expect(result.isCompliant).toBe(false);
    });
  });

  // Unit tests for developAnnuityRecommendations
  describe('developAnnuityRecommendations', () => {
    test('should develop appropriate recommendations when annuity is suitable', () => {
      const options = {
        isAppropriate: true,
        suitableAssets: [
          { type: 'countable', amount: 100000 },
          { type: 'retirement', amount: 150000 }
        ],
        recommendedAmount: 100000,
        reasons: ['excess resources']
      };
      
      const parameters = {
        principal: 100000,
        term: 12,
        termMonths: 144,
        monthlyPayment: 850,
        isCompliant: true
      };
      
      const result = developAnnuityRecommendations(
        options,
        parameters,
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseState
      );
      
      expect(result).toBeDefined();
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.implementationSteps).toBeInstanceOf(Array);
    });

    test('should identify specific annuity providers when appropriate', () => {
      const options = {
        isAppropriate: true,
        suitableAssets: [{ type: 'countable', amount: 100000 }],
        recommendedAmount: 100000,
        reasons: ['excess resources']
      };
      
      const parameters = {
        principal: 100000,
        term: 12,
        termMonths: 144,
        monthlyPayment: 850,
        isCompliant: true
      };
      
      const result = developAnnuityRecommendations(
        options,
        parameters,
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseState
      );
      
      expect(result.providerRecommendations).toBeDefined();
    });

    test('should include state-specific compliance requirements', () => {
      const options = {
        isAppropriate: true,
        suitableAssets: [{ type: 'countable', amount: 100000 }],
        recommendedAmount: 100000,
        reasons: ['excess resources']
      };
      
      const parameters = {
        principal: 100000,
        term: 12,
        termMonths: 144,
        monthlyPayment: 850,
        isCompliant: true
      };
      
      const result = developAnnuityRecommendations(
        options,
        parameters,
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseState
      );
      
      expect(result.complianceRequirements).toBeDefined();
      expect(result.complianceRequirements).toContainEqual(expect.stringMatching(/state/i));
    });

    test('should provide coordination requirements with other planning', () => {
      const options = {
        isAppropriate: true,
        suitableAssets: [{ type: 'countable', amount: 100000 }],
        recommendedAmount: 100000,
        reasons: ['excess resources']
      };
      
      const parameters = {
        principal: 100000,
        term: 12,
        termMonths: 144,
        monthlyPayment: 850,
        isCompliant: true
      };
      
      const result = developAnnuityRecommendations(
        options,
        parameters,
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseState
      );
      
      expect(result.planningCoordination).toBeDefined();
      expect(result.planningCoordination).toContainEqual(expect.stringMatching(/timing/i));
    });

    test('should not provide recommendations when annuity is inappropriate', () => {
      const options = {
        isAppropriate: false,
        reasons: ['already eligible']
      };
      
      const parameters = null;
      
      const result = developAnnuityRecommendations(
        options,
        parameters,
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseState
      );
      
      expect(result.recommendations).toContainEqual(expect.stringMatching(/not recommended/i));
    });

    test('should recommend alternative strategies when annuity isn\'t ideal', () => {
      const options = {
        isAppropriate: false,
        reasons: ['client health concerns'],
        alternativeStrategies: ['spend-down', 'trust planning']
      };
      
      const parameters = null;
      
      const result = developAnnuityRecommendations(
        options,
        parameters,
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseState
      );
      
      expect(result.alternativeStrategies).toBeDefined();
      expect(result.alternativeStrategies.length).toBeGreaterThan(0);
    });
  });

  // Integration tests for annuityPlanning
  describe('annuityPlanning', () => {
    test('should perform complete annuity planning process', async () => {
      const result = await annuityPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseEligibilityResults,
        baseState
      );
      
      expect(result).toBeDefined();
      expect(result.status).toBe('success');
      expect(result.options).toBeDefined();
      expect(result.parameters).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    test('should handle scenario where annuity is not appropriate', async () => {
      const eligResults = {
        isResourceEligible: true,
        isIncomeEligible: true,
        excessResources: 0,
        resourceLimit: 2000
      };
      
      const result = await annuityPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        eligResults, // Already eligible
        baseState
      );
      
      expect(result.options.isAppropriate).toBe(false);
      expect(result.recommendations).toContainEqual(expect.stringMatching(/not recommended/i));
    });

    test('should handle married couples with community spouse considerations', async () => {
      const clientInfo = {
        ...baseClientInfo,
        maritalStatus: 'married',
        spouseInfo: {
          name: 'Spouse Name',
          age: 70,
          gender: 'male',
          lifeExpectancy: 84,
          needsLongTermCare: false
        }
      };
      
      const result = await annuityPlanning(
        clientInfo,
        baseAssets,
        baseIncome,
        baseEligibilityResults,
        baseState
      );
      
      expect(result.options.spouseConsiderations).toBeDefined();
      expect(result.recommendations).toContainEqual(expect.stringMatching(/spouse/i));
    });

    test('should handle errors gracefully', async () => {
      // Test with invalid state
      const result = await annuityPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseEligibilityResults,
        'invalid'
      );
      
      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
    });

    test('should provide comprehensive planning report', async () => {
      const result = await annuityPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseEligibilityResults,
        baseState
      );
      
      expect(result.planningReport).toBeDefined();
      expect(result.planningReport.summary).toBeDefined();
      expect(result.planningReport.recommendations).toBeInstanceOf(Array);
    });

    test('should handle different state rules appropriately', async () => {
      const resultFL = await annuityPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseEligibilityResults,
        'florida'
      );
      
      const resultNY = await annuityPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseEligibilityResults,
        'newyork'
      );
      
      // Recommendations should vary by state
      expect(resultFL.stateSpecificConsiderations).not.toEqual(resultNY.stateSpecificConsiderations);
    });
  });
});