// src/controllers/planningController.js
const logger = require('../config/logger');
const planningService = require('../services/planning/planningService');

exports.comprehensivePlanning = async (req, res) => {
  try {
    const { clientInfo, assets, income, expenses, medicalInfo, livingInfo, state } = req.body;
    
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
      logger.error(`Missing required fields in clientInfo: ${missingFields.join(', ')}`);
      return res.status(400).json({
        status: 'error',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields: missingFields
      });
    }
    
    // Continue with processing
    const planningResult = await planningService.comprehensivePlan(
      clientInfo, 
      assets, 
      income, 
      expenses || {}, 
      medicalInfo || {}, 
      livingInfo || {}, 
      state
    );
    
    return res.json({
      status: 'success',
      data: planningResult
    });
  } catch (error) {
    logger.error(`Comprehensive Planning Error: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: `Server error: ${error.message}`
    });
  }
};

exports.assetPlanning = async (req, res) => {
  try {
    const { clientInfo, assets, state } = req.body;
    
    if (!clientInfo || !assets || !state) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields',
        missingFields: ['clientInfo', 'assets', 'state'].filter(field => !req.body[field])
      });
    }
    
    const planningResult = await planningService.assetPlan(clientInfo, assets, state);
    
    return res.json({
      status: 'success',
      data: planningResult
    });
  } catch (error) {
    logger.error(`Asset Planning Error: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: `Server error: ${error.message}`
    });
  }
};

// Add similar error handling to other planning methods
exports.incomePlanning = async (req, res) => {
  // Similar implementation with detailed error handling
};

exports.trustPlanning = async (req, res) => {
  // Similar implementation with detailed error handling
};

exports.annuityPlanning = async (req, res) => {
  // Similar implementation with detailed error handling
};

exports.divestmentPlanning = async (req, res) => {
  // Similar implementation with detailed error handling
};

exports.carePlanning = async (req, res) => {
  // Similar implementation with detailed error handling
};