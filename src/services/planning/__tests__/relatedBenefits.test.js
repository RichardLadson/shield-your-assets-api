// src/services/planning/__tests__/relatedBenefits.test.js

const { 
  identifyRelatedBenefits,
  evaluateBenefitEligibility,
  developBenefitApplicationStrategies,
  relatedBenefitsPlanning
} = require('../relatedBenefits');

describe('Related Benefits Planning Module', () => {
  // Basic client setup for tests
  const baseClientInfo = {
    name: 'Test Client',
    age: 75,
    maritalStatus: 'single',
    gender: 'female',
    monthlyIncome: 1200
  };

  const baseAssets = {
    countable: 1500,
    home: 180000,
    automobile: 8000
  };

  const baseIncome = {
    social_security: 1200,
    pension: 0,
    other: 0
  };

  const baseExpenses = {
    housing: 600,
    medical: 200,
    food: 300,
    utilities: 150
  };

  const baseMedicalInfo = {
    diagnoses: ['hypertension', 'arthritis'],
    medications: ['lisinopril', 'ibuprofen'],
    adlLimitations: ['bathing', 'dressing']
  };

  const baseState = 'florida';

  // Mock rules for testing
  const mockBenefitRules = {
    florida: {
      snap: {
        incomeLimitSingle: 1473,
        assetLimitSingle: 4250
      },
      liheap: {
        incomeLimitSingle: 1915,
        assetTest: false
      },
      ssi: {
        incomeLimitSingle: 914,
        assetLimitSingle: 2000
      },
      medicare_savings: {
        qmb: {
          incomeLimitSingle: 1133,
          assetLimitSingle: 8400
        },
        slmb: {
          incomeLimitSingle: 1359,
          assetLimitSingle: 8400
        }
      }
    }
  };

  // Mock the rules loader
  jest.mock('../benefitRulesLoader', () => ({
    getBenefitRules: jest.fn((state) => {
      if (state === 'florida') {
        return mockBenefitRules.florida;
      } else {
        throw new Error(`Rules not found for state: ${state}`);
      }
    })
  }));

  // Unit tests for identifyRelatedBenefits
  describe('identifyRelatedBenefits', () => {
    test('should identify all relevant benefits for an elderly person', () => {
      const result = identifyRelatedBenefits(baseClientInfo, baseMedicalInfo, baseState);
      
      expect(result).toBeDefined();
      expect(result.possibleBenefits).toBeInstanceOf(Array);
      expect(result.possibleBenefits).toContain('SNAP');
      expect(result.possibleBenefits).toContain('Medicare Savings Programs');
      expect(result.possibleBenefits).toContain('LIHEAP');
    });

    test('should include SSI for low-income individuals', () => {
      const clientInfo = {
        ...baseClientInfo,
        monthlyIncome: 800 // Lower income
      };
      
      const result = identifyRelatedBenefits(clientInfo, baseMedicalInfo, baseState);
      
      expect(result.possibleBenefits).toContain('SSI');
    });

    test('should identify disabled adult benefits for younger disabled person', () => {
      const clientInfo = {
        ...baseClientInfo,
        age: 45,
        disabled: true
      };
      
      const medicalInfo = {
        ...baseMedicalInfo,
        diagnoses: ['multiple sclerosis'],
        adlLimitations: ['mobility', 'bathing', 'dressing', 'toileting']
      };
      
      const result = identifyRelatedBenefits(clientInfo, medicalInfo, baseState);
      
      expect(result.possibleBenefits).toContain('SSDI');
      expect(result.possibleBenefits).toContain('Vocational Rehabilitation');
    });

    test('should recognize veterans benefits when applicable', () => {
      const clientInfo = {
        ...baseClientInfo,
        veteranStatus: 'veteran',
        serviceEra: 'vietnam'
      };
      
      const result = identifyRelatedBenefits(clientInfo, baseMedicalInfo, baseState);
      
      expect(result.possibleBenefits).toContain('VA Pension');
      expect(result.possibleBenefits).toContain('VA Aid & Attendance');
    });

    test('should include caregiver support programs when relevant', () => {
      const clientInfo = {
        ...baseClientInfo,
        caregiverInfo: {
          hasPrimaryCaregiver: true,
          caregiverRelationship: 'child',
          caregiverHours: 30
        }
      };
      
      const result = identifyRelatedBenefits(clientInfo, baseMedicalInfo, baseState);
      
      expect(result.possibleBenefits).toContain('National Family Caregiver Support Program');
    });
    
    test('should handle missing medical information gracefully', () => {
      const result = identifyRelatedBenefits(baseClientInfo, {}, baseState);
      
      expect(result).toBeDefined();
      expect(result.possibleBenefits).toBeInstanceOf(Array);
      // Should still identify non-medical benefits
      expect(result.possibleBenefits).toContain('SNAP');
    });
  });

  // Unit tests for evaluateBenefitEligibility
  describe('evaluateBenefitEligibility', () => {
    test('should evaluate SNAP eligibility correctly', () => {
      const possibleBenefits = ['SNAP'];
      
      const result = evaluateBenefitEligibility(
        possibleBenefits,
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseState
      );
      
      expect(result).toBeDefined();
      expect(result.eligibilityResults).toHaveProperty('SNAP');
      expect(result.eligibilityResults.SNAP.eligible).toBe(true);
    });

    test('should evaluate multiple benefits at once', () => {
      const possibleBenefits = ['SNAP', 'LIHEAP', 'Medicare Savings Programs'];
      
      const result = evaluateBenefitEligibility(
        possibleBenefits,
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseState
      );
      
      expect(result.eligibilityResults).toHaveProperty('SNAP');
      expect(result.eligibilityResults).toHaveProperty('LIHEAP');
      expect(result.eligibilityResults).toHaveProperty('Medicare Savings Programs');
    });

    test('should identify specific MSP category (QMB, SLMB, etc.)', () => {
      const possibleBenefits = ['Medicare Savings Programs'];
      
      const result = evaluateBenefitEligibility(
        possibleBenefits,
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseState
      );
      
      expect(result.eligibilityResults['Medicare Savings Programs']).toHaveProperty('specificProgram');
      // With income of $1200, should qualify for SLMB but not QMB
      expect(result.eligibilityResults['Medicare Savings Programs'].specificProgram).toBe('SLMB');
    });

    test('should handle excess assets correctly', () => {
      const possibleBenefits = ['SSI'];
      const assets = {
        ...baseAssets,
        countable: 3000 // Over the $2000 SSI limit
      };
      
      const result = evaluateBenefitEligibility(
        possibleBenefits,
        baseClientInfo,
        assets,
        baseIncome,
        baseExpenses,
        baseState
      );
      
      expect(result.eligibilityResults.SSI.eligible).toBe(false);
      expect(result.eligibilityResults.SSI.reason).toContain('excess assets');
    });

    test('should handle excess income correctly', () => {
      const possibleBenefits = ['SSI'];
      const income = {
        social_security: 1500 // Over the $914 SSI limit
      };
      
      const result = evaluateBenefitEligibility(
        possibleBenefits,
        baseClientInfo,
        baseAssets,
        income,
        baseExpenses,
        baseState
      );
      
      expect(result.eligibilityResults.SSI.eligible).toBe(false);
      expect(result.eligibilityResults.SSI.reason).toContain('income');
    });

    test('should estimate benefit amounts when eligible', () => {
      const possibleBenefits = ['SNAP'];
      
      const result = evaluateBenefitEligibility(
        possibleBenefits,
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseState
      );
      
      expect(result.eligibilityResults.SNAP).toHaveProperty('estimatedBenefit');
      expect(result.eligibilityResults.SNAP.estimatedBenefit).toBeGreaterThan(0);
    });
  });

  // Unit tests for developBenefitApplicationStrategies
  describe('developBenefitApplicationStrategies', () => {
    test('should develop strategies for eligible benefits', () => {
      const eligibilityResults = {
        SNAP: { eligible: true, estimatedBenefit: 150 },
        LIHEAP: { eligible: true },
        SSI: { eligible: false, reason: 'Excess income' }
      };
      
      const result = developBenefitApplicationStrategies(eligibilityResults, baseClientInfo, baseState);
      
      expect(result).toBeDefined();
      expect(result.applicationStrategies).toBeInstanceOf(Array);
      // Should have strategies for eligible benefits
      expect(result.applicationStrategies.find(s => s.benefit === 'SNAP')).toBeDefined();
      expect(result.applicationStrategies.find(s => s.benefit === 'LIHEAP')).toBeDefined();
    });

    test('should prioritize benefits with highest impact', () => {
      const eligibilityResults = {
        SNAP: { eligible: true, estimatedBenefit: 150 },
        LIHEAP: { eligible: true, estimatedBenefit: 300 },
        'Medicare Savings Programs': { 
          eligible: true, 
          specificProgram: 'SLMB',
          estimatedBenefit: 170.10 // Medicare Part B premium amount
        }
      };
      
      const result = developBenefitApplicationStrategies(eligibilityResults, baseClientInfo, baseState);
      
      // Higher benefit amount programs should appear earlier in the list
      const benefitOrder = result.applicationStrategies.map(s => s.benefit);
      expect(benefitOrder.indexOf('LIHEAP')).toBeLessThan(benefitOrder.indexOf('SNAP'));
    });

    test('should provide specific application instructions for each benefit', () => {
      const eligibilityResults = {
        SNAP: { eligible: true, estimatedBenefit: 150 },
      };
      
      const result = developBenefitApplicationStrategies(eligibilityResults, baseClientInfo, baseState);
      
      const snapStrategy = result.applicationStrategies.find(s => s.benefit === 'SNAP');
      expect(snapStrategy.applicationSteps).toBeInstanceOf(Array);
      expect(snapStrategy.applicationSteps.length).toBeGreaterThan(0);
      expect(snapStrategy.requiredDocuments).toBeInstanceOf(Array);
    });

    test('should include spend-down strategies for near-miss eligibility', () => {
      const eligibilityResults = {
        SSI: { 
          eligible: false, 
          reason: 'Excess assets: $2500 vs limit of $2000',
          excessAmount: 500
        }
      };
      
      const result = developBenefitApplicationStrategies(eligibilityResults, baseClientInfo, baseState);
      
      expect(result.spendDownStrategies).toBeInstanceOf(Array);
      expect(result.spendDownStrategies.length).toBeGreaterThan(0);
      expect(result.spendDownStrategies[0].benefit).toBe('SSI');
      expect(result.spendDownStrategies[0].amountToReduce).toBe(500);
    });

    test('should provide state-specific application information', () => {
      const eligibilityResults = {
        SNAP: { eligible: true, estimatedBenefit: 150 },
      };
      
      const result = developBenefitApplicationStrategies(eligibilityResults, baseClientInfo, 'florida');
      
      const snapStrategy = result.applicationStrategies.find(s => s.benefit === 'SNAP');
      expect(snapStrategy.stateSpecificInfo).toBeDefined();
      expect(snapStrategy.stateSpecificInfo.state).toBe('florida');
    });
  });

  // Integration tests for relatedBenefitsPlanning
  describe('relatedBenefitsPlanning', () => {
    test('should perform complete benefits planning process', async () => {
      const result = await relatedBenefitsPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseMedicalInfo,
        baseState
      );
      
      expect(result).toBeDefined();
      expect(result.possibleBenefits).toBeInstanceOf(Array);
      expect(result.eligibilityResults).toBeDefined();
      expect(result.applicationStrategies).toBeInstanceOf(Array);
    });

    test('should handle clients with multiple benefit eligibility', async () => {
      const clientInfo = {
        ...baseClientInfo,
        monthlyIncome: 900, // Lower income to qualify for more programs
        veteranStatus: 'veteran'
      };
      
      const result = await relatedBenefitsPlanning(
        clientInfo,
        baseAssets,
        { social_security: 900 },
        baseExpenses,
        baseMedicalInfo,
        baseState
      );
      
      // Should identify and evaluate multiple benefits
      expect(result.possibleBenefits.length).toBeGreaterThan(3);
      
      // Should have multiple eligible benefits
      const eligibleCount = Object.values(result.eligibilityResults)
        .filter(result => result.eligible).length;
      expect(eligibleCount).toBeGreaterThan(2);
    });

    test('should handle errors gracefully', async () => {
      // Test with invalid state
      const result = await relatedBenefitsPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseMedicalInfo,
        'invalid'
      );
      
      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
    });

    test('should provide comprehensive planning report', async () => {
      const result = await relatedBenefitsPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseMedicalInfo,
        baseState
      );
      
      expect(result.planningReport).toBeDefined();
      expect(result.planningReport.summary).toBeDefined();
      expect(result.planningReport.recommendations).toBeInstanceOf(Array);
      expect(result.planningReport.timelineSuggestions).toBeDefined();
    });

    test('should correctly assess total potential benefit value', async () => {
      const result = await relatedBenefitsPlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseMedicalInfo,
        baseState
      );
      
      expect(result.totalMonthlyBenefitValue).toBeDefined();
      expect(typeof result.totalMonthlyBenefitValue).toBe('number');
      expect(result.totalMonthlyBenefitValue).toBeGreaterThan(0);
    });
  });
});