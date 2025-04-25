// src/services/planning/__tests__/trustPlanning.test.js

jest.mock('../../../config/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

jest.mock('../../utils/medicaidRulesLoader', () => ({
  getMedicaidRules: jest.fn((state) => {
    if (state === 'florida') {
      return {
        assetLimitSingle: 2000,
        lookbackPeriod: 60,
        annualGiftExclusion: 18000
      };
    } else if (state === 'newyork') {
      return {
        assetLimitSingle: 16800,
        lookbackPeriod: 60,
        annualGiftExclusion: 18000
      };
    } else if (state === 'california') {
      return {
        assetLimitSingle: 2000,
        lookbackPeriod: 30,
        annualGiftExclusion: 18000
      };
    } else {
      throw new Error(`Rules not found for state: ${state}`);
    }
  })
}));

const {
  assessTrustNeeds,
  evaluateTrustOptions,
  determineTrustFunding,
  trustPlanning
} = require('../trustPlanning');

describe('Trust Planning Module', () => {
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

  const baseEligibilityResults = {
    isResourceEligible: false,
    isIncomeEligible: true,
    excessResources: 98000,
    resourceLimit: 2000
  };

  const containsStringMatching = (array, pattern) => {
    return array.some(item => pattern.test(item));
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

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
        age: 85
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
      expect(result.riskAssessment.transferRisk).toBe('high');
    });

    test('should handle missing or incomplete data gracefully', () => {
      const result = assessTrustNeeds(
        { age: 78 },
        baseAssets,
        baseIncome,
        baseEligibilityResults,
        baseState
      );

      expect(result).toBeDefined();
      expect(result.dataConcerns).toContain('Incomplete input data');
    });

    test('should handle very young client correctly', () => {
      const clientInfo = {
        ...baseClientInfo,
        age: 60
      };

      const result = assessTrustNeeds(
        clientInfo,
        baseAssets,
        baseIncome,
        baseEligibilityResults,
        baseState
      );

      expect(result.needsTrust).toBe(true);
      expect(result.riskAssessment).toBeUndefined();
    });

    test('should handle missing assets gracefully', () => {
      const result = assessTrustNeeds(
        baseClientInfo,
        {},
        baseIncome,
        baseEligibilityResults,
        baseState
      );

      expect(result.needsTrust).toBe(true);
      expect(result.reasons).toContain('excess resources');
    });
  });

  describe('evaluateTrustOptions', () => {
    const needsAssessment = {
      needsTrust: true,
      reasons: ['excess resources'],
      excessAmount: 98000,
      trustType: ['asset protection']
    };

    test('should evaluate different trust types based on needs assessment', () => {
      const result = evaluateTrustOptions(
        needsAssessment,
        baseClientInfo,
        baseAssets,
        baseState
      );

      expect(result.recommendedTrustTypes).toBeInstanceOf(Array);
      expect(result.optionComparison).toBeDefined();
    });

    test('should recommend irrevocable trust for Medicaid planning', () => {
      const result = evaluateTrustOptions(
        needsAssessment,
        baseClientInfo,
        baseAssets,
        baseState
      );

      expect(result.recommendedTrustTypes).toContain('irrevocable medicaid asset protection trust');
    });

    test('should recommend pooled trust for older clients', () => {
      const clientInfo = {
        ...baseClientInfo,
        age: 88
      };

      const result = evaluateTrustOptions(
        needsAssessment,
        clientInfo,
        baseAssets,
        baseState
      );

      expect(result.recommendedTrustTypes).toContain('pooled trust');
      expect(containsStringMatching(result.recommendations, /age/i)).toBe(true);
    });

    test('should recommend special needs trust when applicable', () => {
      const needsAssessmentWithSpecialNeeds = {
        needsTrust: true,
        reasons: ['special needs planning'],
        familyConsiderations: ['special needs child']
      };

      const clientInfo = {
        ...baseClientInfo,
        children: [{ name: 'Child', age: 40, specialNeeds: true }]
      };

      const result = evaluateTrustOptions(
        needsAssessmentWithSpecialNeeds,
        clientInfo,
        baseAssets,
        baseState
      );

      expect(result.recommendedTrustTypes).toContain('special needs trust');
    });

    test('should compare trust options with pros and cons', () => {
      const result = evaluateTrustOptions(
        needsAssessment,
        baseClientInfo,
        baseAssets,
        baseState
      );

      expect(Object.keys(result.optionComparison).length).toBeGreaterThan(1);
      Object.values(result.optionComparison).forEach(option => {
        expect(option.pros).toBeInstanceOf(Array);
        expect(option.cons).toBeInstanceOf(Array);
      });
    });

    test('should consider state-specific trust rules', () => {
      const resultFL = evaluateTrustOptions(
        needsAssessment,
        baseClientInfo,
        baseAssets,
        'florida'
      );

      const resultNY = evaluateTrustOptions(
        needsAssessment,
        baseClientInfo,
        baseAssets,
        'newyork'
      );

      const resultCA = evaluateTrustOptions(
        needsAssessment,
        baseClientInfo,
        baseAssets,
        'california'
      );

      expect(resultFL.stateSpecificConsiderations).not.toEqual(resultNY.stateSpecificConsiderations);
      expect(resultFL.stateSpecificConsiderations).not.toEqual(resultCA.stateSpecificConsiderations);
    });
  });

  describe('determineTrustFunding', () => {
    const trustOptions = {
      recommendedTrustTypes: ['irrevocable medicaid asset protection trust'],
      optionComparison: {
        'irrevocable': {
          pros: ['Medicaid compliant after lookback period'],
          cons: ['Loss of control', '5-year lookback period']
        }
      }
    };

    test('should develop appropriate funding strategy for selected trust', () => {
      const result = determineTrustFunding(
        trustOptions,
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseState
      );

      expect(result.fundingStrategy).toBeDefined();
      expect(result.assetsToTransfer).toBeInstanceOf(Array);
      expect(result.timelineRecommendations).toBeDefined();
    });

    test('should recommend which assets to transfer to trust', () => {
      const result = determineTrustFunding(
        trustOptions,
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseState
      );

      expect(result.assetsToTransfer.length).toBeGreaterThan(0);
      result.assetsToTransfer.forEach(asset => {
        expect(asset.name).toBeDefined();
        expect(asset.amount).toBeDefined();
        expect(asset.reason).toBeDefined();
      });
    });

    test('should retain sufficient assets for living expenses', () => {
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
      const result = determineTrustFunding(
        trustOptions,
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseState
      );

      expect(containsStringMatching(result.timelineRecommendations, /lookback/i)).toBe(true);
      expect(result.planningHorizon).toBeDefined();
    });

    test('should provide income projections after trust funding', () => {
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
      const clientInfo = {
        ...baseClientInfo,
        age: 90
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
    });

    test('should handle missing income gracefully', () => {
      const result = determineTrustFunding(
        trustOptions,
        baseClientInfo,
        baseAssets,
        {},
        baseState
      );

      expect(result.incomeProjections.beforeTrust).toBe(0);
      expect(result.incomeProjections.afterTrust).toBe(0);
    });
  });

  describe('trustPlanning', () => {
    test('should perform complete trust planning process', async () => {
      const result = await trustPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseEligibilityResults,
        baseState
      );

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

      expect(result.implementationResources).toContain('Consult elder law attorney');
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
      expect(containsStringMatching(result.recommendations, /trust.*not needed/i)).toBe(true);
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

      expect(result.needsAssessment.trustType).toContain('income');
      expect(containsStringMatching(result.recommendations, /income trust/i)).toBe(true);
    });

    test('should handle errors gracefully', async () => {
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

      expect(result.planningReport.summary).toBeDefined();
      expect(result.planningReport.recommendations).toBeInstanceOf(Array);
      expect(result.planningReport.nextSteps).toBeInstanceOf(Array);
    });

    test('should handle invalid client info gracefully', async () => {
      const result = await trustPlanning(
        {},
        baseAssets,
        baseIncome,
        baseEligibilityResults,
        baseState
      );

      expect(result.needsAssessment.dataConcerns).toContain('Incomplete client information');
    });
  });
});