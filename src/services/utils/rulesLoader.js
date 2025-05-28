// src/services/utils/rulesLoader.js
const { BenefitRules, EstateRecoveryRules } = require('../../models');
const logger = require('../../config/logger');

/**
 * NEW DATABASE-BASED RULES LOADER
 * Replaces the old file-based medicaidRulesLoader.js
 */

/**
 * Get all benefit programs for a state
 * @param {string} state - State code (FL, CA, etc.)
 * @param {number} year - Year (default: 2025)
 * @returns {Object} All benefit rules for the state
 */
async function getBenefitRules(state, year = 2025) {
    try {
        logger.info(`Loading benefit rules for ${state} ${year}`);
        
        const rules = await BenefitRules.findByState(state, year);
        
        if (!rules || rules.length === 0) {
            logger.warn(`No benefit rules found for ${state} ${year}`);
            return null;
        }
        
        // Transform into the format expected by existing code
        const benefitRules = {};
        rules.forEach(rule => {
            benefitRules[rule.program] = {
                individual_amount: rule.individual_amount,
                couple_amount: rule.couple_amount,
                income_limit: rule.income_limit,
                resource_limit: rule.resource_limit,
                ...rule.program_details
            };
        });
        
        return benefitRules;
        
    } catch (error) {
        logger.error(`Error loading benefit rules for ${state}: ${error.message}`);
        throw error;
    }
}

/**
 * Get specific benefit program for a state
 * @param {string} state - State code (FL, CA, etc.)
 * @param {string} program - Program name (ssi, snap, medicare, veterans)
 * @param {number} year - Year (default: 2025)
 * @returns {Object} Specific benefit rule
 */
async function getBenefitRule(state, program, year = 2025) {
    try {
        logger.info(`Loading ${program} rules for ${state} ${year}`);
        
        const rule = await BenefitRules.findByStateAndProgram(state, program, year);
        
        if (!rule) {
            logger.warn(`No ${program} rules found for ${state} ${year}`);
            return null;
        }
        
        return {
            individual_amount: rule.individual_amount,
            couple_amount: rule.couple_amount,
            income_limit: rule.income_limit,
            resource_limit: rule.resource_limit,
            ...rule.program_details
        };
        
    } catch (error) {
        logger.error(`Error loading ${program} rules for ${state}: ${error.message}`);
        throw error;
    }
}

/**
 * Get estate recovery rules for a state
 * @param {string} state - State code (FL, CA, etc.)
 * @returns {Object} Estate recovery rules
 */
async function getEstateRecoveryRules(state) {
    try {
        logger.info(`Loading estate recovery rules for ${state}`);
        
        const rules = await EstateRecoveryRules.findByState(state);
        
        if (!rules) {
            logger.warn(`No estate recovery rules found for ${state}`);
            return null;
        }
        
        return {
            state: rules.state,
            homeExemptions: {
                primary: rules.primary_residence_protected,
                homestead: rules.homestead_exemption,
                strength: rules.home_protection_strength,
                conditions: rules.recovery_conditions || [],
                exceptions: rules.exceptions || []
            },
            recoveryScope: {
                aggressiveness: rules.recovery_aggressiveness,
                optionalRecovery: rules.optional_recovery,
                tefraLiens: rules.tefra_liens,
                expandedEstate: rules.expanded_estate_definition,
                nonProbateTransfersPursued: rules.non_probate_transfers_pursued
            },
            recoveryTimeframes: {
                lookBackYears: rules.lookback_years,
                claimDeadlineAfterDeathMonths: rules.claim_deadline_months,
                statuteLimit: rules.statute_of_limitations_years
            },
            assetProtections: {
                homeEquityLimit: rules.home_equity_limit,
                recoveryThresholdDollar: rules.recovery_threshold_dollars,
                protectedAssets: rules.protected_assets || []
            },
            planningOpportunities: rules.planning_strategies || []
        };
        
    } catch (error) {
        logger.error(`Error loading estate recovery rules for ${state}: ${error.message}`);
        throw error;
    }
}

/**
 * Compare estate recovery aggressiveness across states
 * @returns {Object} States grouped by recovery aggressiveness
 */
async function compareEstateRecoveryByAggressiveness() {
    try {
        logger.info('Loading estate recovery comparison by aggressiveness');
        
        const none = await EstateRecoveryRules.findByRecoveryAggressiveness('none');
        const minimal = await EstateRecoveryRules.findByRecoveryAggressiveness('minimal');
        const moderate = await EstateRecoveryRules.findByRecoveryAggressiveness('moderate');
        const aggressive = await EstateRecoveryRules.findByRecoveryAggressiveness('aggressive');
        
        return {
            none: none.map(s => s.state),
            minimal: minimal.map(s => s.state),
            moderate: moderate.map(s => s.state),
            aggressive: aggressive.map(s => s.state)
        };
        
    } catch (error) {
        logger.error(`Error comparing estate recovery aggressiveness: ${error.message}`);
        throw error;
    }
}

/**
 * Get states with the best home protection
 * @returns {Array} States with very strong or strong home protection
 */
async function getBestHomeProtectionStates() {
    try {
        logger.info('Loading states with best home protection');
        
        const states = await EstateRecoveryRules.findBestHomeProtectionStates();
        
        return states.map(state => ({
            state: state.state,
            protection_level: state.home_protection_strength,
            recovery_level: state.recovery_aggressiveness,
            protected_assets: state.protected_assets || []
        }));
        
    } catch (error) {
        logger.error(`Error loading best home protection states: ${error.message}`);
        throw error;
    }
}

/**
 * Compare benefit amounts across states for a specific program
 * @param {string} program - Program name (ssi, snap, medicare, veterans)
 * @param {number} year - Year (default: 2025)
 * @returns {Array} All states with their benefit amounts for the program
 */
async function compareBenefitsByProgram(program, year = 2025) {
    try {
        logger.info(`Comparing ${program} benefits across states for ${year}`);
        
        const rules = await BenefitRules.findAllByProgram(program, year);
        
        return rules.map(rule => ({
            state: rule.state,
            individual_amount: rule.individual_amount,
            couple_amount: rule.couple_amount,
            income_limit: rule.income_limit,
            resource_limit: rule.resource_limit
        })).sort((a, b) => (b.individual_amount || 0) - (a.individual_amount || 0));
        
    } catch (error) {
        logger.error(`Error comparing ${program} benefits: ${error.message}`);
        throw error;
    }
}

module.exports = {
    getBenefitRules,
    getBenefitRule,
    getEstateRecoveryRules,
    compareEstateRecoveryByAggressiveness,
    getBestHomeProtectionStates,
    compareBenefitsByProgram
};