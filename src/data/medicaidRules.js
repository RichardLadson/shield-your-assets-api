// src/data/medicaidRules.js

/**
 * Mock implementation of medicaidRules module
 * This file exists to satisfy the jest.mock() in the medicaidRulesLoader.test.js
 */

/**
 * Loads Medicaid rules from data source
 * @returns {Object} Medicaid rules by state
 */
function loadRules() {
    return {
      florida: {
        programName: 'Florida Medicaid',
        assetLimitSingle: 2000,
        assetLimitMarried: 3000,
        incomeLimit: 2742,
        homeEquityLimit: 636000,
        lookbackPeriod: 60,
        incomeTrust: {
          required: true,
          threshold: 2742
        },
        disregards: {
          income: {
            earned: 0.5,
            unearned: 20
          }
        }
      },
      california: {
        programName: 'Medi-Cal',
        assetLimitSingle: 2000, 
        assetLimitMarried: 3000,
        incomeLimit: 1564,
        homeEquityLimit: 1000000,
        lookbackPeriod: 30,
        incomeTrust: {
          required: false
        },
        disregards: {
          income: {
            earned: 0.5,
            unearned: 20
          }
        }
      }
    };
  }
  
  module.exports = {
    loadRules
  };