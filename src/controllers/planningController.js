// src/controllers/planningController.js
const logger = require('../config/logger');
const { medicaidPlanning } = require('../services/planning/medicaidPlanning');
const { medicaidAssetPlanning } = require('../services/planning/assetPlanning');
const { medicaidIncomePlanning } = require('../services/planning/incomePlanning');
const { medicaidTrustPlanning } = require('../services/planning/trustPlanning');
const { medicaidAnnuityPlanning } = require('../services/planning/annuityPlanning');
const { medicaidDivestmentPlanning } = require('../services/planning/divestmentPlanning');
const { medicaidCarePlanning } = require('../services/planning/carePlanning');
const { User, Client, Assessment, Plan } = require('../models');
const integrationController = require('./integrationController');

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

exports.comprehensivePlanning = async (req, res) => {
  try {
    // SECURITY: Log request without sensitive data
    logger.info('📥 Planning controller received request');
    logger.info('📥 Request contains fields:', Object.keys(req.body));
    // REMOVED: Full request body logging to prevent PII exposure
    
    const { client_info, assets, income, expenses, medical_info, living_info, state } = req.body;
    
    // Log what we extracted
    logger.info('📊 Extracted fields:', {
      hasClientInfo: !!client_info,
      hasAssets: !!assets,
      hasIncome: !!income,
      hasState: !!state,
      clientInfoKeys: client_info ? Object.keys(client_info) : 'null'
    });
    
    // Collect missing required fields
    const missingFields = [];
    
    if (!client_info) {
      missingFields.push('client_info');
    } else {
      // Require either full name OR both first and last names
      if (!client_info.name && (!client_info.first_name || !client_info.last_name)) {
        missingFields.push('client_info.name or (client_info.first_name and client_info.last_name)');
      }
      if (!client_info.email) missingFields.push('client_info.email');
      // Require either age OR date_of_birth, not both
      if (client_info.age === undefined && !client_info.date_of_birth) {
        missingFields.push('client_info.age or client_info.date_of_birth');
      }
      if (!client_info.marital_status) missingFields.push('client_info.marital_status');
    }
    
    if (!state) missingFields.push('state');
    if (!assets || Object.keys(assets).length === 0) missingFields.push('assets');
    if (!income || Object.keys(income).length === 0) missingFields.push('income');
    
    // Return detailed error if fields are missing
    if (missingFields.length > 0) {
      logger.error(`Missing required fields in comprehensive planning request: ${missingFields.join(', ')}`);
      return res.status(400).json({
        status: 'error',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }
    
    // SECURITY: Log planning start without client name
    logger.info(`Starting comprehensive planning for client in ${state}`);
    
    // Call the comprehensive planning function
    const planningResult = await medicaidPlanning(
      client_info, 
      assets, 
      income, 
      expenses || {}, 
      medical_info || {}, 
      living_info || {}, 
      state
    );
    
    if (planningResult.status === 'error') {
      logger.error(`Comprehensive planning failed: ${planningResult.error}`);
      return res.status(400).json(planningResult);
    }
    
    // Save planning results to database
    try {
      // Find an admin user dynamically instead of hardcoding
      let defaultUserId;
      try {
        const adminUsers = await User.query('SELECT user_id FROM users WHERE role = $1 LIMIT 1', ['admin']);
        if (adminUsers.rows.length > 0) {
          defaultUserId = adminUsers.rows[0].user_id;
        } else {
          // Fallback to any user if no admin found
          const anyUser = await User.query('SELECT user_id FROM users LIMIT 1', []);
          if (anyUser.rows.length > 0) {
            defaultUserId = anyUser.rows[0].user_id;
          } else {
            throw new Error('No users found in system - cannot assign planner');
          }
        }
      } catch (userLookupError) {
        logger.error(`Failed to find admin user: ${userLookupError.message}`);
        // Last resort fallback - but this should be configurable
        defaultUserId = process.env.DEFAULT_PLANNER_ID || '4bccc534-0a79-434a-b4d4-21672853262a';
      }
      
      // Find or create client (email is now required)
      let client = await Client.findByEmail(client_info.email);
      
      if (!client) {
        // Handle both naming approaches: separate first/last OR parse from full name
        let firstName, lastName;
        
        if (client_info.first_name && client_info.last_name) {
          // Use provided separate names (preferred)
          firstName = client_info.first_name;
          lastName = client_info.last_name;
        } else if (client_info.name) {
          // Fallback: parse full name (less reliable but better than before)
          const nameParts = client_info.name.trim().split(/\s+/);
          firstName = nameParts[0] || client_info.name;
          lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        } else {
          throw new Error('No valid name information provided');
        }
        
        const clientData = {
          assigned_planner_id: defaultUserId,
          first_name: firstName,
          last_name: lastName,
          email: client_info.email, // Required field - no fake emails
          phone: client_info.phone || null,
          date_of_birth: client_info.date_of_birth || null, // Allow null - don't fake birth dates
          age: client_info.age || null, // Store age separately if provided
          marital_status: client_info.marital_status, // Required field - no defaults
          gohighlevel_contact_id: null
        };
        
        client = await Client.create(clientData);
        logger.info(`Created new client for planning: ${client.client_id}`);
      }
      
      // Find the most recent assessment for this client
      const assessments = await Assessment.findByClientId(client.client_id);
      const latestAssessment = assessments[0]; // sorted by created_at DESC
      
      // Save planning results - create a plan for each strategy in the result
      if (planningResult.strategies && Array.isArray(planningResult.strategies)) {
        for (const strategy of planningResult.strategies) {
          const planData = {
            assessment_id: latestAssessment ? latestAssessment.assessment_id : null,
            client_id: client.client_id,
            user_id: defaultUserId,
            plan_type: strategy.type || 'comprehensive',
            plan_data: strategy,
            implementation_steps: strategy.steps || [],
            priority_score: strategy.priority || 50
          };
          
          const plan = await Plan.create(planData);
          logger.info(`Created plan: ${plan.plan_id} for strategy: ${strategy.type}`);
        }
      }
      
      // Add client_id to result for frontend reference
      planningResult.client_id = client.client_id;
      if (latestAssessment) {
        planningResult.assessment_id = latestAssessment.assessment_id;
      }
      
      // Integrate with GoHighLevel after successful planning session
      try {
        logger.info('Attempting to sync planning session to GoHighLevel');
        
        // Prepare data for GHL integration
        const integrationData = {
          clientData: {
            id: client.client_id,
            firstName: client.first_name,
            lastName: client.last_name,
            email: client.email,
            phone: client.phone,
            state: client.state,
            maritalStatus: client_info.marital_status,
            eligibilityStatus: planningResult.eligibility?.status || 'assessment_complete'
          },
          reportData: {
            reportId: latestAssessment?.assessment_id || 'planning_' + new Date().getTime(),
            assessmentDate: new Date().toISOString(),
            eligibilityStatus: planningResult.eligibility?.status || 'pending',
            totalAssets: Object.values(assets).reduce((sum, asset) => sum + (parseFloat(asset.value) || 0), 0),
            estimatedSavings: planningResult.estimatedSavings || 0,
            strategies: planningResult.strategies?.map(s => s.type) || [],
            priorityLevel: 'high',
            keyRecommendations: planningResult.strategies?.map(s => s.description).join('; ') || 'See full planning report'
          },
          reportInfo: {
            reportId: latestAssessment?.assessment_id || 'planning_' + new Date().getTime(),
            generatedDate: new Date().toISOString(),
            eligibilityStatus: planningResult.eligibility?.status || 'pending',
            reportUrl: process.env.APP_URL ? `${process.env.APP_URL}/reports/${client.client_id}` : 'Not available',
            keyFindings: planningResult.keyFindings || planningResult.strategies?.map(s => `• ${s.type}: ${s.description}`).join('\n') || 'Planning session completed successfully',
            nextAction: planningResult.nextSteps || 'Review planning strategies and implement recommendations'
          }
        };
        
        const integrationResult = await integrationController.handleAssessmentComplete(integrationData);
        
        if (integrationResult.success) {
          logger.info('Successfully synced planning session to GoHighLevel', {
            clientId: client.client_id,
            ghlContactId: integrationResult.ghlContactId,
            ghlOpportunityId: integrationResult.ghlOpportunityId
          });
        } else {
          logger.warn('GoHighLevel sync completed with errors', {
            clientId: client.client_id,
            errors: integrationResult.errors
          });
        }
      } catch (ghlError) {
        logger.error('Failed to sync planning session to GoHighLevel', {
          error: ghlError.message,
          clientId: client.client_id
        });
        // Don't fail the planning session if GHL sync fails
      }
      
    } catch (dbError) {
      logger.error(`Database error while saving planning results: ${dbError.message}`);
      // Don't fail the request if database save fails, but log it
    }
    
    // Ensure consistent response format
    return res.status(200).json(formatResponse(planningResult));
  } catch (error) {
    logger.error(`Comprehensive Planning Error: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.assetPlanning = async (req, res) => {
  try {
    const { client_info, assets, state } = req.body;
    
    // Validate required fields
    const missingFields = [];
    if (!client_info) missingFields.push('client_info');
    if (!assets || Object.keys(assets).length === 0) missingFields.push('assets');
    if (!state) missingFields.push('state');
    
    if (missingFields.length > 0) {
      logger.error(`Missing required fields in asset planning request: ${missingFields.join(', ')}`);
      return res.status(400).json({
        status: 'error',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }
    
    logger.info(`Starting asset planning for ${client_info.name} in ${state}`);
    
    const planningResult = await medicaidAssetPlanning(client_info, assets, {}, {}, {}, state);
    
    if (planningResult.status === 'error') {
      logger.error(`Asset planning failed: ${planningResult.error}`);
      return res.status(400).json(planningResult);
    }
    
    // Ensure consistent response format
    return res.status(200).json(formatResponse(planningResult));
  } catch (error) {
    logger.error(`Asset Planning Error: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.incomePlanning = async (req, res) => {
  try {
    const { client_info, income, expenses, state } = req.body;
    
    const missingFields = [];
    if (!client_info) missingFields.push('client_info');
    if (!income || Object.keys(income).length === 0) missingFields.push('income');
    if (!state) missingFields.push('state');
    
    if (missingFields.length > 0) {
      logger.error(`Missing required fields in income planning request: ${missingFields.join(', ')}`);
      return res.status(400).json({
        status: 'error',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }
    
    logger.info(`Starting income planning for ${client_info.name} in ${state}`);
    
    const planningResult = await medicaidIncomePlanning(client_info, income, expenses || {}, state);
    
    if (planningResult.status === 'error') {
      logger.error(`Income planning failed: ${planningResult.error}`);
      return res.status(400).json(planningResult);
    }
    
    // Ensure consistent response format
    return res.status(200).json(formatResponse(planningResult));
  } catch (error) {
    logger.error(`Income Planning Error: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.trustPlanning = async (req, res) => {
  try {
    const { client_info, assets, income, eligibility_results, state } = req.body;
    
    const missingFields = [];
    if (!client_info) missingFields.push('client_info');
    if (!assets || Object.keys(assets).length === 0) missingFields.push('assets');
    if (!income || Object.keys(income).length === 0) missingFields.push('income');
    if (!eligibility_results) missingFields.push('eligibility_results');
    if (!state) missingFields.push('state');
    
    if (missingFields.length > 0) {
      logger.error(`Missing required fields in trust planning request: ${missingFields.join(', ')}`);
      return res.status(400).json({
        status: 'error',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }
    
    logger.info(`Starting trust planning for ${client_info.name} in ${state}`);
    
    const planningResult = await medicaidTrustPlanning(client_info, assets, income, eligibility_results, state);
    
    if (planningResult.status === 'error') {
      logger.error(`Trust planning failed: ${planningResult.error}`);
      return res.status(400).json(planningResult);
    }
    
    // Ensure consistent response format
    return res.status(200).json(formatResponse(planningResult));
  } catch (error) {
    logger.error(`Trust Planning Error: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.annuityPlanning = async (req, res) => {
  try {
    const { client_info, assets, income, eligibility_status, state } = req.body;
    
    const missingFields = [];
    if (!client_info) missingFields.push('client_info');
    if (!assets || Object.keys(assets).length === 0) missingFields.push('assets');
    if (!state) missingFields.push('state');
    
    if (missingFields.length > 0) {
      logger.error(`Missing required fields in annuity planning request: ${missingFields.join(', ')}`);
      return res.status(400).json({
        status: 'error',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }
    
    logger.info(`Starting annuity planning for ${client_info.name} in ${state}`);
    
    const planningResult = await medicaidAnnuityPlanning(client_info, assets, income || {}, eligibility_status || {}, state);
    
    if (planningResult.status === 'error') {
      logger.error(`Annuity planning failed: ${planningResult.error}`);
      return res.status(400).json(planningResult);
    }
    
    // Ensure consistent response format
    return res.status(200).json(formatResponse(planningResult));
  } catch (error) {
    logger.error(`Annuity Planning Error: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.divestmentPlanning = async (req, res) => {
  try {
    const { client_info, assets, past_transfers, state } = req.body;
    
    const missingFields = [];
    if (!client_info) missingFields.push('client_info');
    if (!assets || Object.keys(assets).length === 0) missingFields.push('assets');
    if (!state) missingFields.push('state');
    
    if (missingFields.length > 0) {
      logger.error(`Missing required fields in divestment planning request: ${missingFields.join(', ')}`);
      return res.status(400).json({
        status: 'error',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }
    
    logger.info(`Starting divestment planning for ${client_info.name} in ${state}`);
    
    const planningResult = await medicaidDivestmentPlanning(client_info, assets, past_transfers || [], state);
    
    if (planningResult.status === 'error') {
      logger.error(`Divestment planning failed: ${planningResult.error}`);
      return res.status(400).json(planningResult);
    }
    
    // Ensure consistent response format
    return res.status(200).json(formatResponse(planningResult));
  } catch (error) {
    logger.error(`Divestment Planning Error: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.carePlanning = async (req, res) => {
  try {
    const { client_info, medical_info, living_info, state } = req.body;
    
    const missingFields = [];
    if (!client_info) missingFields.push('client_info');
    if (!medical_info) missingFields.push('medical_info');
    if (!living_info) missingFields.push('living_info');
    if (!state) missingFields.push('state');
    
    if (missingFields.length > 0) {
      logger.error(`Missing required fields in care planning request: ${missingFields.join(', ')}`);
      return res.status(400).json({
        status: 'error',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }
    
    logger.info(`Starting care planning for ${client_info.name} in ${state}`);
    
    const planningResult = await medicaidCarePlanning(client_info, medical_info, living_info, state);
    
    if (planningResult.status === 'error') {
      logger.error(`Care planning failed: ${planningResult.error}`);
      return res.status(400).json(planningResult);
    }
    
    // Ensure consistent response format
    return res.status(200).json(formatResponse(planningResult));
  } catch (error) {
    logger.error(`Care Planning Error: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};