// src/services/planning/medicaidPlanning.js
// import logger, input validation, and the medicaid Rules Loader
const logger = require('../../config/logger');
const { validateAllInputs } = require('../validation/inputValidation');
const { loadMedicaidRules } = require('../utils/medicaidRulesLoader');

// Import all the planning modules in their logical sequence
const { medicaidCarePlanning } = require('./carePlanning');
const { medicaidEligibilityAssessment } = require('./eligibilityAssessment');
const { medicaidRelatedBenefitsPlanning} = require('./relatedBenefits');
const { medicaidAssetPlanning } = require('./assetPlanning');
const { medicaidIncomePlanning } = require('./incomePlanning');
const { medicaidTrustPlanning } = require('./trustPlanning');
const { medicaidAnnuityPlanning } = require('./annuityPlanning');
const { medicaidDivestmentPlanning } = require('./divestmentPlanning');
const { medicaidCommunitySpousePlanning } = require('./communitySpousePlanning');
const { medicaidApplicationPlanning } = require('./applicationPlanning');
const { medicaidPostEligibilityPlanning } = require('./postEligibilityPlanning');
const { medicaidEstateRecoveryPlanning } = require('./estateRecovery');

/**
 * Comprehensive Medicaid planning that coordinates all specialized planning modules
 * in their logical sequence
 * 
 * @param {Object} clientInfo - Client demographic information
 * @param {Object} assets - Client's asset data
 * @param {Object} income - Client's income data
 * @param {Object} expenses - Client's expenses data
 * @param {Object} medicalInfo - Client's medical conditions and functional assessments
 * @param {Object} livingInfo - Client's current living situation
 * @param {string} state - The state of application
 * @returns {Promise<Object>} Complete Medicaid planning result
 */
async function medicaidPlanning(clientInfo, assets, income, expenses, medicalInfo, livingInfo, state) {
  logger.info(`Starting comprehensive Medicaid planning for ${state}`);
  
  try {
    // Validate all inputs
    const validationResult = await validateAllInputs(
      clientInfo, assets, income, expenses, medicalInfo, state
    );
    
    if (!validationResult.valid) {
      logger.error(`Input validation failed: ${validationResult.message}`);
      return {
        error: validationResult.message,
        status: 'error'
      };
    }
    
    // Use normalized data from validation
    const normalizedData = validationResult.normalizedData;
    const normalizedClientInfo = normalizedData.clientInfo;
    const normalizedAssets = normalizedData.assets;
    const normalizedIncome = normalizedData.income;
    const normalizedExpenses = normalizedData.expenses;
    const normalizedState = normalizedData.state;
    
    // Get marital status
    const maritalStatus = normalizedClientInfo.maritalStatus || 'single';
    
    // Load Medicaid rules data
    const rulesData = await loadMedicaidRules(normalizedState);
    
    // Step 1: Care Planning
    const carePlanningResult = await medicaidCarePlanning(
      normalizedClientInfo, medicalInfo, livingInfo, normalizedState
    );
    
    // Step 2: Eligibility Assessment
    const eligibilityResult = await medicaidEligibilityAssessment(
      normalizedClientInfo, normalizedAssets, normalizedIncome, normalizedState, maritalStatus
    );
    
    // Step 3: Related Benefits Planning
    const relatedBenefitsPlanningResult = await medicaidRelatedBenefitsPlanning(
      normalizedClientInfo, normalizedAssets, normalizedIncome, normalizedState
    );
    
    // Step 4: Asset Planning
    const assetPlanningResult = await medicaidAssetPlanning(
      normalizedClientInfo, normalizedAssets, normalizedState
    );
    
    // Step 5: Income Planning
    const incomePlanningResult = await medicaidIncomePlanning(
      normalizedClientInfo, normalizedIncome, normalizedExpenses, normalizedState
    );
    
    // Step 6: Trust Planning
    const trustPlanningResult = await medicaidTrustPlanning(
      normalizedClientInfo, normalizedAssets, normalizedState
    );
    
    // Step 7: Annuity Planning
    const annuityPlanningResult = await medicaidAnnuityPlanning(
      normalizedClientInfo, normalizedAssets, normalizedState
    );
    
    // Step 8: Divestment Planning
    const divestmentPlanningResult = await medicaidDivestmentPlanning(
      normalizedClientInfo, normalizedAssets, normalizedState
    );
    
    // Step 9: Community Spouse Planning (only for married clients)
    let communitySpousePlanningResult = {
      strategies: [],
      approach: "Not applicable (client is not married)"
    };
    
    if (maritalStatus === 'married') {
      communitySpousePlanningResult = await medicaidCommunitySpousePlanning(
        normalizedClientInfo, normalizedAssets, normalizedState
      );
    }
    
    // Step 10: Application Planning
    const applicationPlanningResult = await medicaidApplicationPlanning(
      normalizedClientInfo, normalizedAssets, normalizedIncome, normalizedState, maritalStatus
    );
    
    // Step 11: Post-Eligibility Planning
    const postEligibilityPlanningResult = await medicaidPostEligibilityPlanning(
      normalizedClientInfo, normalizedAssets, normalizedIncome, normalizedState, maritalStatus
    );
    
    // Step 12: Estate Recovery Planning
    const estateRecoveryPlanningResult = await medicaidEstateRecoveryPlanning(
      normalizedClientInfo, normalizedAssets, normalizedState
    );
    
    // Combine all results into a comprehensive planning report
    const planningResult = {
      // Care Planning
      careNeeds: carePlanningResult.careNeeds,
      careStrategies: carePlanningResult.strategies,
      carePlan: carePlanningResult.approach,
      
      // Eligibility Assessment
      eligibility: eligibilityResult.eligibilityResult,
      eligibilityStrategies: eligibilityResult.eligibilityStrategies,
      eligibilityPlan: eligibilityResult.eligibilityPlan,
      
      // Related Benefits
      benefitEligibility: relatedBenefitsPlanningResult.eligibility,
      benefitStrategies: relatedBenefitsPlanningResult.strategies,
      benefitPlan: relatedBenefitsPlanningResult.approach,
      
      // Asset Planning
      assetSituation: assetPlanningResult.situation,
      assetStrategies: assetPlanningResult.strategies,
      assetPlan: assetPlanningResult.approach,
      
      // Income Planning
      incomeSituation: incomePlanningResult.incomeSituation,
      incomeStrategies: incomePlanningResult.strategies,
      incomePlan: incomePlanningResult.approach,
      
      // Trust Planning
      trustStrategies: trustPlanningResult.strategies,
      trustPlan: trustPlanningResult.approach,
      
      // Annuity Planning
      annuityStrategies: annuityPlanningResult.strategies,
      annuityPlan: annuityPlanningResult.approach,
      
      // Divestment Planning
      divestmentStrategies: divestmentPlanningResult.strategies,
      divestmentPlan: divestmentPlanningResult.approach,
      
      // Community Spouse Planning - include appropriate content based on marital status
      communitySpouseStrategies: communitySpousePlanningResult.strategies || [],
      communitySpousePlan: communitySpousePlanningResult.approach,
      
      // Application Planning
      applicationPlan: applicationPlanningResult.applicationApproach,
      
      // Post-Eligibility Planning
      postEligibilityStrategies: postEligibilityPlanningResult.strategies,
      postEligibilityPlan: postEligibilityPlanningResult.approach,
      
      // Estate Recovery Planning
      estateRecoveryStrategies: estateRecoveryPlanningResult.strategies,
      estateRecoveryPlan: estateRecoveryPlanningResult.approach,
      
      // Store normalized data for test verification
      normalizedData: normalizedData,
      
      status: 'success'
    };
    
    logger.info('Comprehensive Medicaid planning completed successfully');
    
    return planningResult;
  } catch (error) {
    logger.error(`Error in comprehensive Medicaid planning: ${error.message}`);
    return {
      error: `Medicaid planning error: ${error.message}`,
      status: 'error'
    };
  }
}

