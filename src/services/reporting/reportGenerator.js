// src/services/reporting/reportGenerator.js
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const markdown = require('markdown-it')();
const logger = require('../../config/logger');

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
    
    this.reportTitle = `Medicaid Planning Report for ${clientInfo.name || 'Client'}`;
    
    logger.info(`Initialized report generator for ${clientInfo.name || 'client'}`);
  }
  
  /**
   * Format a number as currency
   * @param {number} amount - Amount to format
   * @returns {string} - Formatted currency string
   */
  _formatCurrency(amount) {
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
  _formatPercentage(value) {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    return `${value.toFixed(1)}%`;
  }
  
  /**
   * Get client age with validation
   * @returns {string|number} - Client age or "Unknown"
   */
  _getClientAge() {
    const age = this.clientInfo.age;
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
  _getEligibilityStatus(eligibilityResult) {
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
        return ["Not Eligible", `Requires spend-down of ${this._formatCurrency(spenddown)}`];
      }
    } catch (error) {
      logger.error(`Error determining eligibility status: ${error.message}`);
      return ["Unknown", "Error determining eligibility status"];
    }
  }
  
  /**
   * Generate a brief summary report
   * @param {string} outputFormat - Format for output ('markdown', 'plain', 'html')
   * @returns {string} - Formatted report
   */
  generateSummaryReport(outputFormat = 'markdown') {
    try {
      logger.info(`Generating summary report in ${outputFormat} format`);
      
      const eligibilityResult = this.results?.initialAssessment?.eligibility;
      if (!eligibilityResult) {
        return "Error: Missing eligibility assessment results";
      }
      
      const [status, statusReason] = this._getEligibilityStatus(eligibilityResult);
      
      const reportLines = [];
      reportLines.push(`# ${this.reportTitle}`);
      reportLines.push(`**Date:** ${this.currentDate}`);
      const formattedState = this.state.replace('_', ' ');
      reportLines.push(`**State:** ${formattedState.charAt(0).toUpperCase() + formattedState.slice(1)}`);
      reportLines.push(`**Client:** ${this.clientInfo.name || 'Not provided'}`);
      reportLines.push(`**Age:** ${this._getClientAge()}`);
      reportLines.push("");
      
      // Eligibility section
      reportLines.push("## Eligibility Summary");
      reportLines.push(`**Status:** ${status}`);
      reportLines.push(`**Reason:** ${statusReason}`);
      reportLines.push("");
      
      // Financial snapshot
      reportLines.push("## Financial Snapshot");
      reportLines.push(`**Countable Assets:** ${this._formatCurrency(eligibilityResult.countableAssets || 0)}`);
      reportLines.push(`**Resource Limit:** ${this._formatCurrency(eligibilityResult.resourceLimit || 0)}`);
      reportLines.push(`**Spend-down Amount:** ${this._formatCurrency(eligibilityResult.spenddownAmount || 0)}`);
      reportLines.push(`**Monthly Income:** ${this._formatCurrency(eligibilityResult.totalIncome || 0)}`);
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
      
      // Warnings (if any)
      if (eligibilityResult.warnings && eligibilityResult.warnings.length > 0) {
        reportLines.push("## Warnings");
        for (const warning of eligibilityResult.warnings) {
          reportLines.push(`- ${warning.message || 'Unknown warning'}`);
        }
        reportLines.push("");
      }
      
      // Format report according to outputFormat
      if (outputFormat === 'markdown') {
        return reportLines.join('\n');
      } else if (outputFormat === 'plain') {
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
      
      const initialAssessment = this.results?.initialAssessment || {};
      const assetProtection = this.results?.assetProtection || {};
      const communitySpouseProtection = this.results?.communitySpouseProtection || {};
      const homesteadProtection = this.results?.homesteadProtection || {};
      
      const reportLines = [];
      reportLines.push(`# ${this.reportTitle}`);
      reportLines.push(`**Date:** ${this.currentDate}`);
      const formattedState = this.state.replace('_', ' ');
      reportLines.push(`**State:** ${formattedState.charAt(0).toUpperCase() + formattedState.slice(1)}`);
      reportLines.push(`**Client:** ${this.clientInfo.name || 'Not provided'}`);
      reportLines.push(`**Age:** ${this._getClientAge()}`);
      reportLines.push(`**Marital Status:** ${this.clientInfo.maritalStatus ? this.clientInfo.maritalStatus.charAt(0).toUpperCase() + this.clientInfo.maritalStatus.slice(1) : 'Not provided'}`);
      reportLines.push(`**Health Status:** ${this.clientInfo.healthStatus ? this.clientInfo.healthStatus.charAt(0).toUpperCase() + this.clientInfo.healthStatus.slice(1) : 'Not provided'}`);
      reportLines.push("");
      
      // Table of contents
      reportLines.push("## Table of Contents");
      reportLines.push("1. [Eligibility Summary](#eligibility-summary)");
      reportLines.push("2. [Financial Analysis](#financial-analysis)");
      reportLines.push("3. [Planning Strategies](#planning-strategies)");
      reportLines.push("4. [Implementation Steps](#implementation-steps)");
      if (this.clientInfo.maritalStatus === 'married') {
        reportLines.push("5. [Spouse Considerations](#spouse-considerations)");
      }
      reportLines.push("6. [Application Guidance](#application-guidance)");
      reportLines.push("7. [Post-Eligibility Considerations](#post-eligibility-considerations)");
      reportLines.push("");
      
      // Eligibility summary
      const eligibilityResult = initialAssessment.eligibility || {};
      const [status, statusReason] = this._getEligibilityStatus(eligibilityResult);
      reportLines.push("## Eligibility Summary");
      reportLines.push(`**Status:** ${status}`);
      reportLines.push(`**Reason:** ${statusReason}`);
      reportLines.push(`**Planning Urgency:** ${eligibilityResult.urgency || 'Unknown'}`);
      reportLines.push("");
      
      // Financial analysis: Asset analysis section
      reportLines.push("## Financial Analysis");
      reportLines.push("### Asset Analysis");
      reportLines.push(`**Countable Assets:** ${this._formatCurrency(eligibilityResult.countableAssets || 0)}`);
      reportLines.push(`**Non-Countable Assets:** ${this._formatCurrency(eligibilityResult.nonCountableAssets || 0)}`);
      reportLines.push(`**Resource Limit:** ${this._formatCurrency(eligibilityResult.resourceLimit || 0)}`);
      reportLines.push(`**Spend-down Amount:** ${this._formatCurrency(eligibilityResult.spenddownAmount || 0)}`);
      reportLines.push("");
      
      // Disclaimer
      reportLines.push("## Disclaimer");
      reportLines.push("*This report is based on the information provided and current Medicaid rules. " +
                        "Medicaid regulations vary by state and change frequently. " +
                        "This report is not legal advice. " +
                        "Please consult with a qualified elder law attorney before implementing any strategies.*");
      
      if (outputFormat === 'markdown') {
        return reportLines.join('\n');
      } else if (outputFormat === 'plain') {
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
   * Generate a simplified, client-friendly report
   * @param {string} outputFormat - Format for output ('markdown', 'plain', 'html')
   * @returns {string} - Formatted report
   */
  generateClientFriendlyReport(outputFormat = 'markdown') {
    try {
      logger.info(`Generating client-friendly report in ${outputFormat} format`);
      
      const eligibilityResult = this.results?.initialAssessment?.eligibility;
      if (!eligibilityResult) {
        return "Error: Missing eligibility assessment results";
      }
      
      const [status, statusReason] = this._getEligibilityStatus(eligibilityResult);
      
      const reportLines = [];
      reportLines.push("# Your Medicaid Planning Report");
      reportLines.push(`**Prepared for:** ${this.clientInfo.name || 'You'}`);
      reportLines.push(`**Date:** ${this.currentDate}`);
      const formattedState = this.state.replace('_', ' ');
      reportLines.push(`**State:** ${formattedState.charAt(0).toUpperCase() + formattedState.slice(1)}`);
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
      reportLines.push(`**Your countable resources:** ${this._formatCurrency(countableAssets)}`);
      reportLines.push(`**Medicaid's resource limit:** ${this._formatCurrency(resourceLimit)}`);
      
      if (countableAssets > resourceLimit) {
        reportLines.push(`**Difference to become eligible:** ${this._formatCurrency(spenddown)}`);
        reportLines.push("");
        reportLines.push(`This means you would need to reduce your countable resources by ${this._formatCurrency(spenddown)} to qualify for Medicaid.`);
      } else {
        reportLines.push("");
        reportLines.push("Your countable resources are within Medicaid's limits.");
      }
      reportLines.push("");
      
      // Next steps in plain language
      reportLines.push("## What You Can Do Next");
      const eligibilityStrategies = eligibilityResult.planStrategies || [];
      const allStrategies = [...eligibilityStrategies];
      
      const simplifiedStrategies = [];
      for (const strategy of allStrategies) {
        if (strategy.toLowerCase().includes("convert countable assets")) {
          simplifiedStrategies.push("Consider moving funds into exempt assets like home improvements or a new vehicle");
        } else if (strategy.toLowerCase().includes("funeral expenses")) {
          simplifiedStrategies.push("Pre-pay funeral and burial expenses");
        } else if (strategy.toLowerCase().includes("miller trust")) {
          simplifiedStrategies.push("Set up a special trust to manage excess income");
        } else if (strategy.toLowerCase().includes("gifting")) {
          simplifiedStrategies.push("Talk to an attorney about potential gifting strategies (this has special rules)");
        } else if (strategy.toLowerCase().includes("annuities")) {
          simplifiedStrategies.push("Explore converting assets to income through a special Medicaid annuity");
        } else {
          simplifiedStrategies.push(strategy);
        }
      }
      
      const topStrategies = simplifiedStrategies.slice(0, 5);
      for (const strategy of topStrategies) {
        reportLines.push(`- ${strategy}`);
      }
      
      reportLines.push("");
      reportLines.push("The most important next step is to consult with an elder law attorney who specializes in Medicaid planning.");
      reportLines.push("");
      
      // Timeline in plain language
      reportLines.push("## What to Expect");
      reportLines.push("- **First:** Meet with an attorney to discuss your specific situation (1-2 weeks)");
      reportLines.push("- **Next:** Implement planning strategies to address resource issues (1-3 months)");
      reportLines.push("- **Then:** Prepare and submit your Medicaid application (2-4 weeks)");
      reportLines.push("- **Finally:** Respond to any requests for additional information (1-3 months)");
      reportLines.push("");
      
      // Common questions
      reportLines.push("## Common Questions");
      reportLines.push("**Will I lose my home?**");
      reportLines.push("In most cases, your home is an exempt asset and is protected.");
      reportLines.push("");
      reportLines.push("**What medical services does Medicaid cover?**");
      reportLines.push("Medicaid covers doctor visits, hospital care, nursing home care, and in many states, home care services.");
      reportLines.push("");
      reportLines.push("**How long does the application process take?**");
      reportLines.push("Typically, the Medicaid application process takes 45-90 days from submission to approval.");
      reportLines.push("");
      
      // Next steps checklist
      reportLines.push("## Your Checklist");
      reportLines.push("- [ ] Gather all financial statements (bank, investment, retirement accounts)");
      reportLines.push("- [ ] Collect income documentation (Social Security, pension, other income)");
      reportLines.push("- [ ] Make a list of all assets (home, car, valuables, etc.)");
      reportLines.push("- [ ] Schedule a meeting with an elder law attorney");
      reportLines.push("- [ ] Make no gifts or transfers without professional advice");
      reportLines.push("");
      
      // Disclaimer in plain language
      reportLines.push("## Important Note");
      reportLines.push("This report is based on the information you provided and the current Medicaid rules in your state. " +
                        "Medicaid rules are complicated and change often. " +
                        "This report is not legal advice. " +
                        "Please talk to an elder law attorney before making any financial decisions.");
      
      if (outputFormat === 'markdown') {
        return reportLines.join('\n');
      } else if (outputFormat === 'plain') {
        let text = reportLines.join('\n');
        text = text.replace(/# /g, '').replace(/## /g, '').replace(/\*\*/g, '').replace(/\*/g, '');
        text = text.replace(/- \[ \]/g, "□");
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
   * Save a report to a file
   * @param {string} reportText - Report text to save
   * @param {string} filename - Filename to save to
   * @param {string} directory - Directory to save in (optional)
   * @returns {Promise<Object>} - Save result with file path and report ID
   */
  async saveReport(reportText, filename, directory = null) {
    try {
      const reportDir = directory || path.join(process.cwd(), 'reports');
      await fs.mkdir(reportDir, { recursive: true });
      
      const fullPath = path.join(reportDir, filename);
      const reportId = uuidv4();
      
      await fs.writeFile(fullPath, reportText, 'utf8');
      logger.info(`Report saved to ${fullPath}`);
      return {
        success: true,
        reportId,
        filePath: fullPath,
        message: 'Report saved successfully'
      };
    } catch (error) {
      logger.error(`Error saving report: ${error.message}`);
      return {
        success: false,
        error: `Error saving report: ${error.message}`
      };
    }
  }
}

module.exports = MedicaidPlanningReportGenerator;
