// src/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// POST route for generating reports
router.post('/generate', reportController.generateReport);

// GET route for downloading reports
router.get('/download/:reportId', reportController.downloadReport);

// GET route for accessing reports by share token (for client self-service)
router.get('/shared/:token', reportController.getReportByToken);

module.exports = router;