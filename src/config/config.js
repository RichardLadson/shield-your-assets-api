// config.js
// Only load dotenv in development
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
  } catch (err) {
    // dotenv is not available - likely in production mode without dev dependencies
    console.log('dotenv not available in config.js - using environment variables directly');
  }
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3001,
  logLevel: process.env.LOG_LEVEL || 'debug',
  corsOrigin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:8080', 'https://d3btqqunljs3nt.cloudfront.net', 'https://eligibilityApp.nationalmedicaidplanning.com'],
  dataPath: process.env.DATA_PATH || './src/data'
};