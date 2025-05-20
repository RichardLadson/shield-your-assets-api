// src/server.js
require('dotenv').config();
const app = require('./app');
const logger = require('./config/logger');
const config = require('./config/config');

// Log the CORS configuration at startup
logger.info(`CORS configuration: ${JSON.stringify(config.corsOrigin)}`);

// Handle uncaught exceptions to prevent server crash
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  logger.error(error.stack);
  
  // Graceful shutdown in case of critical errors
  if (error.message.includes('EADDRINUSE')) {
    logger.error(`Port ${config.port} is already in use. Shutting down.`);
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

// Start server
const server = app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
  logger.info(`Environment: ${config.env}`);
  logger.info(`Server started at: ${new Date().toISOString()}`);
});

// Graceful shutdown on SIGTERM or SIGINT
['SIGTERM', 'SIGINT'].forEach(signal => {
  process.on(signal, () => {
    logger.info(`${signal} received. Shutting down gracefully.`);
    server.close(() => {
      logger.info('Server closed.');
      process.exit(0);
    });
    
    // Force shutdown after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  });
});