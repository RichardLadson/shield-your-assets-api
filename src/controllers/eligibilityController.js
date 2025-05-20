// src/controllers/eligibilityController.js
const logger = require('../config/logger');
const { assessMedicaidEligibility } = require('../services/planning/eligibilityAssessment');
const { getMedicaidRules } = require('../services/utils/medicaidRulesLoader');

/**
 * Standardized response formatter
 * @param {Object|string} data - Response data
 * @param {string} status - Response status (success or error)
 * @returns {Object} Formatted response
 */
function formatResponse(data, status = 'success') {
  // If data is a string that might be a stringified JSON, try to parse it
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      // Not valid JSON, leave as is
    }
  }
  
  // If data already has status property, return it as is
  if (data && data.status) {
    return data;
  }
  
  // Otherwise, wrap it in a standard format
  return {
    status: status,
    data: data
  };
}

/**
 * Assess eligibility based on submitted data
 */
exports.assessEligibility = async (req, res) => {
  try {
    logger.info('Received eligibility assessment request');
    
    const { clientInfo, assets, income, state } = req.body;
    
    // Collect missing required fields
    const missingFields = [];
    
    if (!clientInfo) {
      missingFields.push('clientInfo');
    } else {
      if (!clientInfo.name) missingFields.push('clientInfo.name');
      if (clientInfo.age === undefined) missingFields.push('clientInfo.age');
      if (!clientInfo.maritalStatus) missingFields.push('clientInfo.maritalStatus');
    }
    
    if (!state) missingFields.push('state');
    if (!assets || Object.keys(assets).length === 0) missingFields.push('assets');
    if (!income || Object.keys(income).length === 0) missingFields.push('income');
    
    // Return detailed error if fields are missing
    if (missingFields.length > 0) {
      logger.error(`Missing required fields in eligibility assessment request: ${missingFields.join(', ')}`);
      return res.status(400).json({
        status: 'error',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields: missingFields
      });
    }
    
    // Create medicalNeeds object
    const medicalNeeds = {
      criticalHealth: clientInfo.healthStatus === 'critical'
    };
    
    // Call the assessMedicaidEligibility function with the proper parameters
    const result = await assessMedicaidEligibility(
      clientInfo, 
      assets, 
      income, 
      medicalNeeds, 
      state, 
      clientInfo.isCrisis || false
    );
    
    if (result.status === 'error') {
      logger.error(`Error in assessment: ${result.error}`);
      return res.status(400).json(result);
    }
    
    logger.info('Successfully completed eligibility assessment');
    
    // Ensure consistent response format
    return res.status(200).json(formatResponse(result));
  } catch (error) {
    logger.error(`Unexpected error in assessEligibility controller: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Get state-specific Medicaid rules
 */
exports.getStateMedicaidRules = async (req, res) => {
  try {
    const { state } = req.params;
    
    if (!state) {
      return res.status(400).json({
        status: 'error',
        message: 'State parameter is required'
      });
    }
    
    const rules = await getMedicaidRules(state);
    
    logger.info(`Successfully retrieved rules for ${state}`);
    
    // Ensure consistent response format
    return res.status(200).json(formatResponse({
      state,
      rules
    }));
  } catch (error) {
    logger.error(`Error in getStateMedicaidRules controller: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};