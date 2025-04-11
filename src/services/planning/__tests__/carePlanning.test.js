// src/services/planning/__tests__/carePlanning.test.js
const {
  assessCareNeeds,
  determineCareStrategies,
  planCareApproach,
  medicaidCarePlanning
} = require('../carePlanning');

// Mock the dependencies
jest.mock('../../../config/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock medicaid rules data
jest.mock('../../../data/medicaid_rules_2025.json', () => ({
  florida: {
    assetLimitSingle: 2000,
    incomeLimitSingle: 2901
  },
  newyork: {
    assetLimitSingle: 15750,
    incomeLimitSingle: 934
  }
}));

describe('Care Planning Module', () => {
  // Sample test data
  const clientInfo = {
    name: 'Test Client',
    age: 85
  };
  
  const medicalInfo = {
    adlLimitations: ['bathing', 'dressing', 'toileting', 'transferring', 'continence'],
    diagnoses: ['Dementia', 'Hypertension', 'Diabetes'],
    mobility: 'wheelchair'
  };
  
  const livingInfo = {
    currentSetting: 'home',
    caregiverSupport: 'family'
  };
  
  const state = 'florida';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('assessCareNeeds', () => {
    test('should assess care needs correctly', () => {
      const careNeeds = assessCareNeeds(medicalInfo, livingInfo, state);
      
      expect(careNeeds).toHaveProperty('recommendedCareLevel');
      expect(careNeeds).toHaveProperty('diagnoses');
      expect(careNeeds).toHaveProperty('adlCount');
      expect(careNeeds).toHaveProperty('currentSetting');
      expect(careNeeds).toHaveProperty('caregiverSupport');
      expect(careNeeds.diagnoses).toContain('Dementia');
      expect(careNeeds.adlCount).toBe(5);
      expect(careNeeds.recommendedCareLevel).toBe('nursing');
    });
    
    test('should handle missing data gracefully', () => {
      const minimalMedicalInfo = {
        diagnoses: ['Dementia']
      };
      
      const minimalLivingInfo = {};
      
      const careNeeds = assessCareNeeds(minimalMedicalInfo, minimalLivingInfo, state);
      
      expect(careNeeds).toHaveProperty('recommendedCareLevel');
      expect(careNeeds.diagnoses).toEqual(['Dementia']);
      // Should handle missing ADL count
      expect(careNeeds.adlCount).toBe(0);
      // Should still recommend nursing home due to dementia
      expect(careNeeds.recommendedCareLevel).toBe('nursing');
    });
    
    test('should handle completely empty inputs', () => {
      const emptyMedicalInfo = {};
      const emptyLivingInfo = {};
      
      const careNeeds = assessCareNeeds(emptyMedicalInfo, emptyLivingInfo, state);
      
      expect(careNeeds).toBeDefined();
      expect(careNeeds.recommendedCareLevel).toBe('in-home');
    });
    
    test('should recommend assisted living for moderate needs', () => {
      const moderateMedicalInfo = {
        adlLimitations: ['bathing', 'dressing'],
        diagnoses: ['Arthritis']
      };
      
      const careNeeds = assessCareNeeds(moderateMedicalInfo, livingInfo, state);
      
      expect(careNeeds.recommendedCareLevel).toBe('assisted living');
    });
    
    test('should recommend in-home care for minimal needs with caregiver support', () => {
      const minimalMedicalInfo = {
        adlLimitations: ['bathing'],
        diagnoses: ['Hypertension']
      };
      
      const strongSupportInfo = {
        currentSetting: 'home',
        caregiverSupport: 'full-time'
      };
      
      const careNeeds = assessCareNeeds(minimalMedicalInfo, strongSupportInfo, state);
      
      expect(careNeeds.recommendedCareLevel).toBe('in-home');
    });
  });
  
  describe('determineCareStrategies', () => {
    test('should recommend nursing facility for high needs', () => {
      const careNeeds = {
        recommendedCareLevel: 'nursing',
        diagnoses: ['Dementia'],
        adlCount: 5
      };
      
      const strategies = determineCareStrategies(careNeeds);
      
      expect(strategies).toContain('Plan for skilled nursing facility placement');
      expect(strategies).toContain('Evaluate long-term care insurance coverage or Medicaid eligibility');
    });
    
    test('should recommend assisted living for moderate needs', () => {
      const careNeeds = {
        recommendedCareLevel: 'assisted living',
        diagnoses: ['Arthritis'],
        adlCount: 2
      };
      
      const strategies = determineCareStrategies(careNeeds);
      
      expect(strategies).toContain('Research assisted living facilities near family members');
      expect(strategies).toContain('Evaluate income and asset availability for private pay or waiver programs');
    });
    
    test('should recommend home care for minimal needs', () => {
      const careNeeds = {
        recommendedCareLevel: 'in-home',
        diagnoses: ['Hypertension'],
        adlCount: 1
      };
      
      const strategies = determineCareStrategies(careNeeds);
      
      expect(strategies).toContain('Coordinate home care services through local agencies');
      expect(strategies).toContain('Apply for Medicaid waiver programs if care needs meet criteria');
    });
    
    test('should handle unknown care level gracefully', () => {
      const careNeeds = {
        recommendedCareLevel: 'unknown',
        diagnoses: ['Other'],
        adlCount: 0
      };
      
      const strategies = determineCareStrategies(careNeeds);
      
      // Should default to in-home strategies
      expect(strategies).toContain('Coordinate home care services through local agencies');
    });
  });
  
  describe('planCareApproach', () => {
    test('should create detailed care plan based on strategies', () => {
      const strategies = [
        'Plan for skilled nursing facility placement',
        'Evaluate long-term care insurance coverage or Medicaid eligibility'
      ];
      
      const careNeeds = {
        recommendedCareLevel: 'nursing',
        diagnoses: ['Dementia', 'Diabetes'],
        adlCount: 5,
        currentSetting: 'home',
        caregiverSupport: 'family',
        state: 'florida'
      };
      
      const approach = planCareApproach(strategies, careNeeds);
      
      expect(approach).toContain('Care Planning Approach');
      expect(approach).toContain('Recommended Level of Care: NURSING');
      expect(approach).toContain('Diagnoses: Dementia, Diabetes');
      expect(approach).toContain('ADL Limitations: 5');
      expect(approach).toContain('Plan for skilled nursing facility placement');
      expect(approach).toContain('Evaluate long-term care insurance coverage');
      expect(approach).toContain('Next Steps');
    });
    
    test('should include all provided strategies in the approach', () => {
      const strategies = [
        'Strategy 1',
        'Strategy 2',
        'Strategy 3'
      ];
      
      const careNeeds = {
        recommendedCareLevel: 'assisted living',
        diagnoses: ['Arthritis'],
        adlCount: 2,
        currentSetting: 'home',
        caregiverSupport: 'none',
        state: 'florida'
      };
      
      const approach = planCareApproach(strategies, careNeeds);
      
      strategies.forEach(strategy => {
        expect(approach).toContain(strategy);
      });
    });
    
    test('should correctly format state information', () => {
      const strategies = ['Strategy 1'];
      const careNeeds = {
        recommendedCareLevel: 'in-home',
        diagnoses: [],
        adlCount: 0,
        currentSetting: 'home',
        caregiverSupport: 'family',
        state: 'newyork'
      };
      
      const approach = planCareApproach(strategies, careNeeds);
      
      expect(approach).toContain('Review Medicaid waiver programs available in newyork');
    });
    
    test('should handle empty strategy array', () => {
      const strategies = [];
      const careNeeds = {
        recommendedCareLevel: 'in-home',
        diagnoses: ['Hypertension'],
        adlCount: 1,
        currentSetting: 'home',
        caregiverSupport: 'family',
        state: 'florida'
      };
      
      const approach = planCareApproach(strategies, careNeeds);
      
      // Should still create a plan even with no strategies
      expect(approach).toContain('Care Planning Approach');
      expect(approach).toContain('Recommended Level of Care');
      expect(approach).toContain('Next Steps');
    });
  });
  
  describe('medicaidCarePlanning', () => {
    test('should complete the care planning process successfully', async () => {
      const result = await medicaidCarePlanning(clientInfo, medicalInfo, livingInfo, state);
      
      expect(result.status).toBe('success');
      expect(result).toHaveProperty('careNeeds');
      expect(result).toHaveProperty('strategies');
      expect(result).toHaveProperty('approach');
      expect(result.careNeeds.recommendedCareLevel).toBe('nursing');
      expect(result.strategies).toContain('Plan for skilled nursing facility placement');
    });
    
    test('should handle errors gracefully', async () => {
      // Mock assessCareNeeds to throw an error
      const originalAssessCareNeeds = assessCareNeeds;
      global.assessCareNeeds = jest.fn().mockImplementation(() => {
        throw new Error('Mock assessment error');
      });
      
      const result = await medicaidCarePlanning(clientInfo, medicalInfo, livingInfo, state);
      
      expect(result.status).toBe('error');
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Mock assessment error');
      
      // Restore the original function
      global.assessCareNeeds = originalAssessCareNeeds;
    });
    
    test('should process data for different states correctly', async () => {
      const flResult = await medicaidCarePlanning(clientInfo, medicalInfo, livingInfo, 'florida');
      const nyResult = await medicaidCarePlanning(clientInfo, medicalInfo, livingInfo, 'newyork');
      
      expect(flResult.status).toBe('success');
      expect(nyResult.status).toBe('success');
      
      // Both should recommend nursing due to diagnosis
      expect(flResult.careNeeds.recommendedCareLevel).toBe('nursing');
      expect(nyResult.careNeeds.recommendedCareLevel).toBe('nursing');
      
      // State should be retained correctly
      expect(flResult.careNeeds.state).toBe('florida');
      expect(nyResult.careNeeds.state).toBe('newyork');
    });
    
    test('should handle minimal valid inputs', async () => {
      const minimalClientInfo = { age: 75 };
      const minimalMedicalInfo = { diagnoses: [] };
      const minimalLivingInfo = {};
      
      const result = await medicaidCarePlanning(
        minimalClientInfo,
        minimalMedicalInfo,
        minimalLivingInfo,
        state
      );
      
      expect(result.status).toBe('success');
      expect(result.careNeeds.recommendedCareLevel).toBe('in-home');
    });
  });
});