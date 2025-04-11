// src/services/planning/__tests__/medicaidPlanning.test.js

const { medicaidPlanning } = require('../medicaidPlanning');

// Mock all dependent modules
jest.mock('../carePlanning', () => ({
  assessCareNeeds: jest.fn(),
  recommendCareSettings: jest.fn(),
  carePlanning: jest.fn().mockResolvedValue({
    status: 'success',
    careNeeds: {
      recommendedCareLevel: 'nursing'
    },
    recommendations: ['Consider nursing facility care']
  })
}));

jest.mock('../eligibilityAssessment', () => ({
  assessIncome: jest.fn(),
  assessAssets: jest.fn(),
  assessEligibility: jest.fn(),
  eligibilityAssessment: jest.fn().mockResolvedValue({
    status: 'success',
    isResourceEligible: false,
    isIncomeEligible: true,
    excessResources: 98000,
    resourceLimit: 2000,
    strategies: ['Reduce countable assets']
  })
}));

jest.mock('../assetPlanning', () => ({
  analyzeAssets: jest.fn(),
  medicaidAssetPlanning: jest.fn().mockResolvedValue({
    status: 'success',
    strategies: ['Transfer home to spouse', 'Spend down on exempt assets'],
    implementation: ['Consult elder law attorney']
  })
}));

jest.mock('../incomePlanning', () => ({
  analyzeIncome: jest.fn(),
  medicaidIncomePlanning: jest.fn().mockResolvedValue({
    status: 'success',
    strategies: ['Establish Qualified Income Trust'],
    implementation: ['Set up income trust with attorney assistance']
  })
}));

jest.mock('../annuityPlanning', () => ({
  assessAnnuityOptions: jest.fn(),
  annuityPlanning: jest.fn().mockResolvedValue({
    status: 'success',
    isAppropriate: true,
    strategies: ['Purchase Medicaid-compliant annuity'],
    recommendations: ['Convert IRA to annuity']
  })
}));

jest.mock('../trustPlanning', () => ({
  assessTrustNeeds: jest.fn(),
  trustPlanning: jest.fn().mockResolvedValue({
    status: 'success',
    needsAssessment: { needsTrust: true },
    recommendations: ['Set up irrevocable trust']
  })
}));

jest.mock('../divestmentPlanning', () => ({
  analyzePastTransfers: jest.fn(),
  divestmentPlanning: jest.fn().mockResolvedValue({
    status: 'success',
    penaltyPeriodEstimate: 0,
    strategies: ['No problematic past transfers identified']
  })
}));

jest.mock('../communitySpousePlanning', () => ({
  assessCommunitySpouseNeeds: jest.fn(),
  communitySpousePlanning: jest.fn().mockResolvedValue({
    status: 'success',
    mmnaCalculation: {
      allowance: 3216
    },
    csraCalculation: {
      allowance: 130380
    },
    strategies: ['Maximize CSRA']
  })
}));

jest.mock('../postEligibilityPlanning', () => ({
  developMaintenancePlan: jest.fn(),
  postEligibilityPlanning: jest.fn().mockResolvedValue({
    status: 'success',
    strategies: ['Establish personal needs allowance account'],
    maintenancePlan: {
      personalAllowance: 130,
      monthlyContributions: 3000
    }
  })
}));

jest.mock('../estateRecovery', () => ({
  assessEstateRecoveryRisk: jest.fn(),
  estateRecoveryPlanning: jest.fn().mockResolvedValue({
    status: 'success',
    riskAssessment: { riskLevel: 'high' },
    strategies: ['Consider life estate deed']
  })
}));

jest.mock('../applicationPlanning', () => ({
  prepareApplicationTimeline: jest.fn(),
  applicationPlanning: jest.fn().mockResolvedValue({
    status: 'success',
    timeline: {
      preparationTime: '4-6 weeks',
      applicationDate: 'After trust funding'
    },
    recommendations: ['Gather all financial statements']
  })
}));

jest.mock('../relatedBenefits', () => ({
  identifyRelatedBenefits: jest.fn(),
  relatedBenefitsPlanning: jest.fn().mockResolvedValue({
    status: 'success',
    possibleBenefits: ['SNAP', 'Medicare Savings Programs'],
    applicationStrategies: [
      { benefit: 'SNAP', steps: ['Apply online'] }
    ]
  })
}));

jest.mock('../medicaidRulesLoader', () => ({
  getMedicaidRules: jest.fn().mockReturnValue({
    assetLimitSingle: 2000,
    assetLimitMarried: 3000,
    incomeLimit: 2382,
    lookbackPeriod: 60
  })
}));

