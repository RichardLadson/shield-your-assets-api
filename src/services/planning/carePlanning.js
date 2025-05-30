const logger = require('../../config/logger');
const { getMedicaidRules } = require('../utils/medicaidRulesLoader');

/**
 * Assesses the client's cognitive status based on medical information
 * @param {Object} medicalInfo - Medical information including diagnoses
 * @returns {Object} Assessment of cognitive status
 */
function assessCognitiveStatus(medicalInfo) {
  let severity = 'none';
  if (!medicalInfo) {
    return { hasDementia: false, severity: 'none', mmseScore: null };
  }
  if (medicalInfo.diagnoses?.includes('Dementia') || medicalInfo.diagnoses?.includes('dementia')) {
    if (medicalInfo.cognitionNotes?.includes('severe') || 
        (medicalInfo.mmseScore !== undefined && medicalInfo.mmseScore < 10)) {
      severity = 'severe';
    } else if (medicalInfo.cognitionNotes?.includes('moderate') || 
               (medicalInfo.mmseScore !== undefined && medicalInfo.mmseScore >= 10 && medicalInfo.mmseScore < 20)) {
      severity = 'moderate';
    } else {
      severity = 'mild';
    }
  }
  return {
    hasDementia: (medicalInfo.diagnoses?.includes('Dementia') || medicalInfo.diagnoses?.includes('dementia')) || false,
    severity,
    mmseScore: medicalInfo.mmseScore || null
  };
}

/**
 * Assesses the client's functional status based on ADLs and IADLs
 * @param {Object} medicalInfo - Medical information including limitations
 * @returns {Object} Assessment of functional status
 */
function assessFunctionalStatus(medicalInfo) {
  if (!medicalInfo) {
    return { adlDependencies: 0, iadlDependencies: 0, adlScore: 0, iadlScore: 0, interpretation: 'independent' };
  }
  const adlDependencies = medicalInfo.adlLimitations?.length || 0;
  const iadlDependencies = medicalInfo.iadlLimitations?.length || 0;
  const katzScore = 6 - adlDependencies;
  const lawtonScore = 8 - iadlDependencies;
  let interpretation = 'independent';
  if (katzScore <= 2) {
    interpretation = 'severely dependent';
  } else if (katzScore <= 4) {
    interpretation = 'moderately dependent';
  } else if (katzScore === 5 || lawtonScore <= 5) {
    interpretation = 'mildly dependent';
  }
  return {
    adlDependencies,
    iadlDependencies,
    adlScore: katzScore,
    iadlScore: lawtonScore,
    interpretation
  };
}

/**
 * Assesses behavioral symptoms and their impact
 * @param {Object} medicalInfo - Medical information including behavioral symptoms
 * @returns {Object} Assessment of behavioral status
 */
function assessBehavioralStatus(medicalInfo) {
  if (!medicalInfo) {
    return { hasBehavioralSymptoms: false, symptoms: [], severity: 'none' };
  }
  const symptoms = medicalInfo.behavioralSymptoms || [];
  let severity = 'none';
  if (symptoms.length > 3) {
    severity = 'severe';
  } else if (symptoms.length > 1) {
    severity = 'moderate';
  } else if (symptoms.length === 1) {
    severity = 'mild';
  }
  const hasHighRiskBehaviors = symptoms.some(s => 
    ['wandering', 'aggression', 'self-harm', 'sundowning'].includes(s));
  return {
    hasBehavioralSymptoms: symptoms.length > 0,
    symptoms,
    severity,
    hasHighRiskBehaviors
  };
}

/**
 * Assesses safety risks based on medical and living information
 * @param {Object} medicalInfo - Medical information
 * @param {Object} livingInfo - Living situation details
 * @returns {Object} Assessment of safety risks
 */
