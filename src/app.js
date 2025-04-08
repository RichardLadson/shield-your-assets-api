// src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./config/logger');
const config = require('./config/config');

// Initialize express app
const app = express();

// Apply middleware
app.use(cors({
  origin: config.corsOrigin
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Root route for API health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Shield Your Assets API is running',
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.env
  });
});

// API Routes will be added here

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  logger.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.env === 'development' ? err.message : 'Something went wrong',
    status: 'error'
  });
});

// Update in src/app.js

// Add this line to the routes section:
app.use('/api/eligibility', require('./routes/eligibilityRoutes'));
app.use('/api/planning', require('./routes/planningRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

module.exports = app;