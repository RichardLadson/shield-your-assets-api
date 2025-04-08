// src/services/utils/medicaidRulesLoader.js
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../config/logger');
const config = require('../../config/config');

// Cache for rules data
let rulesCache = {
  data: null,
  lastLoaded: null,
  fileModified: null
};

/**
 * Load Medicaid eligibility rules from JSON file with caching
 * @param {string} jsonFilePath - Path to JSON file (optional)
 * @param {boolean} forceReload - Force reload from file
 * @returns {Promise<Object>} - Rules data object
 */
async function loadMedicaidRules(jsonFilePath = null, forceReload = false) {
  try {
    // Default path if not specified
    if (!jsonFilePath) {
      jsonFilePath = path.join(config.dataPath, 'medicaid_rules_2025.json');
    }

    // Check if file exists
    try {
      await fs.access(jsonFilePath);
    } catch (error) {
      logger.error(`Medicaid rules file not found: ${jsonFilePath}`);
      throw new Error(`Rules file not found: ${jsonFilePath}`);
    }

    // Get file stats for modified time
    const stats = await fs.stat(jsonFilePath);
    const currentModifiedTime = stats.mtimeMs;

    // Check if we can use cached data
    if (!forceReload && rulesCache.data && rulesCache.fileModified === currentModifiedTime) {
      logger.debug('Using cached Medicaid rules data');
      return rulesCache.data;
    }

    // Load JSON data
    logger.info(`Loading Medicaid rules from ${jsonFilePath}`);
    const fileContent = await fs.readFile(jsonFilePath, 'utf8');
    const rulesData = JSON.parse(fileContent);

    // Validate data structure
    if (typeof rulesData !== 'object') {
      throw new Error('Rules data must be a dictionary');
    }

    if (Object.keys(rulesData).length === 0) {
      throw new Error('Rules data is empty');
    }

    // Update cache
    rulesCache.data = rulesData;
    rulesCache.lastLoaded = new Date();
    rulesCache.fileModified = currentModifiedTime;

    logger.info(`Successfully loaded Medicaid rules for ${Object.keys(rulesData).length} states`);
    return rulesData;
  } catch (error) {
    if (error.name === 'SyntaxError') {
      logger.error(`Invalid JSON format in file ${jsonFilePath}: ${error.message}`);
      throw new Error(`Invalid JSON format in file ${jsonFilePath}: ${error.message}`);
    }
    logger.error(`Error loading Medicaid rules: ${error.message}`);
    throw error;
  }
}

/**
 * Normalize a state name or abbreviation
 * @param {string} state - State name or abbreviation
 * @returns {string} - Normalized state key
 */
function normalizeState(state) {
  if (!state || typeof state !== 'string') {
    throw new Error('State must be a non-empty string');
  }
  
  // Convert to lowercase and replace spaces/underscores
  const normalizedState = state.toLowerCase().replace(/[_\s]/g, '');
  
  // Map of state abbreviations and normalized names to standard keys
  const stateMap = {
    // Abbreviated state names
    'al': 'alabama',
    'ak': 'alaska',
    'az': 'arizona',
    'ar': 'arkansas',
    'ca': 'california',
    'co': 'colorado',
    'ct': 'connecticut',
    'de': 'delaware',
    'fl': 'florida',
    'ga': 'georgia',
    // Add other state abbreviations...
    
    // Full state names (normalized)
    'alabama': 'alabama',
    'alaska': 'alaska',
    'arizona': 'arizona',
    'arkansas': 'arkansas',
    'california': 'california',
    'colorado': 'colorado',
    'connecticut': 'connecticut',
    'delaware': 'delaware',
    'florida': 'florida',
    'georgia': 'georgia'
    // Add other state full names...
  };
  
  const stateKey = stateMap[normalizedState];
  if (!stateKey) {
    throw new Error(`Invalid state: ${state}`);
  }
  
  return stateKey;
}

/**
 * Get Medicaid eligibility rules for a specific state
 * @param {string} state - State name or abbreviation
 * @param {Object} rulesData - Pre-loaded rules data (optional)
 * @returns {Promise<Object>} - State-specific rules
 */
async function getStateRules(state, rulesData = null) {
  try {
    // Load rules if not provided
    if (!rulesData) {
      rulesData = await loadMedicaidRules();
    }
    
    // Normalize state name
    const stateKey = normalizeState(state);
    
    // Check if state exists in rules
    if (!rulesData[stateKey]) {
      throw new Error(`No rules found for state: ${state}`);
    }
    
    return rulesData[stateKey];
  } catch (error) {
    logger.error(`Error getting state rules: ${error.message}`);
    throw error;
  }
}

/**
 * Get resource limit for a specific state and marital status
 * @param {string} state - State name or abbreviation
 * @param {string} maritalStatus - Marital status ('single' or 'married')
 * @param {Object} rulesData - Pre-loaded rules data (optional)
 * @returns {Promise<number>} - Resource limit
 */
async function getResourceLimit(state, maritalStatus, rulesData = null) {
  try {
    const stateRules = await getStateRules(state, rulesData);
    
    // Default values if null
    const defaultLimits = {
      single: 2000,
      married: 3000
    };
    
    // Get limit based on marital status
    let limit;
    if (maritalStatus.toLowerCase() === 'married') {
      limit = stateRules.resourceLimitMarried;
      if (limit === null) {
        logger.warn(`Resource limit for married in ${state} is null, using default`);
        limit = defaultLimits.married;
      }
    } else {
      limit = stateRules.resourceLimitSingle;
      if (limit === null) {
        logger.warn(`Resource limit for single in ${state} is null, using default`);
        limit = defaultLimits.single;
      }
    }
    
    return limit;
  } catch (error) {
    logger.error(`Error getting resource limit: ${error.message}`);
    throw error;
  }
}

