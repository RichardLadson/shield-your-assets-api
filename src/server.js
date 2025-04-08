// src/server.js
require('dotenv').config();
const app = require('./app');
const logger = require('./config/logger');
const config = require('./config/config');

// Start server
app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
  logger.info(`Environment: ${config.env}`);
});