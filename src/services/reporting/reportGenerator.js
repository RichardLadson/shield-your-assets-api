// Path: src/services/reporting/reportGenerator.js
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const markdown = require('markdown-it')();
const logger = require('../../config/logger');

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

/**
 * Format a number as percentage
 * @param {number} value - Value to format
 * @returns {string} - Formatted percentage string
 */
function formatPercentage(value) {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  
  return `${value.toFixed(1)}%`;
}

/**
 * Get client age with validation
 * @param {Object} clientInfo - Client information
 * @returns {string|number} - Client age or "Unknown"
 */
function getClientAge(clientInfo) {
  const age = clientInfo.age;
  
  if (typeof age === 'number' && age > 0) {
    return Math.floor(age);
  }
  
  return "Unknown";
}

/**
 * Determine overall eligibility status from results
 * @param {Object} eligibilityResult - Eligibility assessment result
 * @returns {Array} - [status, reason]
 */
function getEligibilityStatus(eligibilityResult) {
  try {
    if (!eligibilityResult || eligibilityResult.status === 'error') {
      return ["Unknown", "Could not determine eligibility status"];
    }
    
    const countableAssets = eligibilityResult.countableAssets || 0;
    const resourceLimit = eligibilityResult.resourceLimit || 0;
    
    if (countableAssets <= resourceLimit) {
      return ["Eligible", "Currently meets resource requirements"];
    } else {
      const spenddown = eligibilityResult.spenddownAmount || 0;
      return ["Not Eligible", `Requires spend-down of ${formatCurrency(spenddown)}`];
    }
  } catch (error) {
    logger.error(`Error determining eligibility status: ${error.message}`);
    return ["Unknown", "Error determining eligibility status"];
  }
}

class MedicaidPlanningReportGenerator {
  /**
   * Initialize the report generator with planning results
   * @param {Object} planningResults - Comprehensive planning results
   * @param {Object} clientInfo - Client information
   * @param {string} state - State name or abbreviation (normalized)
   */
  constructor(planningResults, clientInfo, state) {
    this.results = planningResults;
    this.clientInfo = clientInfo;
    this.state = state;
    this.currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Set up default report parameters
    this.reportTitle = `Medicaid Planning Report for ${clientInfo.name || 'Client'}`;
    
    logger.info(`Initialized report generator for ${clientInfo.name || 'client'}`);
  }
  
