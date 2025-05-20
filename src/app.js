// src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./config/logger');
const config = require('./config/config');

// Initialize express app
const app = express();

// Set CORS headers to allow all origins for development
app.use((req, res, next) => {
  // Allow all origins for development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

// Continue with other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Create simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.env
  });
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

// API Routes
app.use('/api/eligibility', require('./routes/eligibilityRoutes'));
app.use('/api/planning', require('./routes/planningRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// 404 handler
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    error: 'Not Found',
    message: `The requested resource ${req.url} was not found`,
    status: 'error'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  logger.error(err.stack);
  
  // Send appropriate response based on environment
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: config.env === 'development' ? err.message : 'Something went wrong',
    status: 'error',
    details: config.env === 'development' ? err.details : undefined
  });
});

module.exports = app;