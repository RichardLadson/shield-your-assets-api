const {
  assessCareNeeds,
  determineCareStrategies,
  planCareApproach,
  medicaidCarePlanning,
  assessCognitiveStatus,
  assessFunctionalStatus,
  assessBehavioralStatus,
  assessSafetyRisks,
  assessCaregiverSupport,
  determineCareLevelFromAssessment
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
    age: 85,
    financialInfo: {
      monthlyIncome: 1500,
      liquidAssets: 50000
    },
    preferenceInfo: {
      preferredSetting: 'home',
      valuesPriority: ['independence', 'comfort', 'safety']
    }
  };
  
  const medicalInfo = {
    adlLimitations: ['bathing', 'dressing', 'toileting', 'transferring', 'continence'],
    iadlLimitations: ['medication management', 'meal preparation', 'transportation'],
    diagnoses: ['Dementia', 'Hypertension', 'Diabetes'],
    mobility: 'wheelchair',
    cognitionNotes: 'moderate memory impairment',
    mmseScore: 18,
    behavioralSymptoms: ['wandering', 'sundowning']
  };
  
  const livingInfo = {
    currentSetting: 'home',
    caregiverSupport: 'family',
    caregiverType: 'spouse',
    homeEnvironment: {
      hasStairs: true,
      hasBathSafety: false
    }
  };
  
  const state = 'florida';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('assessCareNeeds', () => {
    test('should assess care needs correctly with full data', () => {
      const careNeeds = assessCareNeeds(medicalInfo, livingInfo, clientInfo.financialInfo, clientInfo.preferenceInfo, state);
      expect(careNeeds).toHaveProperty('recommendedCareLevel');
      expect(careNeeds).toHaveProperty('diagnoses');
      expect(careNeeds).toHaveProperty('adlCount');
      expect(careNeeds).toHaveProperty('currentSetting');
      expect(careNeeds).toHaveProperty('caregiverSupport');
      expect(careNeeds).toHaveProperty('assessment');
      expect(careNeeds).toHaveProperty('detailedRecommendations');
      expect(careNeeds.diagnoses).toContain('Dementia');
      expect(careNeeds.adlCount).toBe(5);
      expect(careNeeds.recommendedCareLevel).toBe('nursing');
    });
    
    test('should handle missing data gracefully', () => {
      const minimalMedicalInfo = { diagnoses: ['Dementia'], cognitionNotes: 'mild' };
      const careNeeds = assessCareNeeds(minimalMedicalInfo, {}, null, null, state);
      expect(careNeeds.recommendedCareLevel).toBe('in-home');
      expect(careNeeds.adlCount).toBe(0);
      expect(careNeeds.assessment.cognitiveStatus.severity).toBe('mild');
    });
    
    test('should handle completely empty inputs', () => {
      const careNeeds = assessCareNeeds({}, {}, null, null, state);
      expect(careNeeds.recommendedCareLevel).toBe('in-home');
      expect(careNeeds.adlCount).toBe(0);
    });
    
    test('should recommend assisted living for moderate needs', () => {
      const moderateMedicalInfo = {
        adlLimitations: ['bathing', 'dressing'],
        diagnoses: ['Arthritis']
      };
      const careNeeds = assessCareNeeds(moderateMedicalInfo, livingInfo, null, null, state);
      expect(careNeeds.recommendedCareLevel).toBe('assisted living');
    });
    
    test('should recommend in-home care for mild dementia with strong support', () => {
      const mildMedicalInfo = {
        diagnoses: ['Dementia'],
        cognitionNotes: 'mild',
        adlLimitations: ['bathing']
      };
      const strongSupportInfo = {
        currentSetting: 'home',
        caregiverSupport: 'full-time'
      };
      const careNeeds = assessCareNeeds(mildMedicalInfo, strongSupportInfo, null, null, state);
      expect(careNeeds.recommendedCareLevel).toBe('in-home');
    });
    
    test('should recommend nursing for severe dementia', () => {
      const severeMedicalInfo = {
        diagnoses: ['Dementia'],
        cognitionNotes: 'severe',
        mmseScore: 8,
        adlLimitations: ['bathing', 'dressing', 'toileting']
      };
      const careNeeds = assessCareNeeds(severeMedicalInfo, livingInfo, null, null, state);
      expect(careNeeds.recommendedCareLevel).toBe('nursing');
    });
  });
  
  describe('Individual Assessment Functions', () => {
    test('should assess cognitive status correctly', () => {
      const cognitiveStatus = assessCognitiveStatus(medicalInfo);
      expect(cognitiveStatus.hasDementia).toBe(true);
      expect(cognitiveStatus.severity).toBe('moderate');
      expect(cognitiveStatus.mmseScore).toBe(18);
    });
    
    test('should assess functional status correctly', () => {
      const functionalStatus = assessFunctionalStatus(medicalInfo);
      expect(functionalStatus.adlDependencies).toBe(5);
      expect(functionalStatus.iadlDependencies).toBe(3);
      expect(functionalStatus.interpretation).toBe('severely dependent');
    });
    
    test('should assess behavioral status correctly', () => {
      const behavioralStatus = assessBehavioralStatus(medicalInfo);
      expect(behavioralStatus.hasBehavioralSymptoms).toBe(true);
      expect(behavioralStatus.symptoms).toContain('wandering');
      expect(behavioralStatus.hasHighRiskBehaviors).toBe(true);
    });
    
    test('should assess safety risks correctly', () => {
      const safetyRisks = assessSafetyRisks(medicalInfo, livingInfo);
      expect(safetyRisks.specific.wandering).toBe('high');
      expect(safetyRisks.overall).toBe('high');
    });
    
    test('should assess caregiver support correctly', () => {
      const caregiverSupport = assessCaregiverSupport(livingInfo);
      expect(caregiverSupport.hasCaregiver).toBe(true);
      expect(caregiverSupport.burnoutRisk).toBeDefined();
    });
    
    test('should use weighted scoring system correctly', () => {
      const assessment = {
        cognitiveStatus: { hasDementia: false, severity: 'none' },
        functionalStatus: { adlDependencies: 5, interpretation: 'severely dependent' },
        behavioralStatus: { severity: 'none', hasHighRiskBehaviors: false },
        safetyRisks: { overall: 'low', specific: { wandering: 'low' } },
        caregiverSupport: { level: 'extensive', burnoutRisk: 'low' },
        financialResources: { canAffordInHomeCare: true },
        preferences: { preferredSetting: 'home' }
      };
      const recommendedLevel = determineCareLevelFromAssessment(assessment);
      expect(recommendedLevel).toBe('nursing');
    });
  });
  
  describe('determineCareStrategies', () => {
    test('should recommend nursing facility for high needs', () => {
      const careNeeds = {
        recommendedCareLevel: 'nursing',
        diagnoses: ['Dementia'],
        adlCount: 5,
        assessment: {
          cognitiveStatus: { hasDementia: true, severity: 'moderate' },
          safetyRisks: { overall: 'high' }
        }
      };
      const strategies = determineCareStrategies(careNeeds);
      expect(strategies).toContain('Plan for skilled nursing facility placement');
      expect(strategies).toContain('Research memory care units within nursing facilities');
    });
    
    test('should recommend assisted living for moderate needs', () => {
      const careNeeds = {
        recommendedCareLevel: 'assisted living',
        diagnoses: ['Arthritis'],
        adlCount: 2,
        assessment: {
          cognitiveStatus: { hasDementia: false },
          safetyRisks: { specific: { falls: 'high' } }
        }
      };
      const strategies = determineCareStrategies(careNeeds);
      expect(strategies).toContain('Research assisted living facilities near family members');
      expect(strategies).toContain('Prioritize facilities with fall prevention programs');
    });
    
    test('should recommend home care for minimal needs', () => {
      const careNeeds = {
        recommendedCareLevel: 'in-home',
        diagnoses: ['Hypertension'],
        adlCount: 1,
        assessment: {
          safetyRisks: { overall: 'moderate' },
          caregiverSupport: { burnoutRisk: 'high' }
        }
      };
      const strategies = determineCareStrategies(careNeeds);
      expect(strategies).toContain('Coordinate home care services through local agencies');
      expect(strategies).toContain('Conduct home safety evaluation and implement modifications');
      expect(strategies).toContain('Arrange for respite care services to support primary caregiver');
    });
    
    test('should handle unknown care level gracefully', () => {
      const careNeeds = {
        recommendedCareLevel: 'unknown',
        diagnoses: ['Other'],
        adlCount: 0,
        assessment: {}
      };
      const strategies = determineCareStrategies(careNeeds);
      expect(strategies).toContain('Coordinate home care services through local agencies');
    });
    
    test('should include universal strategies for all clients', () => {
      const careNeeds = {
        recommendedCareLevel: 'in-home',
        diagnoses: ['Hypertension'],
        adlCount: 1,
        assessment: {}
      };
      const strategies = determineCareStrategies(careNeeds);
      expect(strategies).toContain('Ensure advance directives and healthcare proxy are in place');
      expect(strategies).toContain('Establish regular reassessment schedule based on care needs');
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
        state: 'florida',
        assessment: {
          cognitiveStatus: { severity: 'moderate' },
          safetyRisks: { overall: 'high' },
          functionalStatus: { interpretation: 'severely dependent' }
        },
        detailedRecommendations: {
          alternativeOptions: [],
          requiresReassessment: true
        }
      };
      const approach = planCareApproach(strategies, careNeeds);
      expect(approach).toContain('Care Planning Approach');
      expect(approach).toContain('Recommended Level of Care: NURSING');
      expect(approach).toContain('Diagnoses: Dementia, Diabetes');
      expect(approach).toContain('Plan for skilled nursing facility placement');
      expect(approach).toContain('Assessment Details');
      expect(approach).toContain('Cognitive Status: moderate impairment');
      expect(approach).toContain('Schedule reassessment within 30 days due to high-risk factors');
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
        state: 'florida',
        assessment: {}
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
        state: 'newyork',
        assessment: {}
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
        state: 'florida',
        assessment: {}
      };
      const approach = planCareApproach(strategies, careNeeds);
      expect(approach).toContain('Care Planning Approach');
      expect(approach).toContain('Recommended Level of Care');
      expect(approach).toContain('Next Steps');
    });
    
    test('should include alternative options when available', () => {
      const strategies = ['Primary strategy'];
      const careNeeds = {
        recommendedCareLevel: 'nursing',
        diagnoses: ['Dementia'],
        adlCount: 5,
        currentSetting: 'home',
        caregiverSupport: 'family',
        state: 'florida',
        assessment: {},
        detailedRecommendations: {
          alternativeOptions: [
            {
              option: 'assisted living with memory care',
              conditions: 'With 24/7 supervision and secured memory unit'
            }
          ],
          requiresReassessment: false
        }
      };
      const approach = planCareApproach(strategies, careNeeds);
      expect(approach).toContain('Alternative Care Options');
      expect(approach).toContain('assisted living with memory care');
      expect(approach).toContain('With 24/7 supervision and secured memory unit');
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
      const medicalInfoWithError = { mockError: true };
      const result = await medicaidCarePlanning(clientInfo, medicalInfoWithError, livingInfo, state);
      expect(result.status).toBe('error');
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Mock assessment error');
    });
    
    test('should process data for different states correctly', async () => {
      const flResult = await medicaidCarePlanning(clientInfo, medicalInfo, livingInfo, 'florida');
      const nyResult = await medicaidCarePlanning(clientInfo, medicalInfo, livingInfo, 'newyork');
      expect(flResult.status).toBe('success');
      expect(nyResult.status).toBe('success');
      expect(flResult.careNeeds.recommendedCareLevel).toBe('nursing');
      expect(nyResult.careNeeds.recommendedCareLevel).toBe('nursing');
      expect(flResult.careNeeds.state).toBe('florida');
      expect(nyResult.careNeeds.state).toBe('newyork');
    });
    
    test('should handle minimal valid inputs', async () => {
      const result = await medicaidCarePlanning({}, {}, {}, state);
      expect(result.status).toBe('success');
      expect(result.careNeeds.recommendedCareLevel).toBe('in-home');
    });
    
    test('should extract and use financial and preference info from clientInfo', async () => {
      const clientWithFinancialInfo = {
        name: 'Test Client',
        age: 75,
        financialInfo: { monthlyIncome: 3000, liquidAssets: 80000 },
        preferenceInfo: { preferredSetting: 'assisted living' }
      };
      const result = await medicaidCarePlanning(
        clientWithFinancialInfo,
        { diagnoses: ['Arthritis'], adlLimitations: ['bathing', 'dressing'] },
        { caregiverSupport: 'none' },
        state
      );
      expect(result.status).toBe('success');
      expect(result.careNeeds.assessment.financialResources).toBeDefined();
      expect(result.careNeeds.assessment.preferences).toBeDefined();
      expect(result.careNeeds.assessment.financialResources.canAffordAssistedLiving).toBe(true);
    });
  });
});