  /**
   * Generate a brief summary report
   * @param {string} outputFormat - Format for output ('markdown', 'plain', 'html')
   * @returns {string} - Formatted report
   */
  generateSummaryReport(outputFormat = 'markdown') {
    try {
      logger.info(`Generating summary report in ${outputFormat} format`);
      
      // Get eligibility info
      const eligibilityResult = this.results?.initialAssessment?.eligibility;
      if (!eligibilityResult) {
        return "Error: Missing eligibility assessment results";
      }
      
      const [status, statusReason] = getEligibilityStatus(eligibilityResult);
      
      // Create report content
      const reportLines = [];
      reportLines.push(`# ${this.reportTitle}`);
      reportLines.push(`**Date:** ${this.currentDate}`);
      reportLines.push(`**State:** ${this._formatState(this.state)}`);
      reportLines.push(`**Client:** ${this.clientInfo.name || 'Not provided'}`);
      reportLines.push(`**Age:** ${getClientAge(this.clientInfo)}`);
      reportLines.push("");
      
      // Eligibility section
      reportLines.push("## Eligibility Summary");
      reportLines.push(`**Status:** ${status}`);
      reportLines.push(`**Reason:** ${statusReason}`);
      reportLines.push("");
      
      // Financial snapshot
      reportLines.push("## Financial Snapshot");
      reportLines.push(`**Countable Assets:** ${formatCurrency(eligibilityResult.countableAssets || 0)}`);
      reportLines.push(`**Resource Limit:** ${formatCurrency(eligibilityResult.resourceLimit || 0)}`);
      reportLines.push(`**Spend-down Amount:** ${formatCurrency(eligibilityResult.spenddownAmount || 0)}`);
      reportLines.push(`**Monthly Income:** ${formatCurrency(eligibilityResult.totalIncome || 0)}`);
      reportLines.push("");
      
      // Planning urgency
      reportLines.push("## Planning Urgency");
      reportLines.push(`**Level:** ${eligibilityResult.urgency || 'Unknown'}`);
      reportLines.push("");
      
      // Key strategies
      reportLines.push("## Key Planning Strategies");
      const strategies = eligibilityResult.planStrategies || [];
      if (strategies.length > 0) {
        for (const strategy of strategies) {
          reportLines.push(`- ${strategy}`);
        }
      } else {
        reportLines.push("- No specific strategies identified");
      }
      reportLines.push("");
      
      // Warnings
      if (eligibilityResult.warnings && eligibilityResult.warnings.length > 0) {
        reportLines.push("## Warnings");
        for (const warning of eligibilityResult.warnings) {
          reportLines.push(`- ${warning.message || 'Unknown warning'}`);
        }
        reportLines.push("");
      }
      
      // Format according to requested output format
      if (outputFormat === 'markdown') {
        return reportLines.join('\n');
      } else if (outputFormat === 'plain') {
        // Simple conversion from markdown to plain text
        let text = reportLines.join('\n');
        text = text.replace(/# /g, '').replace(/## /g, '').replace(/\*\*/g, '');
        return text;
      } else if (outputFormat === 'html') {
        const mdText = reportLines.join('\n');
        return markdown.render(mdText);
      } else {
        logger.warning(`Unsupported output format: ${outputFormat}, defaulting to markdown`);
        return reportLines.join('\n');
      }
    } catch (error) {
      logger.error(`Error generating summary report: ${error.message}`);
      return `Error generating report: ${error.message}`;
    }
  }
  
  /**
   * Generate a comprehensive detailed planning report
   * @param {string} outputFormat - Format for output ('markdown', 'plain', 'html')
   * @returns {string} - Formatted report
   */
  generateDetailedReport(outputFormat = 'markdown') {
    try {
      logger.info(`Generating detailed report in ${outputFormat} format`);
      
      // Get assessment sections
      const initialAssessment = this.results?.initialAssessment || {};
      const assetProtection = this.results?.assetProtection || {};
      const communitySpouseProtection = this.results?.communitySpouseProtection || {};
      const homesteadProtection = this.results?.homesteadProtection || {};
      
      // Create report content
      const reportLines = [];
      reportLines.push(`# ${this.reportTitle}`);
      reportLines.push(`**Date:** ${this.currentDate}`);
      reportLines.push(`**State:** ${this._formatState(this.state)}`);
      reportLines.push(`**Client:** ${this.clientInfo.name || 'Not provided'}`);
      reportLines.push(`**Age:** ${getClientAge(this.clientInfo)}`);
      reportLines.push(`**Marital Status:** ${this._capitalize(this.clientInfo.maritalStatus) || 'Not provided'}`);
      reportLines.push(`**Health Status:** ${this._capitalize(this.clientInfo.healthStatus) || 'Not provided'}`);
      reportLines.push("");
      
      // Table of contents
      reportLines.push("## Table of Contents");
      reportLines.push("1. [Eligibility Summary](#eligibility-summary)");
      reportLines.push("2. [Financial Analysis](#financial-analysis)");
      reportLines.push("3. [Planning Strategies](#planning-strategies)");
      reportLines.push("4. [Implementation Steps](#implementation-steps)");
      if (this.clientInfo.maritalStatus && this.clientInfo.maritalStatus.toLowerCase() === 'married') {
        reportLines.push("5. [Spouse Considerations](#spouse-considerations)");
      }
      reportLines.push("6. [Application Guidance](#application-guidance)");
      reportLines.push("7. [Post-Eligibility Considerations](#post-eligibility-considerations)");
      reportLines.push("");
      
      // Eligibility summary
      const eligibilityResult = initialAssessment.eligibility || {};
      const [status, statusReason] = getEligibilityStatus(eligibilityResult);
      reportLines.push("## Eligibility Summary");
      reportLines.push(`**Status:** ${status}`);
      reportLines.push(`**Reason:** ${statusReason}`);
      reportLines.push(`**Planning Urgency:** ${eligibilityResult.urgency || 'Unknown'}`);
      reportLines.push("");
      
      // Financial analysis
      reportLines.push("## Financial Analysis");
      
      // Asset analysis
      reportLines.push("### Asset Analysis");
      reportLines.push(`**Countable Assets:** ${formatCurrency(eligibilityResult.countableAssets || 0)}`);
      reportLines.push(`**Non-Countable Assets:** ${formatCurrency(eligibilityResult.nonCountableAssets || 0)}`);
      reportLines.push(`**Resource Limit:** ${formatCurrency(eligibilityResult.resourceLimit || 0)}`);
      reportLines.push(`**Spend-down Amount:** ${formatCurrency(eligibilityResult.spenddownAmount || 0)}`);
      reportLines.push("");
      
      // Income analysis
      reportLines.push("### Income Analysis");
      reportLines.push(`**Monthly Income:** ${formatCurrency(eligibilityResult.totalIncome || 0)}`);
      reportLines.push(`**Income Limit:** ${formatCurrency(eligibilityResult.incomeLimit || 0)}`);
      reportLines.push(`**Income Eligibility:** ${eligibilityResult.isIncomeEligible ? "Eligible" : "Not Eligible"}`);
      reportLines.push("");
      
      // Planning strategies
      reportLines.push("## Planning Strategies");
      
      // Asset strategies
      reportLines.push("### Asset Protection Strategies");
      const assetStrategies = assetProtection?.strategies || eligibilityResult.planStrategies || [];
      if (assetStrategies.length > 0) {
        for (const strategy of assetStrategies) {
          reportLines.push(`- ${strategy}`);
        }
      } else {
        reportLines.push("- No specific asset strategies identified");
      }
      reportLines.push("");
      
      // Implementation steps
      reportLines.push("## Implementation Steps");
      const nextSteps = eligibilityResult.nextSteps || [];
      if (nextSteps.length > 0) {
        for (let i = 0; i < nextSteps.length; i++) {
          reportLines.push(`${i + 1}. ${nextSteps[i]}`);
        }
      } else {
        reportLines.push("1. Consult with an elder law attorney");
        reportLines.push("2. Gather all financial documentation");
        reportLines.push("3. Implement recommended planning strategies");
        reportLines.push("4. Prepare and submit Medicaid application");
      }
      reportLines.push("");
      
      // Spousal considerations if applicable
      if (this.clientInfo.maritalStatus && this.clientInfo.maritalStatus.toLowerCase() === 'married') {
        reportLines.push("## Spouse Considerations");
        reportLines.push("### Community Spouse Resource Allowance (CSRA)");
        reportLines.push("The CSRA is the amount of assets that the community spouse (the spouse not applying for Medicaid) is allowed to keep.");
        reportLines.push("");
        reportLines.push("### Minimum Monthly Maintenance Needs Allowance (MMMNA)");
        reportLines.push("The MMMNA is the minimum amount of income that the community spouse is allowed to keep each month.");
        reportLines.push("");
      }
      
      // Application guidance
      reportLines.push("## Application Guidance");
      reportLines.push("### Documentation Required");
      reportLines.push("- Personal identification (birth certificate, Social Security card)");
      reportLines.push("- Proof of residence and citizenship");
      reportLines.push("- Financial records (bank statements, investment accounts, etc.)");
      reportLines.push("- Income verification (Social Security award letters, pension statements)");
      reportLines.push("- Property documents (deeds, vehicle titles)");
      reportLines.push("- Insurance policies (health, life, long-term care)");
      reportLines.push("- Medical records if applying based on disability");
      reportLines.push("");
      reportLines.push("### Application Process");
      reportLines.push("1. Submit application to your local Medicaid office");
      reportLines.push("2. Complete interview process if required");
      reportLines.push("3. Respond promptly to any requests for additional information");
      reportLines.push("4. Follow up regularly on application status");
      reportLines.push("5. Appeal if denied and you believe you should qualify");
      reportLines.push("");
      
      // Post-eligibility considerations
      reportLines.push("## Post-Eligibility Considerations");
      reportLines.push("- Report changes in finances or circumstances promptly");
      reportLines.push("- Complete annual recertification as required");
      reportLines.push("- Consider estate recovery implications and planning options");
      reportLines.push("- Review and update advance directives and powers of attorney");
      reportLines.push("");
      
      // Disclaimer
      reportLines.push("## Disclaimer");
      reportLines.push("*This report is based on the information provided and current Medicaid rules. " +
                      "Medicaid regulations vary by state and change frequently. " +
                      "This report is not legal advice. " +
                      "Please consult with a qualified elder law attorney before implementing any strategies.*");
      
      // Format according to requested output format
      if (outputFormat === 'markdown') {
        return reportLines.join('\n');
      } else if (outputFormat === 'plain') {
        // Convert markdown to plain text
        let text = reportLines.join('\n');
        text = text.replace(/# /g, '').replace(/## /g, '').replace(/### /g, '').replace(/#### /g, '');
        text = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\|/g, ' ');
        return text;
      } else if (outputFormat === 'html') {
        const mdText = reportLines.join('\n');
        return markdown.render(mdText);
      } else {
        logger.warning(`Unsupported output format: ${outputFormat}, defaulting to markdown`);
        return reportLines.join('\n');
      }
    } catch (error) {
      logger.error(`Error generating detailed report: ${error.message}`);
      return `Error generating detailed report: ${error.message}`;
    }
  }
  
  /**
   * Generate a simplified report for clients with non-technical language
   * @param {string} outputFormat - Format for output ('markdown', 'plain', 'html')
   * @returns {string} - Formatted report
   */
  generateClientFriendlyReport(outputFormat = 'markdown') {
    try {
      logger.info(`Generating client-friendly report in ${outputFormat} format`);
      
      // Get eligibility info
      const eligibilityResult = this.results?.initialAssessment?.eligibility;
      if (!eligibilityResult) {
        return "Error: Missing eligibility assessment results";
      }
      
      const [status, statusReason] = getEligibilityStatus(eligibilityResult);
      
      // Create report content
      const reportLines = [];
      reportLines.push("# Your Medicaid Planning Report");
      reportLines.push(`**Prepared for:** ${this.clientInfo.name || 'You'}`);
      reportLines.push(`**Date:** ${this.currentDate}`);
      reportLines.push(`**State:** ${this._formatState(this.state)}`);
      reportLines.push("");
      
      // Simple overview
      reportLines.push("## What You Need to Know");
      
      if (status === "Eligible") {
        reportLines.push("**Good news!** Based on the information provided, you appear to be eligible for Medicaid benefits.");
      } else if (status === "Not Eligible") {
        reportLines.push("Based on the information provided, you are not currently eligible for Medicaid. " +
                        "However, we have identified several planning opportunities that could help you become eligible.");
      } else {
        reportLines.push("We need more information to determine your Medicaid eligibility.");
      }
      
      reportLines.push("");
      
      // Financial situation in simple terms
      reportLines.push("## Your Financial Situation");
      
      const countableAssets = eligibilityResult.countableAssets || 0;
      const resourceLimit = eligibilityResult.resourceLimit || 0;
      const spenddown = eligibilityResult.spenddownAmount || 0;
      
      reportLines.push(`**Your countable resources:** ${formatCurrency(countableAssets)}`);
      reportLines.push(`**Medicaid's resource limit:** ${formatCurrency(resourceLimit)}`);
      
      if (countableAssets > resourceLimit) {
        reportLines.push(`**Difference to become eligible:** ${formatCurrency(spenddown)}`);
        reportLines.push("");
        reportLines.push(`This means you would need to reduce your countable resources by ${formatCurrency(spenddown)} to qualify for Medicaid.`);
      } else {
        reportLines.push("");
        reportLines.push("Your countable resources are within Medicaid's limits.");
      }
      
      reportLines.push("");
      
      // Next steps in plain language
      reportLines.push("## What You Can Do Next");
      
      // Process eligibility strategies and simplify where applicable
      const eligibilityStrategies = eligibilityResult.planStrategies || [];
      const simplifiedStrategies = [];
      
      for (const strategy of eligibilityStrategies) {
        const lowerStrategy = strategy.toLowerCase();
        if (lowerStrategy.includes("convert countable assets")) {
          simplifiedStrategies.push("Consider moving funds into exempt assets like home improvements or a new vehicle.");
        } else if (lowerStrategy.includes("funeral expenses")) {
          simplifiedStrategies.push("Pre-pay funeral and burial expenses.");
        } else if (lowerStrategy.includes("miller trust")) {
          simplifiedStrategies.push("Set up a special trust to manage excess income.");
        } else {
          // If no specific simplification rule applies, just include the original strategy.
          simplifiedStrategies.push(strategy);
        }
      }
      
      if (simplifiedStrategies.length > 0) {
        reportLines.push("### Suggested Next Steps:");
        for (const item of simplifiedStrategies) {
          reportLines.push(`- ${item}`);
        }
      } else {
        reportLines.push("No additional strategies identified.");
      }
      
      reportLines.push("");
      
      // Format according to requested output format
      if (outputFormat === 'markdown') {
        return reportLines.join('\n');
      } else if (outputFormat === 'plain') {
        let text = reportLines.join('\n');
        text = text.replace(/# /g, '').replace(/## /g, '').replace(/### /g, '').replace(/#### /g, '');
        text = text.replace(/\*\*/g, '').replace(/\*/g, '');
        return text;
      } else if (outputFormat === 'html') {
        const mdText = reportLines.join('\n');
        return markdown.render(mdText);
      } else {
        logger.warning(`Unsupported output format: ${outputFormat}, defaulting to markdown`);
        return reportLines.join('\n');
      }
    } catch (error) {
      logger.error(`Error generating client-friendly report: ${error.message}`);
      return `Error generating client-friendly report: ${error.message}`;
    }
  }
  
  /**
   * Capitalize the first letter of a string.
   * @param {string} str - The string to capitalize.
   * @returns {string}
   */
  _capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Format state string (e.g., replace underscores with spaces and capitalize each word).
   * @param {string} state
   * @returns {string}
   */
  _formatState(state) {
    if (!state) return 'Not provided';
    return state.split('_').map(word => this._capitalize(word)).join(' ');
  }
}

module.exports = MedicaidPlanningReportGenerator;
