// src/services/validation/inputValidation.js
const Joi = require('joi');
const logger = require('../../config/logger');
const { normalizeStateKey, loadMedicaidRules } = require('../utils/medicaidRulesLoader');
const { ValidationError, StateNotFoundError } = require('./validationErrors');

// Configurable validation thresholds - can be overridden by environment variables
const VALIDATION_THRESHOLDS = {
  maxAge: parseInt(process.env.MAX_AGE_THRESHOLD) || 120,
  maxTotalAssets: parseInt(process.env.MAX_TOTAL_ASSETS_THRESHOLD) || 10000000,
  maxHomeValue: parseInt(process.env.MAX_HOME_VALUE_THRESHOLD) || 5000000,
  maxMonthlyIncome: parseInt(process.env.MAX_MONTHLY_INCOME_THRESHOLD) || 50000,
  maxSocialSecurityIncome: parseInt(process.env.MAX_SS_INCOME_THRESHOLD) || 4000
};

// Client info validation schema - using snake_case for consistency
const clientInfoSchema = Joi.object({
  // Support both full name and separate first/last names
  name: Joi.string().trim().optional().messages({
    'string.empty': 'Name cannot be empty'
  }),
  first_name: Joi.string().trim().optional().messages({
    'string.empty': 'First name cannot be empty'
  }),
  last_name: Joi.string().trim().optional().messages({
    'string.empty': 'Last name cannot be empty'
  }),
  email: Joi.string().email().required().messages({
    'any.required': 'Email is required',
    'string.email': 'Email must be a valid email address',
    'string.empty': 'Email cannot be empty'
  }),
  age: Joi.number().min(0).optional().messages({
    'number.base': 'Age must be a number',
    'number.min': 'Age must be a positive number'
  }),
  date_of_birth: Joi.date().iso().optional().messages({
    'date.format': 'Date of birth must be in YYYY-MM-DD format'
  }),
  marital_status: Joi.string().valid('single', 'married', 'divorced', 'widowed', 'separated').required().messages({
    'any.required': 'Marital status is required',
    'any.only': 'Marital status must be one of: single, married, divorced, widowed, separated'
  }),
  health_status: Joi.string().valid('good', 'fair', 'declining', 'critical').optional().messages({
    'any.only': 'Health status must be one of: good, fair, declining, critical'
  })
})
.or('age', 'date_of_birth').messages({
  'object.missing': 'Either age or date of birth is required'
})
.or('name', 'first_name').messages({
  'object.missing': 'Either full name or first name is required'
})
.unknown(true); // Allow additional fields

// Assets validation schema - allow strings that can be converted to numbers
const assetsSchema = Joi.object().pattern(
  Joi.string(),
  Joi.alternatives().try(
    Joi.number().min(0),
    Joi.string().pattern(/^\d+(\.\d+)?$/).messages({
      'string.pattern.base': 'Asset values must be valid numbers'
    })
  ).messages({
    'alternatives.match': 'Asset values must be numbers or numeric strings'
  })
).min(1).messages({
  'object.min': 'At least one asset must be provided'
});

// Income validation schema - allow strings that can be converted to numbers
const incomeSchema = Joi.object().pattern(
  Joi.string(),
  Joi.alternatives().try(
    Joi.number().min(0),
    Joi.string().pattern(/^\d+(\.\d+)?$/).messages({
      'string.pattern.base': 'Income values must be valid numbers'
    })
  ).messages({
    'alternatives.match': 'Income values must be numbers or numeric strings'
  })
).min(1).messages({
  'object.min': 'At least one income source must be provided'
});

// Expenses validation schema
const expensesSchema = Joi.object().pattern(
  Joi.string(),
  Joi.number().min(0)
).messages({
  'number.min': 'Expense values must be positive numbers'
});

// Home info validation schema
const homeInfoSchema = Joi.object({
  value: Joi.number().min(0).required().messages({
    'any.required': 'Home value is required',
    'number.base': 'Home value must be a number',
    'number.min': 'Home value must be a positive number'
  }),
  mortgage: Joi.number().min(0).max(Joi.ref('value')).default(0).messages({
    'number.base': 'Mortgage must be a number',
    'number.min': 'Mortgage must be a positive number',
    'number.max': 'Mortgage cannot exceed home value'
  })
});

/**
 * Normalize and validate client information
 * @param {Object} clientInfo - Client information to validate
 * @returns {Object} - Validation result with normalized data
 */
