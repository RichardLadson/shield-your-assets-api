// src/routes/planningRoutes.js
const express = require('express');
const router = express.Router();
const planningController = require('../controllers/planningController');
const communitySpousePlanning = require('../services/planning/communitySpousePlanning');
const postEligibilityPlanning = require('../services/planning/postEligibilityPlanning');
const eligibilityAssessment = require('../services/planning/eligibilityAssessment');
const reportGenerator = require('../services/reporting/reportGenerator');
const integrationController = require('../controllers/integrationController');

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

// GET route for testing GHL integration
router.get('/test-ghl-integration', async (_req, res) => {
  try {
    // Create test client data
    const testClientData = {
      id: 'test-' + Date.now(),
      firstName: 'Test',
      lastName: 'Client',
      email: 'test-' + Date.now() + '@example.com',
      phone: '555-123-4567',
      state: 'FL',
      maritalStatus: 'single',
      eligibilityStatus: 'pending'
    };

    const testReportData = {
      reportId: 'report-test-' + Date.now(),
      clientName: 'Test Client',
      assessmentDate: new Date().toISOString(),
      eligibilityStatus: 'eligible',
      totalAssets: 50000,
      estimatedSavings: 25000,
      strategies: ['Asset Protection Trust', 'Spend Down', 'Annuity Purchase'],
      keyRecommendations: 'Test recommendations for GHL integration',
      priorityLevel: 'high'
    };

    const testReportInfo = {
      reportId: testReportData.reportId,
      generatedDate: new Date().toISOString(),
      eligibilityStatus: 'eligible',
      reportUrl: 'https://example.com/reports/' + testReportData.reportId,
      keyFindings: 'Test key findings for integration',
      nextAction: 'Schedule consultation'
    };

    const testAssessmentData = {
      clientData: testClientData,
      reportData: testReportData,
      reportInfo: testReportInfo
    };

    // Log the test data
    console.log('Testing GHL integration with data:', JSON.stringify(testAssessmentData, null, 2));

    // Check if GHL is configured
    const isConfigured = !!(process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID);
    
    let integrationResults = null;
    let error = null;

    if (isConfigured) {
      try {
        // Attempt to sync with GHL
        integrationResults = await integrationController.handleAssessmentComplete(testAssessmentData);
      } catch (err) {
        error = {
          message: err.message,
          stack: err.stack,
          response: err.response?.data
        };
      }
    }

    // Return detailed results
    return res.json({
      status: 'test_complete',
      timestamp: new Date().toISOString(),
      configuration: {
        isConfigured,
        hasApiKey: !!process.env.GHL_API_KEY,
        hasLocationId: !!process.env.GHL_LOCATION_ID,
        baseUrl: process.env.GHL_BASE_URL || 'https://api.gohighlevel.com/v1',
        hasPipelineId: !!process.env.GHL_PIPELINE_ID,
        hasStageId: !!process.env.GHL_STAGE_ID,
        hasWebhookUrl: !!process.env.GHL_WEBHOOK_URL
      },
      testData: testAssessmentData,
      integrationResults,
      error,
      message: isConfigured 
        ? (error ? 'GHL integration test failed' : 'GHL integration test completed')
        : 'GHL integration not configured - set GHL_API_KEY and GHL_LOCATION_ID environment variables'
    });
  } catch (error) {
    console.error('Test GHL Integration Error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;