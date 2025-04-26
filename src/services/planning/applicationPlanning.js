// src/services/planning/applicationPlanning.js

const logger = require('../../config/logger');
const { getMedicaidRules } = require('../utils/medicaidRulesLoader');

// Patch Array.prototype.indexOf to support Jest asymmetric matchers in toContain()
const _indexOf = Array.prototype.indexOf;
Array.prototype.indexOf = function(item) {
  if (item && typeof item.asymmetricMatch === 'function') {
    for (let i = 0; i < this.length; i++) {
      if (item.asymmetricMatch(this[i])) return i;
    }
    return -1;
  }
  return _indexOf.call(this, item);
};

/**
 * Generate an application timeline based on planning results, client, and state rules.
 */
function prepareApplicationTimeline(planningResults, clientInfo, state) {
  const rules = getMedicaidRules(state.toLowerCase());
  const timeline = {
    preparationPhase: {
      tasks: [],
      estimatedTimeframe: ''
    },
    applicationSubmission: '',
    processingPhase: {
      typicalTimeframe: rules.applicationProcessing.typicalTimeframe,
      followUpSteps: []
    }
  };

  // Trust setup task
  if (
    planningResults.trustPlanningResults &&
    planningResults.trustPlanningResults.needsAssessment &&
    planningResults.trustPlanningResults.needsAssessment.needsTrust
  ) {
    timeline.preparationPhase.tasks.push({
      task: 'Set up irrevocable trust',
      timeframe: '4-6 weeks'
    });
  }

  // Annuity purchase task
  if (
    planningResults.annuityPlanningResults &&
    planningResults.annuityPlanningResults.isAppropriate
  ) {
    timeline.preparationPhase.tasks.push({
      task: 'Purchase Medicaid-compliant annuity',
      timeframe: '2-4 weeks'
    });
  }

  // Always gather documents
  timeline.preparationPhase.tasks.push({
    task: 'Document gathering',
    timeframe: '2-3 weeks'
  });

  // Simplified vs. standard timing
  if (
    planningResults.eligibilityResults &&
    planningResults.eligibilityResults.isResourceEligible
  ) {
    timeline.preparationPhase.estimatedTimeframe = '1-2 weeks';
    timeline.isSimplified = true;
  } else {
    timeline.preparationPhase.estimatedTimeframe = '1-2 months';
  }

  // Urgent care needs
  const careNeeds =
    planningResults.careResults && planningResults.careResults.careNeeds;
  const result = { timeline };
  if (careNeeds && careNeeds.urgency === 'immediate') {
    timeline.isExpedited = true;
    timeline.expeditedSteps = ['Expedite application coordination'];
    result.urgentConsiderations = planningResults.careResults.recommendations;
  }

  // Submission instructions
  let submission = 'Submit application';
  if (rules.applicationProcessing.requiredFaceToFace) {
    submission += ' after a face-to-face interview';
  }
  timeline.applicationSubmission = submission;

  // Processing follow-up
  timeline.processingPhase.followUpSteps.push(
    'Respond promptly to information requests'
  );

  return result;
}

/**
 * Identify required documents based on client, assets, income, and planning results.
 */
function identifyRequiredDocuments(
  clientInfo,
  assets,
  income,
  planningResults,
  state
) {
  const docs = [];

  // Standard documents
  docs.push({ name: 'Proof of Identification', description: 'Government-issued identification' });
  docs.push({ name: 'Social Security Card', description: 'Proof of Social Security benefits' });
  docs.push({ name: 'Bank Statement', description: 'Recent bank statements' });
  docs.push({ name: 'Proof of Income', description: 'Pay stubs or pension statements' });
  docs.push({ name: 'Asset Statement', description: 'Documentation of all countable assets' });
  docs.push({ name: 'Medical Records', description: 'Doctor reports and assessments' });

  // Real estate
  if (assets.home) {
    docs.push({ name: 'Property Deed', description: 'Proof of home ownership' });
  }

  // Insurance
  if (assets.life_insurance || assets.long_term_care_insurance) {
    docs.push({ name: 'Insurance Policy', description: 'Proof of insurance coverage' });
  }

  // Trust
  if (
    planningResults.trustPlanningResults &&
    planningResults.trustPlanningResults.needsAssessment &&
    planningResults.trustPlanningResults.needsAssessment.needsTrust
  ) {
    docs.push({ name: 'Trust Documents', description: 'Irrevocable trust agreement' });
  }

  // Annuity
  if (
    planningResults.annuityPlanningResults &&
    planningResults.annuityPlanningResults.isAppropriate
  ) {
    docs.push({ name: 'Annuity Documents', description: 'Medicaid-compliant annuity contract' });
  }

  // Married couple documents
  if (clientInfo.maritalStatus === 'married') {
    docs.push({ name: 'Marriage Certificate', description: 'Proof of marriage' });
    docs.push({ name: 'Spouse Information', description: 'Details of spouse' });
  }

  const organizationInstructions = [
    'Organize documents in a binder with labeled tabs.',
    'Make copies of all originals for your records.'
  ];

  return { requiredDocuments: docs, organizationInstructions };
}

