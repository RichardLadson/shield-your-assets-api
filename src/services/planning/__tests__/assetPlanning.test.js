const {
  assessAssetSituation,
  determineAssetStrategies,
  planAssetApproach,
  medicaidAssetPlanning
} = require('../assetPlanning');

jest.mock('../../../eligibility/eligibilityUtils', () => ({
  classifyAssets: jest.fn().mockReturnValue({
    countableAssets: 5000,
    nonCountableAssets: 150000
  })
}));

describe('Asset Planning Module', () => {
  const clientInfo = {
    state: 'florida',
    maritalStatus: 'single'
  };

  const assets = {
    total: 155000,
    countable: 5000,
    nonCountable: 150000
  };

  const state = 'florida';

  describe('assessAssetSituation', () => {
    test('should classify and assess assets correctly', () => {
      const situation = assessAssetSituation(clientInfo, assets, state);
      expect(situation).toHaveProperty('countableAssets');
      expect(situation.countableAssets).toBeGreaterThan(0);
    });
  });

  describe('determineAssetStrategies', () => {
    const situation = {
      countableAssets: 5000,
      state: 'florida'
    };

    test('should suggest spend-down options', () => {
      const strategies = determineAssetStrategies(situation);
      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies).toContain('Convert countable assets to exempt assets');
    });
  });

  describe('planAssetApproach', () => {
    const strategies = ['Convert countable assets to exempt assets'];
    const situation = {
      countableAssets: 5000
    };

    test('should generate a planning explanation', () => {
      const plan = planAssetApproach(strategies, situation);
      expect(plan).toContain('Convert countable assets to exempt assets');
    });
  });

  test('medicaidAssetPlanning should run and return success', async () => {
    const result = await medicaidAssetPlanning(clientInfo, assets, state);
    expect(result.status).toBe('success');
    expect(result).toHaveProperty('strategies');
    expect(result).toHaveProperty('approach');
  });
});