function validateClientInfo(clientInfo) {
  try {
    // Log validation without PII - only log field names for debugging
    const fieldNames = clientInfo ? Object.keys(clientInfo) : [];
    logger.debug(`Validating client information with fields: [${fieldNames.join(', ')}]`);

    if (!clientInfo) {
      throw new ValidationError('Client information is required');
    }

    // Normalize field names to snake_case for consistency
    const normalizedClientInfo = {};
    for (const [key, value] of Object.entries(clientInfo)) {
      const snakeKey = key.toLowerCase().replace(/[-\s]/g, '_');
      normalizedClientInfo[snakeKey] = value;
    }
    logger.debug(`Normalized field names: [${Object.keys(normalizedClientInfo).join(', ')}]`);

    // Normalize specific fields
    if (normalizedClientInfo.marital_status) {
      normalizedClientInfo.marital_status = normalizedClientInfo.marital_status.toLowerCase().trim();
    }
    if (normalizedClientInfo.health_status) {
      normalizedClientInfo.health_status = normalizedClientInfo.health_status.toLowerCase().trim();
    }

    // Validate with Joi
    const { error, value } = clientInfoSchema.validate(normalizedClientInfo, { abortEarly: false });
    // Log validation result without PII - only success/failure and error types
    if (error) {
      logger.debug(`Joi validation failed with ${error.details.length} errors`);
    } else {
      logger.debug('Joi validation successful');
    }
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join('; ');
      logger.error(`Client info validation error: ${errorMessage}`);
      throw new ValidationError(`Invalid client info: ${errorMessage}`);
    }

    // Warn for unusual values using configurable thresholds
    if (value.age > VALIDATION_THRESHOLDS.maxAge) {
      logger.warn(`Client age ${value.age} exceeds threshold (${VALIDATION_THRESHOLDS.maxAge}), verify accuracy`);
    }
    const hasSpouseInfo = Object.keys(normalizedClientInfo).some(key => key.startsWith('spouse'));
    if (hasSpouseInfo && value.marital_status !== 'married') {
      logger.warn(`Client has spouse information but marital status is ${value.marital_status}`);
    }
    if (normalizedClientInfo.is_crisis && value.health_status === 'good') {
      logger.warn('Client marked as crisis but health status is good, verify accuracy');
    }

    return {
      valid: true,
      message: '',
      normalizedData: value
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        valid: false,
        message: error.message,
        normalizedData: null
      };
    }
    logger.error(`Unexpected error validating client info: ${error.message}`);
    return {
      valid: false,
      message: `Error validating client info: ${error.message}`,
      normalizedData: null
    };
  }
}

/**
 * Validate assets data
 * @param {Object} assets - Assets to validate
 * @returns {Object} - Validation result with normalized data
 */
function validateAssets(assets) {
  try {
    // Log validation without sensitive values - only asset types
    const assetTypes = assets ? Object.keys(assets) : [];
    logger.debug(`Validating assets with types: [${assetTypes.join(', ')}]`);

    if (!assets) {
      throw new ValidationError('Assets are required');
    }

    // Normalize asset keys to snake_case
    const normalizedAssets = {};
    for (const [key, value] of Object.entries(assets)) {
      const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
      
      // Don't silently convert strings to numbers - let Joi validation handle type checking
      // This preserves user input and makes validation errors explicit
      normalizedAssets[normalizedKey] = value;
    }

    // Validate with Joi
    const { error, value } = assetsSchema.validate(normalizedAssets, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join('; ');
      logger.error(`Assets validation error: ${errorMessage}`);
      throw new ValidationError(`Invalid assets: ${errorMessage}`);
    }

    // After validation, explicitly convert string numbers to numbers
    const convertedAssets = {};
    for (const [key, val] of Object.entries(value)) {
      convertedAssets[key] = typeof val === 'string' ? parseFloat(val) : val;
    }

    // Warn for unusually high values using configurable thresholds
    const totalAssets = Object.values(convertedAssets).reduce((sum, val) => sum + val, 0);
    if (totalAssets > VALIDATION_THRESHOLDS.maxTotalAssets) {
      logger.warn(`Total assets value (${totalAssets}) exceeds threshold (${VALIDATION_THRESHOLDS.maxTotalAssets}), verify accuracy`);
    }
    if (convertedAssets.home && convertedAssets.home > VALIDATION_THRESHOLDS.maxHomeValue) {
      logger.warn(`Home value (${convertedAssets.home}) exceeds threshold (${VALIDATION_THRESHOLDS.maxHomeValue}), verify accuracy`);
    }

    return {
      valid: true,
      message: '',
      normalizedData: convertedAssets
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        valid: false,
        message: error.message,
        normalizedData: null
      };
    }
    logger.error(`Unexpected error validating assets: ${error.message}`);
    return {
      valid: false,
      message: `Error validating assets: ${error.message}`,
      normalizedData: null
    };
  }
}

