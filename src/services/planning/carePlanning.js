const logger = require('../../config/logger');
const medicaidRules = require('../../data/medicaid_rules_2025.json');

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
 * @returns {Array} Array of care planning strategies
 */
function determineCareStrategies(careNeeds) {
  logger.debug("Determining care strategies");
  const strategies = [];

  switch (careNeeds.recommendedCareLevel) {
    case "nursing":
      strategies.push("Plan for skilled nursing facility placement");
      strategies.push("Evaluate long-term care insurance coverage or Medicaid eligibility");
      if (careNeeds.assessment?.cognitiveStatus?.hasDementia) {
        strategies.push("Research memory care units within nursing facilities");
      }
      if (careNeeds.assessment?.financialResources &&
          !careNeeds.assessment.financialResources.canAffordNursingHome) {
        strategies.push("Begin Medicaid application and planning process immediately");
      }
      break;
    case "assisted living":
      strategies.push("Research assisted living facilities near family members");
      strategies.push("Evaluate income and asset availability for private pay or waiver programs");
      if (careNeeds.assessment?.cognitiveStatus?.hasDementia) {
        strategies.push("Focus on facilities with dedicated memory care units");
      }
      if (careNeeds.assessment?.safetyRisks?.specific?.falls === 'high') {
        strategies.push("Prioritize facilities with fall prevention programs");
      }
      break;
    case "in-home":
    default:
      strategies.push("Coordinate home care services through local agencies");
      strategies.push("Apply for Medicaid waiver programs if care needs meet criteria");
      if (careNeeds.assessment?.safetyRisks?.overall === 'moderate' ||
          careNeeds.assessment?.safetyRisks?.overall === 'high') {
        strategies.push("Conduct home safety evaluation and implement modifications");
      }
      if (careNeeds.assessment?.caregiverSupport?.burnoutRisk === 'high') {
        strategies.push("Arrange for respite care services to support primary caregiver");
      }
      break;
  }

  strategies.push("Ensure advance directives and healthcare proxy are in place");
  strategies.push("Establish regular reassessment schedule based on care needs");

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
    const rules = medicaidRules[state.toLowerCase()] || {};
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