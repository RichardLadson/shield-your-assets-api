const logger = require('../config/logger');
const { medicaidPlanning } = require('../services/planning/medicaidPlanning');
const { medicaidAssetPlanning } = require('../services/planning/assetPlanning');
const { medicaidIncomePlanning } = require('../services/planning/incomePlanning');
const { medicaidTrustPlanning } = require('../services/planning/trustPlanning');
const { medicaidAnnuityPlanning } = require('../services/planning/annuityPlanning');
const { medicaidDivestmentPlanning } = require('../services/planning/divestmentPlanning');
const { medicaidCarePlanning } = require('../services/planning/carePlanning');

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
      logger.error(`Missing required fields in comprehensive planning request: ${missingFields.join(', ')}`);
      return res.status(400).json({
        status: 'error',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }
    
    // Log the start of planning
    logger.info(`Starting comprehensive planning for ${clientInfo.name} in ${state}`);
    
    // Call the comprehensive planning function
    const planningResult = await medicaidPlanning(
      clientInfo, 
      assets, 
      income, 
      expenses || {}, 
      medicalInfo || {}, 
      livingInfo || {}, 
      state
    );
    
    if (planningResult.status === 'error') {
      logger.error(`Comprehensive planning failed: ${planningResult.error}`);
      return res.status(500).json({
        status: 'error',
        message: `Planning error: ${planningResult.error}`
      });
    }
    
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
    
    // Validate required fields
    const missingFields = [];
    if (!clientInfo) missingFields.push('clientInfo');
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
    
    logger.info(`Starting asset planning for ${clientInfo.name} in ${state}`);
    
    const planningResult = await medicaidAssetPlanning(clientInfo, assets, {}, {}, {}, state);
    
    if (planningResult.status === 'error') {
      logger.error(`Asset planning failed: ${planningResult.error}`);
      return res.status(500).json({
        status: 'error',
        message: `Planning error: ${planningResult.error}`
      });
    }
    
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

exports.incomePlanning = async (req, res) => {
  try {
    const { clientInfo, income, expenses, state } = req.body;
    
    const missingFields = [];
    if (!clientInfo) missingFields.push('clientInfo');
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
    
    logger.info(`Starting income planning for ${clientInfo.name} in ${state}`);
    
    const planningResult = await medicaidIncomePlanning(clientInfo, income, expenses || {}, state);
    
    if (planningResult.status === 'error') {
      logger.error(`Income planning failed: ${planningResult.error}`);
      return res.status(500).json({
        status: 'error',
        message: `Planning error: ${planningResult.error}`
      });
    }
    
    return res.json({
      status: 'success',
      data: planningResult
    });
  } catch (error) {
    logger.error(`Income Planning Error: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: `Server error: ${error.message}`
    });
  }
};

exports.trustPlanning = async (req, res) => {
  try {
    const { clientInfo, assets, income, eligibilityResults, state } = req.body;
    
    const missingFields = [];
    if (!clientInfo) missingFields.push('clientInfo');
    if (!assets || Object.keys(assets).length === 0) missingFields.push('assets');
    if (!income || Object.keys(income).length === 0) missingFields.push('income');
    if (!eligibilityResults) missingFields.push('eligibilityResults');
    if (!state) missingFields.push('state');
    
    if (missingFields.length > 0) {
      logger.error(`Missing required fields in trust planning request: ${missingFields.join(', ')}`);
      return res.status(400).json({
        status: 'error',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }
    
    logger.info(`Starting trust planning for ${clientInfo.name} in ${state}`);
    
    const planningResult = await medicaidTrustPlanning(clientInfo, assets, income, eligibilityResults, state);
    
    if (planningResult.status === 'error') {
      logger.error(`Trust planning failed: ${planningResult.error}`);
      return res.status(500).json({
        status: 'error',
        message: `Planning error: ${planningResult.error}`
      });
    }
    
    return res.json({
      status: 'success',
      data: planningResult
    });
  } catch (error) {
    logger.error(`Trust Planning Error: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: `Server error: ${error.message}`
    });
  }
};

exports.annuityPlanning = async (req, res) => {
  try {
    const { clientInfo, assets, income, eligibilityStatus, state } = req.body;
    
    const missingFields = [];
    if (!clientInfo) missingFields.push('clientInfo');
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
    
    logger.info(`Starting annuity planning for ${clientInfo.name} in ${state}`);
    
    const planningResult = await medicaidAnnuityPlanning(clientInfo, assets, income || {}, eligibilityStatus || {}, state);
    
    if (planningResult.status === 'error') {
      logger.error(`Annuity planning failed: ${planningResult.error}`);
      return res.status(500).json({
        status: 'error',
        message: `Planning error: ${planningResult.error}`
      });
    }
    
    return res.json({
      status: 'success',
      data: planningResult
    });
  } catch (error) {
    logger.error(`Annuity Planning Error: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: `Server error: ${error.message}`
    });
  }
};

exports.divestmentPlanning = async (req, res) => {
  try {
    const { clientInfo, assets, pastTransfers, state } = req.body;
    
    const missingFields = [];
    if (!clientInfo) missingFields.push('clientInfo');
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
    
    logger.info(`Starting divestment planning for ${clientInfo.name} in ${state}`);
    
    const planningResult = await medicaidDivestmentPlanning(clientInfo, assets, pastTransfers || [], state);
    
    if (planningResult.status === 'error') {
      logger.error(`Divestment planning failed: ${planningResult.error}`);
      return res.status(500).json({
        status: 'error',
        message: `Planning error: ${planningResult.error}`
      });
    }
    
    return res.json({
      status: 'success',
      data: planningResult
    });
  } catch (error) {
    logger.error(`Divestment Planning Error: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: `Server error: ${error.message}`
    });
  }
};

exports.carePlanning = async (req, res) => {
  try {
    const { clientInfo, medicalInfo, livingInfo, state } = req.body;
    
    const missingFields = [];
    if (!clientInfo) missingFields.push('clientInfo');
    if (!medicalInfo) missingFields.push('medicalInfo');
    if (!livingInfo) missingFields.push('livingInfo');
    if (!state) missingFields.push('state');
    
    if (missingFields.length > 0) {
      logger.error(`Missing required fields in care planning request: ${missingFields.join(', ')}`);
      return res.status(400).json({
        status: 'error',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }
    
    logger.info(`Starting care planning for ${clientInfo.name} in ${state}`);
    
    const planningResult = await medicaidCarePlanning(clientInfo, medicalInfo, livingInfo, state);
    
    if (planningResult.status === 'error') {
      logger.error(`Care planning failed: ${planningResult.error}`);
      return res.status(500).json({
        status: 'error',
        message: `Planning error: ${planningResult.error}`
      });
    }
    
    return res.json({
      status: 'success',
      data: planningResult
    });
  } catch (error) {
    logger.error(`Care Planning Error: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: `Server error: ${error.message}`
    });
  }
};