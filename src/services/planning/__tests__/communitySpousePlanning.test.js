// src/services/planning/__tests__/communitySpousePlanning.test.js

const { 
  assessCommunitySpouseNeeds,
  calculateCSRA,
  calculateMMNA,
  developSpouseStrategies,
  communitySpousePlanning
} = require('../communitySpousePlanning');

describe('Community Spouse Planning Module', () => {
  // Basic client setup for tests
  const baseClientInfo = {
    name: 'Test Client',
    age: 75,
    maritalStatus: 'married',
    spouseInfo: {
      name: 'Spouse Name',
      age: 73,
      needsLongTermCare: false,
      monthlyIncome: 800
    }
  };

  const baseAssets = {
    countable: 100000,
    home: 250000,
    investments: 80000,
    retirement: 150000,
    automobile: 15000,
    joint_accounts: 75000,
    spouse_retirement: 120000
  };

  const baseIncome = {
    social_security: 1800,
    pension: 1200,
    investment: 500,
    spouse_social_security: 800
  };

  const baseExpenses = {
    housing: 1800,
    utilities: 300,
    food: 600,
    medical: 400,
    insurance: 200,
    transportation: 300
  };

  const baseState = 'florida';

  // Mock rules
  const mockRules = {
    florida: {
      csraMinimum: 27480,
      csraMaximum: 137400,
      mmnaMinimum: 2288.75,
      mmnaMaximum: 3435,
      housingAllowance: 687,
      excessShelterStandard: 687,
      applicantAllowance: 130,
      homeEquityLimit: 636000
    },
    newyork: {
      csraMinimum: 74820,
      csraMaximum: 137400,
      mmnaMinimum: 3435,
      mmnaMaximum: 3435,
      housingAllowance: 1,039.50,
      excessShelterStandard: 1,039.50,
      applicantAllowance: 50,
      homeEquityLimit: 955000
    }
  };

  // Mock eligibility assessment results
  const baseEligibilityResults = {
    isResourceEligible: false,
    isIncomeEligible: true,
    excessResources: 98000,
    resourceLimit: 2000
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

  // Unit tests for assessCommunitySpouseNeeds
  describe('assessCommunitySpouseNeeds', () => {
    test('should correctly assess community spouse needs', () => {
      const result = assessCommunitySpouseNeeds(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseState
      );
      
      expect(result).toBeDefined();
      expect(result.spouseNeeds).toBeDefined();
      expect(result.incomeGap).toBeDefined();
      expect(result.resourceNeeds).toBeDefined();
    });

    test('should identify income shortfall when spouse income is low', () => {
      const clientInfo = {
        ...baseClientInfo,
        spouseInfo: {
          ...baseClientInfo.spouseInfo,
          monthlyIncome: 500 // Very low income
        }
      };
      
      const income = {
        ...baseIncome,
        spouse_social_security: 500
      };
      
      const result = assessCommunitySpouseNeeds(
        clientInfo,
        baseAssets,
        income,
        baseExpenses,
        baseState
      );
      
      expect(result.incomeGap).toBeGreaterThan(0);
      expect(result.needsIncomeAllowance).toBe(true);
    });

    test('should consider home maintenance when calculating needs', () => {
      const expenses = {
        ...baseExpenses,
        housing: 2500, // High housing costs
        utilities: 500
      };
      
      const result = assessCommunitySpouseNeeds(
        baseClientInfo,
        baseAssets,
        baseIncome,
        expenses,
        baseState
      );
      
      expect(result.housingCosts).toBeDefined();
      expect(result.housingCosts).toBeGreaterThan(mockRules.florida.excessShelterStandard);
      expect(result.excessShelterAmount).toBeDefined();
      expect(result.excessShelterAmount).toBeGreaterThan(0);
    });

    test('should identify specific needs for elderly community spouse', () => {
      const clientInfo = {
        ...baseClientInfo,
        spouseInfo: {
          ...baseClientInfo.spouseInfo,
          age: 85, // Elderly spouse
          medicalConditions: ['arthritis', 'hypertension']
        }
      };
      
      const result = assessCommunitySpouseNeeds(
        clientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseState
      );
      
      expect(result.specialConsiderations).toBeDefined();
      expect(result.specialConsiderations).toContain(expect.stringMatching(/elderly/i));
    });

    test('should handle spouse with high medical expenses', () => {
      const expenses = {
        ...baseExpenses,
        medical: 1200, // High medical costs
        insurance: 400
      };
      
      const result = assessCommunitySpouseNeeds(
        baseClientInfo,
        baseAssets,
        baseIncome,
        expenses,
        baseState
      );
      
      expect(result.medicalNeeds).toBeDefined();
      expect(result.medicalNeeds.highMedicalExpenses).toBe(true);
    });
  });

  // Unit tests for calculateCSRA
  describe('calculateCSRA', () => {
    test('should calculate Community Spouse Resource Allowance correctly', () => {
      const totalAssets = 350000; // Total countable assets
      
      const result = calculateCSRA(
        totalAssets,
        baseClientInfo,
        baseState
      );
      
      expect(result).toBeDefined();
      expect(result.totalCountableAssets).toBe(350000);
      expect(result.halfOfAssets).toBe(175000);
      // Should be capped at maximum
      expect(result.csraAmount).toBe(mockRules.florida.csraMaximum);
      expect(result.remainingAssets).toBe(totalAssets - result.csraAmount);
    });

    test('should apply minimum CSRA when half of assets is below minimum', () => {
      const totalAssets = 40000; // Low total assets
      
      const result = calculateCSRA(
        totalAssets,
        baseClientInfo,
        baseState
      );
      
      expect(result.halfOfAssets).toBe(20000);
      // Should be bumped up to minimum
      expect(result.csraAmount).toBe(mockRules.florida.csraMinimum);
    });

    test('should handle special circumstances for expanded resource allowance', () => {
      const totalAssets = 350000;
      
      const clientInfo = {
        ...baseClientInfo,
        spouseInfo: {
          ...baseClientInfo.spouseInfo,
          monthlyIncome: 500, // Very low income
          expandedResourceAllowance: true,
          expandedResourceReason: 'income generation needs'
        }
      };
      
      const result = calculateCSRA(
        totalAssets,
        clientInfo,
        baseState
      );
      
      expect(result.specialCircumstances).toBeDefined();
      expect(result.specialCircumstances).toContain(expect.stringMatching(/expanded/i));
      expect(result.expandedAllowanceRecommended).toBe(true);
    });

    test('should account for state-specific CSRA limits', () => {
      const totalAssets = 150000;
      
      // Florida calculation
      const resultFL = calculateCSRA(
        totalAssets,
        baseClientInfo,
        'florida'
      );
      
      // New York calculation
      const resultNY = calculateCSRA(
        totalAssets,
        baseClientInfo,
        'newyork'
      );
      
      // Should have different minimum amounts
      expect(resultFL.csraAmount).not.toBe(resultNY.csraAmount);
      
      // NY has higher minimum
      expect(resultNY.csraAmount).toBe(mockRules.newyork.csraMinimum);
      expect(resultFL.csraAmount).toBe(75000); // Half of assets is between FL min and max
    });

    test('should handle cases where all assets are protected', () => {
      const totalAssets = 20000; // Very low total assets
      
      const result = calculateCSRA(
        totalAssets,
        baseClientInfo,
        baseState
      );
      
      expect(result.csraAmount).toBe(mockRules.florida.csraMinimum);
      expect(result.remainingAssets).toBe(0);
      expect(result.allAssetsProtected).toBe(true);
    });
  });

  // Unit tests for calculateMMNA
  describe('calculateMMNA', () => {
    test('should calculate Minimum Monthly Maintenance Needs Allowance correctly', () => {
      const spouseNeeds = {
        housingCosts: 2100, // Mortgage/rent + utilities
        medicalNeeds: {
          highMedicalExpenses: false
        },
        incomeGap: 1500
      };
      
      const result = calculateMMNA(
        spouseNeeds,
        baseClientInfo,
        baseState
      );
      
      expect(result).toBeDefined();
      expect(result.baseAllowance).toBe(mockRules.florida.mmnaMinimum);
      expect(result.excessShelterAllowance).toBeDefined();
      expect(result.totalAllowance).toBeDefined();
    });

    test('should cap MMNA at state maximum', () => {
      const spouseNeeds = {
        housingCosts: 3500, // Very high housing costs
        medicalNeeds: {
          highMedicalExpenses: true
        },
        incomeGap: 2500
      };
      
      const result = calculateMMNA(
        spouseNeeds,
        baseClientInfo,
        baseState
      );
      
      // Should be capped at maximum
      expect(result.totalAllowance).toBe(mockRules.florida.mmnaMaximum);
      expect(result.isCapped).toBe(true);
    });

    test('should calculate excess shelter allowance correctly', () => {
      const spouseNeeds = {
        housingCosts: 2100, // Housing costs exceed standard
        medicalNeeds: {
          highMedicalExpenses: false
        },
        incomeGap: 1500
      };
      
      const result = calculateMMNA(
        spouseNeeds,
        baseClientInfo,
        baseState
      );
      
      // Excess shelter = housing costs - standard
      const expectedExcess = 2100 - mockRules.florida.excessShelterStandard;
      expect(result.excessShelterAllowance).toBeCloseTo(expectedExcess, 0);
    });

    test('should handle different state standards', () => {
      const spouseNeeds = {
        housingCosts: 2100,
        medicalNeeds: {
          highMedicalExpenses: false
        },
        incomeGap: 1500
      };
      
      // Florida calculation
      const resultFL = calculateMMNA(
        spouseNeeds,
        baseClientInfo,
        'florida'
      );
      
      // New York calculation
      const resultNY = calculateMMNA(
        spouseNeeds,
        baseClientInfo,
        'newyork'
      );
      
      // Different base allowances and excess shelter calculations
      expect(resultFL.baseAllowance).not.toBe(resultNY.baseAllowance);
      expect(resultFL.excessShelterAllowance).not.toBe(resultNY.excessShelterAllowance);
    });

    test('should include court-ordered support amounts when applicable', () => {
      const spouseNeeds = {
        housingCosts: 2100,
        medicalNeeds: {
          highMedicalExpenses: false
        },
        incomeGap: 1500,
        courtOrderedSupport: 2000 // Court-ordered support amount
      };
      
      const result = calculateMMNA(
        spouseNeeds,
        baseClientInfo,
        baseState
      );
      
      expect(result.courtOrderedAmount).toBe(2000);
      expect(result.totalAllowance).toBe(2000); // Court order overrides calculated amount
      expect(result.courtOrderOverride).toBe(true);
    });
  });

  // Unit tests for developSpouseStrategies
  describe('developSpouseStrategies', () => {
    test('should develop appropriate strategies for community spouse', () => {
      const csraCalculation = {
        totalCountableAssets: 350000,
        halfOfAssets: 175000,
        csraAmount: 137400,
        remainingAssets: 212600
      };
      
      const mmnaCalculation = {
        baseAllowance: 2288.75,
        excessShelterAllowance: 500,
        totalAllowance: 2788.75
      };
      
      const spouseNeeds = {
        housingCosts: 2100,
        medicalNeeds: {
          highMedicalExpenses: false
        },
        incomeGap: 1500,
        needsIncomeAllowance: true
      };
      
      const result = developSpouseStrategies(
        csraCalculation,
        mmnaCalculation,
        spouseNeeds,
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseState
      );
      
      expect(result).toBeDefined();
      expect(result.strategies).toBeInstanceOf(Array);
      expect(result.strategies.length).toBeGreaterThan(0);
      expect(result.implementation).toBeInstanceOf(Array);
    });

    test('should recommend asset allocation strategies', () => {
      const csraCalculation = {
        totalCountableAssets: 350000,
        halfOfAssets: 175000,
        csraAmount: 137400,
        remainingAssets: 212600
      };
      
      const mmnaCalculation = {
        baseAllowance: 2288.75,
        excessShelterAllowance: 500,
        totalAllowance: 2788.75
      };
      
      const spouseNeeds = {
        housingCosts: 2100,
        medicalNeeds: {
          highMedicalExpenses: false
        },
        incomeGap: 1500,
        needsIncomeAllowance: true
      };
      
      const result = developSpouseStrategies(
        csraCalculation,
        mmnaCalculation,
        spouseNeeds,
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseState
      );
      
      // Should recommend asset allocation for CSRA
      expect(result.strategies).toContain(expect.stringMatching(/allocate assets/i));
      expect(result.resourceAllocationPlan).toBeDefined();
      expect(result.resourceAllocationPlan.length).toBeGreaterThan(0);
    });

    test('should recommend income maximization strategies', () => {
      const csraCalculation = {
        totalCountableAssets: 350000,
        halfOfAssets: 175000,
        csraAmount: 137400,
        remainingAssets: 212600
      };
      
      const mmnaCalculation = {
        baseAllowance: 2288.75,
        excessShelterAllowance: 500,
        totalAllowance: 2788.75
      };
      
      const spouseNeeds = {
        housingCosts: 2100,
        medicalNeeds: {
          highMedicalExpenses: false
        },
        incomeGap: 1988.75, // Large income gap
        needsIncomeAllowance: true
      };
      
      const result = developSpouseStrategies(
        csraCalculation,
        mmnaCalculation,
        spouseNeeds,
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseState
      );
      
      // Should recommend income maximization
      expect(result.strategies).toContain(expect.stringMatching(/income/i));
      expect(result.incomeMaximizationPlan).toBeDefined();
      expect(result.incomeMaximizationPlan.length).toBeGreaterThan(0);
    });

    test('should recommend appropriate strategies for expanded resource allowance', () => {
      const csraCalculation = {
        totalCountableAssets: 350000,
        halfOfAssets: 175000,
        csraAmount: 137400,
        remainingAssets: 212600,
        expandedAllowanceRecommended: true
      };
      
      const mmnaCalculation = {
        baseAllowance: 2288.75,
        excessShelterAllowance: 500,
        totalAllowance: 2788.75
      };
      
      const spouseNeeds = {
        housingCosts: 2100,
        medicalNeeds: {
          highMedicalExpenses: false
        },
        incomeGap: 1988.75,
        needsIncomeAllowance: true
      };
      
      const result = developSpouseStrategies(
        csraCalculation,
        mmnaCalculation,
        spouseNeeds,
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseState
      );
      
      // Should recommend expanded resource allowance
      expect(result.strategies).toContain(expect.stringMatching(/expanded resource/i));
      expect(result.legalActionPlan).toBeDefined();
    });

    test('should provide housing recommendations when applicable', () => {
      const csraCalculation = {
        totalCountableAssets: 350000,
        halfOfAssets: 175000,
        csraAmount: 137400,
        remainingAssets: 212600
      };
      
      const mmnaCalculation = {
        baseAllowance: 2288.75,
        excessShelterAllowance: 500,
        totalAllowance: 2788.75
      };
      
      const spouseNeeds = {
        housingCosts: 2100,
        affordabilityRisk: true,
        medicalNeeds: {
          highMedicalExpenses: false
        },
        incomeGap: 1500,
        needsIncomeAllowance: true
      };
      
      const assets = {
        ...baseAssets,
        home: 450000,
        mortgage: 300000
      };
      
      const result = developSpouseStrategies(
        csraCalculation,
        mmnaCalculation,
        spouseNeeds,
        baseClientInfo,
        assets,
        baseIncome,
        baseState
      );
      
      // Should provide housing recommendations
      expect(result.housingRecommendations).toBeDefined();
      expect(result.housingRecommendations.length).toBeGreaterThan(0);
    });
  });

  // Integration tests for communitySpousePlanning
  describe('communitySpousePlanning', () => {
    test('should perform complete community spouse planning process', async () => {
      const result = await communitySpousePlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseState
      );
      
      expect(result).toBeDefined();
      expect(result.status).toBe('success');
      expect(result.spouseNeeds).toBeDefined();
      expect(result.csraCalculation).toBeDefined();
      expect(result.mmnaCalculation).toBeDefined();
      expect(result.strategies).toBeInstanceOf(Array);
    });

    test('should handle single clients appropriately', async () => {
      const singleClientInfo = {
        name: 'Test Client',
        age: 75,
        maritalStatus: 'single'
      };
      
      const result = await communitySpousePlanning(
        singleClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseState
      );
      
      expect(result.status).toBe('not applicable');
      expect(result.message).toContain(expect.stringMatching(/single/i));
    });

    test('should handle errors gracefully', async () => {
      // Test with invalid state
      const result = await communitySpousePlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        'invalid'
      );
      
      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
    });

    test('should provide comprehensive planning report', async () => {
      const result = await communitySpousePlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseState
      );
      
      expect(result.planningReport).toBeDefined();
      expect(result.planningReport.summary).toBeDefined();
      expect(result.planningReport.recommendations).toBeInstanceOf(Array);
    });

    test('should handle scenarios with different state rules', async () => {
      const resultFL = await communitySpousePlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        'florida'
      );
      
      const resultNY = await communitySpousePlanning(
        baseClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        'newyork'
      );
      
      // Should have different CSRA and MMNA calculations based on state
      expect(resultFL.csraCalculation.csraAmount).not.toEqual(resultNY.csraCalculation.csraAmount);
      expect(resultFL.mmnaCalculation.baseAllowance).not.toEqual(resultNY.mmnaCalculation.baseAllowance);
    });

    test('should handle different spouse scenarios appropriately', async () => {
      // Scenario with spouse also needing long-term care
      const dualLTCClientInfo = {
        ...baseClientInfo,
        spouseInfo: {
          ...baseClientInfo.spouseInfo,
          needsLongTermCare: true
        }
      };
      
      const result = await communitySpousePlanning(
        dualLTCClientInfo,
        baseAssets,
        baseIncome,
        baseExpenses,
        baseState
      );
      
      expect(result.status).toBe('modified');
      expect(result.message).toContain(expect.stringMatching(/both/i));
      expect(result.dualApplicationConsiderations).toBeDefined();
    });
  });
});