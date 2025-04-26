// src/services/validation/inputValidation.js
const Joi = require('joi');
const logger = require('../../config/logger');
const { normalizeStateKey, loadMedicaidRules } = require('../utils/medicaidRulesLoader');
const { ValidationError, StateNotFoundError } = require('./validationErrors');

// Client info validation schema
const clientInfoSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'any.required': 'Name is required',
    'string.empty': 'Name cannot be empty'
  }),
  age: Joi.number().min(0).required().messages({
    'any.required': 'Age is required',
    'number.base': 'Age must be a number',
    'number.min': 'Age must be a positive number'
  }),
  maritalStatus: Joi.string().valid('single', 'married', 'divorced', 'widowed', 'separated').required().messages({
    'any.required': 'Marital status is required',
    'any.only': 'Marital status must be one of: single, married, divorced, widowed, separated'
  }),
  healthStatus: Joi.string().valid('good', 'fair', 'declining', 'critical').optional().messages({
    'any.only': 'Health status must be one of: good, fair, declining, critical'
  })
}).unknown(true); // Allow additional fields

// Assets validation schema
const assetsSchema = Joi.object().pattern(
  Joi.string(),
  Joi.number().min(0)
).min(1).messages({
  'object.min': 'At least one asset must be provided',
  'number.min': 'Asset values must be positive numbers'
});

// Income validation schema
const incomeSchema = Joi.object().pattern(
  Joi.string(),
  Joi.number().min(0)
).min(1).messages({
  'object.min': 'At least one income source must be provided',
  'number.min': 'Income values must be positive numbers'
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
    logger.debug('Validating client information');

    if (!clientInfo) {
      throw new ValidationError('Client information is required');
    }

    // Normalize field names to camelCase
    const normalizedClientInfo = {};
    for (const [key, value] of Object.entries(clientInfo)) {
      const camelKey = key.replace(/[-_\s](.)/g, (_, c) => c.toUpperCase());
      normalizedClientInfo[camelKey] = value;
    }

    // Normalize specific fields
    if (normalizedClientInfo.maritalStatus) {
      normalizedClientInfo.maritalStatus = normalizedClientInfo.maritalStatus.toLowerCase().trim();
    }
    if (normalizedClientInfo.healthStatus) {
      normalizedClientInfo.healthStatus = normalizedClientInfo.healthStatus.toLowerCase().trim();
    }

    // Validate with Joi
    const { error, value } = clientInfoSchema.validate(normalizedClientInfo, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join('; ');
      logger.error(`Client info validation error: ${errorMessage}`);
      throw new ValidationError(`Invalid client info: ${errorMessage}`);
    }

    // Warn for unusual values
    if (value.age > 120) {
      logger.warn(`Client age ${value.age} seems unusually high, verify accuracy`);
    }
    const hasSpouseInfo = Object.keys(normalizedClientInfo).some(key => key.startsWith('spouse'));
    if (hasSpouseInfo && value.maritalStatus !== 'married') {
      logger.warn(`Client has spouse information but marital status is ${value.maritalStatus}`);
    }
    if (normalizedClientInfo.isCrisis && value.healthStatus === 'good') {
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
    logger.debug('Validating assets');

    if (!assets) {
      throw new ValidationError('Assets are required');
    }

    // Normalize asset keys to snake_case
    const normalizedAssets = {};
    for (const [key, value] of Object.entries(assets)) {
      const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
      let normalizedValue = value;
      if (typeof value === 'string') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          normalizedValue = numValue;
        }
      }
      normalizedAssets[normalizedKey] = normalizedValue;
    }

    // Validate with Joi
    const { error, value } = assetsSchema.validate(normalizedAssets, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join('; ');
      logger.error(`Assets validation error: ${errorMessage}`);
      throw new ValidationError(`Invalid assets: ${errorMessage}`);
    }

    // Warn for unusually high values
    const totalAssets = Object.values(value).reduce((sum, val) => sum + val, 0);
    if (totalAssets > 10000000) {
      logger.warn(`Total assets value (${totalAssets}) is unusually high, verify accuracy`);
    }
    if (value.home && value.home > 5000000) {
      logger.warn(`Home value (${value.home}) is unusually high, verify accuracy`);
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
    logger.debug('Validating income');

    if (!income) {
      throw new ValidationError('Income is required');
    }

    // Normalize income keys to snake_case
    const normalizedIncome = {};
    for (const [key, value] of Object.entries(income)) {
      const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
      let normalizedValue = value;
      if (typeof value === 'string') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          normalizedValue = numValue;
        }
      }
      normalizedIncome[normalizedKey] = normalizedValue;
    }

    // Validate with Joi
    const { error, value } = incomeSchema.validate(normalizedIncome, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join('; ');
      logger.error(`Income validation error: ${errorMessage}`);
      throw new ValidationError(`Invalid income: ${errorMessage}`);
    }

    // Warn for unusually high values
    const totalIncome = Object.values(value).reduce((sum, val) => sum + val, 0);
    if (totalIncome > 50000) {
      logger.warn(`Total monthly income (${totalIncome}) is unusually high, verify accuracy`);
    }
    if (value.social_security && value.social_security > 4000) {
      logger.warn(`Social Security income (${value.social_security}) is unusually high, verify accuracy`);
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