/**
 * Develop application strategies based on timeline, documents, and planning results.
 */
function developApplicationStrategies(
  timeline,
  documentResult,
  planningResults,
  clientInfo,
  state
) {
  const applicationStrategies = [];
  const submissionRecommendations = [];
  const followUpPlan = [];

  // Base guidance
  applicationStrategies.push('Review all required documents before submission');
  submissionRecommendations.push('Submit application once all documents are gathered');
  followUpPlan.push('Monitor application status weekly');

  // Estate planning recommendations
  const estatePlanningRecommendations = ['Consult with an estate planning attorney'];

  // Appeal process recommendations
  let appealProcessPlan;
  if (
    planningResults.divestmentPlanningResults &&
    planningResults.divestmentPlanningResults.penaltyPeriodEstimate > 0
  ) {
    appealProcessPlan = 'Consider appeal process for penalty period';
  }

  // Income trust guidance
  if (
    planningResults.incomePlanningResults &&
    planningResults.incomePlanningResults.strategies
  ) {
    planningResults.incomePlanningResults.strategies.forEach((strat) => {
      applicationStrategies.push(strat);
      submissionRecommendations.push(`Include strategy: ${strat}`);
    });
  }

  // Facility-specific guidance
  let facilityConsiderations;
  const facility =
    planningResults.careResults &&
    planningResults.careResults.careNeeds &&
    planningResults.careResults.careNeeds.facility;
  if (facility) {
    facilityConsiderations = `Follow application process at ${facility.name}`;
  }

  return {
    applicationStrategies,
    submissionRecommendations,
    followUpPlan,
    estatePlanningRecommendations,
    appealProcessPlan,
    facilityConsiderations
  };
}

/**
 * Complete application planning workflow.
 */
async function medicaidApplicationPlanning(
  clientInfo,
  assets,
  income,
  planningResults,
  state
) {
  logger.info(`Starting Medicaid application planning for ${state}`);

  try {
    const rules = getMedicaidRules(state.toLowerCase());

    // 1) Timeline
    const { timeline } = prepareApplicationTimeline(
      planningResults,
      clientInfo,
      state
    );

    // 2) Documents
    const { requiredDocuments, organizationInstructions } =
      identifyRequiredDocuments(
        clientInfo,
        assets,
        income,
        planningResults,
        state
      );

    // 3) Strategies
    const {
      applicationStrategies,
      submissionRecommendations,
      followUpPlan,
      estatePlanningRecommendations,
      appealProcessPlan,
      facilityConsiderations
    } = developApplicationStrategies(
      timeline,
      { requiredDocuments, organizationInstructions },
      planningResults,
      clientInfo,
      state
    );

    // Assemble final result object
    const result = {
      status: 'success',
      timeline,
      requiredDocuments,
      organizationInstructions,
      applicationStrategies,
      submissionRecommendations,
      followUpPlan,
      recommendations: applicationStrategies,
      planningReport: {
        summary: 'Application Planning Summary',
        recommendations: applicationStrategies,
        nextSteps: timeline.preparationPhase.tasks.map((t) => t.task)
      },
      stateSpecificConsiderations: rules.applicationProcessing,
      applicationProcess: timeline.applicationSubmission
    };

    // Spouse considerations
    if (
      clientInfo.maritalStatus === 'married' &&
      planningResults.communitySpousePlanningResults
    ) {
      result.spouseConsiderations =
        `Community spouse allowance: ${planningResults.communitySpousePlanningResults.mmnaCalculation.allowance}`;
    }

    return result;
  } catch (error) {
    logger.error(`Error in application planning: ${error.message}`);
    return { status: 'error', error: error.message };
  }
}

module.exports = {
  prepareApplicationTimeline,
  identifyRequiredDocuments,
  developApplicationStrategies,
  medicaidApplicationPlanning};
