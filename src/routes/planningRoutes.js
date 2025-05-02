// src/routes/planningRoutes.js
const express = require('express');
const router = express.Router();
const planningController = require('../controllers/planningController');
const communitySpousePlanning = require('../services/planning/communitySpousePlanning');
const postEligibilityPlanning = require('../services/planning/postEligibilityPlanning');
const eligibilityAssessment = require('../services/planning/eligibilityAssessment');
const reportGenerator = require('../services/reporting/reportGenerator');

// POST route for comprehensive planning
router.post('/comprehensive', planningController.comprehensivePlanning);

// POST routes for individual planning modules
router.post('/asset', planningController.assetPlanning);
router.post('/income', planningController.incomePlanning);
router.post('/trust', planningController.trustPlanning);
router.post('/annuity', planningController.annuityPlanning);
router.post('/divestment', planningController.divestmentPlanning);
router.post('/care', planningController.carePlanning);

// POST route for eligibility assessment
router.post('/eligibility', async (req, res) => {
  try {
    const { clientInfo, assets, income, state, maritalStatus } = req.body;
    
    if (!assets || !income || !state) {
      return res.status(400).json({
        error: 'Missing required fields',
        status: 'error'
      });
    }
    
    const result = await eligibilityAssessment.medicaidEligibilityAssessment(
      clientInfo || {}, assets, income, state, maritalStatus || (clientInfo ? clientInfo.maritalStatus : 'single')
    );
    
    return res.json(result);
  } catch (error) {
    console.error(`Eligibility Assessment Error: ${error.message}`);
    return res.status(500).json({
      error: `Server error: ${error.message}`,
      status: 'error'
    });
  }
});

// POST route for community spouse planning
router.post('/community-spouse', async (req, res) => {
  try {
    const { clientInfo, assets, income, expenses, state } = req.body;
    
    if (!clientInfo || !assets || !state) {
      return res.status(400).json({
        error: 'Missing required fields',
        status: 'error'
      });
    }
    
    const result = await communitySpousePlanning.medicaidCommunitySpousePlanning(
      clientInfo, assets, income || {}, expenses || {}, state
    );
    
    return res.json(result);
  } catch (error) {
    console.error(`Community Spouse Planning Error: ${error.message}`);
    return res.status(500).json({
      error: `Server error: ${error.message}`,
      status: 'error'
    });
  }
});

// POST route for post-eligibility planning
router.post('/post-eligibility', async (req, res) => {
  try {
    const { clientInfo, assets, income, state, maritalStatus } = req.body;
    
    if (!clientInfo || !assets || !income || !state) {
      return res.status(400).json({
        error: 'Missing required fields',
        status: 'error'
      });
    }
    
    const result = await postEligibilityPlanning.medicaidPostEligibilityPlanning(
      clientInfo, assets, income, state, maritalStatus || clientInfo.maritalStatus
    );
    
    return res.json(result);
  } catch (error) {
    console.error(`Post-Eligibility Planning Error: ${error.message}`);
    return res.status(500).json({
      error: `Server error: ${error.message}`,
      status: 'error'
    });
  }
});

// POST route for report generation
router.post('/report', async (req, res) => {
  try {
    const { planningResults, clientInfo, state, reportType, outputFormat } = req.body;
    
    if (!planningResults || !clientInfo || !state) {
      return res.status(400).json({
        error: 'Missing required fields',
        status: 'error'
      });
    }
    
    // Create report generator instance
    const generator = new reportGenerator(planningResults, clientInfo, state);
    
    // Generate report based on type
    let report = '';
    if (reportType === 'detailed') {
      report = generator.generateDetailedReport(outputFormat || 'markdown');
    } else if (reportType === 'client-friendly') {
      report = generator.generateClientFriendlyReport(outputFormat || 'markdown');
    } else {
      // Default to summary report
      report = generator.generateSummaryReport(outputFormat || 'markdown');
    }
    
    return res.json({
      status: 'success',
      report,
      reportType: reportType || 'summary',
      outputFormat: outputFormat || 'markdown'
    });
  } catch (error) {
    console.error(`Report Generation Error: ${error.message}`);
    return res.status(500).json({
      error: `Server error: ${error.message}`,
      status: 'error'
    });
  }
});

module.exports = router;