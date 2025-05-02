const logger = require('../config/logger');
const { medicaidPlanning } = require('../services/planning/medicaidPlanning');
const { medicaidAssetPlanning } = require('../services/planning/assetPlanning');
const { medicaidIncomePlanning } = require('../services/planning/incomePlanning');
const { medicaidTrustPlanning } = require('../services/planning/trustPlanning');
const { medicaidAnnuityPlanning } = require('../services/planning/annuityPlanning');
const { medicaidDivestmentPlanning } = require('../services/planning/divestmentPlanning');
const { medicaidCarePlanning } = require('../services/planning/carePlanning');
const medicaidRulesLoader = require('../services/utils/medicaidRulesLoader');

/**
 * Process comprehensive Medicaid planning
 */
async function comprehensivePlanning(req, res) {
  try {
    logger.info('Received comprehensive planning request');
    logger.debug(`Raw request body: ${JSON.stringify(req.body, null, 2)}`);
    
    const { clientInfo, assets, income, expenses, medicalInfo, livingInfo, state } = req.body;
    
    if (!clientInfo || !assets || !income || !state || typeof state !== 'string' || state.trim() === '') {
      logger.error('Missing or invalid required fields in comprehensive planning request');
      return res.status(400).json({
        error: 'Missing or invalid required fields: clientInfo, assets, income, and state (non-empty string) are required',
        status: 'error'
      });
    }
    
    if (!clientInfo.name || !clientInfo.age || !clientInfo.maritalStatus) {
      logger.error('Missing required fields in clientInfo');
      return res.status(400).json({
        error: 'Missing required fields in clientInfo: name, age, and maritalStatus are required',
        status: 'error'
      });
    }
    
    try {
      await medicaidRulesLoader.loadMedicaidRules(state.toLowerCase());
    } catch (error) {
      logger.error(`Invalid state in comprehensive planning request: ${state}`);
      return res.status(400).json({
        error: `Invalid state: ${state}`,
        status: 'error'
      });
    }
    
    const result = await medicaidPlanning(
      clientInfo, 
      assets, 
      income, 
      expenses || {}, 
      medicalInfo || {}, 
      livingInfo || {}, 
      state
    );
    
    const message = result.status === 'success' 
      ? 'Comprehensive planning completed successfully' 
      : 'Comprehensive planning failed';
    
    logger.info(message);
    return res.status(result.status === 'success' ? 200 : 400).json({
      message,
      planningType: 'comprehensive',
      clientName: clientInfo.name || 'Client',
      state: state.toLowerCase(),
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
 */
async function assetPlanning(req, res) {
  try {
    logger.info('Received asset planning request');
    logger.debug(`Raw request body: ${JSON.stringify(req.body, null, 2)}`);
    
    const { clientInfo, assets, income, expenses, homeInfo, state } = req.body;
    
    if (!clientInfo || !assets || !state || typeof state !== 'string' || state.trim() === '') {
      logger.error('Missing or invalid required fields in asset planning request');
      return res.status(400).json({
        error: 'Missing or invalid required fields: clientInfo, assets, and state (non-empty string) are required',
        status: 'error'
      });
    }
    
    if (!clientInfo.name || !clientInfo.age || !clientInfo.maritalStatus) {
      logger.error('Missing required fields in clientInfo');
      return res.status(400).json({
        error: 'Missing required fields in clientInfo: name, age, and maritalStatus are required',
        status: 'error'
      });
    }
    
    try {
      await medicaidRulesLoader.loadMedicaidRules(state.toLowerCase());
    } catch (error) {
      logger.error(`Invalid state in asset planning request: ${state}`);
      return res.status(400).json({
        error: `Invalid state: ${state}`,
        status: 'error'
      });
    }
    
    const result = await medicaidAssetPlanning(
      clientInfo, 
      assets, 
      income || {}, 
      expenses || {}, 
      homeInfo || {}, 
      state
    );
    
    const message = result.status === 'success' 
      ? 'Asset planning completed successfully' 
      : 'Asset planning failed';
    
    logger.info(message);
    return res.status(result.status === 'success' ? 200 : 400).json({
      message,
      planningType: 'asset',
      clientName: clientInfo.name || 'Client',
      state: state.toLowerCase(),
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
 */
async function incomePlanning(req, res) {
  try {
    logger.info('Received income planning request');
    logger.debug(`Raw request body: ${JSON.stringify(req.body, null, 2)}`);
    
    const { clientInfo, income, expenses, state } = req.body;
    
    if (!clientInfo || !income || !state || typeof state !== 'string' || state.trim() === '') {
      logger.error('Missing or invalid required fields in income planning request');
      return res.status(400).json({
        error: 'Missing or invalid required fields: clientInfo, income, and state (non-empty string) are required',
        status: 'error'
      });
    }
    
    if (!clientInfo.name || !clientInfo.age || !clientInfo.maritalStatus) {
      logger.error('Missing required fields in clientInfo');
      return res.status(400).json({
        error: 'Missing required fields in clientInfo: name, age, and maritalStatus are required',
        status: 'error'
      });
    }
    
    try {
      await medicaidRulesLoader.loadMedicaidRules(state.toLowerCase());
    } catch (error) {
      logger.error(`Invalid state in income planning request: ${state}`);
      return res.status(400).json({
        error: `Invalid state: ${state}`,
        status: 'error'
      });
    }
    
    const result = await medicaidIncomePlanning(clientInfo, income, expenses || {}, state);
    
    const message = result.status === 'success' 
      ? 'Income planning completed successfully' 
      : 'Income planning failed';
    
    logger.info(message);
    return res.status(result.status === 'success' ? 200 : 400).json({
      message,
      planningType: 'income',
      clientName: clientInfo.name || 'Client',
      state: state.toLowerCase(),
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
 */
async function trustPlanning(req, res) {
  try {
    logger.info('Received trust planning request');
    logger.debug(`Raw request body: ${JSON.stringify(req.body, null, 2)}`);
    
    const { clientInfo, assets, income, eligibilityResults, state } = req.body;
    
    if (!clientInfo || !assets || !income || !eligibilityResults || !state || typeof state !== 'string' || state.trim() === '') {
      logger.error('Missing or invalid required fields in trust planning request');
      return res.status(400).json({
        error: 'Missing or invalid required fields: clientInfo, assets, income, eligibilityResults, and state (non-empty string) are required',
        status: 'error'
      });
    }
    
    if (!clientInfo.name || !clientInfo.age || !clientInfo.maritalStatus) {
      logger.error('Missing required fields in clientInfo');
      return res.status(400).json({
        error: 'Missing required fields in clientInfo: name, age, and maritalStatus are required',
        status: 'error'
      });
    }
    
    try {
      await medicaidRulesLoader.loadMedicaidRules(state.toLowerCase());
    } catch (error) {
      logger.error(`Invalid state in trust planning request: ${state}`);
      return res.status(400).json({
        error: `Invalid state: ${state}`,
        status: 'error'
      });
    }
    
    const result = await medicaidTrustPlanning(clientInfo, assets, income, eligibilityResults, state);
    
    const message = result.status === 'success' 
      ? 'Trust planning completed successfully' 
      : 'Trust planning failed';
    
    logger.info(message);
    return res.status(result.status === 'success' ? 200 : 400).json({
      message,
      planningType: 'trust',
      clientName: clientInfo.name || 'Client',
      state: state.toLowerCase(),
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
 */
async function annuityPlanning(req, res) {
  try {
    logger.info('Received annuity planning request');
    logger.debug(`Raw request body: ${JSON.stringify(req.body, null, 2)}`);
    
    const { clientInfo, assets, income, state } = req.body;
    
    // Validate required fields
    if (!clientInfo || !assets || !state || typeof state !== 'string' || state.trim() === '') {
      logger.error('Missing or invalid required fields in annuity planning request');
      return res.status(400).json({
        error: 'Missing or invalid required fields: clientInfo, assets, and state (non-empty string) are required',
        status: 'error'
      });
    }
    
    // Validate clientInfo fields
    if (!clientInfo.name || !clientInfo.age || !clientInfo.maritalStatus) {
      logger.error('Missing required fields in clientInfo');
      return res.status(400).json({
        error: 'Missing required fields in clientInfo: name, age, and maritalStatus are required',
        status: 'error'
      });
    }
    
    // Validate state against supported states
    try {
      await medicaidRulesLoader.loadMedicaidRules(state.toLowerCase());
    } catch (error) {
      logger.error(`Invalid state in annuity planning request: ${state}`);
      return res.status(400).json({
        error: `Invalid state: ${state}`,
        status: 'error'
      });
    }
    
    // Call the annuity planning service
    const result = await medicaidAnnuityPlanning(clientInfo, assets, income || {}, null, state);
    
    const message = result.status === 'success' 
      ? 'Annuity planning completed successfully' 
      : 'Annuity planning failed';
    
    logger.info(message);
    return res.status(result.status === 'success' ? 200 : 400).json({
      message,
      planningType: 'annuity',
      clientName: clientInfo.name || 'Client',
      state: state.toLowerCase(),
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
 */
async function divestmentPlanning(req, res) {
  try {
    logger.info('Received divestment planning request');
    logger.debug(`Raw request body: ${JSON.stringify(req.body, null, 2)}`);
    
    const { clientInfo, assets, pastTransfers, state } = req.body;
    
    if (!clientInfo || !assets || !state || typeof state !== 'string' || state.trim() === '') {
      logger.error('Missing or invalid required fields in divestment planning request');
      return res.status(400).json({
        error: 'Missing or invalid required fields: clientInfo, assets, and state (non-empty string) are required',
        status: 'error'
      });
    }
    
    if (!clientInfo.name || !clientInfo.age || !clientInfo.maritalStatus) {
      logger.error('Missing required fields in clientInfo');
      return res.status(400).json({
        error: 'Missing required fields in clientInfo: name, age, and maritalStatus are required',
        status: 'error'
      });
    }
    
    try {
      await medicaidRulesLoader.loadMedicaidRules(state.toLowerCase());
    } catch (error) {
      logger.error(`Invalid state in divestment planning request: ${state}`);
      return res.status(400).json({
        error: `Invalid state: ${state}`,
        status: 'error'
      });
    }
    
    const result = await medicaidDivestmentPlanning(clientInfo, assets, pastTransfers || [], state);
    
    const message = result.status === 'success' 
      ? 'Divestment planning completed successfully' 
      : 'Divestment planning failed';
    
    logger.info(message);
    return res.status(result.status === 'success' ? 200 : 400).json({
      message,
      planningType: 'divestment',
      clientName: clientInfo.name || 'Client',
      state: state.toLowerCase(),
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
 */
async function carePlanning(req, res) {
  try {
    logger.info('Received care planning request');
    logger.debug(`Raw request body: ${JSON.stringify(req.body, null, 2)}`);
    
    const { clientInfo, medicalInfo, livingInfo, state } = req.body;
    
    if (!clientInfo || !medicalInfo || !livingInfo || !state || typeof state !== 'string' || state.trim() === '') {
      logger.error('Missing or invalid required fields in care planning request');
      return res.status(400).json({
        error: 'Missing or invalid required fields: clientInfo, medicalInfo, livingInfo, and state (non-empty string) are required',
        status: 'error'
      });
    }
    
    if (!clientInfo.name || !clientInfo.age || !clientInfo.maritalStatus) {
      logger.error('Missing required fields in clientInfo');
      return res.status(400).json({
        error: 'Missing required fields in clientInfo: name, age, and maritalStatus are required',
        status: 'error'
      });
    }
    
    try {
      await medicaidRulesLoader.loadMedicaidRules(state.toLowerCase());
    } catch (error) {
      logger.error(`Invalid state in care planning request: ${state}`);
      return res.status(400).json({
        error: `Invalid state: ${state}`,
        status: 'error'
      });
    }
    
    const result = await medicaidCarePlanning(clientInfo, medicalInfo, livingInfo, state);
    
    const message = result.status === 'success' 
      ? 'Care planning completed successfully' 
      : 'Care planning failed';
    
    logger.info(message);
    return res.status(result.status === 'success' ? 200 : 400).json({
      message,
      planningType: 'care',
      clientName: clientInfo.name || 'Client',
      state: state.toLowerCase(),
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