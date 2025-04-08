// src/services/validation/__tests__/inputValidation.test.js
const {
    validateClientInfo,
    validateAssets,
    validateIncome,
    validateExpenses,
    validateHomeInfo
  } = require('../inputValidation');
  
  // Mock the logger
  jest.mock('../../../config/logger', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }));
  
  describe('Input Validation', () => {
    describe('validateClientInfo', () => {
      test('should validate valid client info', () => {
        const clientInfo = {
          name: 'John Doe',
          age: 75,
          maritalStatus: 'single',
          healthStatus: 'good'
        };
        
        const result = validateClientInfo(clientInfo);
        expect(result.valid).toBe(true);
        expect(result.normalizedData).toEqual(clientInfo);
      });
  
      test('should normalize field names and values', () => {
        const clientInfo = {
          name: 'John Doe',
          age: '75',
          'marital-status': 'MARRIED',
          health_status: 'Declining'
        };
        
        const result = validateClientInfo(clientInfo);
        expect(result.valid).toBe(true);
        expect(result.normalizedData.maritalStatus).toBe('married');
        expect(result.normalizedData.healthStatus).toBe('declining');
        expect(result.normalizedData.age).toBe(75);
      });
  
      test('should reject missing required fields', () => {
        const clientInfo = {
          name: 'John Doe'
          // Missing age and maritalStatus
        };
        
        const result = validateClientInfo(clientInfo);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('Age is required');
      });
  
      test('should reject invalid values', () => {
        const clientInfo = {
          name: 'John Doe',
          age: -5,
          maritalStatus: 'unknown'
        };
        
        const result = validateClientInfo(clientInfo);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('Age must be a positive number');
        expect(result.message).toContain('Marital status must be one of');
      });
    });
  
    describe('validateAssets', () => {
      test('should validate valid assets', () => {
        const assets = {
          savings: 50000,
          home: 200000,
          investments: 30000
        };
        
        const result = validateAssets(assets);
        expect(result.valid).toBe(true);
        expect(result.normalizedData).toEqual(assets);
      });
  
      test('should normalize asset names and values', () => {
        const assets = {
          'Bank Savings': '50000',
          'Home Value': 200000
        };
        
        const result = validateAssets(assets);
        expect(result.valid).toBe(true);
        expect(result.normalizedData.bank_savings).toBe(50000);
        expect(result.normalizedData.home_value).toBe(200000);
      });
  
      test('should reject empty assets', () => {
        const result = validateAssets({});
        expect(result.valid).toBe(false);
        expect(result.message).toContain('At least one asset must be provided');
      });
  
      test('should reject negative values', () => {
        const assets = {
          savings: -5000,
          home: 200000
        };
        
        const result = validateAssets(assets);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('Asset values must be positive numbers');
      });
    });
  
    // Similar tests for validateIncome, validateExpenses, validateHomeInfo
  });