function assessSafetyRisks(medicalInfo, livingInfo) {
  if (!medicalInfo) medicalInfo = {};
  if (!livingInfo) livingInfo = {};
  const wanderingRisk = medicalInfo.behavioralSymptoms?.includes('wandering') ? 'high' : 
                       (medicalInfo.diagnoses?.includes('Dementia') || medicalInfo.diagnoses?.includes('dementia')) ? 'moderate' : 'low';
  const fallRiskFactors = [
    medicalInfo.adlLimitations?.includes('transferring'),
    medicalInfo.mobilityIssues === true,
    medicalInfo.diagnoses?.includes('Parkinson\'s'),
    medicalInfo.diagnoses?.includes('neuropathy'),
    medicalInfo.history?.includes('falls')
  ].filter(Boolean).length;
  const fallRisk = fallRiskFactors >= 3 ? 'high' : fallRiskFactors >= 1 ? 'moderate' : 'low';
  const medicationRisk = medicalInfo.medications?.length > 7 ? 'high' :
                        medicalInfo.medications?.length > 3 ? 'moderate' : 'low';
  const risks = [wanderingRisk, fallRisk, medicationRisk];
  const highRisks = risks.filter(r => r === 'high').length;
  const moderateRisks = risks.filter(r => r === 'moderate').length;
  let overallRisk = 'low';
  if (highRisks > 0) {
    overallRisk = 'high';
  } else if (moderateRisks > 1) {
    overallRisk = 'moderate';
  }
  return {
    specific: { wandering: wanderingRisk, falls: fallRisk, medication: medicationRisk },
    overall: overallRisk
  };
}

/**
 * Assesses caregiver support availability and capacity
 * @param {Object} livingInfo - Information about living situation and caregivers
 * @returns {Object} Assessment of caregiver support
 */
function assessCaregiverSupport(livingInfo) {
  if (!livingInfo) {
    return { hasCaregiver: false, level: 'none', burnoutRisk: 'high' };
  }
  const hasCaregiver = livingInfo.caregiverSupport && 
                      livingInfo.caregiverSupport.toLowerCase() !== 'none';
  let level = 'none';
  if (hasCaregiver) {
    if (livingInfo.caregiverSupport.toLowerCase().includes('full-time') || 
        livingInfo.caregiverSupport.toLowerCase().includes('24/7')) {
      level = 'extensive';
    } else if (livingInfo.caregiverSupport.toLowerCase().includes('part-time') || 
               livingInfo.caregiverSupport.toLowerCase().includes('daily')) {
      level = 'moderate';
    } else {
      level = 'limited';
    }
  }
  let burnoutRisk = 'low';
  if (level === 'extensive') {
    burnoutRisk = 'high';
  } else if (level === 'moderate') {
    burnoutRisk = 'moderate';
  }
  return {
    hasCaregiver,
    level,
    caregiverType: livingInfo.caregiverType || 'unknown',
    burnoutRisk
  };
}

/**
 * Assesses financial resources for care planning
 * @param {Object} financialInfo - Financial information
 * @returns {Object} Assessment of financial resources
 */
function assessFinancialResources(financialInfo) {
  if (!financialInfo) {
    return { 
      canAffordPrivateCare: false, 
      canAffordAssistedLiving: false, 
      medicaidEligible: true 
    };
  }
  const canAffordNursingHome = (financialInfo.monthlyIncome || 0) > 8000 || 
                              (financialInfo.liquidAssets || 0) > 100000;
  const canAffordAssistedLiving = (financialInfo.monthlyIncome || 0) > 5000 || 
                                 (financialInfo.liquidAssets || 0) > 70000;
  const canAffordInHomeCare = (financialInfo.monthlyIncome || 0) > 3500 || 
                             (financialInfo.liquidAssets || 0) > 50000;
  const medicaidEligible = (financialInfo.monthlyIncome || 0) < 2500 && 
                          (financialInfo.liquidAssets || 0) < 2000;
  return {
    canAffordNursingHome,
    canAffordAssistedLiving,
    canAffordInHomeCare,
    medicaidEligible
  };
}

/**
 * Evaluates client preferences for care planning
 * @param {Object} preferenceInfo - Client preferences information
 * @returns {Object} Structured client preferences
 */
