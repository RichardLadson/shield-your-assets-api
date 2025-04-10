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
 * Process comprehensive Medicaid planning
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function comprehensivePlanning(req, res) {
  try {
    logger.info('Received comprehensive planning request');
    
    const { clientInfo, assets, income, expenses, medicalInfo, livingInfo, state } = req.body;
    
    // Validate required fields
    if (!clientInfo || !assets || !income || !state) {
      logger.error('Missing required fields in comprehensive planning request');
      return res.status(400).json({
        error: 'Missing required fields: clientInfo, assets, income, and state are required',
        status: 'error'
      });
    }
    
    // Call the medicaidPlanning service
    const result = await medicaidPlanning(
      clientInfo, 
      assets, 
      income, 
      expenses || {}, 
      medicalInfo || {}, 
      livingInfo || {}, 
      state
    );
    
    logger.info('Comprehensive planning completed successfully');
    return res.status(200).json({
      message: 'Comprehensive planning completed successfully',
      planningType: 'comprehensive',
      clientName: clientInfo.name || 'Client',
      state,
      status: result.status,
      planningResults: result
    });
  } catch (error) {
    logger.error(`Error in comprehensivePlanning controller: ${error.message}`);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      status: 'error'
    });
  }
}

/**
 * Process asset planning
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function assetPlanning(req, res) {
  try {
    logger.info('Received asset planning request');
    
    const { clientInfo, assets, state } = req.body;
    
    // Validate required fields
    if (!clientInfo || !assets || !state) {
      logger.error('Missing required fields in asset planning request');
      return res.status(400).json({
        error: 'Missing required fields: clientInfo, assets, and state are required',
        status: 'error'
      });
    }
    
    // Call the asset planning service
    const result = await medicaidAssetPlanning(clientInfo, assets, state);
    
    logger.info('Asset planning completed successfully');
    return res.status(200).json({
      message: 'Asset planning completed successfully',
      planningType: 'asset',
      clientName: clientInfo.name || 'Client',
      state,
      status: result.status,
      planningResults: result
    });
  } catch (error) {
    logger.error(`Error in assetPlanning controller: ${error.message}`);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      status: 'error'
    });
  }
}

/**
 * Process income planning
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function incomePlanning(req, res) {
  try {
    logger.info('Received income planning request');
    
    const { clientInfo, income, expenses, state } = req.body;
    
    // Validate required fields
    if (!clientInfo || !income || !state) {
      logger.error('Missing required fields in income planning request');
      return res.status(400).json({
        error: 'Missing required fields: clientInfo, income, and state are required',
        status: 'error'
      });
    }
    
    // Call the income planning service
    const result = await medicaidIncomePlanning(clientInfo, income, expenses || {}, state);
    
    logger.info('Income planning completed successfully');
    return res.status(200).json({
      message: 'Income planning completed successfully',
      planningType: 'income',
      clientName: clientInfo.name || 'Client',
      state,
      status: result.status,
      planningResults: result
    });
  } catch (error) {
    logger.error(`Error in incomePlanning controller: ${error.message}`);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      status: 'error'
    });
  }
}

/**
 * Process trust planning
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function trustPlanning(req, res) {
  try {
    logger.info('Received trust planning request');
    
    const { clientInfo, assets, state } = req.body;
    
    // Validate required fields
    if (!clientInfo || !assets || !state) {
      logger.error('Missing required fields in trust planning request');
      return res.status(400).json({
        error: 'Missing required fields: clientInfo, assets, and state are required',
        status: 'error'
      });
    }
    
    // Call the trust planning service
    const result = await medicaidTrustPlanning(clientInfo, assets, state);
    
    logger.info('Trust planning completed successfully');
    return res.status(200).json({
      message: 'Trust planning completed successfully',
      planningType: 'trust',
      clientName: clientInfo.name || 'Client',
      state,
      status: result.status,
      planningResults: result
    });
  } catch (error) {
    logger.error(`Error in trustPlanning controller: ${error.message}`);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      status: 'error'
    });
  }
}

/**
 * Process annuity planning
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function annuityPlanning(req, res) {
  try {
    logger.info('Received annuity planning request');
    
    const { clientInfo, assets, state } = req.body;
    
    // Validate required fields
    if (!clientInfo || !assets || !state) {
      logger.error('Missing required fields in annuity planning request');
      return res.status(400).json({
        error: 'Missing required fields: clientInfo, assets, and state are required',
        status: 'error'
      });
    }
    
    // Call the annuity planning service
    const result = await medicaidAnnuityPlanning(clientInfo, assets, state);
    
    logger.info('Annuity planning completed successfully');
    return res.status(200).json({
      message: 'Annuity planning completed successfully',
      planningType: 'annuity',
      clientName: clientInfo.name || 'Client',
      state,
      status: result.status,
      planningResults: result
    });
  } catch (error) {
    logger.error(`Error in annuityPlanning controller: ${error.message}`);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      status: 'error'
    });
  }
}

/**
 * Process divestment planning
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function divestmentPlanning(req, res) {
  try {
    logger.info('Received divestment planning request');
    
    const { clientInfo, assets, state } = req.body;
    
    // Validate required fields
    if (!clientInfo || !assets || !state) {
      logger.error('Missing required fields in divestment planning request');
      return res.status(400).json({
        error: 'Missing required fields: clientInfo, assets, and state are required',
        status: 'error'
      });
    }
    
    // Call the divestment planning service
    const result = await medicaidDivestmentPlanning(clientInfo, assets, state);
    
    logger.info('Divestment planning completed successfully');
    return res.status(200).json({
      message: 'Divestment planning completed successfully',
      planningType: 'divestment',
      clientName: clientInfo.name || 'Client',
      state,
      status: result.status,
      planningResults: result
    });
  } catch (error) {
    logger.error(`Error in divestmentPlanning controller: ${error.message}`);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      status: 'error'
    });
  }
}

/**
 * Process care planning
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function carePlanning(req, res) {
  try {
    logger.info('Received care planning request');
    
    const { clientInfo, medicalInfo, livingInfo, state } = req.body;
    
    // Validate required fields
    if (!clientInfo || !medicalInfo || !livingInfo || !state) {
      logger.error('Missing required fields in care planning request');
      return res.status(400).json({
        error: 'Missing required fields: clientInfo, medicalInfo, livingInfo, and state are required',
        status: 'error'
      });
    }
    
    // Call the care planning service
    const result = await medicaidCarePlanning(clientInfo, medicalInfo, livingInfo, state);
    
    logger.info('Care planning completed successfully');
    return res.status(200).json({
      message: 'Care planning completed successfully',
      planningType: 'care',
      clientName: clientInfo.name || 'Client',
      state,
      status: result.status,
      planningResults: result
    });
  } catch (error) {
    logger.error(`Error in carePlanning controller: ${error.message}`);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      status: 'error'
    });
  }
}

module.exports = {
  comprehensivePlanning,
  assetPlanning,
  incomePlanning,
  trustPlanning,
  annuityPlanning,
  divestmentPlanning,
  carePlanning
};