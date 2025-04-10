// src/services/planning/__tests__/applicationPlanning.test.js

const {
    planApplication,
    medicaidApplicationPlanning
  } = require('../applicationPlanning');
  
  // Mock the dependencies
  jest.mock('../../../config/logger', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }));
  
  describe('Application Planning Module', () => {
    // Sample test data
    const clientInfo = {
      name: 'Test Client',
      age: 75
    };
  
    const assets = {
      countable: 5000,
      non_countable: 150000
    };
  
    const income = {
      social_security: 1500,
      pension: 800
    };
  
    const state = 'florida';
    const maritalStatus = 'single';
  
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    describe('planApplication', () => {
      test('should plan application correctly for elderly client', () => {
        const input = {
          clientInfo: { ...clientInfo },
          assets,
          income,
          state,
          maritalStatus
        };
  
        const result = planApplication(input);
  
        expect(result).toHaveProperty('applicant');
        expect(result).toHaveProperty('timingFactors');
        expect(result).toHaveProperty('applicationStrategies');
        expect(result).toHaveProperty('applicationApproach');
        expect(result.applicant).toBe('Patient');
      });
  
      test('should recommend different applicant for married client', () => {
        const input = {
          clientInfo: { ...clientInfo },
          assets,
          income,
          state,
          maritalStatus: 'married'
        };
  
        const result = planApplication(input);
  
        expect(result.applicant).toBe('Community Spouse');
      });
  
      test('should recommend authorized representative for younger client', () => {
        const input = {
          clientInfo: { ...clientInfo, age: 55 },
          assets,
          income,
          state,
          maritalStatus
        };
  
        const result = planApplication(input);
  
        expect(result.applicant).toBe('Authorized Representative');
      });
  
      test('should recommend retroactive coverage when needed', () => {
        const input = {
          clientInfo: { ...clientInfo },
          assets: { countable: 5000 },
          income,
          state,
          maritalStatus
        };
  
        const result = planApplication(input);
  
        expect(result.timingFactors.needsRetroactiveCoverage).toBe(true);
        expect(result.applicationStrategies).toContain('Request retroactive coverage for up to 3 months.');
      });
  
      test('should recommend spend-down planning for excess assets', () => {
        const input = {
          clientInfo: { ...clientInfo },
          assets: { countable: 5000 },
          income,
          state,
          maritalStatus
        };
  
        const result = planApplication(input);
  
        expect(result.timingFactors.pendingSpendDown).toBe(true);
        expect(result.applicationStrategies).toContain('Plan and document spend-down of excess assets.');
      });
  
      test('should recommend Miller Trust for excess income', () => {
        const highIncome = {
          social_security: 2000,
          pension: 1500
        };
  
        const input = {
          clientInfo: { ...clientInfo },
          assets: { countable: 1000 },
          income: highIncome,
          state,
          maritalStatus
        };
  
        const result = planApplication(input);
  
        expect(result.timingFactors.incomeOverLimit).toBe(true);
        expect(result.applicationStrategies).toContain('Consider setting up a Qualified Income Trust (Miller Trust).');
      });
    });
  
    describe('medicaidApplicationPlanning', () => {
      test('should complete the application planning process successfully', async () => {
        const result = await medicaidApplicationPlanning(clientInfo, assets, income, state, maritalStatus);
  
        expect(result.status).toBe('success');
        expect(result).toHaveProperty('applicant');
        expect(result).toHaveProperty('timingFactors');
        expect(result).toHaveProperty('applicationStrategies');
        expect(result).toHaveProperty('applicationApproach');
      });
  
      test('should handle errors gracefully', async () => {
        const invalidAssets = null;
  
        const result = await medicaidApplicationPlanning(clientInfo, invalidAssets, income, state, maritalStatus);
  
        expect(result.status).toBe('error');
        expect(result).toHaveProperty('error');
      });
    });
  });
  