function evaluatePreferences(preferenceInfo) {
  if (!preferenceInfo) {
    return {
      preferredSetting: 'unknown',
      valuesPriority: ['safety', 'independence', 'comfort'],
      culturalFactors: [],
      importanceOfProximityToFamily: 'medium'
    };
  }
  return {
    preferredSetting: preferenceInfo.preferredSetting || 'unknown',
    valuesPriority: preferenceInfo.valuesPriority || ['safety', 'independence', 'comfort'],
    culturalFactors: preferenceInfo.culturalFactors || [],
    importanceOfProximityToFamily: preferenceInfo.proximityToFamily || 'medium'
  };
}

/**
 * Determines care level based on comprehensive assessment
 * @param {Object} assessment - Comprehensive assessment
 * @returns {string} Recommended care level
 */
function determineCareLevelFromAssessment(assessment) {
  let nursingScore = 0;
  let assistedLivingScore = 0;
  let inHomeScore = 5;

  // Cognitive factors
  if (assessment.cognitiveStatus.severity === 'severe') {
    nursingScore += 20;
  } else if (assessment.cognitiveStatus.severity === 'moderate') {
    assistedLivingScore += 10;
    nursingScore += 5;
  } else if (assessment.cognitiveStatus.severity === 'mild') {
    assistedLivingScore += 3;
    inHomeScore += 5;
  }

  // Functional status (ADLs)
  const adlDependencies = assessment.functionalStatus.adlDependencies || 0;
  if (adlDependencies >= 4) {
    nursingScore += 20;
  } else if (adlDependencies === 3) {
    nursingScore += 10;
    assistedLivingScore += 8;
  } else if (adlDependencies === 2) {
    assistedLivingScore += 12;
  } else if (adlDependencies === 1) {
    assistedLivingScore += 8;
  } else {
    inHomeScore += 5;
  }

  // Safety considerations
  if (assessment.safetyRisks.specific.wandering === 'high') {
    nursingScore += 10;
    assistedLivingScore += 5;
  }

  if (assessment.safetyRisks.overall === 'high') {
    nursingScore += 10;
  } else if (assessment.safetyRisks.overall === 'moderate') {
    assistedLivingScore += 8;
  }

  // Behavioral factors
  if (assessment.behavioralStatus.severity === 'severe') {
    nursingScore += 15;
  } else if (assessment.behavioralStatus.severity === 'moderate') {
    assistedLivingScore += 10;
  }

  // Caregiver support
  if (assessment.caregiverSupport.level === 'extensive') {
    inHomeScore += 10;
  } else if (assessment.caregiverSupport.level === 'moderate') {
    inHomeScore += 5;
  } else if (assessment.caregiverSupport.level === 'none') {
    assistedLivingScore += 8;
    nursingScore += 5;
  }

  // Financial and preference boost
  if (assessment.financialResources.canAffordInHomeCare &&
      assessment.preferences.preferredSetting === 'home') {
    inHomeScore += 3;
  }

  // Determine recommendation
  if (nursingScore > assistedLivingScore && nursingScore > inHomeScore) {
    return 'nursing';
  } else if (assistedLivingScore > inHomeScore) {
    return 'assisted living';
  }
  return 'in-home';
}

/**
 * Determines detailed care recommendations with alternatives
 * @param {Object} assessment - Comprehensive assessment
 * @returns {Object} Primary and alternative care recommendations
 */
function determineDetailedCareRecommendations(assessment) {
  const primaryRecommendation = determineCareLevelFromAssessment(assessment);
  const alternativeOptions = [];

  if (primaryRecommendation === 'nursing' && 
      assessment.caregiverSupport.level === 'extensive' &&
      assessment.cognitiveStatus.severity !== 'severe') {
    alternativeOptions.push({
      option: 'assisted living with memory care',
      conditions: 'With 24/7 supervision and secured memory unit'
    });
  }

  if (primaryRecommendation === 'assisted living' && 
      assessment.caregiverSupport.level === 'extensive') {
    alternativeOptions.push({
      option: 'in-home care',
      conditions: 'With professional caregivers 12+ hours daily and home modifications'
    });
  }

  if (primaryRecommendation === 'in-home' && 
      assessment.safetyRisks.overall === 'moderate') {
    alternativeOptions.push({
      option: 'assisted living',
      conditions: 'If home safety issues cannot be adequately addressed or caregiver burnout occurs'
    });
  }

  return {
    primaryRecommendation,
    alternativeOptions,
    requiresReassessment: assessment.safetyRisks.overall === 'high' || 
                         assessment.caregiverSupport.burnoutRisk === 'high'
  };
}

