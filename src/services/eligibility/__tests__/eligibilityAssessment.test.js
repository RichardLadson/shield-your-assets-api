// src/services/eligibility/__tests__/eligibilityAssessment.test.js
const { assessMedicaidEligibility } = require('../eligibilityAssessment');
const { validateAllInputs } = require('../../validation/inputValidation');
const { loadMedicaidRules } = require('../../utils/medicaidRulesLoader');

// Mock the validation and rules loader modules
jest.mock('../../validation/inputValidation');
jest.mock('../../utils/medicaidRulesLoader');

// Mock the logger
jest.mock('../../../config/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Eligibility Assessment', () => {
  // Sample data for testing
  const sampleAssets = {
    savings: 50000,
    investments: 30000,
    home: 200000,
    vehicle: 15000
  };
  
  const sampleIncome = {
    social_security: 1500,
    pension: 1000
  };
  
  const sampleRulesData = {
    florida: {
      resourceLimitSingle: 2000,
      resourceLimitMarried: 3000,
      incomeLimitSingle: 2901,
      incomeLimitMarried: 5802,
      nursingHomeIncomeLimitSingle: 2901,
      nursingHomeIncomeLimitMarried: 5802
    }
  };
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock successful validation
    validateAllInputs.mockResolvedValue({
      valid: true,
      message: '',
      normalizedData: {
        clientInfo: {
          name: 'Test Client',
          age: 75,
          maritalStatus: 'single',
          healthStatus: 'declining'
        },
        assets: sampleAssets,
        income: sampleIncome,
        state: 'florida'
      }
    });
    
    // Mock successful rules loading
    loadMedicaidRules.mockResolvedValue(sampleRulesData);
    
    // Mock resource and income limits
    const mockGetResourceLimit = jest.fn().mockImplementation((state, maritalStatus) => {
      return maritalStatus === 'married' ? 3000 : 2000;
    });
    
    const mockGetIncomeLimit = jest.fn().mockImplementation((state, maritalStatus, forNursingHome) => {
      return maritalStatus === 'married' ? 5802 : 2901;
    });
    
    require('../../utils/medicaidRulesLoader').getResourceLimit = mockGetResourceLimit;
    require('../../utils/medicaidRulesLoader').getIncomeLimit = mockGetIncomeLimit;
  });

  test('should assess eligibility successfully', async () => {
    const result = await assessMedicaidEligibility(
      sampleAssets,
      sampleIncome,
      'single',
      'florida',
      75,
      'declining',
      false
    );
    
    expect(result.status).toBe('success');
    expect(result.countableAssets).toBe(80000); // savings + investments
    expect(result.nonCountableAssets).toBe(215000); // home + vehicle
    expect(result.totalIncome).toBe(2500); // social_security + pension
    expect(result.spenddownAmount).toBe(78000); // countableAssets - resourceLimit
    expect(result.isResourceEligible).toBe(false);
    expect(result.isIncomeEligible).toBe(true);
    expect(result.isEligible).toBe(false);
    expect(result.planStrategies.length).toBeGreaterThan(0);
    expect(result.urgency).toBe('Medium - Begin pre-planning soon');
  });

  test('should handle validation errors', async () => {
    // Mock validation failure
    validateAllInputs.mockResolvedValue({
      valid: false,
      message: 'Invalid client info: Age must be a positive number',
      normalizedData: null
    });
    
    const result = await assessMedicaidEligibility(
      sampleAssets,
      sampleIncome,
      'single',
      'florida',
      -5, // Invalid age
      'declining',
      false
    );
    
    expect(result.status).toBe('error');
    expect(result.error).toBe('Invalid client info: Age must be a positive number');
  });

  test('should handle unexpected errors', async () => {
    // Mock a failure in the process
    loadMedicaidRules.mockRejectedValue(new Error('Failed to load rules'));
    
    const result = await assessMedicaidEligibility(
      sampleAssets,
      sampleIncome,
      'single',
      'florida',
      75,
      'declining',
      false
    );
    
    expect(result.status).toBe('error');
    expect(result.error).toContain('Failed to load rules');
  });

  test('should identify eligible clients', async () => {
    // Modify assets to make client eligible
    const eligibleAssets = {
      savings: 1000,
      home: 200000,
      vehicle: 15000
    };
    
    validateAllInputs.mockResolvedValue({
      valid: true,
      message: '',
      normalizedData: {
        clientInfo: {
          name: 'Test Client',
          age: 75,
          maritalStatus: 'single',
          healthStatus: 'declining'
        },
        assets: eligibleAssets,
        income: sampleIncome,
        state: 'florida'
      }
    });
    
    const result = await assessMedicaidEligibility(
      eligibleAssets,
      sampleIncome,
      'single',
      'florida',
      75,
      'declining',
      false
    );
    
    expect(result.status).toBe('success');
    expect(result.countableAssets).toBe(1000);
    expect(result.isResourceEligible).toBe(true);
    expect(result.isIncomeEligible).toBe(true);
    expect(result.isEligible).toBe(true);
    expect(result.spenddownAmount).toBe(0);
  });

  test('should properly calculate urgency levels', async () => {
    // Test high urgency - crisis
    let result = await assessMedicaidEligibility(
      sampleAssets,
      sampleIncome,
      'single',
      'florida',
      75,
      'declining',
      true // Crisis
    );
    expect(result.urgency).toBe('High - Immediate crisis planning required');
    
    // Test high urgency - critical health
    result = await assessMedicaidEligibility(
      sampleAssets,
      sampleIncome,
      'single',
      'florida',
      75,
      'critical',
      false
    );
    expect(result.urgency).toBe('High - Immediate crisis planning required');
    
    // Test high urgency - advanced age
    result = await assessMedicaidEligibility(
      sampleAssets,
      sampleIncome,
      'single',
      'florida',
      85, // >80
      'good',
      false
    );
    expect(result.urgency).toBe('High - Immediate crisis planning required');
    
    // Test low urgency
    result = await assessMedicaidEligibility(
      sampleAssets,
      sampleIncome,
      'single',
      'florida',
      65,
      'good',
      false
    );
    expect(result.urgency).toBe('Low - Good candidate for long-term pre-planning');
  });
});