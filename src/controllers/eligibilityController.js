// src/controllers/eligibilityController.js
const logger = require('../config/logger');
const { assessMedicaidEligibility } = require('../services/planning/eligibilityAssessment');
const { getMedicaidRules } = require('../services/utils/medicaidRulesLoader');
const { generateEnhancedEligibilityReport } = require('../services/reporting/enhancedEligibilityReport');
const { Client, Assessment } = require('../models');
const crypto = require('crypto');

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
    
    // ADD THESE DEBUG LINES
    console.log('📥 Received body keys:', Object.keys(req.body));
    console.log('📥 Full body:', JSON.stringify(req.body, null, 2));
    
    // Use snake_case from the transformed request
    const { client_info, assets, income, state } = req.body;
    
    // Collect missing required fields
    const missingFields = [];
    
    if (!client_info) {
      missingFields.push('client_info');
    } else {
      if (!client_info.name) missingFields.push('client_info.name');
      if (client_info.age === undefined) missingFields.push('client_info.age');
      if (!client_info.marital_status) missingFields.push('client_info.marital_status');
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
    
    // Create medicalNeeds object - use snake_case
    const medicalNeeds = {
      criticalHealth: client_info.health_status === 'critical'
    };
    
    // Convert back to camelCase for the service function
    const clientInfo = {
      name: client_info.name,
      age: client_info.age,
      maritalStatus: client_info.marital_status,
      healthStatus: client_info.health_status,
      isCrisis: client_info.is_crisis || false
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
    
    // Generate the enhanced HTML report
    try {
      const enhancedReport = await generateEnhancedEligibilityReport(
        result,
        clientInfo,
        assets,
        income,
        state
      );
      
      if (enhancedReport.status === 'success') {
        // Add the embedded HTML report for React components
        result.enhancedReport = enhancedReport.embeddedReport;
        result.fullHtmlReport = enhancedReport.htmlReport;
        result.reportData = enhancedReport.reportData;
      }
    } catch (reportError) {
      logger.warn('Failed to generate enhanced report, continuing with basic assessment:', reportError.message);
      // Don't fail the whole request if enhanced report fails
    }
    
    // Save client and assessment to database
    try {
      // For now, use a default user_id - in production this would come from authentication
      const defaultUserId = '4bccc534-0a79-434a-b4d4-21672853262a'; // admin user from setup
      
      // Create or find client
      let client = await Client.findByEmail(client_info.email || `${client_info.name.toLowerCase().replace(/\s+/g, '')}@temp.com`);
      
      if (!client) {
        const clientData = {
          assigned_planner_id: defaultUserId,
          first_name: client_info.name.split(' ')[0] || client_info.name,
          last_name: client_info.name.split(' ').slice(1).join(' ') || '',
          email: client_info.email || `${client_info.name.toLowerCase().replace(/\s+/g, '')}@temp.com`,
          phone: client_info.phone || null,
          date_of_birth: client_info.date_of_birth || '1950-01-01', // Required field
          marital_status: client_info.marital_status || 'single',
          gohighlevel_contact_id: null // Will be populated later when goHighLevel integration is added
        };
        
        client = await Client.create(clientData);
        logger.info(`Created new client: ${client.id}`);
      }
      
      // Add client_id to the result for frontend reference  
      result.client_id = client.id;
      
    } catch (dbError) {
      logger.error(`Database error while saving assessment: ${dbError.message}`);
      // Don't fail the request if database save fails, but log it
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

/**
 * Generate enhanced eligibility report
 */
exports.generateEnhancedReport = async (req, res) => {
  try {
    logger.info('Received enhanced eligibility report request');
    
    const { client_info, assets, income, state } = req.body;
    
    // Validate required fields
    if (!client_info || !assets || !income || !state) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: client_info, assets, income, state'
      });
    }
    
    // First, get the basic eligibility assessment
    const clientInfo = {
      name: client_info.name,
      age: client_info.age,
      maritalStatus: client_info.marital_status,
      healthStatus: client_info.health_status,
      isCrisis: client_info.is_crisis || false
    };
    
    const medicalNeeds = {
      criticalHealth: client_info.health_status === 'critical'
    };
    
    const assessment = await assessMedicaidEligibility(
      clientInfo, 
      assets, 
      income, 
      medicalNeeds, 
      state, 
      clientInfo.isCrisis || false
    );
    
    if (assessment.status === 'error') {
      logger.error(`Error in assessment: ${assessment.error}`);
      return res.status(400).json(assessment);
    }
    
    // Generate the enhanced HTML report
    const enhancedReport = await generateEnhancedEligibilityReport(
      assessment,
      clientInfo,
      assets,
      income,
      state
    );
    
    if (enhancedReport.status !== 'success') {
      logger.error('Error generating enhanced report');
      return res.status(500).json({
        status: 'error',
        message: 'Failed to generate enhanced eligibility report'
      });
    }
    
    logger.info('Successfully generated enhanced eligibility report');
    
    return res.status(200).json({
      status: 'success',
      data: {
        assessment: assessment,
        reportData: enhancedReport.reportData,
        htmlReport: enhancedReport.htmlReport,
        embeddedReport: enhancedReport.embeddedReport
      }
    });
    
  } catch (error) {
    logger.error(`Error in generateEnhancedReport controller: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};