/**
 * Enhanced assessment of client's care needs based on comprehensive data
 * @param {Object} medicalInfo - Diagnoses and ADL limitations
 * @param {Object} livingInfo - Living setting and caregiver support
 * @param {Object} financialInfo - Financial resources information
 * @param {Object} preferenceInfo - Client preferences information
 * @param {string} state - State of application
 * @param {Object} rules - Medicaid rules for the state
 * @returns {Object} Comprehensive care needs assessment
 */
function assessCareNeeds(medicalInfo, livingInfo, financialInfo, preferenceInfo, state, rules) {
  logger.debug(`Assessing care needs for ${state}`);

  if (!medicalInfo) medicalInfo = { diagnoses: [], adlLimitations: [] };
  if (!medicalInfo.diagnoses) medicalInfo.diagnoses = [];
  if (!medicalInfo.adlLimitations) medicalInfo.adlLimitations = [];
  if (!livingInfo) livingInfo = { caregiverSupport: 'none', currentSetting: 'home' };

  const assessment = {
    cognitiveStatus: assessCognitiveStatus(medicalInfo),
    functionalStatus: assessFunctionalStatus(medicalInfo),
    behavioralStatus: assessBehavioralStatus(medicalInfo),
    safetyRisks: assessSafetyRisks(medicalInfo, livingInfo),
    caregiverSupport: assessCaregiverSupport(livingInfo),
    financialResources: assessFinancialResources(financialInfo),
    preferences: evaluatePreferences(preferenceInfo)
  };

  const adlCount = medicalInfo.adlLimitations?.length || 0;
  const recommendedCareLevel = determineCareLevelFromAssessment(assessment);
  const detailedRecommendations = determineDetailedCareRecommendations(assessment);

  return {
    recommendedCareLevel,
    diagnoses: medicalInfo.diagnoses,
    adlCount,
    currentSetting: livingInfo.currentSetting || 'home',
    caregiverSupport: livingInfo.caregiverSupport || 'none',
    state,
    assessment,
    detailedRecommendations,
    assessmentDate: new Date().toISOString()
  };
}

/**
 * Recommends strategies based on assessed care needs
 * @param {Object} careNeeds - Output from assessCareNeeds
 * @returns {Array} Array of structured care planning strategy objects
 */
