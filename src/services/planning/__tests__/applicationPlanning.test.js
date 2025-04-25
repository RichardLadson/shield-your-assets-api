// src/services/planning/__tests__/applicationPlanning.test.js

// Mock medicaidRulesLoader before loading the module under test
const mockRules = {
  florida: {
    assetLimitSingle: 2000,
    incomeLimit: 2523,
    lookbackPeriod: 60,
    applicationProcessing: {
      typicalTimeframe: '45-90 days',
      retroactiveEligibility: 3, // months
      requiredFaceToFace: false
    }
  },
  newyork: {
    assetLimitSingle: 16800,
    incomeLimit: 1563,
    lookbackPeriod: 60,
    applicationProcessing: {
      typicalTimeframe: '45-90 days',
      retroactiveEligibility: 3, // months
      requiredFaceToFace: true
    }
  }
};

jest.mock('../../utils/medicaidRulesLoader', () => ({
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

const {
  prepareApplicationTimeline,
  identifyRequiredDocuments,
  developApplicationStrategies,
  applicationPlanning
} = require('../applicationPlanning');

describe('Application Planning Module', () => {
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

  const baseState = 'florida';

  // Mock planning results
  const basePlanningResults = {
    eligibilityResults: {
      isResourceEligible: false,
      isIncomeEligible: true,
      excessResources: 98000,
      resourceLimit: 2000
    },
    assetPlanningResults: {
      strategies: ['Transfer home to spouse', 'Spend down on exempt assets'],
      implementation: ['Consult elder law attorney']
    },
    incomePlanningResults: {
      strategies: ['Establish Qualified Income Trust'],
      implementation: ['Set up income trust with attorney assistance']
    },
    annuityPlanningResults: {
      isAppropriate: true,
      recommendations: ['Purchase Medicaid-compliant annuity']
    },
    trustPlanningResults: {
      needsAssessment: { needsTrust: true },
      recommendations: ['Set up irrevocable trust']
    },
    divestmentPlanningResults: {
      penaltyPeriodEstimate: 0,
      strategies: ['No problematic past transfers identified']
    },
    careResults: {
      careNeeds: {
        recommendedCareLevel: 'nursing'
      },
      recommendations: ['Consider nursing facility care']
    }
  };

  // Unit tests for prepareApplicationTimeline
  describe('prepareApplicationTimeline', () => {
    test('should create appropriate timeline based on planning results', () => {
      const result = prepareApplicationTimeline(
        basePlanningResults,
        baseClientInfo,
        baseState
      );

      expect(result).toBeDefined();
      expect(result.timeline).toBeDefined();
      expect(result.timeline.preparationPhase).toBeDefined();
      expect(result.timeline.applicationSubmission).toBeDefined();
      expect(result.timeline.processingPhase).toBeDefined();
    });

    test('should account for trust setup in timeline', () => {
      const result = prepareApplicationTimeline(
        basePlanningResults,
        baseClientInfo,
        baseState
      );

      expect(result.timeline.preparationPhase.tasks).toContain(
        expect.objectContaining({
          task: expect.stringMatching(/trust/i)
        })
      );
      expect(result.timeline.preparationPhase.estimatedTimeframe).toContain('month');
    });

    test('should account for annuity purchase in timeline', () => {
      const result = prepareApplicationTimeline(
        basePlanningResults,
        baseClientInfo,
        baseState
      );

      expect(result.timeline.preparationPhase.tasks).toContain(
        expect.objectContaining({
          task: expect.stringMatching(/annuity/i)
        })
      );
    });

    test('should handle urgent care needs with expedited timeline', () => {
      const urgentPlanningResults = {
        ...basePlanningResults,
        careResults: {
          careNeeds: {
            recommendedCareLevel: 'nursing',
            urgency: 'immediate'
          },
          recommendations: ['Immediate nursing facility placement needed']
        }
      };

      const result = prepareApplicationTimeline(
        urgentPlanningResults,
        baseClientInfo,
        baseState
      );

      expect(result.timeline.isExpedited).toBe(true);
      expect(result.urgentConsiderations).toBeDefined();
      expect(result.timeline.expeditedSteps).toBeDefined();
    });

    test('should handle already-eligible clients with simpler timeline', () => {
      const eligiblePlanningResults = {
        ...basePlanningResults,
        eligibilityResults: {
          isResourceEligible: true,
          isIncomeEligible: true,
          excessResources: 0,
          resourceLimit: 2000
        },
        trustPlanningResults: {
          needsAssessment: { needsTrust: false }
        },
        annuityPlanningResults: {
          isAppropriate: false
        }
      };

      const result = prepareApplicationTimeline(
        eligiblePlanningResults,
        baseClientInfo,
        baseState
      );

      expect(result.timeline.preparationPhase.estimatedTimeframe).toContain('week');
      expect(result.timeline.isSimplified).toBe(true);
    });

    test('should consider state-specific processing times', () => {
      const resultFL = prepareApplicationTimeline(
        basePlanningResults,
        baseClientInfo,
        'florida'
      );
      const resultNY = prepareApplicationTimeline(
        basePlanningResults,
        baseClientInfo,
        'newyork'
      );

      expect(resultNY.timeline.applicationSubmission).toMatch(/face/i);
      expect(resultFL.timeline.applicationSubmission).not.toMatch(/face/i);
    });
  });

  // Unit tests for identifyRequiredDocuments
  describe('identifyRequiredDocuments', () => {
    test('should identify all standard required documents', () => {
      const result = identifyRequiredDocuments(
        baseClientInfo,
        baseAssets,
        baseIncome,
        basePlanningResults,
        baseState
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result.requiredDocuments)).toBe(true);
      expect(result.requiredDocuments.length).toBeGreaterThan(5);

      expect(result.requiredDocuments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: expect.stringMatching(/identification/i) }),
          expect.objectContaining({ name: expect.stringMatching(/social security/i) }),
          expect.objectContaining({ name: expect.stringMatching(/bank statement/i) })
        ])
      );
    });

    test('should identify real estate documents when applicable', () => {
      const result = identifyRequiredDocuments(
        baseClientInfo,
        baseAssets,
        baseIncome,
        basePlanningResults,
        baseState
      );

      const realEstateDoc = result.requiredDocuments.find(doc =>
        /deed|property|real estate/i.test(doc.name)
      );
      expect(realEstateDoc).toBeDefined();
    });

    test('should identify insurance documents when applicable', () => {
      const assetsWithInsurance = {
        ...baseAssets,
        life_insurance: 25000,
        long_term_care_insurance: 100000
      };
      const result = identifyRequiredDocuments(
        baseClientInfo,
        assetsWithInsurance,
        baseIncome,
        basePlanningResults,
        baseState
      );

      const insuranceDoc = result.requiredDocuments.find(doc =>
        /insurance/i.test(doc.name)
      );
      expect(insuranceDoc).toBeDefined();
    });

    test('should include trust documents when trust planning is involved', () => {
      const planningResultsWithTrust = {
        ...basePlanningResults,
        trustPlanningResults: {
          needsAssessment: { needsTrust: true },
          recommendations: ['Set up irrevocable trust']
        }
      };
      const result = identifyRequiredDocuments(
        baseClientInfo,
        baseAssets,
        baseIncome,
        planningResultsWithTrust,
        baseState
      );

      const trustDoc = result.requiredDocuments.find(doc =>
        /trust/i.test(doc.name)
      );
      expect(trustDoc).toBeDefined();
    });

    test('should include annuity documents when applicable', () => {
      const planningResultsWithAnnuity = {
        ...basePlanningResults,
        annuityPlanningResults: {
          isAppropriate: true,
          recommendations: ['Purchase Medicaid-compliant annuity']
        }
      };
      const result = identifyRequiredDocuments(
        baseClientInfo,
        baseAssets,
        baseIncome,
        planningResultsWithAnnuity,
        baseState
      );

      const annuityDoc = result.requiredDocuments.find(doc =>
        /annuity/i.test(doc.name)
      );
      expect(annuityDoc).toBeDefined();
    });

    test('should identify additional documents for married couples', () => {
      const marriedClientInfo = {
        ...baseClientInfo,
        maritalStatus: 'married',
        spouseInfo: {
          name: 'Spouse Name',
          age: 73,
          needsLongTermCare: false
        }
      };
      const result = identifyRequiredDocuments(
        marriedClientInfo,
        baseAssets,
        baseIncome,
        basePlanningResults,
        baseState
      );

      const marriageDoc = result.requiredDocuments.find(doc =>
        /marriage/i.test(doc.name)
      );
      expect(marriageDoc).toBeDefined();

      const spouseDoc = result.requiredDocuments.find(doc =>
        /spouse/i.test(doc.description)
      );
      expect(spouseDoc).toBeDefined();
    });

    test('should provide document organization instructions', () => {
      const result = identifyRequiredDocuments(
        baseClientInfo,
        baseAssets,
        baseIncome,
        basePlanningResults,
        baseState
      );
      expect(Array.isArray(result.organizationInstructions)).toBe(true);
      expect(result.organizationInstructions.length).toBeGreaterThan(0);
    });
  });

  // Unit tests for developApplicationStrategies
  describe('developApplicationStrategies', () => {
    test('should develop appropriate application strategies', () => {
      const timeline = {
        preparationPhase: {
          tasks: [
            { task: 'Document gathering', timeframe: '2-3 weeks' },
            { task: 'Trust setup', timeframe: '4-6 weeks' }
          ],
          estimatedTimeframe: '1-2 months'
        },
        applicationSubmission: 'Submit after trust funding and spend-down',
        processingPhase: {
          typicalTimeframe: '45-90 days',
          followUpSteps: ['Respond promptly to information requests']
        }
      };
      const documentResult = {
        requiredDocuments: [
          { name: 'Photo ID', description: 'Government-issued identification' },
          { name: 'Birth Certificate', description: 'Original or certified copy' },
          { name: 'Social Security Card', description: 'Original card' }
        ],
        organizationInstructions: ['Organize documents in a binder with labeled tabs']
      };

      const result = developApplicationStrategies(
        timeline,
        documentResult,
        basePlanningResults,
        baseClientInfo,
        baseState
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result.applicationStrategies)).toBe(true);
      expect(result.submissionRecommendations).toBeDefined();
      expect(result.followUpPlan).toBeDefined();
    });

    test('should include estate planning recommendations', () => {
      const timeline = {
        preparationPhase: { tasks: [], estimatedTimeframe: '1 month' },
        applicationSubmission: 'Submit after preparation complete',
        processingPhase: { typicalTimeframe: '45-90 days' }
      };
      const documentResult = { requiredDocuments: [], organizationInstructions: [] };

      const result = developApplicationStrategies(
        timeline,
        documentResult,
        basePlanningResults,
        baseClientInfo,
        baseState
      );

      expect(Array.isArray(result.estatePlanningRecommendations)).toBe(true);
      expect(result.estatePlanningRecommendations.length).toBeGreaterThan(0);
    });

    test('should handle appeal process recommendations', () => {
      const timeline = {
        preparationPhase: { tasks: [], estimatedTimeframe: '1 month' },
        applicationSubmission: 'Submit after preparation complete',
        processingPhase: { typicalTimeframe: '45-90 days' }
      };
      const documentResult = { requiredDocuments: [], organizationInstructions: [] };
      const planningResultsWithRisks = {
        ...basePlanningResults,
        divestmentPlanningResults: {
          penaltyPeriodEstimate: 6,
          strategies: ['Develop mitigation strategy for past transfers']
        }
      };

      const result = developApplicationStrategies(
        timeline,
        documentResult,
        planningResultsWithRisks,
        baseClientInfo,
        baseState
      );

      expect(result.appealProcessPlan).toMatch(/appeal/i);
    });

    test('should provide income trust submission guidance when needed', () => {
      const timeline = {
        preparationPhase: { tasks: [], estimatedTimeframe: '1 month' },
        applicationSubmission: 'Submit after preparation complete',
        processingPhase: { typicalTimeframe: '45-90 days' }
      };
      const documentResult = { requiredDocuments: [], organizationInstructions: [] };
      const planningResultsWithIncomeTrust = {
        ...basePlanningResults,
        incomePlanningResults: {
          strategies: ['Establish Qualified Income Trust (QIT)'],
          implementation: ['Set up income trust with attorney assistance']
        },
        eligibilityResults: {
          isResourceEligible: true,
          isIncomeEligible: false,
          excessIncome: 300,
          incomeLimit: 2500
        }
      };

      const result = developApplicationStrategies(
        timeline,
        documentResult,
        planningResultsWithIncomeTrust,
        baseClientInfo,
        baseState
      );

      expect(result.applicationStrategies).toEqual(
        expect.arrayContaining([expect.stringMatching(/income trust/i)])
      );
      expect(result.submissionRecommendations).toEqual(
        expect.arrayContaining([expect.stringMatching(/income trust/i)])
      );
    });

    test('should provide facility-specific application guidance', () => {
      const timeline = {
        preparationPhase: { tasks: [], estimatedTimeframe: '1 month' },
        applicationSubmission: 'Submit after preparation complete',
        processingPhase: { typicalTimeframe: '45-90 days' }
      };
      const documentResult = { requiredDocuments: [], organizationInstructions: [] };
      const planningResultsWithFacility = {
        ...basePlanningResults,
        careResults: {
          careNeeds: {
            recommendedCareLevel: 'nursing',
            facility: {
              name: 'Sample Nursing Center',
              address: '123 Care Lane',
              applicationProcess: 'Facility-specific process'
            }
          },
          recommendations: ['Consider nursing facility care']
        }
      };

      const result = developApplicationStrategies(
        timeline,
        documentResult,
        planningResultsWithFacility,
        baseClientInfo,
        baseState
      );

      expect(result.facilityConsiderations).toMatch(/Sample Nursing Center/i);
    });
  });

  // Integration tests for applicationPlanning
  describe('applicationPlanning', () => {
    test('should perform complete application planning process', async () => {
      const result = await applicationPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        basePlanningResults,
        baseState
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('success');
      expect(result.timeline).toBeDefined();
      expect(result.requiredDocuments).toBeDefined();
      expect(result.applicationStrategies).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test('should handle married couples with community spouse', async () => {
      const marriedClientInfo = {
        ...baseClientInfo,
        maritalStatus: 'married',
        spouseInfo: {
          name: 'Spouse Name',
          age: 73,
          needsLongTermCare: false
        }
      };
      const planningResultsWithSpouse = {
        ...basePlanningResults,
        communitySpousePlanningResults: {
          mmnaCalculation: { allowance: 3216 },
          csraCalculation: { allowance: 130380 },
          strategies: ['Maximize CSRA']
        }
      };

      const result = await applicationPlanning(
        marriedClientInfo,
        baseAssets,
        baseIncome,
        planningResultsWithSpouse,
        baseState
      );

      expect(result.spouseConsiderations).toBeDefined();
      expect(result.requiredDocuments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: expect.stringMatching(/marriage/i) })
        ])
      );
    });

    test('should handle errors gracefully', async () => {
      const result = await applicationPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        basePlanningResults,
        'invalid'
      );

      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
    });

    test('should provide comprehensive planning report', async () => {
      const result = await applicationPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        basePlanningResults,
        baseState
      );

      expect(result.planningReport).toBeDefined();
      expect(result.planningReport.summary).toBeDefined();
      expect(Array.isArray(result.planningReport.recommendations)).toBe(true);
      expect(Array.isArray(result.planningReport.nextSteps)).toBe(true);
    });

    test('should handle different state requirements appropriately', async () => {
      const resultFL = await applicationPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        basePlanningResults,
        'florida'
      );
      const resultNY = await applicationPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        basePlanningResults,
        'newyork'
      );

      expect(resultFL.stateSpecificConsiderations).not.toEqual(
        resultNY.stateSpecificConsiderations
      );
      expect(resultNY.applicationProcess).toMatch(/face/i);
      expect(resultFL.applicationProcess).not.toMatch(/face/i);
    });

    test('should provide specific timeline for eligible vs. non-eligible clients', async () => {
      const eligiblePlanningResults = {
        ...basePlanningResults,
        eligibilityResults: {
          isResourceEligible: true,
          isIncomeEligible: true,
          excessResources: 0,
          resourceLimit: 2000
        },
        trustPlanningResults: { needsAssessment: { needsTrust: false } },
        annuityPlanningResults: { isAppropriate: false }
      };
      const resultEligible = await applicationPlanning(
        baseClientInfo,
        { countable: 1500, home: 250000, automobile: 15000 },
        baseIncome,
        eligiblePlanningResults,
        baseState
      );
      const resultIneligible = await applicationPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        basePlanningResults,
        baseState
      );

      expect(resultEligible.timeline.preparationPhase.estimatedTimeframe).toContain('week');
      expect(resultIneligible.timeline.preparationPhase.estimatedTimeframe).toContain('month');
    });
  });
});
