// src/services/planning/__tests__/divestmentPlanning.test.js

const {
  assessDivestmentSituation,
  determineDivestmentStrategies,
  planDivestmentApproach,
  medicaidDivestmentPlanning
} = require('../divestmentPlanning');

// Mock Medicaid rules loader to avoid undefined threshold errors
jest.mock('../../utils/medicaidRulesLoader', () => ({
  getStateRules: jest.fn().mockResolvedValue({
    assetLimitSingle: 2000,
    assetLimitMarried: 3000,
    incomeLimitSingle: 2901,
    incomeLimitMarried: 5802
  }),
  normalizeState: jest.fn(state => state.toLowerCase()),
  loadMedicaidRules: jest.fn().mockResolvedValue({
    florida: {
      assetLimitSingle: 2000,
      assetLimitMarried: 3000,
      incomeLimitSingle: 2901,
      incomeLimitMarried: 5802
    }
  })
}));

describe('Divestment Planning Module', () => {
  const clientInfo = {
    age: 75,
    maritalStatus: 'single',
    state: 'florida',
    homeOwnership: true
  };

  const assets = {
    total: 30000,
    countable: 8000,
    exempt: 22000
  };

  const state = 'florida';

  describe('assessDivestmentSituation', () => {
    test('should identify excess countable assets', () => {
      const result = assessDivestmentSituation(clientInfo, assets, state);
      expect(result).toHaveProperty('excessAssets');
      expect(typeof result.excessAssets).toBe('number');
      expect(result.excessAssets).toBeGreaterThan(0);
    });

    test('should report no excess assets if countable is below limit', () => {
      const lowAssets = { ...assets, countable: 1000 };
      const result = assessDivestmentSituation(clientInfo, lowAssets, state);
      expect(result.excessAssets).toBe(0);
    });
  });

  describe('determineDivestmentStrategies', () => {
    const situation = {
      excessAssets: 5000,
      hasHome: true,
      state: 'florida'
    };

    test('should suggest gifting and annuity strategies', () => {
      const strategies = determineDivestmentStrategies(situation);
      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies).toContain('Consider gifting excess assets within Medicaid look-back rules');
    });
  });

  describe('planDivestmentApproach', () => {
    const strategies = ['Consider gifting excess assets'];
    const situation = {
      excessAssets: 5000,
      hasHome: true
    };

    test('should include strategy details in the plan', () => {
      const plan = planDivestmentApproach(strategies, situation);
      expect(typeof plan).toBe('string');
      expect(plan).toContain('Consider gifting excess assets');
    });
  });

  describe('medicaidDivestmentPlanning', () => {
    test('should complete successfully and return a valid plan', async () => {
      const result = await medicaidDivestmentPlanning(clientInfo, assets, state);
      expect(result).toHaveProperty('status', 'success');
      expect(result).toHaveProperty('strategies');
      expect(Array.isArray(result.strategies)).toBe(true);
      expect(result).toHaveProperty('approach');
      expect(typeof result.approach).toBe('string');
    });
  });
});