function determineCareStrategies(careNeeds) {
  logger.debug("Determining care strategies");
  const strategies = [];
  let strategyId = 1;
  
  const hasFinancialConstraints = careNeeds.assessment?.financialResources && 
    (!careNeeds.assessment.financialResources.canAffordNursingHome || 
     !careNeeds.assessment.financialResources.canAffordAssistedLiving);
  
  const hasDementia = careNeeds.assessment?.cognitiveStatus?.hasDementia;
  const highFallRisk = careNeeds.assessment?.safetyRisks?.specific?.falls === 'high';
  const highSafetyRisk = careNeeds.assessment?.safetyRisks?.overall === 'moderate' || 
                        careNeeds.assessment?.safetyRisks?.overall === 'high';
  const caregiverBurnout = careNeeds.assessment?.caregiverSupport?.burnoutRisk === 'high';

  switch (careNeeds.recommendedCareLevel) {
    case "nursing":
      strategies.push({
        id: `care-${strategyId++}`,
        type: 'nursing-facility',
        name: 'Skilled Nursing Facility Placement',
        description: 'Plan for comprehensive nursing home care with 24/7 medical supervision and personal care assistance.',
        pros: [
          '24/7 skilled nursing care available',
          'Comprehensive medical management',
          'Social activities and therapy programs',
          'Medicaid coverage available when eligible'
        ],
        cons: [
          'High cost ($8,000-$15,000/month)',
          'Loss of independence and privacy',
          'Adjustment challenges',
          'Limited family interaction time'
        ],
        effectiveness: 'High',
        timing: 'Plan 2-3 months ahead',
        estimatedCost: '$8,000-$15,000/month',
        monthlyImpact: 'Complete care solution',
        priority: 'High',
        careLevel: careNeeds.recommendedCareLevel,
        specificActions: [
          'Tour 3-5 facilities in preferred area',
          'Check state inspection reports',
          'Verify Medicaid acceptance policies',
          'Prepare care plan documentation',
          'Coordinate with discharge planners'
        ]
      });
      
      strategies.push({
        id: `care-${strategyId++}`,
        type: 'insurance-evaluation',
        name: 'Long-Term Care Coverage Assessment',
        description: 'Evaluate existing insurance coverage and Medicaid eligibility to fund nursing home care.',
        pros: [
          'May provide significant cost coverage',
          'Reduces family financial burden',
          'Preserves assets for spouse/heirs',
          'Professional guidance available'
        ],
        cons: [
          'Complex eligibility requirements',
          'Application process takes time',
          'Coverage limits may apply',
          'Waiting periods possible'
        ],
        effectiveness: 'High',
        timing: 'Begin immediately',
        estimatedCost: '$0-$2,000 for professional help',
        monthlyImpact: 'Potential full care coverage',
        priority: 'High',
        careLevel: careNeeds.recommendedCareLevel
      });
      
      if (hasDementia) {
        strategies.push({
          id: `care-${strategyId++}`,
          type: 'memory-care',
          name: 'Memory Care Unit Research',
          description: 'Identify specialized memory care units within nursing facilities for dementia-specific care.',
          pros: [
            'Specialized dementia care training',
            'Secure environment prevents wandering',
            'Structured daily activities',
            'Family support programs'
          ],
          cons: [
            'Higher cost than general nursing care',
            'Limited availability in some areas',
            'May require facility transfer',
            'Adjustment to specialized routine'
          ],
          effectiveness: 'High',
          timing: 'Research within 30 days',
          estimatedCost: '$10,000-$18,000/month',
          monthlyImpact: 'Specialized dementia care',
          priority: 'High',
          careLevel: 'memory-care'
        });
      }
      
      if (hasFinancialConstraints) {
        strategies.push({
          id: `care-${strategyId++}`,
          type: 'medicaid-application',
          name: 'Emergency Medicaid Application',
          description: 'Begin immediate Medicaid application and planning process due to inability to afford private pay.',
          pros: [
            'Provides pathway to affordable care',
            'Retroactive coverage possible',
            'Asset protection strategies available',
            'Legal protections for spouse'
          ],
          cons: [
            'Complex application process',
            'Asset and income restrictions',
            'Potential penalty periods',
            'Limited facility choices initially'
          ],
          effectiveness: 'Essential',
          timing: 'File within 2 weeks',
          estimatedCost: '$2,000-$5,000 legal fees',
          monthlyImpact: 'Enables affordable care access',
          priority: 'Critical',
          careLevel: careNeeds.recommendedCareLevel
        });
      }
      break;
      
    case "assisted living":
      strategies.push({
        id: `care-${strategyId++}`,
        type: 'assisted-living',
        name: 'Assisted Living Facility Research',
        description: 'Research assisted living facilities near family members with appropriate service levels.',
        pros: [
          'Maintains independence with support',
          'Social engagement opportunities',
          'Meal and housekeeping services',
          'Emergency response systems'
        ],
        cons: [
          'High monthly costs ($3,000-$6,000)',
          'Limited Medicaid coverage',
          'May need to relocate as needs increase',
          'Less medical supervision than nursing home'
        ],
        effectiveness: 'High',
        timing: 'Research within 1-2 months',
        estimatedCost: '$3,000-$6,000/month',
        monthlyImpact: 'Supported independent living',
        priority: 'High',
        careLevel: careNeeds.recommendedCareLevel,
        specificActions: [
          'Visit facilities near family members',
          'Compare service packages and costs',
          'Check licensing and inspection records',
          'Assess transportation services',
          'Review contract terms carefully'
        ]
      });
      
      strategies.push({
        id: `care-${strategyId++}`,
        type: 'financial-assessment',
        name: 'Assisted Living Financial Planning',
        description: 'Evaluate income, assets, and waiver program availability for assisted living funding.',
        pros: [
          'Identifies all funding sources',
          'May qualify for waiver programs',
          'Optimizes asset utilization',
          'Plans for future care transitions'
        ],
        cons: [
          'Limited Medicaid waiver availability',
          'Waiting lists for waiver programs',
          'Asset spend-down may be required',
          'Complex eligibility requirements'
        ],
        effectiveness: 'Medium-High',
        timing: 'Complete within 30 days',
        estimatedCost: '$500-$2,000',
        monthlyImpact: 'Optimizes funding strategies',
        priority: 'High',
        careLevel: careNeeds.recommendedCareLevel
      });
      
      if (hasDementia) {
        strategies.push({
          id: `care-${strategyId++}`,
          type: 'memory-care-assisted',
          name: 'Memory Care Assisted Living',
          description: 'Focus on assisted living facilities with dedicated memory care units and specialized programming.',
          pros: [
            'Specialized dementia care in less restrictive setting',
            'Maintains some independence',
            'Family-style environment',
            'Structured but flexible daily routine'
          ],
          cons: [
            'Higher cost than standard assisted living',
            'May need transition to nursing care later',
            'Limited availability',
            'Specialized staff requirements'
          ],
          effectiveness: 'High',
          timing: 'Research immediately',
          estimatedCost: '$4,500-$8,000/month',
          monthlyImpact: 'Dementia-specific assisted living',
          priority: 'High',
          careLevel: 'memory-care-assisted'
        });
      }
      
      if (highFallRisk) {
        strategies.push({
          id: `care-${strategyId++}`,
          type: 'fall-prevention',
          name: 'Fall Prevention Program Priority',
          description: 'Prioritize facilities with comprehensive fall prevention programs and safety features.',
          pros: [
            'Reduces injury risk',
            'Specialized safety equipment',
            'Trained staff for fall prevention',
            'Physical therapy integration'
          ],
          cons: [
            'May limit facility choices',
            'Potential higher costs',
            'Additional assessments required',
            'May feel restrictive'
          ],
          effectiveness: 'High',
          timing: 'Include in facility selection',
          estimatedCost: 'Included in facility costs',
          monthlyImpact: 'Improved safety outcomes',
          priority: 'High',
          careLevel: careNeeds.recommendedCareLevel
        });
      }
      break;
      
    case "in-home":
    default:
      strategies.push({
        id: `care-${strategyId++}`,
        type: 'home-care-coordination',
        name: 'Home Care Services Coordination',
        description: 'Coordinate comprehensive home care services through local agencies to support aging in place.',
        pros: [
          'Remains in familiar environment',
          'Maintains independence and control',
          'Cost-effective for lower care needs',
          'Family involvement easier'
        ],
        cons: [
          'Limited overnight supervision',
          'Caregiver turnover challenges',
          'Emergency response concerns',
          'May become inadequate as needs increase'
        ],
        effectiveness: 'High',
        timing: 'Implement within 2-4 weeks',
        estimatedCost: '$20-$35/hour',
        monthlyImpact: 'Maintains home-based living',
        priority: 'High',
        careLevel: careNeeds.recommendedCareLevel,
        specificActions: [
          'Contact licensed home care agencies',
          'Conduct caregiver interviews',
          'Verify insurance and bonding',
          'Establish care plan and schedule',
          'Set up emergency protocols'
        ]
      });
      
      strategies.push({
        id: `care-${strategyId++}`,
        type: 'medicaid-waiver',
        name: 'Medicaid Waiver Program Application',
        description: 'Apply for Medicaid waiver programs if care needs meet criteria for home and community-based services.',
        pros: [
          'Significantly reduces care costs',
          'Supports aging in place preference',
          'Comprehensive service coverage',
          'Care coordination included'
        ],
        cons: [
          'Waiting lists in most states',
          'Strict eligibility requirements',
          'Limited service hours',
          'Complex application process'
        ],
        effectiveness: 'High',
        timing: 'Apply immediately if eligible',
        estimatedCost: '$0-$1,000 application help',
        monthlyImpact: 'Potential full home care coverage',
        priority: 'High',
        careLevel: careNeeds.recommendedCareLevel
      });
      
      if (highSafetyRisk) {
        strategies.push({
          id: `care-${strategyId++}`,
          type: 'home-safety',
          name: 'Home Safety Evaluation and Modifications',
          description: 'Conduct comprehensive home safety evaluation and implement necessary modifications to reduce risks.',
          pros: [
            'Reduces fall and injury risks',
            'Enables safer aging in place',
            'May qualify for assistance programs',
            'Improves caregiver confidence'
          ],
          cons: [
            'Upfront modification costs',
            'May require contractor work',
            'Temporary disruption during modifications',
            'Ongoing maintenance needs'
          ],
          effectiveness: 'High',
          timing: 'Complete within 30 days',
          estimatedCost: '$1,000-$5,000',
          monthlyImpact: 'Improved safety for home care',
          priority: 'High',
          careLevel: careNeeds.recommendedCareLevel,
          specificActions: [
            'Schedule occupational therapy home assessment',
            'Install grab bars and safety equipment',
            'Improve lighting throughout home',
            'Remove trip hazards and clutter',
            'Set up emergency alert system'
          ]
        });
      }
      
      if (caregiverBurnout) {
        strategies.push({
          id: `care-${strategyId++}`,
          type: 'respite-care',
          name: 'Respite Care Services',
          description: 'Arrange for regular respite care services to support primary caregiver and prevent burnout.',
          pros: [
            'Prevents caregiver burnout',
            'Maintains care quality',
            'Provides caregiver mental health support',
            'Enables caregiver to maintain employment'
          ],
          cons: [
            'Additional care costs',
            'Coordination complexity',
            'Care recipient may resist',
            'Finding reliable respite providers'
          ],
          effectiveness: 'High',
          timing: 'Implement within 2 weeks',
          estimatedCost: '$20-$35/hour',
          monthlyImpact: 'Sustainable family caregiving',
          priority: 'High',
          careLevel: careNeeds.recommendedCareLevel
        });
      }
      break;
  }

  // Universal strategies for all care levels
  strategies.push({
    id: `care-${strategyId++}`,
    type: 'advance-directives',
    name: 'Advance Directives and Healthcare Proxy',
    description: 'Ensure all advance directives, healthcare proxy, and HIPAA authorizations are properly executed and accessible.',
    pros: [
      'Ensures wishes are followed',
      'Reduces family decision-making burden',
      'Provides legal clarity for providers',
      'Enables appropriate medical decisions'
    ],
    cons: [
      'Difficult conversations required',
      'May need periodic updates',
      'Legal complexity',
      'Family disagreement potential'
    ],
    effectiveness: 'Essential',
    timing: 'Complete immediately',
    estimatedCost: '$200-$800',
    monthlyImpact: 'Ensures care decision authority',
    priority: 'High',
    careLevel: 'universal'
  });
  
  strategies.push({
    id: `care-${strategyId++}`,
    type: 'care-monitoring',
    name: 'Regular Care Reassessment Schedule',
    description: 'Establish systematic schedule for reassessing care needs and adjusting services as condition changes.',
    pros: [
      'Ensures appropriate care level',
      'Identifies changing needs early',
      'Optimizes care resources',
      'Prevents crisis situations'
    ],
    cons: [
      'Requires ongoing coordination',
      'May involve difficult transitions',
      'Assessment costs',
      'Potential care disruptions'
    ],
    effectiveness: 'High',
    timing: 'Establish within 30 days',
    estimatedCost: '$200-$500 per assessment',
    monthlyImpact: 'Optimized ongoing care',
    priority: 'Medium',
    careLevel: 'universal'
  });

  return strategies;
}

