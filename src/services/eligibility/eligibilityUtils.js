// src/services/eligibility/eligibilityUtils.js
const logger = require('../../config/logger');

/**
 * Calculates total income from all sources
 * 
 * @param {Object} income - Income breakdown by source
 * @returns {number} Total income
 */
function calculateTotalIncome(income) {
  if (!income || typeof income !== 'object') return 0;
  
  return Object.values(income).reduce((sum, value) => {
    const amount = parseFloat(value) || 0;
    return sum + amount;
  }, 0);
}

/**
 * Classifies assets as countable or non-countable for Medicaid
 * 
 * @param {Object} assets - Assets breakdown by type
 * @returns {Object} Classification with countable and non-countable totals
 */
function classifyAssets(assets) {
  if (!assets || typeof assets !== 'object') {
    return { countableAssets: 0, nonCountableAssets: 0 };
  }
  
  // Default commonly non-countable asset types
  const nonCountableTypes = [
    'home', 
    'primary_residence',
    'burial_funds', 
    'burial_plots',
    'pre_paid_funeral',
    'funeral_plan',
    'life_insurance_exempt',
    'automobile_primary',
    'personal_effects'
  ];
  
  let countableAssets = 0;
  let nonCountableAssets = 0;
  
  // Process each asset
  Object.entries(assets).forEach(([key, value]) => {
    const amount = parseFloat(value) || 0;
    
    // Check if this is an explicitly countable asset
    if (key === 'countable') {
      countableAssets += amount;
      return;
    }
    
    // Check if this is an explicitly non-countable asset
    if (key === 'non_countable') {
      nonCountableAssets += amount;
      return;
    }
    
    // Classify based on asset type
    if (nonCountableTypes.includes(key)) {
      nonCountableAssets += amount;
    } else {
      countableAssets += amount;
    }
  });
  
  return { countableAssets, nonCountableAssets };
}

module.exports = {
  calculateTotalIncome,
  classifyAssets
};