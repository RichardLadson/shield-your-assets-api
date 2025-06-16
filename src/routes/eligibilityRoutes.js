// src/routes/eligibilityRoutes.js
const express = require('express');
const router = express.Router();
const eligibilityController = require('../controllers/eligibilityController');

// POST route for eligibility assessment
router.post('/assess', eligibilityController.assessEligibility);

// POST route for enhanced eligibility report
router.post('/enhanced-report', eligibilityController.generateEnhancedReport);

// GET route for state-specific rules
router.get('/rules/:state', eligibilityController.getStateMedicaidRules);

module.exports = router;

// src/routes/planningRoutes.js

const planningController = require('../controllers/planningController');

// POST route for comprehensive planning
router.post('/comprehensive', planningController.comprehensivePlanning);

// POST routes for individual planning modules
router.post('/asset', planningController.assetPlanning);
router.post('/income', planningController.incomePlanning);
router.post('/trust', planningController.trustPlanning);
// Add other planning routes...

module.exports = router;

// src/routes/reportRoutes.js

const reportController = require('../controllers/reportController');

// POST route for generating reports
router.post('/generate', reportController.generateReport);

// GET route for downloading reports
router.get('/download/:reportId', reportController.downloadReport);

module.exports = router;