/**
 * Validate income data
 * @param {Object} income - Income to validate
 * @returns {Object} - Validation result with normalized data
 */
function validateIncome(income) {
  try {
    // Log validation without sensitive values - only income types
    const incomeTypes = income ? Object.keys(income) : [];
    logger.debug(`Validating income with types: [${incomeTypes.join(', ')}]`);

    // Handle null, undefined, or empty income (make it optional)
    if (!income || Object.keys(income).length === 0) {
      logger.debug('Income is null, undefined, or empty; treating as valid');
      return {
        valid: true,
        message: '',
        normalizedData: {}
      };
    }

    // Normalize income keys to snake_case
    const normalizedIncome = {};
    for (const [key, value] of Object.entries(income)) {
      const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
      
      // Don't silently convert strings to numbers - let Joi validation handle type checking
      // This preserves user input and makes validation errors explicit
      normalizedIncome[normalizedKey] = value;
    }
    logger.debug(`Normalized income types: [${Object.keys(normalizedIncome).join(', ')}]`);

    // Validate with Joi
    const { error, value } = incomeSchema.validate(normalizedIncome, { abortEarly: false });
    if (error) {
      logger.debug(`Income validation failed with ${error.details.length} errors`);
    } else {
      logger.debug('Income validation successful');
    }
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join('; ');
      logger.error(`Income validation error: ${errorMessage}`);
      throw new ValidationError(`Invalid income: ${errorMessage}`);
    }

    // After validation, explicitly convert string numbers to numbers
    const convertedIncome = {};
    for (const [key, val] of Object.entries(value)) {
      convertedIncome[key] = typeof val === 'string' ? parseFloat(val) : val;
    }

    // Warn for unusually high values using configurable thresholds
    const totalIncome = Object.values(convertedIncome).reduce((sum, val) => sum + val, 0);
    if (totalIncome > VALIDATION_THRESHOLDS.maxMonthlyIncome) {
      logger.warn(`Total monthly income (${totalIncome}) exceeds threshold (${VALIDATION_THRESHOLDS.maxMonthlyIncome}), verify accuracy`);
    }
    if (convertedIncome.social_security && convertedIncome.social_security > VALIDATION_THRESHOLDS.maxSocialSecurityIncome) {
      logger.warn(`Social Security income (${convertedIncome.social_security}) exceeds threshold (${VALIDATION_THRESHOLDS.maxSocialSecurityIncome}), verify accuracy`);
    }

    return {
      valid: true,
      message: '',
      normalizedData: convertedIncome
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        valid: false,
        message: error.message,
        normalizedData: null
      };
    }
    logger.error(`Unexpected error validating income: ${error.message}`);
    return {
      valid: false,
      message: `Error validating income: ${error.message}`,
      normalizedData: null
    };
  }
}

/**
 * Validate expenses data
 * @param {Object} expenses - Expenses to validate
 * @returns {Object} - Validation result with normalized data
 */
function validateExpenses(expenses) {
  try {
    logger.debug('Validating expenses');

    // Handle missing or empty input (expenses can be empty)
    if (!expenses || Object.keys(expenses).length === 0) {
      return {
        valid: true,
        message: '',
        normalizedData: {}
      };
    }

    // Normalize expense keys to snake_case
    const normalizedExpenses = {};
    for (const [key, value] of Object.entries(expenses)) {
      const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
      let normalizedValue = value;
      if (typeof value === 'string') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          normalizedValue = numValue;
        }
      }
      normalizedExpenses[normalizedKey] = normalizedValue;
    }

    // Validate with Joi
    const { error, value } = expensesSchema.validate(normalizedExpenses, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join('; ');
      logger.error(`Expenses validation error: ${errorMessage}`);
      throw new ValidationError(`Invalid expenses: ${errorMessage}`);
    }

    // Warn for unusually high values
    if (Object.keys(value).length > 0) {
      const totalExpenses = Object.values(value).reduce((sum, val) => sum + val, 0);
      if (totalExpenses > 50000) {
        logger.warn(`Total monthly expenses (${totalExpenses}) is unusually high, verify accuracy`);
      }
    }

    return {
      valid: true,
      message: '',
      normalizedData: value
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        valid: false,
        message: error.message,
        normalizedData: null
      };
    }
    logger.error(`Unexpected error validating expenses: ${error.message}`);
    return {
      valid: false,
      message: `Error validating expenses: ${error.message}`,
      normalizedData: null
    };
  }
}

