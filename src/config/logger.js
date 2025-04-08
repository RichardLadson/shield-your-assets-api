
  // src/config/logger.js
const winston = require('winston');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console output
    new winston.transports.Console(),
    // File output - error logs
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    // File output - combined logs
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// If in development, log to console with colors
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;