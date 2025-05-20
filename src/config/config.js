// config.js
require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3001,
  logLevel: process.env.LOG_LEVEL || 'debug',
  corsOrigin: process.env.CORS_ORIGIN || ['http://localhost:8080', 'https://05cc14f2-4909-4c06-9af5-7bc54650b4a7.lovableproject.com',],
  dataPath: process.env.DATA_PATH || './src/data'
};