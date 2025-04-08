// src/controllers/eligibilityController.js
const { assessMedicaidEligibility } = require('../services/eligibility/eligibilityAssessment');
const { getStateRules } = require('../services/utils/medicaidRulesLoader');
const logger = require('../config/logger');

/**
 * Assess eligibility based on submitted data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function assessEligibility(req, res) {
  try {
    logger.info('Received eligibility assessment request');
    
    const { assets, income, maritalStatus, state, age, healthStatus, isCrisis } = req.body;
    
    // Validate required fields
    if (!assets || !income || !maritalStatus || !state || !age) {
      logger.error('Missing required fields in eligibility assessment request');
      return res.status(400).json({
        error: 'Missing required fields',
        status: 'error'
      });
    }
    
    // Process assessment
    const result = await assessMedicaidEligibility(
      assets, income, maritalStatus, state, age, healthStatus, isCrisis
    );
    
    // Return assessment results
    if (result.status === 'error') {
      logger.error(`Error in assessment: ${result.error}`);
      return res.status(400).json(result);
    }
    
    logger.info('Successfully completed eligibility assessment');
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Unexpected error in assessEligibility controller: ${error.message}`);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      status: 'error'
    });
  }
}

/**
 * Get state-specific Medicaid rules
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getStateMedicaidRules(req, res) {
  try {
    const { state } = req.params;
    
    if (!state) {
      logger.error('State parameter is required');
      return res.status(400).json({
        error: 'State parameter is required',
        status: 'error'
      });
    }
    
    // Get rules for the specified state
    const rules = await getStateRules(state);
    
    logger.info(`Successfully retrieved rules for ${state}`);
    return res.status(200).json({
      state,
      rules,
      status: 'success'
    });
  } catch (error) {
    logger.error(`Error in getStateMedicaidRules controller: ${error.message}`);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      status: 'error'
    });
  }
}

module.exports = {
  assessEligibility,
  getStateMedicaidRules
};