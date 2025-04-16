// src/data/ruleUpdates.js

/**
 * Mock implementation of ruleUpdates module
 * This file exists to satisfy the jest.mock() in the medicaidRulesLoader.test.js
 */

/**
 * Check for updates to Medicaid rules
 * @returns {Object} Updates by state
 */
function checkForUpdates() {
    return {
      florida: {
        incomeLimit: 2823 // Updated value
      }
    };
  }
  
  module.exports = {
    checkForUpdates
  };