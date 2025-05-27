// src/controllers/planningController.js
const logger = require('../config/logger');
const { medicaidPlanning } = require('../services/planning/medicaidPlanning');
const { medicaidAssetPlanning } = require('../services/planning/assetPlanning');
const { medicaidIncomePlanning } = require('../services/planning/incomePlanning');
const { medicaidTrustPlanning } = require('../services/planning/trustPlanning');
const { medicaidAnnuityPlanning } = require('../services/planning/annuityPlanning');
const { medicaidDivestmentPlanning } = require('../services/planning/divestmentPlanning');
const { medicaidCarePlanning } = require('../services/planning/carePlanning');

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
    // Add detailed debugging
    logger.info('📥 Planning controller received request');
    logger.info('📥 Request body keys:', Object.keys(req.body));
    logger.info('📥 Full request body: ' + JSON.stringify(req.body, null, 2));
    
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
      if (!client_info.name) missingFields.push('client_info.name');
      if (client_info.age === undefined) missingFields.push('client_info.age');
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
    
    // Log the start of planning
    logger.info(`Starting comprehensive planning for ${client_info.name} in ${state}`);
    
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