// src/services/planning/__tests__/divestmentPlanning.test.js

const { 
  analyzePastTransfers,
  calculatePenaltyPeriod,
  developMitigationStrategies,
  divestmentPlanning
} = require('../divestmentPlanning');

// Mock medicaid rules
jest.mock('../../utils/medicaidRulesLoader', () => ({
  getMedicaidRules: jest.fn((state) => {
    const mockRules = {
      florida: {
        lookbackPeriod: 60, // months
        penaltyDivisor: 9901, // Average monthly cost of nursing home care
        annualGiftExclusion: 18000,
        exceptions: ['caregiver child', 'disabled child', 'sibling with equity interest']
      },
      california: {
        lookbackPeriod: 30, // months
        penaltyDivisor: 10933,
        annualGiftExclusion: 18000,
        exceptions: ['caregiver child', 'disabled child']
      }
    };
    
    if (mockRules[state]) {
      return mockRules[state];
    } else {
      throw new Error(`No Medicaid rules found for state: ${state}`);
    }
  })
}));

describe('Divestment Planning Module', () => {
  // Basic client setup for tests
  const baseClientInfo = {
    name: 'Test Client',
    age: 75,
    maritalStatus: 'single'
  };

  // Create dates within lookback period
  const currentDate = new Date();
  const oneYearAgo = new Date(currentDate);
  oneYearAgo.setFullYear(currentDate.getFullYear() - 1);
  
  const twoYearsAgo = new Date(currentDate);
  twoYearsAgo.setFullYear(currentDate.getFullYear() - 2);
  
  const sixYearsAgo = new Date(currentDate);
  sixYearsAgo.setFullYear(currentDate.getFullYear() - 6);

  const basePastTransfers = [
    {
      date: oneYearAgo.toISOString().split('T')[0],
      amount: 15000,
      recipient: 'child',
      purpose: 'gift',
      documentation: 'bank statement'
    },
    {
      date: twoYearsAgo.toISOString().split('T')[0],
      amount: 10000,
      recipient: 'grandchild',
      purpose: 'education',
      documentation: 'check copy'
    }
  ];

  const baseState = 'florida';

  // Unit tests for analyzePastTransfers
  describe('analyzePastTransfers', () => {
    test('should correctly identify transfers within lookback period', () => {
      const result = analyzePastTransfers(basePastTransfers, baseState);
      
      expect(result).toBeDefined();
      expect(result.transfersWithinLookback).toBeInstanceOf(Array);
      expect(result.transfersWithinLookback.length).toBe(2);
      expect(result.totalAmount).toBe(25000);
    });

    test('should identify exempt transfers correctly', () => {
      const pastTransfers = [
        ...basePastTransfers,
        {
          date: oneYearAgo.toISOString().split('T')[0],
          amount: 20000,
          recipient: 'child',
          purpose: 'caregiver compensation',
          documentation: 'caregiver agreement',
          details: { yearsOfCare: 2, hoursPerWeek: 20 }
        }
      ];
      
      const result = analyzePastTransfers(pastTransfers, baseState);
      
      expect(result.exemptTransfers).toBeInstanceOf(Array);
      expect(result.exemptTransfers.length).toBe(1);
      expect(result.exemptTransfers[0].amount).toBe(20000);
      expect(result.nonExemptTotal).toBe(25000); // Only the original transfers
    });

    test('should handle transfers outside lookback period', () => {
      const pastTransfers = [
        ...basePastTransfers,
        {
          date: sixYearsAgo.toISOString().split('T')[0], // More than 5 years ago
          amount: 50000,
          recipient: 'child',
          purpose: 'gift',
          documentation: 'bank statement'
        }
      ];
      
      const result = analyzePastTransfers(pastTransfers, baseState);
      
      expect(result.transfersOutsideLookback).toBeInstanceOf(Array);
      expect(result.transfersOutsideLookback.length).toBe(1);
      expect(result.transfersOutsideLookback[0].amount).toBe(50000);
    });

    test('should apply annual gift exclusions correctly', () => {
      const pastTransfers = [
        {
          date: oneYearAgo.toISOString().split('T')[0],
          amount: 15000,
          recipient: 'child',
          purpose: 'gift',
          documentation: 'bank statement'
        }
      ];
      
      const result = analyzePastTransfers(pastTransfers, baseState);
      
      expect(result.giftExclusionsApplied).toBeDefined();
      expect(result.nonExemptTotal).toBe(0); // Under annual gift exclusion
    });

    test('should handle multiple transfers to the same recipient within a year', () => {
      const sameYear = new Date(currentDate);
      sameYear.setMonth(currentDate.getMonth() - 6);
      
      const pastTransfers = [
        {
          date: currentDate.toISOString().split('T')[0],
          amount: 10000,
          recipient: 'child',
          purpose: 'gift',
          documentation: 'bank statement'
        },
        {
          date: sameYear.toISOString().split('T')[0], // Same year as above
          amount: 10000,
          recipient: 'child', // Same recipient in same year
          purpose: 'gift',
          documentation: 'bank statement'
        }
      ];
      
      const result = analyzePastTransfers(pastTransfers, baseState);
      
      // Two gifts totaling $20,000 to same person in same year, over $18,000 annual exclusion
      expect(result.nonExemptTotal).toBe(2000);
    });

    test('should identify documentation issues with transfers', () => {
      const pastTransfers = [
        {
          date: oneYearAgo.toISOString().split('T')[0],
          amount: 15000,
          recipient: 'child',
          purpose: 'gift'
          // Missing documentation
        }
      ];
      
      const result = analyzePastTransfers(pastTransfers, baseState);
      
      expect(result.documentationIssues).toBeInstanceOf(Array);
      expect(result.documentationIssues.length).toBe(1);
      expect(result.riskAssessment.documentationRisk).toBe('high');
    });

    test('should handle empty or missing transfers data', () => {
      const result = analyzePastTransfers([], baseState);
      
      expect(result).toBeDefined();
      expect(result.transfersWithinLookback).toBeInstanceOf(Array);
      expect(result.transfersWithinLookback.length).toBe(0);
      expect(result.totalAmount).toBe(0);
    });
  });

  // Unit tests for calculatePenaltyPeriod
  describe('calculatePenaltyPeriod', () => {
    test('should calculate penalty period correctly', () => {
      const transferAnalysis = {
        nonExemptTotal: 30000,
        totalAmount: 50000,
        exemptTransfers: [
          { amount: 20000, reason: 'caregiver compensation' }
        ]
      };
      
      const result = calculatePenaltyPeriod(transferAnalysis, baseState);
      
      expect(result).toBeDefined();
      expect(result.penaltyMonths).toBeDefined();
      // $30,000 ÷ $9,901 ≈ 3.03 months
      expect(result.penaltyMonths).toBeCloseTo(3.03, 1);
      expect(result.penaltyEnd).toBeDefined();
    });

    test('should return zero penalty when no non-exempt transfers', () => {
      const transferAnalysis = {
        nonExemptTotal: 0,
        totalAmount: 20000,
        exemptTransfers: [
          { amount: 20000, reason: 'caregiver compensation' }
        ]
      };
      
      const result = calculatePenaltyPeriod(transferAnalysis, baseState);
      
      expect(result.penaltyMonths).toBe(0);
      expect(result.hasPenalty).toBe(false);
    });

    test('should use correct state-specific penalty divisor', () => {
      const transferAnalysis = {
        nonExemptTotal: 30000,
        totalAmount: 30000,
        exemptTransfers: []
      };
      
      // Florida calculation
      const resultFL = calculatePenaltyPeriod(transferAnalysis, 'florida');
      // $30,000 ÷ $9,901 ≈ 3.03 months
      expect(resultFL.penaltyMonths).toBeCloseTo(3.03, 1);
      
      // California calculation
      const resultCA = calculatePenaltyPeriod(transferAnalysis, 'california');
      // $30,000 ÷ $10,933 ≈ 2.74 months
      expect(resultCA.penaltyMonths).toBeCloseTo(2.74, 1);
    });

    test('should round down to nearest day for penalty period', () => {
      const transferAnalysis = {
        nonExemptTotal: 5000,
        totalAmount: 5000,
        exemptTransfers: []
      };
      
      const result = calculatePenaltyPeriod(transferAnalysis, baseState);
      // $5,000 ÷ $9,901 ≈ 0.505 months
      
      // Check that decimal portion is preserved to days (not just rounded to months)
      expect(result.penaltyDays).toBeDefined();
    });

    test('should provide estimated penalty cost impact', () => {
      const transferAnalysis = {
        nonExemptTotal: 30000,
        totalAmount: 30000,
        exemptTransfers: []
      };
      
      const result = calculatePenaltyPeriod(transferAnalysis, baseState);
      
      expect(result.financialImpact).toBeDefined();
      expect(result.financialImpact.estimatedCost).toBeGreaterThan(0);
    });
  });

  // Unit tests for developMitigationStrategies
  describe('developMitigationStrategies', () => {
    test('should provide appropriate strategies for significant penalties', () => {
      const transferAnalysis = {
        nonExemptTotal: 100000,
        totalAmount: 100000,
        exemptTransfers: [],
        transfersWithinLookback: [
          { date: twoYearsAgo.toISOString().split('T')[0], amount: 100000, recipient: 'child', purpose: 'gift' }
        ],
        documentationIssues: []
      };
      
      const penaltyCalculation = {
        penaltyMonths: 10.1,
        hasPenalty: true,
        financialImpact: { estimatedCost: 99010 }
      };
      
      const result = developMitigationStrategies(
        transferAnalysis,
        penaltyCalculation,
        baseClientInfo,
        baseState
      );
      
      expect(result).toBeDefined();
      expect(result.strategies).toBeInstanceOf(Array);
      expect(result.strategies.length).toBeGreaterThan(0);
      
      // Should include return of assets strategy for significant penalties
      expect(result.strategies.some(s => s.toLowerCase().includes('return of assets'))).toBe(true);
    });

    test('should recommend documentation improvements when needed', () => {
      const transferAnalysis = {
        nonExemptTotal: 30000,
        totalAmount: 30000,
        exemptTransfers: [],
        transfersWithinLookback: [
          { date: twoYearsAgo.toISOString().split('T')[0], amount: 30000, purpose: 'gift' } // Missing documentation
        ],
        documentationIssues: [
          { transferIndex: 0, issue: 'Missing documentation' }
        ],
        riskAssessment: { documentationRisk: 'high' }
      };
      
      const penaltyCalculation = {
        penaltyMonths: 3.03,
        hasPenalty: true
      };
      
      const result = developMitigationStrategies(
        transferAnalysis,
        penaltyCalculation,
        baseClientInfo,
        baseState
      );
      
      expect(result.strategies.some(s => s.toLowerCase().includes('documentation'))).toBe(true);
      expect(result.priorityActions.some(a => a.toLowerCase().includes('document'))).toBe(true);
    });

    test('should provide strategies to reclassify transfers when possible', () => {
      const transferAnalysis = {
        nonExemptTotal: 20000,
        totalAmount: 20000,
        exemptTransfers: [],
        transfersWithinLookback: [
          { 
            date: twoYearsAgo.toISOString().split('T')[0], 
            amount: 20000, 
            recipient: 'child',
            purpose: 'gift',
            details: { recipientRelationship: 'child', childProvidedCare: true }
          }
        ],
        documentationIssues: []
      };
      
      const penaltyCalculation = {
        penaltyMonths: 2.02,
        hasPenalty: true
      };
      
      const result = developMitigationStrategies(
        transferAnalysis,
        penaltyCalculation,
        baseClientInfo,
        baseState
      );
      
      // Should include caregiver exemption strategy
      expect(result.strategies.some(s => s.toLowerCase().includes('caregiver'))).toBe(true);
    });

    test('should provide minimal strategies for minimal penalties', () => {
      const transferAnalysis = {
        nonExemptTotal: 5000,
        totalAmount: 5000,
        exemptTransfers: [],
        transfersWithinLookback: [
          { date: oneYearAgo.toISOString().split('T')[0], amount: 5000, recipient: 'child', purpose: 'gift' }
        ],
        documentationIssues: []
      };
      
      const penaltyCalculation = {
        penaltyMonths: 0.51,
        hasPenalty: true,
        financialImpact: { estimatedCost: 5000 }
      };
      
      const result = developMitigationStrategies(
        transferAnalysis,
        penaltyCalculation,
        baseClientInfo,
        baseState
      );
      
      // For minor penalties, may recommend accepting the penalty
      expect(result.strategies.some(s => s.toLowerCase().includes('accept') && s.toLowerCase().includes('penalty'))).toBe(true);
    });

    test('should consider hardship waivers when applicable', () => {
      const transferAnalysis = {
        nonExemptTotal: 50000,
        totalAmount: 50000,
        exemptTransfers: [],
        transfersWithinLookback: [
          { date: twoYearsAgo.toISOString().split('T')[0], amount: 50000, recipient: 'child', purpose: 'gift' }
        ],
        documentationIssues: []
      };
      
      const penaltyCalculation = {
        penaltyMonths: 5.05,
        hasPenalty: true
      };
      
      // Client with health issues that might qualify for hardship waiver
      const clientInfo = {
        ...baseClientInfo,
        medicalInfo: {
          diagnoses: ['terminal cancer'],
          prognosis: 'poor',
          lifeExpectancy: '6 months'
        }
      };
      
      const result = developMitigationStrategies(
        transferAnalysis,
        penaltyCalculation,
        clientInfo,
        baseState
      );
      
      expect(result.strategies.some(s => s.toLowerCase().includes('hardship waiver'))).toBe(true);
    });

    test('should provide no strategies when no penalty exists', () => {
      const transferAnalysis = {
        nonExemptTotal: 0,
        totalAmount: 0,
        exemptTransfers: [],
        transfersWithinLookback: [],
        documentationIssues: []
      };
      
      const penaltyCalculation = {
        penaltyMonths: 0,
        hasPenalty: false
      };
      
      const result = developMitigationStrategies(
        transferAnalysis,
        penaltyCalculation,
        baseClientInfo,
        baseState
      );
      
      expect(result.strategies.some(s => s.toLowerCase().includes('no penalty mitigation needed'))).toBe(true);
    });
  });

  // Integration tests for divestmentPlanning
  describe('divestmentPlanning', () => {
    test('should perform complete divestment planning process', async () => {
      const result = await divestmentPlanning(
        baseClientInfo,
        basePastTransfers,
        baseState
      );
      
      expect(result).toBeDefined();
      expect(result.transferAnalysis).toBeDefined();
      expect(result.penaltyCalculation).toBeDefined();
      expect(result.mitigationStrategies).toBeDefined();
      expect(result.strategies).toBeInstanceOf(Array);
    });

    test('should handle scenario with no transfers', async () => {
      const result = await divestmentPlanning(
        baseClientInfo,
        [], // No transfers
        baseState
      );
      
      expect(result.status).toBe('success');
      expect(result.penaltyCalculation.hasPenalty).toBe(false);
      expect(result.strategies.some(s => s.toLowerCase().includes('no penalty'))).toBe(true);
    });

    test('should handle exempt transfers properly', async () => {
      const pastTransfers = [
        {
          date: oneYearAgo.toISOString().split('T')[0],
          amount: 20000,
          recipient: 'child',
          purpose: 'caregiver compensation',
          documentation: 'caregiver agreement',
          details: { yearsOfCare: 2, hoursPerWeek: 20 }
        }
      ];
      
      const result = await divestmentPlanning(
        baseClientInfo,
        pastTransfers,
        baseState
      );
      
      expect(result.transferAnalysis.exemptTransfers.length).toBe(1);
      expect(result.penaltyCalculation.hasPenalty).toBe(false);
    });

    test('should return state-specific strategies', async () => {
      const result = await divestmentPlanning(
        baseClientInfo,
        basePastTransfers,
        'california' // Different state
      );
      
      expect(result.stateSpecificConsiderations).toBeDefined();
      expect(result.stateSpecificConsiderations).toBe('california');
    });

    test('should handle errors gracefully', async () => {
      // Test with invalid state
      const result = await divestmentPlanning(
        baseClientInfo,
        basePastTransfers,
        'invalid'
      );
      
      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
    });

    test('should provide comprehensive planning report', async () => {
      const result = await divestmentPlanning(
        baseClientInfo,
        basePastTransfers,
        baseState
      );
      
      expect(result.planningReport).toBeDefined();
      expect(result.planningReport.summary).toBeDefined();
      expect(result.planningReport.recommendations).toBeInstanceOf(Array);
    });

    test('should handle mixed exempt and non-exempt transfers', async () => {
      const pastTransfers = [
        {
          date: oneYearAgo.toISOString().split('T')[0],
          amount: 15000,
          recipient: 'child',
          purpose: 'gift',
          documentation: 'bank statement'
        },
        {
          date: oneYearAgo.toISOString().split('T')[0],
          amount: 20000,
          recipient: 'child',
          purpose: 'caregiver compensation',
          documentation: 'caregiver agreement',
          details: { yearsOfCare: 2, hoursPerWeek: 20 }
        }
      ];
      
      const result = await divestmentPlanning(
        baseClientInfo,
        pastTransfers,
        baseState
      );
      
      expect(result.transferAnalysis.exemptTransfers.length).toBe(1);
      expect(result.transferAnalysis.transfersWithinLookback.length).toBe(2);
      expect(result.penaltyCalculation.hasPenalty).toBe(false); // Under gift exclusion
    });

    test('should consider family relationships in strategy development', async () => {
      const clientInfo = {
        ...baseClientInfo,
        familyInfo: {
          children: [
            { name: 'Child 1', relationship: 'primary caregiver', livesWithClient: true },
            { name: 'Child 2', relationship: 'distant' }
          ]
        }
      };
      
      const pastTransfers = [
        {
          date: oneYearAgo.toISOString().split('T')[0],
          amount: 50000,
          recipient: 'child',
          recipientName: 'Child 1',
          purpose: 'gift',
          documentation: 'bank statement'
        }
      ];
      
      const result = await divestmentPlanning(
        clientInfo,
        pastTransfers,
        baseState
      );
      
      // Should suggest caregiver exemption strategy
      expect(result.strategies.some(s => s.toLowerCase().includes('caregiver'))).toBe(true);
    });
  });
});