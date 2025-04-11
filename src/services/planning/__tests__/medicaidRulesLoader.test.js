// src/services/utils/__tests__/medicaidRulesLoader.test.js
const path = require('path');
const fs = require('fs').promises;
const {
  loadMedicaidRules,
  getStateRules,
  getResourceLimit,
  normalizeState
} = require('../medicaidRulesLoader');

// Mock the fs module
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn()
  }
}));

// Mock the logger
jest.mock('../../../../config/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Medicaid Rules Loader', () => {
  // Sample rules data for testing
  const sampleRulesData = {
    florida: {
      resourceLimitSingle: 2000,
      resourceLimitMarried: 3000,
      incomeLimitSingle: 2901,
      incomeLimitMarried: 5802
    },
    california: {
      resourceLimitSingle: null,
      resourceLimitMarried: null,
      incomeLimitSingle: 1801,
      incomeLimitMarried: 2433
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Simulate accessible file
    fs.access.mockResolvedValue(undefined);

    // Simulate file stat
    fs.stat.mockResolvedValue({ mtimeMs: 123456789 });

    // Simulate valid rules data
    fs.readFile.mockResolvedValue(JSON.stringify(sampleRulesData));
  });

  describe('loadMedicaidRules', () => {
    test('should load rules successfully', async () => {
      const result = await loadMedicaidRules();
      expect(result).toEqual(sampleRulesData);
      expect(fs.readFile).toHaveBeenCalled();
    });

    test('should handle file not found', async () => {
      fs.access.mockRejectedValue(new Error('File not found'));
      await expect(loadMedicaidRules()).rejects.toThrow('Rules file not found');
    });

    test('should handle invalid JSON', async () => {
      fs.readFile.mockResolvedValue('invalid json');
      await expect(loadMedicaidRules()).rejects.toThrow('Invalid JSON format');
    });
  });

  describe('getStateRules', () => {
    test('should get rules for a valid state', async () => {
      const result = await getStateRules('Florida', sampleRulesData);
      expect(result).toEqual(sampleRulesData.florida);
    });

    test('should get rules for a valid state abbreviation', async () => {
      const result = await getStateRules('FL', sampleRulesData);
      expect(result).toEqual(sampleRulesData.florida);
    });

    test('should throw error for invalid state', async () => {
      await expect(getStateRules('InvalidState', sampleRulesData)).rejects.toThrow('Invalid state');
    });
  });

  describe('normalizeState', () => {
    test('should normalize state names correctly', () => {
      expect(normalizeState('Florida')).toBe('florida');
      expect(normalizeState('fl')).toBe('florida');
      expect(normalizeState('FLORIDA')).toBe('florida');
      expect(normalizeState('New York')).toBe('newyork');
    });

    test('should throw error for invalid input', () => {
      expect(() => normalizeState('')).toThrow('State must be a non-empty string');
      expect(() => normalizeState(null)).toThrow('State must be a non-empty string');
    });
  });

  describe('getResourceLimit', () => {
    test('should get correct resource limit for single', async () => {
      const result = await getResourceLimit('Florida', 'single', sampleRulesData);
      expect(result).toBe(2000);
    });

    test('should get correct resource limit for married', async () => {
      const result = await getResourceLimit('Florida', 'married', sampleRulesData);
      expect(result).toBe(3000);
    });

    test('should use default for null value', async () => {
      const result = await getResourceLimit('California', 'single', sampleRulesData);
      expect(result).toBe(2000); // Fallback default
    });
  });
});
