// src/services/planning/__tests__/trustPlanning.test.js

const {
  assessTrustNeeds,
  evaluateTrustOptions,
  determineTrustFunding,
  trustPlanning
} = require('../trustPlanning');

describe('Trust Planning Module', () => {
  // Basic client setup for tests
  const baseClientInfo = {
    name: 'Test Client',
    age: 75,
    maritalStatus: 'single'
  };

  const baseAssets = {
    countable: 100000,
    home: 250000,
    investments: 80000,
    retirement: 150000,
    automobile: 15000,
    personal_property: 20000
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
      lookbackPeriod: 60,
      annualGiftExclusion: 18000
    },
    newyork: {
      assetLimitSingle: 16800,
      lookbackPeriod: 60,
      annualGiftExclusion: 18000
    }
  };

  // Mock the rules loader
  jest.mock('../medicaidRulesLoader', () => ({
    getMedicaidRules: jest.fn((state) => {
      if (state === 'florida') {
        return mockRules.florida;
      } else if (state === 'newyork') {
        return mockRules.newyork;
      } else {
        throw new Error(`Rules not found for state: ${state}`);
      }
    })
  }));

  // Unit tests for assessTrustNeeds
  describe('assessTrustNeeds', () => {
    test('should correctly identify need for trust with excess resources', () => {
      const result = assessTrustNeeds(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseEligibilityResults,
        baseState
      );

      expect(result).toBeDefined();
      expect(result.needsTrust).toBe(true);
      expect(result.reasons).toContain('excess resources');
      expect(result.excessAmount).toBe(98000);
    });

    test('should identify no trust need when eligible', () => {
      const eligibilityResults = {
        isResourceEligible: true,
        isIncomeEligible: true,
        excessResources: 0,
        resourceLimit: 2000
      };

      const result = assessTrustNeeds(
        baseClientInfo,
        baseAssets,
        baseIncome,
        eligibilityResults,
        baseState
      );

      expect(result.needsTrust).toBe(false);
    });

    test('should consider family situation in trust assessment', () => {
      const clientInfo = {
        ...baseClientInfo,
        maritalStatus: 'married',
        spouseInfo: {
          name: 'Spouse',
          age: 72,
          needsLongTermCare: false
        },
        children: [
          { name: 'Child 1', age: 45, specialNeeds: false },
          { name: 'Child 2', age: 42, specialNeeds: true }
        ]
      };

      const result = assessTrustNeeds(
        clientInfo,
        baseAssets,
        baseIncome,
        baseEligibilityResults,
        baseState
      );

      expect(result.needsTrust).toBe(true);
      expect(result.familyConsiderations).toBeDefined();
      expect(result.familyConsiderations).toContain('special needs child');
    });

    test('should consider income needs for income-only trust', () => {
      const eligibilityResults = {
        isResourceEligible: true,
        isIncomeEligible: false,
        excessIncome: 500,
        incomeLimit: 2500
      };

      const result = assessTrustNeeds(
        baseClientInfo,
        baseAssets,
        baseIncome,
        eligibilityResults,
        baseState
      );

      expect(result.needsTrust).toBe(true);
      expect(result.trustType).toContain('income');
    });

    test('should properly assess risk levels for asset transfer strategies', () => {
      const clientInfo = {
        ...baseClientInfo,
        age: 85 // Older client with health issues
      };

      const medicalInfo = {
        diagnoses: ['alzheimer\'s', 'heart disease'],
        adlLimitations: ['bathing', 'dressing', 'toileting', 'transferring']
      };

      const result = assessTrustNeeds(
        clientInfo,
        baseAssets,
        baseIncome,
        baseEligibilityResults,
        baseState,
        medicalInfo
      );

      expect(result.needsTrust).toBe(true);
      expect(result.riskAssessment).toBeDefined();
      expect(result.riskAssessment.transferRisk).toBe('high');
    });

    test('should handle missing or incomplete data gracefully', () => {
      // Test with minimal client info
      const result = assessTrustNeeds(
        { age: 78 }, // Minimal client info
        baseAssets,
        baseIncome,
        baseEligibilityResults,
        baseState
      );

      expect(result).toBeDefined();
      expect(result.needsTrust).toBeDefined();
      expect(result.dataConcerns).toBeDefined();
    });
  });

  // Unit tests for evaluateTrustOptions
  describe('evaluateTrustOptions', () => {
    test('should evaluate different trust types based on needs assessment', () => {
      const needsAssessment = {
        needsTrust: true,
        reasons: ['excess resources'],
        excessAmount: 98000,
        trustType: ['asset protection']
      };

      const result = evaluateTrustOptions(
        needsAssessment,
        baseClientInfo,
        baseAssets,
        baseState
      );

      expect(result).toBeDefined();
      expect(result.recommendedTrustTypes).toBeInstanceOf(Array);
      expect(result.optionComparison).toBeDefined();
    });

    test('should recommend irrevocable trust for Medicaid planning', () => {
      const needsAssessment = {
        needsTrust: true,
        reasons: ['excess resources'],
        excessAmount: 98000,
        trustType: ['asset protection']
      };

      const result = evaluateTrustOptions(
        needsAssessment,
        baseClientInfo,
        baseAssets,
        baseState
      );

      expect(result.recommendedTrustTypes).toContain('irrevocable medicaid asset protection trust');
    });

    test('should recommend pooled trust for older clients', () => {
      const needsAssessment = {
        needsTrust: true,
        reasons: ['excess resources'],
        excessAmount: 98000,
        trustType: ['asset protection']
      };

      const clientInfo = {
        ...baseClientInfo,
        age: 88 // Very elderly client
      };

      const result = evaluateTrustOptions(
        needsAssessment,
        clientInfo,
        baseAssets,
        baseState
      );

      expect(result.recommendedTrustTypes).toContain('pooled trust');
      // Age-based recommendation
      expect(result.recommendations).toContain(expect.stringMatching(/age/i));
    });

    test('should recommend special needs trust when applicable', () => {
      const needsAssessment = {
        needsTrust: true,
        reasons: ['special needs planning'],
        familyConsiderations: ['special needs child']
      };

      const clientInfo = {
        ...baseClientInfo,
        children: [
          { name: 'Child', age: 40, specialNeeds: true }
        ]
      };

      const result = evaluateTrustOptions(
        needsAssessment,
        clientInfo,
        baseAssets,
        baseState
      );

      expect(result.recommendedTrustTypes).toContain('special needs trust');
    });

    test('should compare trust options with pros and cons', () => {
      const needsAssessment = {
        needsTrust: true,
        reasons: ['excess resources'],
        excessAmount: 98000,
        trustType: ['asset protection']
      };

      const result = evaluateTrustOptions(
        needsAssessment,
        baseClientInfo,
        baseAssets,
        baseState
      );

      // Should have comparison data for multiple trust types
      expect(Object.keys(result.optionComparison).length).toBeGreaterThan(1);
      
      // Each option should have pros and cons
      Object.values(result.optionComparison).forEach(option => {
        expect(option.pros).toBeInstanceOf(Array);
        expect(option.cons).toBeInstanceOf(Array);
      });
    });

    test('should consider state-specific trust rules', () => {
      const needsAssessment = {
        needsTrust: true,
        reasons: ['excess resources'],
        excessAmount: 98000,
        trustType: ['asset protection']
      };

      // Test with Florida
      const resultFL = evaluateTrustOptions(
        needsAssessment,
        baseClientInfo,
        baseAssets,
        'florida'
      );
      
      // Test with New York
      const resultNY = evaluateTrustOptions(
        needsAssessment,
        baseClientInfo,
        baseAssets,
        'newyork'
      );
      
      // Should have different recommendations based on state
      expect(resultFL.stateSpecificConsiderations).not.toEqual(resultNY.stateSpecificConsiderations);
    });
  });

  // Unit tests for determineTrustFunding
  describe('determineTrustFunding', () => {
    test('should develop appropriate funding strategy for selected trust', () => {
      const trustOptions = {
        recommendedTrustTypes: ['irrevocable medicaid asset protection trust'],
        optionComparison: {
          'irrevocable': {
            pros: ['Medicaid compliant after lookback period'],
            cons: ['Loss of control', '5-year lookback period']
          }
        }
      };

      const result = determineTrustFunding(
        trustOptions,
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseState
      );

      expect(result).toBeDefined();
      expect(result.fundingStrategy).toBeDefined();
      expect(result.assetsToTransfer).toBeInstanceOf(Array);
      expect(result.timelineRecommendations).toBeDefined();
    });

    test('should recommend which assets to transfer to trust', () => {
      const trustOptions = {
        recommendedTrustTypes: ['irrevocable medicaid asset protection trust']
      };

      const result = determineTrustFunding(
        trustOptions,
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseState
      );

      expect(result.assetsToTransfer.length).toBeGreaterThan(0);
      // Should specify amounts for each asset
      result.assetsToTransfer.forEach(asset => {
        expect(asset.name).toBeDefined();
        expect(asset.amount).toBeDefined();
        expect(asset.reason).toBeDefined();
      });
    });

    test('should retain sufficient assets for living expenses', () => {
      const trustOptions = {
        recommendedTrustTypes: ['irrevocable medicaid asset protection trust']
      };

      const result = determineTrustFunding(
        trustOptions,
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseState
      );

      expect(result.assetsToRetain).toBeDefined();
      expect(result.assetsToRetain.length).toBeGreaterThan(0);
      expect(result.retentionReasoning).toContain('living expenses');
    });

    test('should consider lookback period in funding timeline', () => {
      const trustOptions = {
        recommendedTrustTypes: ['irrevocable medicaid asset protection trust']
      };

      const result = determineTrustFunding(
        trustOptions,
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseState
      );

      expect(result.timelineRecommendations).toContain(expect.stringMatching(/lookback/i));
      expect(result.planningHorizon).toBeDefined();
      expect(result.planningHorizon.lookbackCompleted).toBeDefined();
    });

    test('should provide income projections after trust funding', () => {
      const trustOptions = {
        recommendedTrustTypes: ['irrevocable medicaid asset protection trust']
      };

      const result = determineTrustFunding(
        trustOptions,
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseState
      );

      expect(result.incomeProjections).toBeDefined();
      expect(result.incomeProjections.beforeTrust).toBeDefined();
      expect(result.incomeProjections.afterTrust).toBeDefined();
    });

    test('should handle older clients with shorter planning horizons', () => {
      const trustOptions = {
        recommendedTrustTypes: ['pooled trust']
      };

      const clientInfo = {
        ...baseClientInfo,
        age: 90 // Very elderly client
      };

      const result = determineTrustFunding(
        trustOptions,
        clientInfo,
        baseAssets,
        baseIncome,
        baseState
      );

      expect(result.urgencyLevel).toBe('high');
      expect(result.alternativePlanningStrategies).toBeDefined();
      expect(result.alternativePlanningStrategies.length).toBeGreaterThan(0);
    });
  });

  // Integration tests for trustPlanning
  describe('trustPlanning', () => {
    test('should perform complete trust planning process', async () => {
      const result = await trustPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseEligibilityResults,
        baseState
      );

      expect(result).toBeDefined();
      expect(result.needsAssessment).toBeDefined();
      expect(result.trustOptions).toBeDefined();
      expect(result.fundingStrategy).toBeDefined();
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    test('should include attorney referral information in plan', async () => {
      const result = await trustPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseEligibilityResults,
        baseState
      );

      expect(result.implementationResources).toBeDefined();
      expect(result.implementationResources).toContain(expect.stringMatching(/attorney/i));
    });

    test('should handle scenario with no trust needed', async () => {
      const eligibilityResults = {
        isResourceEligible: true,
        isIncomeEligible: true,
        excessResources: 0,
        resourceLimit: 2000
      };

      const result = await trustPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        eligibilityResults,
        baseState
      );

      expect(result.needsAssessment.needsTrust).toBe(false);
      expect(result.recommendations).toContain(expect.stringMatching(/trust.*not needed/i));
    });

    test('should handle income trust planning when needed', async () => {
      const eligibilityResults = {
        isResourceEligible: true,
        isIncomeEligible: false,
        excessIncome: 500,
        incomeLimit: 2500
      };

      const result = await trustPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        eligibilityResults,
        baseState
      );

      expect(result.needsAssessment.needsTrust).toBe(true);
      expect(result.needsAssessment.trustType).toContain('income');
      expect(result.recommendations).toContain(expect.stringMatching(/income trust/i));
    });

    test('should handle errors gracefully', async () => {
      // Test with invalid state
      const result = await trustPlanning(
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
      const result = await trustPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseEligibilityResults,
        baseState
      );

      expect(result.planningReport).toBeDefined();
      expect(result.planningReport.summary).toBeDefined();
      expect(result.planningReport.recommendations).toBeInstanceOf(Array);
      expect(result.planningReport.nextSteps).toBeInstanceOf(Array);
    });
  });
});