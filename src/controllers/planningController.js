// src/controllers/planningController.js
const logger = require('../config/logger');
const { medicaidAssetPlanning } = require('../services/planning/assetPlanning');
const { medicaidIncomePlanning } = require('../services/planning/incomePlanning');

/**
 * Process comprehensive Medicaid planning
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function comprehensivePlanning(req, res) {
  try {
    logger.info('Received comprehensive planning request');
    
    const { clientInfo, assets, income, expenses, homeInfo, state } = req.body;
    
    // Validate required fields
    if (!clientInfo || !assets || !income || !state) {
      logger.error('Missing required fields in comprehensive planning request');
      return res.status(400).json({
        error: 'Missing required fields: clientInfo, assets, income, and state are required',
        status: 'error'
      });
    }
    
    // For now, return a placeholder response
    // This will be implemented fully in Phase 4
    return res.status(200).json({
      message: 'Comprehensive planning request received',
      planningType: 'comprehensive',
      clientName: clientInfo.name || 'Client',
      state,
      status: 'success',
      // Placeholder for actual planning results
      planningResults: {
        initialAssessment: {
          status: 'pending',
          message: 'Initial assessment will be performed'
        },
        planningModules: ['asset', 'income', 'trust', 'homestead'],
        completionStatus: 'pending'
      }
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
    
    // Optionally, call the asset planning service
    // const result = await medicaidAssetPlanning(clientInfo, assets, state);
    
    // Return placeholder response
    return res.status(200).json({
      message: 'Asset planning request received',
      planningType: 'asset',
      clientName: clientInfo.name || 'Client',
      state,
      status: 'success',
      // Placeholder for actual planning results
      planningResults: {
        totalAssets: Object.values(assets).reduce((sum, val) => sum + val, 0),
        countableAssets: Object.values(assets).reduce((sum, val) => sum + val, 0) - (assets.home || 0) - (assets.vehicle || 0),
        status: 'pending',
        strategies: [
          'Convert countable assets to non-countable assets',
          'Maximize homestead advantages',
          'Evaluate personal property exemptions'
        ]
      }
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
    
    // Optionally, call the income planning service
    // const result = await medicaidIncomePlanning(clientInfo, income, expenses, state);
    
    // Return placeholder response
    return res.status(200).json({
      message: 'Income planning request received',
      planningType: 'income',
      clientName: clientInfo.name || 'Client',
      state,
      status: 'success',
      // Placeholder for actual planning results
      planningResults: {
        totalIncome: Object.values(income).reduce((sum, val) => sum + val, 0),
        status: 'pending',
        strategies: [
          'Consider Qualified Income Trust (Miller Trust)',
          'Explore ways to increase allowable deductions'
        ]
      }
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
    
    const { clientInfo, assets, income, state } = req.body;
    
    // Validate required fields
    if (!clientInfo || !assets || !income || !state) {
      logger.error('Missing required fields in trust planning request');
      return res.status(400).json({
        error: 'Missing required fields: clientInfo, assets, income, and state are required',
        status: 'error'
      });
    }
    
    // Return placeholder response
    return res.status(200).json({
      message: 'Trust planning request received',
      planningType: 'trust',
      clientName: clientInfo.name || 'Client',
      state,
      status: 'success',
      // Placeholder for actual planning results
      planningResults: {
        status: 'pending',
        strategies: [
          'Consider Solely-for-the-Benefit-of-Spouse Trust',
          'Evaluate self-settled irrevocable trust options'
        ]
      }
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

module.exports = {
  comprehensivePlanning,
  assetPlanning,
  incomePlanning,
  trustPlanning
};