/**
 * Validate home information
 * @param {Object} homeInfo - Home information to validate
 * @returns {Object} - Validation result with normalized data
 */
function validateHomeInfo(homeInfo) {
  try {
    logger.debug('Validating home information');

    // Handle missing input (home info can be null)
    if (!homeInfo) {
      return {
        valid: true,
        message: '',
        normalizedData: null
      };
    }

    // Normalize home info
    const normalizedHomeInfo = {
      value: parseFloat(homeInfo.value) || 0,
      mortgage: parseFloat(homeInfo.mortgage) || 0
    };

    // Validate with Joi
    const { error, value } = homeInfoSchema.validate(normalizedHomeInfo, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join('; ');
      logger.error(`Home info validation error: ${errorMessage}`);
      throw new ValidationError(`Invalid home info: ${errorMessage}`);
    }

    // Warn for unusually high values
    if (value.value > 5000000) {
      logger.warn(`Home value (${value.value}) is unusually high, verify accuracy`);
    }

    return {
      valid: true,
      message: '',
      normalizedData: value
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        valid: false,
        message: error.message,
        normalizedData: null
      };
    }
    logger.error(`Unexpected error validating home info: ${error.message}`);
    return {
      valid: false,
      message: `Error validating home info: ${error.message}`,
      normalizedData: null
    };
  }
}

/**
 * Validate state against Medicaid rules
 * @param {string} state - State name or abbreviation
 * @returns {Promise<Object>} - Validation result with normalized state
 */
async function validateState(state) {
  try {
    logger.debug(`Validating state: ${state}`);

    if (!state || typeof state !== 'string') {
      throw new ValidationError('State is required and must be a string');
    }

    // Normalize the state
    const normalizedState = normalizeStateKey(state.trim());
    logger.debug(`Normalized state: ${normalizedState}`);

    // Load Medicaid rules for the normalized state
    const rulesData = await loadMedicaidRules(normalizedState);
    logger.debug(`Rules loaded for state: ${normalizedState}`);

    return {
      valid: true,
      message: '',
      normalizedData: normalizedState
    };
  } catch (error) {
    if (error.message.includes('Rules not found')) {
      logger.error(`State not found: ${state}`);
      return {
        valid: false,
        message: `State not found: ${state}`,
        normalizedData: null
      };
    }
    logger.error(`Unexpected error validating state: ${error.message}`);
    return {
      valid: false,
      message: `Error validating state: ${error.message}`,
      normalizedData: null
    };
  }
}

/**
 * Validate all inputs together
 * @param {Object} clientInfo - Client information
 * @param {Object} assets - Client assets
 * @param {Object} income - Client income
 * @param {Object} expenses - Client expenses
 * @param {Object} homeInfo - Home information
 * @param {string} state - State name or abbreviation
 * @returns {Promise<Object>} - Validation result with normalized data
 */
async function validateAllInputs(clientInfo, assets, income, expenses, homeInfo, state) {
  try {
    logger.info('Starting validation of all inputs');

    // Validate client info
    const clientResult = validateClientInfo(clientInfo);
    if (!clientResult.valid) {
      return clientResult;
    }

    // Validate assets
    const assetsResult = validateAssets(assets);
    if (!assetsResult.valid) {
      return assetsResult;
    }

    // Validate income
    const incomeResult = validateIncome(income);
    if (!incomeResult.valid) {
      return incomeResult;
    }

    // Validate expenses
    const expensesResult = validateExpenses(expenses);
    if (!expensesResult.valid) {
      return expensesResult;
    }

    // Validate home info
    const homeInfoResult = validateHomeInfo(homeInfo);
    if (!homeInfoResult.valid) {
      return homeInfoResult;
    }

    // Validate state
    const stateResult = await validateState(state);
    if (!stateResult.valid) {
      return stateResult;
    }

    logger.info('All inputs validated successfully');

    return {
      valid: true,
      message: 'All inputs are valid',
      normalizedData: {
        clientInfo: clientResult.normalizedData,
        assets: assetsResult.normalizedData,
        income: incomeResult.normalizedData,
        expenses: expensesResult.normalizedData,
        homeInfo: homeInfoResult.normalizedData,
        state: stateResult.normalizedData
      }
    };
  } catch (error) {
    logger.error(`Error in validateAllInputs: ${error.message}`);
    return {
      valid: false,
      message: `Validation error: ${error.message}`,
      normalizedData: null
    };
  }
}

module.exports = {
  validateClientInfo,
  validateAssets,
  validateIncome,
  validateExpenses,
  validateHomeInfo,
  validateState,
  validateAllInputs
};