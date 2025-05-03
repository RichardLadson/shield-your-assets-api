// src/controllers/eligibilityController.js
const logger = require('../config/logger');
const eligibilityService = require('../services/eligibility/eligibilityService');

exports.assessEligibility = async (req, res) => {
  try {
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
    
    // Continue with processing
    const eligibilityResult = await eligibilityService.assessEligibility(
      clientInfo, assets, income, state
    );
    
    return res.json({
      status: 'success',
      data: eligibilityResult
    });
  } catch (error) {
    logger.error(`Eligibility Assessment Error: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: `Server error: ${error.message}`
    });
  }
};

exports.getStateMedicaidRules = async (req, res) => {
  try {
    const { state } = req.params;
    
    if (!state) {
      return res.status(400).json({
        status: 'error',
        message: 'State parameter is required'
      });
    }
    
    const stateRules = await eligibilityService.getStateMedicaidRules(state);
    
    return res.json({
      status: 'success',
      data: stateRules
    });
  } catch (error) {
    logger.error(`Get State Rules Error: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: `Server error: ${error.message}`
    });
  }
};