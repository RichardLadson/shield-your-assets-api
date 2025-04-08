// src/routes/planningRoutes.js
const express = require('express');
const router = express.Router();
const planningController = require('../controllers/planningController');

// POST route for comprehensive planning
router.post('/comprehensive', planningController.comprehensivePlanning);

// POST routes for individual planning modules
router.post('/asset', planningController.assetPlanning);
router.post('/income', planningController.incomePlanning);
router.post('/trust', planningController.trustPlanning);

module.exports = router;