/**
 * Get income limit for a specific state and marital status
 * @param {string} state - State name or abbreviation
 * @param {string} maritalStatus - Marital status ('single' or 'married')
 * @param {boolean} forNursingHome - Whether for nursing home
 * @param {Object} rulesData - Pre-loaded rules data (optional)
 * @returns {Promise<number>} - Income limit
 */
async function getIncomeLimit(state, maritalStatus, forNursingHome = false, rulesData = null) {
  try {
    const stateRules = await getStateRules(state, rulesData);
    
    // Default values if null
    const defaultLimits = {
      single: {
        regular: 1000,
        nursingHome: 2901
      },
      married: {
        regular: 1500,
        nursingHome: 5802
      }
    };
    
    let limit;
    if (forNursingHome) {
      // Nursing home income limits
      if (maritalStatus.toLowerCase() === 'married') {
        limit = stateRules.nursingHomeIncomeLimitMarried;
        if (limit === null) {
          logger.warn(`Nursing home income limit for married in ${state} is null, using default`);
          limit = defaultLimits.married.nursingHome;
        }
      } else {
        limit = stateRules.nursingHomeIncomeLimitSingle;
        if (limit === null) {
          logger.warn(`Nursing home income limit for single in ${state} is null, using default`);
          limit = defaultLimits.single.nursingHome;
        }
      }
    } else {
      // Regular income limits
      if (maritalStatus.toLowerCase() === 'married') {
        limit = stateRules.incomeLimitMarried;
        if (limit === null) {
          logger.warn(`Income limit for married in ${state} is null, using default`);
          limit = defaultLimits.married.regular;
        }
      } else {
        limit = stateRules.incomeLimitSingle;
        if (limit === null) {
          logger.warn(`Income limit for single in ${state} is null, using default`);
          limit = defaultLimits.single.regular;
        }
      }
    }
    
    return limit;
  } catch (error) {
    logger.error(`Error getting income limit: ${error.message}`);
    throw error;
  }
}

/**
 * Get monthly personal needs allowance for a specific state
 * @param {string} state - State name or abbreviation
 * @param {Object} rulesData - Pre-loaded rules data (optional)
 * @returns {Promise<number>} - Personal needs allowance
 */
async function getPersonalNeedsAllowance(state, rulesData = null) {
  try {
    const stateRules = await getStateRules(state, rulesData);
    
    const allowance = stateRules.monthlyPersonalNeedsAllowance;
    if (allowance === null) {
      logger.warn(`Personal needs allowance for ${state} is null, using default`);
      return 60; // Default value
    }
    
    return allowance;
  } catch (error) {
    logger.error(`Error getting personal needs allowance: ${error.message}`);
    throw error;
  }
}

/**
 * Get CSRA limits for a specific state
 * @param {string} state - State name or abbreviation
 * @param {Object} rulesData - Pre-loaded rules data (optional)
 * @returns {Promise<Object>} - CSRA min and max
 */
async function getCsraLimits(state, rulesData = null) {
  try {
    const stateRules = await getStateRules(state, rulesData);
    
    const min = stateRules.communitySpouseResourceAllowanceMin || 31584; // Default
    const max = stateRules.communitySpouseResourceAllowanceMax || 157920; // Default
    
    return { min, max };
  } catch (error) {
    logger.error(`Error getting CSRA limits: ${error.message}`);
    throw error;
  }
}

/**
 * Get home equity limit for a specific state
 * @param {string} state - State name or abbreviation
 * @param {Object} rulesData - Pre-loaded rules data (optional)
 * @returns {Promise<number>} - Home equity limit
 */
async function getHomeEquityLimit(state, rulesData = null) {
  try {
    const stateRules = await getStateRules(state, rulesData);
    
    const limit = stateRules.homeEquityLimit;
    if (limit === null) {
      logger.warn(`Home equity limit for ${state} is null, using default`);
      return 730000; // Default value
    }
    
    return limit;
  } catch (error) {
    logger.error(`Error getting home equity limit: ${error.message}`);
    throw error;
  }
}

/**
 * Get average nursing home cost for a specific state
 * @param {string} state - State name or abbreviation
 * @param {Object} rulesData - Pre-loaded rules data (optional)
 * @returns {Promise<number|null>} - Average nursing home cost
 */
async function getAverageNursingHomeCost(state, rulesData = null) {
  try {
    const stateRules = await getStateRules(state, rulesData);
    return stateRules.averageNursingHomeCost; // Can be null
  } catch (error) {
    logger.error(`Error getting average nursing home cost: ${error.message}`);
    throw error;
  }
}

/**
 * Get MMMNA limits for a specific state
 * @param {string} state - State name or abbreviation
 * @param {Object} rulesData - Pre-loaded rules data (optional)
 * @returns {Promise<Object>} - MMMNA min and max
 */
async function getMmmnaLimits(state, rulesData = null) {
  try {
    const stateRules = await getStateRules(state, rulesData);
    
    const min = stateRules.monthlyMaintenanceNeedsAllowanceMin || 2555; // Default
    const max = stateRules.monthlyMaintenanceNeedsAllowanceMax || 3948; // Default
    
    return { min, max };
  } catch (error) {
    logger.error(`Error getting MMMNA limits: ${error.message}`);
    throw error;
  }
}

module.exports = {
  loadMedicaidRules,
  getStateRules,
  getResourceLimit,
  getIncomeLimit,
  getPersonalNeedsAllowance,
  getCsraLimits,
  getHomeEquityLimit,
  getAverageNursingHomeCost,
  getMmmnaLimits,
  normalizeState
};