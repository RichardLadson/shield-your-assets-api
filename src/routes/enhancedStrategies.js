// Enhanced Strategies API Routes
// Provides REST endpoints for the new enhanced strategy system

const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const {
  getAllEnhancedStrategies,
  getEnhancedStrategyById,
  getEnhancedStrategyByName,
  mapOldStrategiesToEnhanced,
  getStrategiesForAssessment,
  getStrategyCategories
} = require('../services/enhanced-strategies/enhancedStrategyService');

/**
 * GET /api/enhanced-strategies
 * Get all enhanced strategies with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      timing_category: req.query.timing_category,
      min_effectiveness: req.query.min_effectiveness ? parseInt(req.query.min_effectiveness) : undefined
    };
    
    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) delete filters[key];
    });
    
    const strategies = await getAllEnhancedStrategies(filters);
    
    res.json({
      success: true,
      count: strategies.length,
      filters: filters,
      data: strategies
    });
    
  } catch (error) {
    logger.error('Error in GET /enhanced-strategies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve enhanced strategies',
      message: error.message
    });
  }
});

/**
 * GET /api/enhanced-strategies/categories
 * Get strategy categories with counts
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await getStrategyCategories();
    
    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
    
  } catch (error) {
    logger.error('Error in GET /enhanced-strategies/categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve strategy categories',
      message: error.message
    });
  }
});

/**
 * GET /api/enhanced-strategies/:id
 * Get enhanced strategy by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid strategy ID',
        message: 'Strategy ID must be a number'
      });
    }
    
    const strategy = await getEnhancedStrategyById(id);
    
    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found',
        message: `No enhanced strategy found with ID ${id}`
      });
    }
    
    res.json({
      success: true,
      data: strategy
    });
    
  } catch (error) {
    logger.error(`Error in GET /enhanced-strategies/${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve enhanced strategy',
      message: error.message
    });
  }
});

/**
 * POST /api/enhanced-strategies/map-old
 * Map old strategy names to enhanced strategies
 */
router.post('/map-old', async (req, res) => {
  try {
    const { strategies } = req.body;
    
    if (!Array.isArray(strategies)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'strategies must be an array of strategy names'
      });
    }
    
    const enhancedStrategies = await mapOldStrategiesToEnhanced(strategies);
    
    res.json({
      success: true,
      input_count: strategies.length,
      mapped_count: enhancedStrategies.length,
      data: enhancedStrategies
    });
    
  } catch (error) {
    logger.error('Error in POST /enhanced-strategies/map-old:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to map strategies',
      message: error.message
    });
  }
});

/**
 * POST /api/enhanced-strategies/for-assessment
 * Get strategies for specific client assessment
 */
router.post('/for-assessment', async (req, res) => {
  try {
    const assessment = req.body;
    
    if (!assessment || typeof assessment !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid assessment',
        message: 'Assessment data is required'
      });
    }
    
    const strategies = await getStrategiesForAssessment(assessment);
    
    res.json({
      success: true,
      count: strategies.length,
      assessment_summary: {
        excess_resources: assessment.excessResources || 0,
        income_eligible: assessment.isIncomeEligible || false,
        marital_status: assessment.clientInfo?.maritalStatus || 'unknown',
        urgency: assessment.urgency || 'unknown'
      },
      data: strategies
    });
    
  } catch (error) {
    logger.error('Error in POST /enhanced-strategies/for-assessment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get assessment strategies',
      message: error.message
    });
  }
});

/**
 * GET /api/enhanced-strategies/search/:name
 * Search enhanced strategy by formal name
 */
router.get('/search/:name', async (req, res) => {
  try {
    const formalName = decodeURIComponent(req.params.name);
    
    const strategy = await getEnhancedStrategyByName(formalName);
    
    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found',
        message: `No enhanced strategy found with name: ${formalName}`
      });
    }
    
    res.json({
      success: true,
      data: strategy
    });
    
  } catch (error) {
    logger.error(`Error in GET /enhanced-strategies/search/${req.params.name}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to search enhanced strategy',
      message: error.message
    });
  }
});

/**
 * GET /api/enhanced-strategies/timing/:category
 * Get strategies by timing category
 */
router.get('/timing/:category', async (req, res) => {
  try {
    const timingCategory = req.params.category;
    
    const validCategories = ['immediate', 'short_term', 'long_term'];
    if (!validCategories.includes(timingCategory)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timing category',
        message: `Timing category must be one of: ${validCategories.join(', ')}`
      });
    }
    
    const strategies = await getAllEnhancedStrategies({ timing_category: timingCategory });
    
    res.json({
      success: true,
      timing_category: timingCategory,
      count: strategies.length,
      data: strategies
    });
    
  } catch (error) {
    logger.error(`Error in GET /enhanced-strategies/timing/${req.params.category}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve strategies by timing',
      message: error.message
    });
  }
});

module.exports = router;