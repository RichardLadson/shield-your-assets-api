// src/server.js
require('dotenv').config();
const app = require('./app');
const logger = require('./config/logger');
const config = require('./config/config');

// Environment variable validation
function validateEnvironment() {
  const requiredVars = [
    'DB_HOST',
    'DB_PORT', 
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
  
  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logger.error('JWT_SECRET must be at least 32 characters long for security');
    console.error('❌ JWT_SECRET too short - must be at least 32 characters');
    process.exit(1);
  }
  
  // Validate optional but recommended variables for production
  const productionRecommended = ['CORS_ORIGIN', 'AWS_REGION', 'APP_URL'];
  const missingProdRecommended = productionRecommended.filter(varName => !process.env[varName]);
  
  if (process.env.NODE_ENV === 'production' && missingProdRecommended.length > 0) {
    logger.warn(`Production-recommended environment variables not set: ${missingProdRecommended.join(', ')}`);
    console.warn(`⚠️  Production-recommended variables missing: ${missingProdRecommended.join(', ')}`);
  }
  
  // Validate optional integration variables
  const optionalVars = ['GHL_CLIENT_ID', 'GHL_CLIENT_SECRET', 'DEFAULT_PLANNER_ID'];
  const missingOptional = optionalVars.filter(varName => !process.env[varName]);
  
  if (missingOptional.length > 0) {
    logger.info(`Optional integration variables not set: ${missingOptional.join(', ')}`);
  }
  
  console.log('✅ Environment validation passed');
  logger.info('Environment validation completed successfully');
}

// Validate environment variables before starting
validateEnvironment();

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