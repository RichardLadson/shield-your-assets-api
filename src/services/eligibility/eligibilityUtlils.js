// src/services/eligibility/eligibilityUtils.js
const logger = require('../../config/logger');

/**
 * Classify assets into countable and non-countable categories
 * @param {Object} assets - Assets object
 * @returns {Object} - Object with countable and non-countable assets
 */
function classifyAssets(assets) {
  logger.debug('Classifying assets');
  
  // Define non-countable asset types
  const nonCountableAssetTypes = ['home', 'primary_residence', 'vehicle', 'car', 'burial_plot', 'life_insurance'];
  
  let countableAssets = 0;
  let nonCountableAssets = 0;
  
  // Calculate countable and non-countable assets
  for (const [key, value] of Object.entries(assets)) {
    const assetKey = key.toLowerCase();
    if (nonCountableAssetTypes.some(type => assetKey.includes(type))) {
      nonCountableAssets += value;
      logger.debug(`Non-countable asset: ${key} = ${value}`);
    } else {
      countableAssets += value;
      logger.debug(`Countable asset: ${key} = ${value}`);
    }
  }
  
  return { countableAssets, nonCountableAssets };
}

/**
 * Calculate total monthly income
 * @param {Object} income - Income object
 * @returns {number} - Total monthly income
 */
function calculateTotalIncome(income) {
  logger.debug('Calculating total income');
  
  const totalIncome = Object.values(income).reduce((sum, value) => sum + value, 0);
  logger.debug(`Total income: ${totalIncome}`);
  
  return totalIncome;
}

/**
 * Determine urgency level for Medicaid planning
 * @param {number} age - Client age
 * @param {string} healthStatus - Client health status
 * @param {boolean} isCrisis - Whether this is a crisis situation
 * @returns {string} - Urgency assessment
 */
function determineUrgency(age, healthStatus, isCrisis) {
  logger.debug(`Determining urgency: age=${age}, healthStatus=${healthStatus}, isCrisis=${isCrisis}`);
  
  if (isCrisis || healthStatus === 'critical' || age >= 80) {
    return "High - Immediate crisis planning required";
  } else if (healthStatus === 'declining' || age >= 70) {
    return "Medium - Begin pre-planning soon";
  } else {
    return "Low - Good candidate for long-term pre-planning";
  }
}

/**
 * Format a number as currency
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
function formatCurrency(amount) {
  if (amount === null || amount === undefined) {
    return 'N/A';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
}

module.exports = {
  classifyAssets,
  calculateTotalIncome,
  determineUrgency,
  formatCurrency
};