// src/services/planning/__tests__/assetPlanning.test.js
const {
  assessAssetSituation,
  determineAssetStrategies,
  planAssetApproach,
  medicaidAssetPlanning
} = require('../assetPlanning');

// Mock the dependencies
jest.mock('../../../config/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock the validation service
jest.mock('../../validation/inputValidation', () => ({
  validateAllInputs: jest.fn().mockResolvedValue({
    valid: true,
    message: 'All inputs are valid',
    normalizedData: {
      clientInfo: { name: 'Test Client', age: 75, maritalStatus: 'single' },
      assets: { countable: 5000, home: 150000 },
      state: 'florida'
    }
  })
}));

// Mock the medicaid rules loader
jest.mock('../../utils/medicaidRulesLoader', () => ({
  getResourceLimit: jest.fn().mockResolvedValue(2000),
  getHomeEquityLimit: jest.fn().mockResolvedValue(636000),
  loadMedicaidRules: jest.fn().mockResolvedValue({
    florida: {
      assetLimitSingle: 2000,
      assetLimitMarried: 3000,
      homeEquityLimit: 636000
    },
    newyork: {
      assetLimitSingle: 15750,
      assetLimitMarried: 23400,
      homeEquityLimit: 906000
    }
  })
}));

// Mock the eligibility utils
jest.mock('../../eligibility/eligibilityUtils', () => ({
  classifyAssets: jest.fn().mockImplementation((assets) => {
    return {
      countableAssets: assets.countable || 0,
      nonCountableAssets: assets.home || assets.non_countable || 0
    };
  })
}));

describe('Asset Planning Module', () => {
  // Sample test data
  const clientInfo = {
    name: 'Test Client',
    age: 75,
    maritalStatus: 'single'
  };
  
  const assets = {
    countable: 5000,
    home: 150000,
    mortgage: 50000
  };
  
  const state = 'florida';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('assessAssetSituation', () => {
    test('should classify and assess assets correctly', async () => {
      const rulesData = {
        florida: {
          assetLimitSingle: 2000,
          homeEquityLimit: 636000
        }
      };
      
      const situation = await assessAssetSituation(assets, state, 'single', rulesData);
      
      expect(situation).toHaveProperty('countableAssets');
      expect(situation).toHaveProperty('nonCountableAssets');
      expect(situation).toHaveProperty('excessAssets');
      expect(situation).toHaveProperty('hasHome');
      expect(situation).toHaveProperty('homeValue');
      expect(situation).toHaveProperty('homeMortgage');
      expect(situation).toHaveProperty('homeEquity');
      expect(situation).toHaveProperty('resourceLimit');
      
      expect(situation.countableAssets).toBe(5000);
      expect(situation.excessAssets).toBe(3000); // 5000 - 2000
      expect(situation.hasHome).toBe(true);
      expect(situation.homeValue).toBe(150000);
      expect(situation.homeMortgage).toBe(50000);
      expect(situation.homeEquity).toBe(100000); // 150000 - 50000
    });
    
    test('should identify excess home equity when above limit', async () => {
      const highValueHome = {
        countable: 5000,
        home: 700000,
        mortgage: 50000
      };
      
      const rulesData = {
        florida: {
          assetLimitSingle: 2000,
          homeEquityLimit: 636000
        }
      };
      
      const situation = await assessAssetSituation(highValueHome, state, 'single', rulesData);
      
      expect(situation.homeEquity).toBe(650000); // 700000 - 50000
      expect(situation.excessHomeEquity).toBe(14000); // 650000 - 636000
    });
    
    test('should handle no home ownership', async () => {
      const noHomeAssets = {
        countable: 5000,
        non_countable: 20000
      };
      
      const rulesData = {
        florida: {
          assetLimitSingle: 2000,
          homeEquityLimit: 636000
        }
      };
      
      const situation = await assessAssetSituation(noHomeAssets, state, 'single', rulesData);
      
      expect(situation.hasHome).toBe(false);
      expect(situation.homeValue).toBe(0);
      expect(situation.homeMortgage).toBe(0);
      expect(situation.homeEquity).toBe(0);
      expect(situation.excessHomeEquity).toBe(0);
    });
    
    test('should calculate different limits for different states', async () => {
      const rulesData = {
        florida: {
          assetLimitSingle: 2000,
          homeEquityLimit: 636000
        },
        newyork: {
          assetLimitSingle: 15750,
          homeEquityLimit: 906000
        }
      };
      
      const flSituation = await assessAssetSituation(assets, 'florida', 'single', rulesData);
      const nySituation = await assessAssetSituation(assets, 'newyork', 'single', rulesData);
      
      expect(flSituation.resourceLimit).toBe(2000);
      expect(flSituation.excessAssets).toBe(3000); // 5000 - 2000
      
      expect(nySituation.resourceLimit).toBe(15750);
      expect(nySituation.excessAssets).toBe(0); // 5000 < 15750
    });
  });
  
  describe('determineAssetStrategies', () => {
    test('should suggest spend-down options for excess assets', () => {
      const situation = {
        countableAssets: 5000,
        excessAssets: 3000,
        resourceLimit: 2000,
        hasHome: true,
        state: 'florida'
      };
      
      const strategies = determineAssetStrategies(situation);
      
      expect(strategies).toContain('Convert countable assets to non-countable assets');
      expect(strategies).toContain('Maximize homestead advantages');
    });
    
    test('should recommend home equity reduction when needed', () => {
      const situation = {
        countableAssets: 5000,
        excessAssets: 3000,
        hasHome: true,
        homeEquity: 650000,
        homeEquityLimit: 636000,
        excessHomeEquity: 14000,
        state: 'florida'
      };
      
      const strategies = determineAssetStrategies(situation);
      
      expect(strategies).toContain('Address excess home equity');
    });
    
    test('should not recommend home-related strategies when client has no home', () => {
      const situation = {
        countableAssets: 5000,
        excessAssets: 3000,
        hasHome: false,
        state: 'florida'
      };
      
      const strategies = determineAssetStrategies(situation);
      
      expect(strategies).not.toContain('Maximize homestead advantages');
      expect(strategies).not.toContain('Address excess home equity');
    });
    
    test('should recommend different strategies for clients who are already eligible', () => {
      const situation = {
        countableAssets: 1500,
        excessAssets: 0,
        resourceLimit: 2000,
        hasHome: true,
        state: 'florida'
      };
      
      const strategies = determineAssetStrategies(situation);
      
      // Should still suggest some general strategies but not spend-down
      expect(strategies).toContain('Evaluate personal property exemptions');
      expect(strategies).not.toContain('Convert countable assets to non-countable assets');
    });
  });
  
  describe('planAssetApproach', () => {
    test('should generate a comprehensive planning explanation', () => {
      const strategies = [
        'Convert countable assets to non-countable assets',
        'Maximize homestead advantages',
        'Evaluate personal property exemptions'
      ];
      
      const situation = {
        countableAssets: 5000,
        nonCountableAssets: 150000,
        excessAssets: 3000,
        resourceLimit: 2000,
        hasHome: true,
        homeValue: 150000,
        homeMortgage: 50000,
        homeEquity: 100000,
        state: 'florida'
      };
      
      const plan = planAssetApproach(strategies, situation);
      
      expect(plan).toContain('Asset Eligibility Planning Approach');
      expect(plan).toContain('Identify $3000.00 in excess countable assets');
      expect(plan).toContain('Pay off debt, especially home mortgage');
      expect(plan).toContain('Consider home renovations or improvements');
      expect(plan).toContain('Review florida-specific rules on exempt personal property');
    });
    
    test('should include excess home equity strategies when needed', () => {
      const strategies = [
        'Address excess home equity'
      ];
      
      const situation = {
        countableAssets: 5000,
        excessAssets: 3000,
        hasHome: true,
        homeEquity: 650000,
        homeEquityLimit: 636000,
        excessHomeEquity: 14000,
        state: 'florida'
      };
      
      const plan = planAssetApproach(strategies, situation);
      
      expect(plan).toContain('Current home equity ($650000.00) exceeds state limit of $636000.00');
      expect(plan).toContain('Consider home equity loan or reverse mortgage to reduce equity by $14000.00');
    });
    
    test('should include guidance for different states', () => {
      const strategies = [
        'Convert countable assets to non-countable assets'
      ];
      
      const flSituation = {
        countableAssets: 5000,
        excessAssets: 3000,
        state: 'florida'
      };
      
      const nySituation = {
        countableAssets: 5000,
        excessAssets: 0,
        state: 'newyork'
      };
      
      const flPlan = planAssetApproach(strategies, flSituation);
      const nyPlan = planAssetApproach(strategies, nySituation);
      
      expect(flPlan).toContain('florida');
      expect(nyPlan).toContain('newyork');
    });
  });
  
  describe('medicaidAssetPlanning', () => {
    test('should complete the asset planning process successfully', async () => {
      const result = await medicaidAssetPlanning(clientInfo, assets, state);
      
      expect(result.status).toBe('success');
      expect(result).toHaveProperty('situation');
      expect(result).toHaveProperty('strategies');
      expect(result).toHaveProperty('approach');
      expect(result.situation.countableAssets).toBe(5000);
      expect(result.situation.excessAssets).toBe(3000);
    });
    
    test('should handle validation failures', async () => {
      // Mock validation failure
      require('../../validation/inputValidation').validateAllInputs.mockResolvedValueOnce({
        valid: false,
        message: 'Invalid asset data',
        normalizedData: null
      });
      
      const result = await medicaidAssetPlanning(clientInfo, assets, state);
      
      expect(result.status).toBe('error');
      expect(result.error).toContain('Invalid asset data');
    });
    
    test('should handle unexpected errors', async () => {
      // Mock loadMedicaidRules to throw an error
      require('../../utils/medicaidRulesLoader').loadMedicaidRules.mockRejectedValueOnce(
        new Error('Database connection error')
      );
      
      const result = await medicaidAssetPlanning(clientInfo, assets, state);
      
      expect(result.status).toBe('error');
      expect(result.error).toContain('Database connection error');
    });
    
    test('should handle different states', async () => {
      const flResult = await medicaidAssetPlanning(clientInfo, assets, 'florida');
      const nyResult = await medicaidAssetPlanning(clientInfo, assets, 'newyork');
      
      // Both should be successful
      expect(flResult.status).toBe('success');
      expect(nyResult.status).toBe('success');
    });
    
    test('should handle different marital statuses', async () => {
      const singleClient = { ...clientInfo, maritalStatus: 'single' };
      const marriedClient = { ...clientInfo, maritalStatus: 'married' };
      
      const singleResult = await medicaidAssetPlanning(singleClient, assets, state);
      const marriedResult = await medicaidAssetPlanning(marriedClient, assets, state);
      
      expect(singleResult.status).toBe('success');
      expect(marriedResult.status).toBe('success');
    });
  });
});