/**
 * Creates a care planning narrative based on strategies
 * @param {Array} strategies - Strategies list
 * @param {Object} careNeeds - Care assessment detail
 * @returns {string} Narrative report
 */
function planCareApproach(strategies, careNeeds) {
  logger.debug("Planning care approach");
  let approach = "Care Planning Approach:\n\n";

  approach += `- Recommended Level of Care: ${careNeeds.recommendedCareLevel.toUpperCase()}\n`;
  approach += `- Diagnoses: ${careNeeds.diagnoses.join(", ") || "N/A"}\n`;
  approach += `- ADL Limitations: ${careNeeds.adlCount}\n`;
  approach += `- Current Setting: ${careNeeds.currentSetting}\n`;
  approach += `- Caregiver Support: ${careNeeds.caregiverSupport}\n\n`;

  if (careNeeds.assessment && Object.keys(careNeeds.assessment).length > 0) {
    approach += "Assessment Details:\n";
    if (careNeeds.assessment.cognitiveStatus && careNeeds.assessment.cognitiveStatus.severity !== 'none') {
      approach += `- Cognitive Status: ${careNeeds.assessment.cognitiveStatus.severity} impairment\n`;
    }
    if (careNeeds.assessment.safetyRisks && careNeeds.assessment.safetyRisks.overall !== 'low') {
      approach += `- Safety Risk Level: ${careNeeds.assessment.safetyRisks.overall}\n`;
    }
    if (careNeeds.assessment.functionalStatus && careNeeds.assessment.functionalStatus.interpretation !== 'independent') {
      approach += `- Functional Status: ${careNeeds.assessment.functionalStatus.interpretation}\n`;
    }
    approach += "\n";
  }

  if (careNeeds.detailedRecommendations?.alternativeOptions?.length > 0) {
    approach += "Alternative Care Options:\n";
    careNeeds.detailedRecommendations.alternativeOptions.forEach(option => {
      approach += `- ${option.option} (Conditions: ${option.conditions})\n`;
    });
    approach += "\n";
  }

  approach += "Recommended Strategies:\n";
  strategies.forEach((strategy) => {
    approach += `- ${strategy}\n`;
  });

  approach += "\nNext Steps:\n";
  approach += "- Confirm current care costs and any available support\n";
  approach += "- Consult a care manager or social worker to develop a transition plan\n";
  approach += `- Review Medicaid waiver programs available in ${careNeeds.state}\n`;

  if (careNeeds.detailedRecommendations?.requiresReassessment) {
    approach += "- Schedule reassessment within 30 days due to high-risk factors\n";
  }

  return approach;
}

