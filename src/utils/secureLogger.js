// src/utils/secureLogger.js
const logger = require('../config/logger');

/**
 * List of sensitive field names that should never be logged
 */
const SENSITIVE_FIELDS = [
  // Personal Identifiers
  'name', 'first_name', 'last_name', 'full_name', 'client_name',
  'email', 'phone', 'phone_number', 'cell_phone', 'home_phone',
  'ssn', 'social_security_number', 'tax_id',
  
  // Addresses
  'address', 'street', 'street_address', 'home_address', 'mailing_address',
  'city', 'zip', 'zipcode', 'postal_code',
  
  // Financial Information
  'account_number', 'routing_number', 'bank_account',
  'credit_card', 'card_number',
  
  // Authentication
  'password', 'token', 'jwt', 'secret', 'key', 'api_key',
  'password_hash', 'salt',
  
  // Medical Information
  'diagnosis', 'medical_condition', 'disability', 'health_condition',
  'medication', 'doctor', 'physician', 'hospital',
  
  // Contact Information
  'emergency_contact', 'next_of_kin', 'spouse_name', 'contact_name'
];

/**
 * Sanitizes an object by removing or masking sensitive fields
 * @param {Object} obj - Object to sanitize
 * @param {Object} options - Sanitization options
 * @returns {Object} Sanitized object
 */
function sanitizeObject(obj, options = {}) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const { maskValue = '[REDACTED]', maxDepth = 3, currentDepth = 0 } = options;
  
  // Prevent infinite recursion
  if (currentDepth >= maxDepth) {
    return '[MAX_DEPTH_REACHED]';
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, { ...options, currentDepth: currentDepth + 1 }));
  }
  
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Check if field is sensitive
    const isSensitive = SENSITIVE_FIELDS.some(field => 
      lowerKey.includes(field) || field.includes(lowerKey)
    );
    
    if (isSensitive) {
      sanitized[key] = maskValue;
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, { ...options, currentDepth: currentDepth + 1 });
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Secure logger wrapper that automatically sanitizes data
 */
class SecureLogger {
  static info(message, data = null) {
    if (data) {
      const sanitizedData = sanitizeObject(data);
      logger.info(message, sanitizedData);
    } else {
      logger.info(message);
    }
  }
  
  static warn(message, data = null) {
    if (data) {
      const sanitizedData = sanitizeObject(data);
      logger.warn(message, sanitizedData);
    } else {
      logger.warn(message);
    }
  }
  
  static error(message, error = null) {
    if (error) {
      // For errors, log the message and stack but sanitize any attached data
      const sanitizedError = {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        code: error.code,
        status: error.status,
        // Sanitize any additional error properties
        ...sanitizeObject(error, { maskValue: '[ERROR_DATA_REDACTED]' })
      };
      logger.error(message, sanitizedError);
    } else {
      logger.error(message);
    }
  }
  
  static debug(message, data = null) {
    // Only log debug info in development
    if (process.env.NODE_ENV === 'development') {
      if (data) {
        const sanitizedData = sanitizeObject(data);
        logger.debug(message, sanitizedData);
      } else {
        logger.debug(message);
      }
    }
  }
  
  /**
   * Log request information safely
   * @param {Object} req - Express request object
   * @param {string} action - Action being performed
   */
  static logRequest(req, action) {
    const requestInfo = {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      // Only log non-sensitive headers
      contentType: req.get('Content-Type'),
      // Log body structure but not content
      bodyKeys: req.body ? Object.keys(req.body) : [],
      // Never log actual body content
    };
    
    this.info(`${action} - Request received`, requestInfo);
  }
  
  /**
   * Log API response safely
   * @param {Object} res - Express response object
   * @param {string} action - Action that was performed
   * @param {number} duration - Request duration in ms
   */
  static logResponse(action, statusCode, duration) {
    this.info(`${action} - Response sent`, {
      statusCode,
      duration: `${duration}ms`
    });
  }
}

module.exports = {
  SecureLogger,
  sanitizeObject,
  SENSITIVE_FIELDS
};