// src/controllers/reportController.js
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const MedicaidPlanningReportGenerator = require('../services/reporting/reportGenerator');

/**
 * Generate a report based on planning results.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
async function generateReport(req, res) {
  try {
    logger.info('Received report generation request');
    
    // Destructure request body (state is required now)
    const { planningResults, clientInfo, reportType, outputFormat, state } = req.body;
    
    // Validate required fields – state is required here
    if (!planningResults || !clientInfo || !state) {
      logger.error('Missing required fields in report generation request');
      return res.status(400).json({
        error: 'Missing required fields: planningResults, clientInfo, and state are required',
        status: 'error'
      });
    }
    
    // Validate report type. Allow professional along with the others.
    const validReportTypes = ['summary', 'detailed', 'professional', 'client-friendly'];
    const selectedReportType = reportType || 'summary';
    if (!validReportTypes.includes(selectedReportType)) {
      logger.error(`Invalid report type: ${selectedReportType}`);
      return res.status(400).json({
        error: `Invalid report type. Must be one of: ${validReportTypes.join(', ')}`,
        status: 'error'
      });
    }
    
    // Validate output format
    const validFormats = ['markdown', 'plain', 'html'];
    const selectedFormat = outputFormat || 'html';
    if (!validFormats.includes(selectedFormat)) {
      logger.error(`Invalid output format: ${selectedFormat}`);
      return res.status(400).json({
        error: `Invalid output format. Must be one of: ${validFormats.join(', ')}`,
        status: 'error'
      });
    }
    
    // Create an instance of the report generator.
    const reportGenerator = new MedicaidPlanningReportGenerator(
      planningResults,
      clientInfo,
      state
    );
    
    // Generate the report based on the selected report type.
    let reportContent;
    if (selectedReportType === 'detailed') {
      reportContent = reportGenerator.generateDetailedReport(selectedFormat);
    } else if (selectedReportType === 'client-friendly') {
      reportContent = reportGenerator.generateClientFriendlyReport(selectedFormat);
    } else if (
      selectedReportType === 'professional' &&
      typeof reportGenerator.generateProfessionalReport === 'function'
    ) {
      reportContent = reportGenerator.generateProfessionalReport(selectedFormat);
    } else {
      // Fallback to summary report if professional is not implemented
      reportContent = reportGenerator.generateSummaryReport(selectedFormat);
    }
    
    // Generate a unique report ID.
    const reportId = uuidv4();
    
    // Build the filename – use .html extension for HTML output; otherwise, .md.
    const filename = `${clientInfo.name || 'client'}_${selectedReportType}_${reportId}.${selectedFormat === 'html' ? 'html' : 'md'}`;
    
    // Save the report using the report generator saveReport method.
    const saveResult = await reportGenerator.saveReport(reportContent, filename);
    
    logger.info(`Successfully generated report with ID: ${reportId}`);
    return res.status(200).json({
      reportId,
      clientName: clientInfo.name || 'Client',
      reportType: selectedReportType,
      outputFormat: selectedFormat,
      generatedAt: new Date().toISOString(),
      content: reportContent,
      filePath: saveResult.success ? saveResult.filePath : null,
      status: 'success'
    });
  } catch (error) {
    logger.error(`Error in generateReport controller: ${error.message}`);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      status: 'error'
    });
  }
}

/**
 * Download a previously generated report.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
async function downloadReport(req, res) {
  try {
    const { reportId } = req.params;
    
    if (!reportId) {
      logger.error('Report ID is required');
      return res.status(400).json({
        error: 'Report ID is required',
        status: 'error'
      });
    }
    
    // For now, we'll assume reports are stored in the reports directory at the project root.
    const reportsDir = path.join(process.cwd(), 'reports');
    
    try {
      const files = await fs.readdir(reportsDir);
      const reportFile = files.find(file => file.includes(reportId));
      
      if (reportFile) {
        const filePath = path.join(reportsDir, reportFile);
        const content = await fs.readFile(filePath, 'utf8');
        
        // Set headers based on file type.
        if (reportFile.endsWith('.html')) {
          res.setHeader('Content-Type', 'text/html');
        } else {
          res.setHeader('Content-Type', 'text/plain');
        }
        res.setHeader('Content-Disposition', `attachment; filename="${reportFile}"`);
        
        return res.send(content);
      } else {
        logger.error(`Report with ID ${reportId} not found`);
        return res.status(404).json({
          error: `Report with ID ${reportId} not found`,
          status: 'error'
        });
      }
    } catch (error) {
      logger.error(`Error finding report file: ${error.message}`);
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        status: 'error'
      });
    }
  } catch (error) {
    logger.error(`Error in downloadReport controller: ${error.message}`);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      status: 'error'
    });
  }
}

module.exports = {
  generateReport,
  downloadReport
};
