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
  
  describe('Care Planning Module', () => {
    // Sample test data
    const clientInfo = {
      name: 'Test Client',
      age: 85
    };
    
    const medicalInfo = {
      adls: {
        bathing: 'dependent',
        dressing: 'dependent',
        toileting: 'dependent',
        transferring: 'dependent',
        continence: 'dependent',
        feeding: 'independent'
      },
      iadls: {
        mealPrep: 'dependent',
        finances: 'dependent',
        medications: 'dependent',
        transportation: 'dependent',
        housework: 'dependent',
        shopping: 'dependent',
        communication: 'independent'
      },
      cognitiveAssessment: {
        score: 15,
        wandering: true,
        poorJudgment: true
      },
      conditions: ['Dementia', 'Hypertension', 'Diabetes'],
      mobility: 'wheelchair'
    };
    
    const livingInfo = {
      homeDetails: {
        stairs: true,
        stairLift: false,
        accessibleBathroom: false,
        firstFloorBedroom: false,
        elevator: false,
        wheelchairAccessible: false,
        wideHallways: true
      }
    };
    
    const state = 'florida';
    
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    describe('assessCareNeeds', () => {
      test('should assess care needs correctly', () => {
        const careNeeds = assessCareNeeds(clientInfo, medicalInfo, livingInfo);
        
        expect(careNeeds).toHaveProperty('adlScore');
        expect(careNeeds).toHaveProperty('iadlScore');
        expect(careNeeds).toHaveProperty('cognitiveImpairment');
        expect(careNeeds).toHaveProperty('medicalComplexity');
        expect(careNeeds).toHaveProperty('recommendedCareLevel');
        expect(careNeeds).toHaveProperty('homeSafetyRisk');
        expect(careNeeds).toHaveProperty('primaryDiagnoses');
        expect(careNeeds.primaryDiagnoses).toContain('Dementia');
        expect(careNeeds.adlScore).toBeGreaterThan(0);
      });
      
      test('should handle missing data gracefully', () => {
        const minimalMedicalInfo = {
          conditions: ['Dementia']
        };
        
        const minimalLivingInfo = {};
        
        const careNeeds = assessCareNeeds(clientInfo, minimalMedicalInfo, minimalLivingInfo);
        
        expect(careNeeds).toHaveProperty('adlScore');
        expect(careNeeds).toHaveProperty('iadlScore');
        expect(careNeeds).toHaveProperty('cognitiveImpairment');
        expect(careNeeds.primaryDiagnoses).toEqual(['Dementia']);
      });
    });
    
    describe('determineCareStrategies', () => {
      test('should recommend nursing facility for high needs', () => {
        const careNeeds = {
          adlScore: 5,
          iadlScore: 6,
          cognitiveImpairment: 'moderate',
          medicalComplexity: 'medium',
          recommendedCareLevel: 'nursing',
          homeSafetyRisk: 'high'
        };
        
        const strategies = determineCareStrategies(careNeeds, state);
        
        expect(strategies).toContain('Plan for skilled nursing facility placement');
      });
      
      test('should recommend assisted living for moderate needs', () => {
        const careNeeds = {
          adlScore: 3,
          iadlScore: 5,
          cognitiveImpairment: 'mild',
          medicalComplexity: 'low',
          recommendedCareLevel: 'assisted',
          homeSafetyRisk: 'medium'
        };
        
        const strategies = determineCareStrategies(careNeeds, state);
        
        expect(strategies).toContain('Evaluate assisted living facilities with Medicaid waivers');
      });
      
      test('should recommend memory care for cognitive impairment', () => {
        const careNeeds = {
          adlScore: 3,
          iadlScore: 5,
          cognitiveImpairment: 'moderate',
          medicalComplexity: 'low',
          recommendedCareLevel: 'assisted',
          homeSafetyRisk: 'medium'
        };
        
        const strategies = determineCareStrategies(careNeeds, state);
        
        expect(strategies).toContain('Seek specialized memory care services');
      });
    });
    
    describe('planCareApproach', () => {
      test('should create detailed care plan based on strategies', () => {
        const strategies = [
          'Plan for skilled nursing facility placement',
          'Seek specialized memory care services',
          'Coordinate complex medical care management'
        ];
        
        const careNeeds = {
          adlScore: 5,
          iadlScore: 6,
          cognitiveImpairment: 'moderate',
          medicalComplexity: 'high',
          recommendedCareLevel: 'nursing',
          homeSafetyRisk: 'high',
          primaryDiagnoses: ['Dementia', 'Diabetes'],
          mobilityStatus: 'wheelchair'
        };
        
        const approach = planCareApproach(strategies, careNeeds, state);
        
        expect(approach).toContain('Care Planning Approach');
        expect(approach).toContain('Assessment Summary');
        expect(approach).toContain('Skilled Nursing Facility Planning');
        expect(approach).toContain('Memory Care Considerations');
        expect(approach).toContain('Complex Medical Care Coordination');
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
      });
      
      test('should handle errors gracefully', async () => {
        // Create a situation that will cause an error
        const badMedicalInfo = null;
        
        const result = await medicaidCarePlanning(clientInfo, badMedicalInfo, livingInfo, state);
        
        expect(result.status).toBe('error');
        expect(result).toHaveProperty('error');
      });
    });
  });