describe('Medicaid Planning Integration Module', () => {
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
    automobile: 15000
  };

  const baseIncome = {
    social_security: 1800,
    pension: 1200,
    investment: 500
  };

  const baseExpenses = {
    housing: 1500,
    medical: 400,
    food: 500,
    transportation: 200
  };

  const baseMedicalInfo = {
    diagnoses: ['dementia', 'hypertension'],
    medications: ['aricept', 'lisinopril'],
    adlLimitations: ['bathing', 'dressing', 'toileting']
  };

  const baseLivingInfo = {
    currentSetting: 'home',
    caregiverSupport: 'part-time'
  };

  const baseState = 'florida';

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Integration tests for medicaidPlanning
  describe('medicaidPlanning', () => {
    test('should perform complete Medicaid planning process successfully', async () => {
      const result = await medicaidPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseMedicalInfo,
        baseLivingInfo,
        baseState
      );
      
      expect(result).toBeDefined();
      expect(result.status).toBe('success');
      
      // Should include results from all planning modules
      expect(result.careResults).toBeDefined();
      expect(result.eligibilityResults).toBeDefined();
      expect(result.assetPlanningResults).toBeDefined();
      expect(result.incomePlanningResults).toBeDefined();
      expect(result.annuityPlanningResults).toBeDefined();
      expect(result.trustPlanningResults).toBeDefined();
    });

    test('should call all planning modules with correct parameters', async () => {
      const { carePlanning } = require('../carePlanning');
      const { eligibilityAssessment } = require('../eligibilityAssessment');
      const { medicaidAssetPlanning } = require('../assetPlanning');
      
      await medicaidPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseMedicalInfo,
        baseLivingInfo,
        baseState
      );
      
      // Check that each module was called with appropriate parameters
      expect(carePlanning).toHaveBeenCalledWith(
        expect.objectContaining(baseClientInfo),
        expect.objectContaining(baseMedicalInfo),
        expect.objectContaining(baseLivingInfo),
        baseState
      );
      
      expect(eligibilityAssessment).toHaveBeenCalledWith(
        expect.objectContaining(baseClientInfo),
        expect.objectContaining(baseAssets),
        expect.objectContaining(baseIncome),
        baseState
      );
      
      expect(medicaidAssetPlanning).toHaveBeenCalledWith(
        expect.objectContaining(baseClientInfo),
        expect.objectContaining(baseAssets),
        baseState,
        expect.anything() // Eligibility results
      );
    });

    test('should handle married couples with community spouse planning', async () => {
      const { communitySpousePlanning } = require('../communitySpousePlanning');
      
      const marriedClientInfo = {
        ...baseClientInfo,
        maritalStatus: 'married',
        spouseInfo: {
          name: 'Spouse Name',
          age: 73,
          needsLongTermCare: false
        }
      };
      
      await medicaidPlanning(
        marriedClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseMedicalInfo,
        baseLivingInfo,
        baseState
      );
      
      // Should call community spouse planning for married clients
      expect(communitySpousePlanning).toHaveBeenCalled();
    });

    test('should skip community spouse planning for single clients', async () => {
      const { communitySpousePlanning } = require('../communitySpousePlanning');
      
      await medicaidPlanning(
        baseClientInfo, // Single client
        baseAssets,
        baseIncome,
        baseExpenses,
        baseMedicalInfo,
        baseLivingInfo,
        baseState
      );
      
      // Should not call community spouse planning for single clients
      expect(communitySpousePlanning).not.toHaveBeenCalled();
    });

    test('should generate comprehensive planning report', async () => {
      const result = await medicaidPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseMedicalInfo,
        baseLivingInfo,
        baseState
      );
      
      expect(result.planningReport).toBeDefined();
      expect(result.planningReport.summary).toBeDefined();
      expect(result.planningReport.eligibilitySummary).toBeDefined();
      expect(result.planningReport.recommendations).toBeInstanceOf(Array);
      expect(result.planningReport.implementationSteps).toBeInstanceOf(Array);
    });

    test('should prioritize strategies based on urgency and effectiveness', async () => {
      const result = await medicaidPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseMedicalInfo,
        baseLivingInfo,
        baseState
      );
      
      expect(result.prioritizedStrategies).toBeDefined();
      expect(result.prioritizedStrategies).toBeInstanceOf(Array);
      
      // First strategy should have highest priority
      expect(result.prioritizedStrategies[0]).toHaveProperty('priority');
      expect(result.prioritizedStrategies[0].priority).toBe('high');
    });

    test('should handle different long-term care needs', async () => {
      const { carePlanning } = require('../carePlanning');
      
      // Mock different care recommendations
      carePlanning.mockResolvedValueOnce({
        status: 'success',
        careNeeds: {
          recommendedCareLevel: 'assisted_living'
        },
        recommendations: ['Consider assisted living facility']
      });
      
      const result = await medicaidPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseMedicalInfo,
        {
          currentSetting: 'home',
          caregiverSupport: 'none'
        },
        baseState
      );
      
      expect(result.careResults.careNeeds.recommendedCareLevel).toBe('assisted_living');
      // Planning should adjust based on care setting
      expect(result.planningReport.recommendations).toContain(
        expect.stringMatching(/assisted living/i)
      );
    });

    test('should handle errors in individual modules gracefully', async () => {
      const { eligibilityAssessment } = require('../eligibilityAssessment');
      
      // Mock an error in eligibility assessment
      eligibilityAssessment.mockResolvedValueOnce({
        status: 'error',
        error: 'Failed to calculate eligibility'
      });
      
      const result = await medicaidPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseMedicalInfo,
        baseLivingInfo,
        baseState
      );
      
      // Should still complete overall planning despite module error
      expect(result.status).toBe('partial');
      expect(result.moduleErrors).toBeDefined();
      expect(result.moduleErrors.eligibility).toBeDefined();
      
      // Should still have results from other modules
      expect(result.careResults).toBeDefined();
      expect(result.assetPlanningResults).toBeDefined();
    });

    test('should adjust planning based on state-specific rules', async () => {
      const { getMedicaidRules } = require('../medicaidRulesLoader');
      
      // Mock different rules for a different state
      getMedicaidRules.mockReturnValueOnce({
        assetLimitSingle: 15750, // New York's higher limit
        assetLimitMarried: 23400,
        incomeLimit: 934,
        lookbackPeriod: 60
      });
      
      const result = await medicaidPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseMedicalInfo,
        baseLivingInfo,
        'newyork' // Different state
      );
      
      // Should include state-specific information
      expect(result.stateSpecificConsiderations).toBeDefined();
      expect(result.stateSpecificConsiderations).toContain('newyork');
    });

    test('should provide timeline with implementation steps', async () => {
      const result = await medicaidPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseMedicalInfo,
        baseLivingInfo,
        baseState
      );
      
      expect(result.implementationTimeline).toBeDefined();
      expect(result.implementationTimeline.immediateSteps).toBeInstanceOf(Array);
      expect(result.implementationTimeline.shortTermSteps).toBeInstanceOf(Array);
      expect(result.implementationTimeline.longTermSteps).toBeInstanceOf(Array);
    });

    test('should include resources and referrals in plan', async () => {
      const result = await medicaidPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseMedicalInfo,
        baseLivingInfo,
        baseState
      );
      
      expect(result.resourcesAndReferrals).toBeDefined();
      expect(result.resourcesAndReferrals.legalResources).toBeInstanceOf(Array);
      expect(result.resourcesAndReferrals.financialResources).toBeInstanceOf(Array);
      expect(result.resourcesAndReferrals.careResources).toBeInstanceOf(Array);
    });

    test('should handle clients with minimal assets differently', async () => {
      const lowAssetClient = {
        countable: 1500, // Under the limit
        home: 150000,
        automobile: 5000
      };
      
      const result = await medicaidPlanning(
        baseClientInfo,
        lowAssetClient,
        baseIncome,
        baseExpenses,
        baseMedicalInfo,
        baseLivingInfo,
        baseState
      );
      
      // Should focus more on application and less on complex planning
      expect(result.planningFocus).toBe('application');
      expect(result.prioritizedStrategies.find(s => 
        s.category === 'application' && s.priority === 'high'
      )).toBeDefined();
    });

    test('should adjust for urgent care needs', async () => {
      const { carePlanning } = require('../carePlanning');
      
      // Mock urgent care needs
      carePlanning.mockResolvedValueOnce({
        status: 'success',
        careNeeds: {
          recommendedCareLevel: 'nursing',
          urgency: 'immediate'
        },
        recommendations: ['Immediate nursing facility placement needed']
      });
      
      const result = await medicaidPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        {
          ...baseMedicalInfo,
          recentHospitalization: true,
          criticalDiagnoses: ['advanced dementia']
        },
        {
          currentSetting: 'home',
          caregiverSupport: 'none',
          safetyRisks: ['wandering', 'falls']
        },
        baseState
      );
      
      // Should prioritize expedited planning and application
      expect(result.urgentConsiderations).toBeDefined();
      expect(result.urgentConsiderations).toContain('immediate care needs');
      expect(result.implementationTimeline.immediateSteps).toContain(
        expect.stringMatching(/expedited/i)
      );
    });
  });
});