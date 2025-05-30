// src/middleware/inputSanitization.js
const xss = require('xss');
const { SecureLogger } = require('../utils/secureLogger');

/**
 * XSS protection configuration
 */
const xssOptions = {
  whiteList: {}, // Remove all HTML tags
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script'],
  css: false
};

/**
 * Recursively sanitize an object to prevent XSS attacks
 * @param {*} obj - Object to sanitize
 * @param {number} depth - Current recursion depth
 * @returns {*} Sanitized object
 */
function sanitizeObject(obj, depth = 0) {
  // Prevent infinite recursion
  if (depth > 10) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    // Remove potential XSS vectors
    return xss(obj, xssOptions);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize both key and value
      const cleanKey = xss(key, xssOptions);
      sanitized[cleanKey] = sanitizeObject(value, depth + 1);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Middleware to sanitize all request inputs
 */
function sanitizeInputs(req, res, next) {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    SecureLogger.error('Input sanitization failed', error);
    res.status(400).json({
      status: 'error',
      message: 'Invalid input format'
    });
  }
}

/**
 * Validate that required fields are present and non-empty
 * @param {Array} requiredFields - Array of required field names
 * @returns {Function} Express middleware function
 */
function validateRequiredFields(requiredFields) {
  return (req, res, next) => {
    const missing = [];
    
    for (const field of requiredFields) {
      // Support nested field checking with dot notation
      const value = field.split('.').reduce((obj, key) => obj?.[key], req.body);
      
      if (value === undefined || value === null || value === '') {
        missing.push(field);
      }
    }
    
    if (missing.length > 0) {
      SecureLogger.warn('Validation failed - missing required fields', { missing });
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields',
        missingFields: missing
      });
    }
    
    next();
  };
}

/**
 * Validate specific field formats
 */
const validators = {
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  phone: (phone) => {
    // Allow various phone formats
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
    return phoneRegex.test(cleanPhone);
  },
  
  zipCode: (zip) => {
    // US ZIP codes (5 digits or 5+4 format)
    const zipRegex = /^\d{5}(-\d{4})?$/;
    return zipRegex.test(zip);
  },
  
  currency: (amount) => {
    // Validate currency amounts
    const num = parseFloat(amount);
    return !isNaN(num) && num >= 0 && num <= 999999999;
  },
  
  state: (state) => {
    // Validate US state codes or names
    const stateCodes = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
    return stateCodes.includes(state.toUpperCase());
  }
};

/**
 * Middleware to validate specific field formats
 * @param {Object} fieldValidations - Object mapping field names to validation types
 * @returns {Function} Express middleware function
 */
function validateFieldFormats(fieldValidations) {
  return (req, res, next) => {
    const errors = [];
    
    for (const [fieldPath, validationType] of Object.entries(fieldValidations)) {
      const value = fieldPath.split('.').reduce((obj, key) => obj?.[key], req.body);
      
      if (value && validators[validationType]) {
        if (!validators[validationType](value)) {
          errors.push(`Invalid ${validationType} format for field: ${fieldPath}`);
        }
      }
    }
    
    if (errors.length > 0) {
      SecureLogger.warn('Field validation failed', { errors });
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    }
    
    next();
  };
}

module.exports = {
  sanitizeInputs,
  validateRequiredFields,
  validateFieldFormats,
  validators,
  sanitizeObject
};