/**
 * Generate a consolidated Medicaid planning report in text format
 * 
 * @param {Object} planningResult - Result from medicaidPlanning function 
 * @returns {string} Formatted comprehensive planning report
 */
function generateMedicaidPlanningReport(planningResult) {
  if (planningResult.status !== 'success') {
    return `ERROR: ${planningResult.error}`;
  }
  
  let report = "COMPREHENSIVE MEDICAID PLANNING REPORT\n";
  report += "=====================================\n\n";
  
  // Care Planning Section
  report += "1. CARE PLANNING\n";
  report += "-----------------\n";
  report += planningResult.carePlan + "\n\n";
  
  // Eligibility Section
  report += "2. ELIGIBILITY ASSESSMENT\n";
  report += "-------------------------\n";
  report += planningResult.eligibilityPlan + "\n\n";
  
  // Related Benefits Section
  report += "3. RELATED BENEFITS PLANNING\n";
  report += "----------------------------\n";
  report += planningResult.benefitPlan + "\n\n";
  
  // Asset Planning Section
  report += "4. ASSET PLANNING\n";
  report += "-----------------\n";
  report += planningResult.assetPlan + "\n\n";
  
  // Income Planning Section
  report += "5. INCOME PLANNING\n";
  report += "------------------\n";
  report += planningResult.incomePlan + "\n\n";
  
  // Trust Planning Section
  report += "6. TRUST PLANNING\n";
  report += "-----------------\n";
  report += planningResult.trustPlan + "\n\n";
  
  // Annuity & Promissory Note Planning Section
  report += "7. ANNUITY & PROMISSORY NOTE PLANNING\n";
  report += "-------------------------------------\n";
  report += planningResult.annuityPlan + "\n\n";
  
  // Divestment Planning Section
  report += "8. DIVESTMENT PLANNING\n";
  report += "----------------------\n";
  report += planningResult.divestmentPlan + "\n\n";
  
  // Community Spouse Planning Section
  report += "9. COMMUNITY SPOUSE PLANNING\n";
  report += "----------------------------\n";
  report += planningResult.communitySpousePlan + "\n\n";
  
  // Application Planning Section
  report += "10. APPLICATION PLANNING\n";
  report += "------------------------\n";
  report += planningResult.applicationPlan + "\n\n";
  
  // Post-Eligibility Planning Section
  report += "11. POST-ELIGIBILITY PLANNING\n";
  report += "-----------------------------\n";
  report += planningResult.postEligibilityPlan + "\n\n";
  
  // Estate Recovery Planning Section
  report += "12. ESTATE RECOVERY PLANNING\n";
  report += "----------------------------\n";
  report += planningResult.estateRecoveryPlan + "\n\n";
  
  // Summary & Next Steps
  report += "SUMMARY & RECOMMENDED NEXT STEPS\n";
  report += "================================\n";
  report += "1. Determine appropriate care setting and needs\n";
  report += "2. Apply for related benefits that may assist with care costs\n";
  report += "3. Address asset and income eligibility issues\n";
  report += "4. Implement appropriate planning strategies (trusts, annuities, etc.)\n";
  report += "5. For married couples, protect the community spouse\n";
  report += "6. Prepare and submit the Medicaid application\n";
  report += "7. Develop post-eligibility monitoring system\n";
  report += "8. Plan for potential estate recovery\n";
  
  return report;
}

module.exports = {
  medicaidPlanning,
  generateMedicaidPlanningReport
};