/**
 * Complete care planning workflow
 * @param {Object} clientInfo - Client demographic info
 * @param {Object} medicalInfo - Diagnoses and ADL data
 * @param {Object} livingInfo - Living situation and caregiver details
 * @param {string} state - State of application
 * @returns {Promise<Object>} Full care planning output
 */
async function medicaidCarePlanning(clientInfo, medicalInfo, livingInfo, state) {
  logger.info(`Starting care planning for ${state}`);
  try {
    if (medicalInfo?.mockError === true) {
      throw new Error("Mock assessment error");
    }
    const rules = getMedicaidRules(state);
    const financialInfo = clientInfo?.financialInfo || {};
    const preferenceInfo = clientInfo?.preferenceInfo || {};
    const careNeeds = assessCareNeeds(medicalInfo, livingInfo, financialInfo, preferenceInfo, state, rules);
    const strategies = determineCareStrategies(careNeeds);
    const approach = planCareApproach(strategies, careNeeds);
    logger.info("Care planning completed successfully");
    return {
      careNeeds,
      strategies,
      approach,
      status: "success"
    };
  } catch (error) {
    logger.error(`Error in care planning: ${error.message}`);
    return {
      error: `Care planning error: ${error.message}`,
      status: "error"
    };
  }
}

module.exports = {
  assessCareNeeds,
  determineCareStrategies,
  planCareApproach,
  medicaidCarePlanning,
  assessCognitiveStatus,
  assessFunctionalStatus,
  assessBehavioralStatus,
  assessSafetyRisks,
  assessCaregiverSupport,
  assessFinancialResources,
  evaluatePreferences,
  determineCareLevelFromAssessment,
  determineDetailedCareRecommendations
};