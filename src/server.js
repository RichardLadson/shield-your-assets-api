// src/server.js
require('dotenv').config();
const app = require('./app');
const logger = require('./config/logger');
const config = require('./config/config');

// Add debugging for startup
console.log('🚀 Starting server...');
console.log('📍 Current directory:', process.cwd());
console.log('🔧 Node version:', process.version);
console.log('🔧 Environment:', process.env.NODE_ENV || 'development');

// Log the CORS configuration at startup
logger.info(`CORS configuration: ${JSON.stringify(config.corsOrigin)}`);

// Handle uncaught exceptions to prevent server crash
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
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
  console.error('💥 Unhandled Promise Rejection:', reason);
  logger.error('Unhandled Promise Rejection:', reason);
});

// Add exit handler to understand why process is exiting
process.on('exit', (code) => {
  console.log(`🛑 Process exit event fired with code: ${code}`);
  logger.info(`Process exiting with code: ${code}`);
});

// Keep track of server state
let serverStarted = false;

// Start server
try {
  const server = app.listen(config.port, () => {
    serverStarted = true;
    console.log(`✅ Server successfully started on port ${config.port}`);
    logger.info(`Server running on port ${config.port}`);
    logger.info(`Environment: ${config.env}`);
    logger.info(`Server started at: ${new Date().toISOString()}`);
    
    // Keep the process alive
    if (process.env.NODE_ENV !== 'test') {
      console.log('🏃 Server is running and listening for requests...');
    }
  });

  // Handle server errors
  server.on('error', (error) => {
    console.error('💥 Server error:', error);
    logger.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${config.port} is already in use`);
      process.exit(1);
    }
  });

  // Graceful shutdown on SIGTERM or SIGINT
  ['SIGTERM', 'SIGINT'].forEach(signal => {
    process.on(signal, () => {
      console.log(`📡 ${signal} received. Shutting down gracefully.`);
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
  
} catch (error) {
  console.error('💥 Failed to start server:', error);
  logger.error('Failed to start server:', error);
  process.exit(1);
}

// Keep process alive - prevent immediate exit
if (process.env.NODE_ENV !== 'test') {
  // This prevents the process from exiting when there are no more tasks
  process.stdin.resume();
}

// Log that we've reached the end of server.js
console.log('📄 server.js loaded completely');

module.exports = app;