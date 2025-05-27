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
      normalizedClientInfo, normalizedAssets, normalizedIncome, normalizedExpenses, livingInfo, normalizedState
    );
    
    // Step 5: Income Planning
    const incomePlanningResult = await medicaidIncomePlanning(
      normalizedClientInfo, normalizedIncome, normalizedExpenses, normalizedState
    );
    
    // Step 6: Trust Planning
    const trustPlanningResult = await medicaidTrustPlanning(
      normalizedClientInfo, normalizedAssets, normalizedIncome, eligibilityResult, normalizedState
    );
    
    // Step 7: Annuity Planning
    const annuityPlanningResult = await medicaidAnnuityPlanning(
      normalizedClientInfo, normalizedAssets, normalizedIncome, eligibilityResult, normalizedState
    );
    
    // Step 8: Divestment Planning
    const divestmentPlanningResult = await medicaidDivestmentPlanning(
      normalizedClientInfo, normalizedAssets, null, normalizedState
    );
    
    // Step 9: Community Spouse Planning (only for married clients)
    let communitySpousePlanningResult = {
      strategies: [],
      approach: "Not applicable (client is not married)"
    };
    
    if (maritalStatus === 'married') {
      communitySpousePlanningResult = await medicaidCommunitySpousePlanning(
        normalizedClientInfo, normalizedAssets, normalizedIncome, normalizedExpenses, normalizedState
      );
    }
    
    // Step 10: Application Planning
    const applicationPlanningResult = await medicaidApplicationPlanning(
      normalizedClientInfo, normalizedAssets, normalizedIncome, {
        eligibilityResult,
        assetPlanningResult,
        incomePlanningResult,
        trustPlanningResult,
        annuityPlanningResult,
        divestmentPlanningResult,
        communitySpousePlanningResult
      }, normalizedState
    );
    
    // Step 11: Post-Eligibility Planning
    const postEligibilityPlanningResult = await medicaidPostEligibilityPlanning(
      normalizedClientInfo, normalizedAssets, normalizedIncome, normalizedState, maritalStatus
    );
    
    // Step 12: Estate Recovery Planning
    const estateRecoveryPlanningResult = await medicaidEstateRecoveryPlanning(
      normalizedClientInfo, normalizedAssets, normalizedState
    );
    
    // Combine all strategies for frontend
    const allStrategies = [];
    let strategyId = 1;
    
    logger.info(`Asset strategies found: ${JSON.stringify(assetPlanningResult.strategies)}`);
    logger.info(`Trust strategies found: ${JSON.stringify(trustPlanningResult.strategies)}`);
    
    // Add asset strategies
    if (assetPlanningResult.strategies && assetPlanningResult.strategies.length > 0) {
      assetPlanningResult.strategies.forEach(strategy => {
        if (typeof strategy === 'object' && strategy.id) {
          // Strategy is already a structured object from the new assetPlanning module
          allStrategies.push(strategy);
        } else if (typeof strategy === 'string') {
          logger.info(`Processing string strategy: ${strategy}`);
          // Parse string strategies into structured format (for backward compatibility)
          if (strategy.toLowerCase().includes('trust') || strategy.toLowerCase().includes('irrevocable')) {
            allStrategies.push({
              id: strategyId++,
              name: "Irrevocable Trust",
              description: "Transfer assets to an irrevocable trust to remove them from Medicaid countable assets.",
              pros: ["Assets protected from Medicaid spend-down", "Potentially avoids estate recovery", "Provides legacy planning"],
              cons: ["Loss of direct control over assets", "5-year look-back period applies", "Cannot modify trust terms"],
              effectiveness: "High",
              timing: "Implement at least 5 years before anticipated need"
            });
          } else if (strategy.toLowerCase().includes('spousal') || strategy.toLowerCase().includes('spouse')) {
            allStrategies.push({
              id: strategyId++,
              name: "Spousal Transfer",
              description: "Transfer assets to a community spouse to protect them while qualifying for Medicaid.",
              pros: ["No look-back period for transfers between spouses", "Community spouse retains control", "Immediate protection"],
              cons: ["Only applicable if married", "Community spouse subject to resource limits", "State variations in allowances"],
              effectiveness: "Medium-High",
              timing: "Can be implemented close to application time"
            });
          } else if (strategy.toLowerCase().includes('spend') || strategy.toLowerCase().includes('convert')) {
            allStrategies.push({
              id: strategyId++,
              name: "Asset Conversion Strategy",
              description: "Convert countable assets to non-countable assets or spend down strategically.",
              pros: ["Immediate effect on eligibility", "Retain benefit of assets", "No look-back period concerns"],
              cons: ["Assets must be used wisely", "Limited to specific exempt categories", "May not protect all assets"],
              effectiveness: "Medium",
              timing: "Implement before application"
            });
          } else if (strategy.toLowerCase().includes('annuity')) {
            allStrategies.push({
              id: strategyId++,
              name: "Medicaid-Compliant Annuity",
              description: "Purchase a Medicaid-compliant annuity to convert assets to income stream.",
              pros: ["Converts excess resources to income", "Protects assets for community spouse", "Immediate eligibility possible"],
              cons: ["Irrevocable decision", "Must meet strict Medicaid requirements", "Income stream counts toward eligibility"],
              effectiveness: "High",
              timing: "Can be implemented immediately before application"
            });
          } else {
            // Generic strategy for unmatched strings
            allStrategies.push({
              id: strategyId++,
              name: strategy.substring(0, 50),
              description: strategy,
              pros: ["May help with Medicaid qualification"],
              cons: ["Requires professional guidance"],
              effectiveness: "Varies",
              timing: "Consult with Medicaid planner"
            });
          }
        }
      });
    }
    
    // Add trust strategies
    if (trustPlanningResult.strategies && trustPlanningResult.strategies.length > 0) {
      trustPlanningResult.strategies.forEach(strategy => {
        if (strategy.type && !allStrategies.find(s => s.name === strategy.name)) {
          allStrategies.push({
            id: strategyId++,
            name: strategy.name || strategy.type,
            description: strategy.description || `${strategy.type} strategy for Medicaid planning`,
            pros: strategy.benefits || [],
            cons: strategy.limitations || [],
            effectiveness: strategy.effectiveness || "Medium",
            timing: strategy.timing || "Varies based on situation"
          });
        }
      });
    }
    
    // Add income strategies
    if (incomePlanningResult.strategies && incomePlanningResult.strategies.length > 0) {
      incomePlanningResult.strategies.forEach(strategy => {
        if (typeof strategy === 'object' && strategy.id) {
          // Strategy is already a structured object from the new incomePlanning module
          allStrategies.push(strategy);
        } else if (typeof strategy === 'string' && !allStrategies.find(s => s.name.toLowerCase().includes(strategy.toLowerCase().substring(0, 20)))) {
          // Handle legacy string strategies
          if (strategy.toLowerCase().includes('miller trust') || strategy.toLowerCase().includes('qit')) {
            allStrategies.push({
              id: strategyId++,
              name: "Miller Trust (QIT)",
              description: "Establish a Qualified Income Trust to manage excess income.",
              pros: ["Allows eligibility despite excess income", "Required in income cap states", "Preserves income for care"],
              cons: ["Complex setup required", "Ongoing administration needed", "Income must flow through trust"],
              effectiveness: "High",
              timing: "Must be established before Medicaid application"
            });
          }
        }
      });
    }
    
    // Add divestment strategies
    if (divestmentPlanningResult.strategies && divestmentPlanningResult.strategies.length > 0) {
      divestmentPlanningResult.strategies.forEach(strategy => {
        if (typeof strategy === 'object' && strategy.id) {
          // Strategy is already a structured object from the refactored divestmentPlanning module
          allStrategies.push(strategy);
        } else if (typeof strategy === 'string' && strategy.length > 10) {
          // Handle legacy string strategies
          logger.info(`Processing legacy divestment strategy: ${strategy}`);
          allStrategies.push({
            id: strategyId++,
            name: strategy.substring(0, 50),
            description: strategy,
            pros: ["May reduce penalty exposure"],
            cons: ["Requires professional guidance"],
            effectiveness: "Varies",
            timing: "Consult with Medicaid planner"
          });
        }
      });
    }
    
    // Add estate recovery strategies
    if (estateRecoveryPlanningResult.strategies && estateRecoveryPlanningResult.strategies.length > 0) {
      estateRecoveryPlanningResult.strategies.forEach(strategy => {
        if (typeof strategy === 'object' && strategy.id) {
          // Strategy is already a structured object from the refactored estateRecovery module
          allStrategies.push(strategy);
        } else if (typeof strategy === 'string' && strategy.length > 10) {
          // Handle legacy string strategies
          allStrategies.push({
            id: strategyId++,
            name: strategy.substring(0, 50),
            description: strategy,
            pros: ["May protect assets from recovery"],
            cons: ["Requires professional guidance"],
            effectiveness: "Varies",
            timing: "Consult with estate planning attorney"
          });
        }
      });
    }
    
    // Add post-eligibility strategies
    if (postEligibilityPlanningResult.strategies && postEligibilityPlanningResult.strategies.length > 0) {
      postEligibilityPlanningResult.strategies.forEach(strategy => {
        if (typeof strategy === 'object' && strategy.id) {
          // Strategy is already a structured object from the refactored postEligibilityPlanning module
          allStrategies.push(strategy);
        } else if (typeof strategy === 'string' && strategy.length > 10) {
          // Handle legacy string strategies
          allStrategies.push({
            id: strategyId++,
            name: strategy.substring(0, 50),
            description: strategy,
            pros: ["Maintains Medicaid compliance"],
            cons: ["Requires ongoing attention"],
            effectiveness: "High",
            timing: "Ongoing requirement"
          });
        }
      });
    }
    
    // If married, add community spouse strategies
    if (maritalStatus === 'married' && communitySpousePlanningResult.strategies && communitySpousePlanningResult.strategies.length > 0) {
      if (!allStrategies.find(s => s.name.includes('Spousal'))) {
        allStrategies.push({
          id: strategyId++,
          name: "Community Spouse Resource Allowance",
          description: "Maximize the amount of assets the community spouse can retain.",
          pros: ["Protects resources for at-home spouse", "No penalty period", "Immediate protection"],
          cons: ["Complex calculations required", "State-specific rules apply", "May require court order for maximum"],
          effectiveness: "High",
          timing: "At time of Medicaid application"
        });
      }
    }
    
    // Ensure we always have at least some strategies
    if (allStrategies.length === 0) {
      logger.warn('No strategies generated, adding default strategies');
      allStrategies.push({
        id: 1,
        name: "Medicaid Planning Consultation",
        description: "Work with a Medicaid planning attorney to develop a customized strategy.",
        pros: ["Personalized advice", "Ensures compliance with state rules", "Maximizes asset protection"],
        cons: ["Professional fees required", "Time needed for planning", "May require document preparation"],
        effectiveness: "High",
        timing: "As soon as possible"
      });
    }
    
    logger.info(`Total strategies generated: ${allStrategies.length}`);

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
      
      // Combined strategies for frontend
      strategies: allStrategies,
      
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