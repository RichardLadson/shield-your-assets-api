const logger = require('../config/logger');
const axios = require('axios');
const { Client } = require('../models');

class IntegrationController {
  constructor() {
    this.ghlApiKey = process.env.GHL_API_KEY;
    this.ghlLocationId = process.env.GHL_LOCATION_ID;
    this.ghlBaseUrl = process.env.GHL_BASE_URL || 'https://api.gohighlevel.com/v1';
    
    if (!this.ghlApiKey || !this.ghlLocationId) {
      logger.warn('GoHighLevel integration not configured - missing API key or location ID');
    }
  }

  /**
   * Sync client data to GoHighLevel after assessment completion
   * @param {Object} clientData - Client information from assessment
   * @returns {Object} GHL contact response
   */
  async syncClientToGHL(clientData) {
    try {
      logger.info('Syncing client to GoHighLevel', { clientId: clientData.id });
      
      if (!this.ghlApiKey) {
        logger.warn('GHL sync skipped - integration not configured');
        return null;
      }

      // Check if contact already exists
      const existingContact = await this.findGHLContact(clientData.email);
      
      if (existingContact) {
        // Update existing contact
        const updated = await this.updateGHLContact(existingContact.id, clientData);
        logger.info('Updated existing GHL contact', { 
          ghlContactId: existingContact.id,
          clientId: clientData.id 
        });
        return updated;
      }

      // Create new contact
      const ghlPayload = {
        firstName: clientData.firstName,
        lastName: clientData.lastName,
        email: clientData.email,
        phone: clientData.phone,
        locationId: this.ghlLocationId,
        customFields: {
          medicaid_client_id: clientData.id,
          medicaid_assessment_date: new Date().toISOString(),
          medicaid_status: 'assessment_complete',
          state: clientData.state,
          marital_status: clientData.maritalStatus,
          medicaid_eligibility: clientData.eligibilityStatus || 'pending'
        },
        tags: ['medicaid-assessment', 'auto-synced']
      };

      const response = await axios.post(
        `${this.ghlBaseUrl}/contacts`,
        ghlPayload,
        {
          headers: {
            'Authorization': `Bearer ${this.ghlApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Created new GHL contact', { 
        ghlContactId: response.data.contact.id,
        clientId: clientData.id 
      });

      // Update client record with GHL ID
      if (clientData.id) {
        await this.updateClientWithGHLId(clientData.id, response.data.contact.id);
      }

      return response.data.contact;
    } catch (error) {
      logger.error('Failed to sync client to GHL', { 
        error: error.message,
        clientId: clientData.id 
      });
      throw error;
    }
  }

  /**
   * Create opportunity in GoHighLevel with report data
   * @param {Object} reportData - Assessment report data
   * @param {String} ghlContactId - GoHighLevel contact ID
   * @returns {Object} GHL opportunity response
   */
  async createGHLOpportunity(reportData, ghlContactId) {
    try {
      logger.info('Creating GHL opportunity', { 
        reportId: reportData.reportId,
        ghlContactId 
      });

      if (!this.ghlApiKey) {
        logger.warn('GHL opportunity creation skipped - integration not configured');
        return null;
      }

      const opportunityPayload = {
        name: `Medicaid Planning - ${reportData.clientName}`,
        contactId: ghlContactId,
        locationId: this.ghlLocationId,
        pipelineId: process.env.GHL_PIPELINE_ID,
        pipelineStageId: process.env.GHL_STAGE_ID || 'assessment_complete',
        monetaryValue: reportData.estimatedSavings || 0,
        status: 'open',
        customFields: {
          report_id: reportData.reportId,
          assessment_date: reportData.assessmentDate,
          eligibility_status: reportData.eligibilityStatus,
          total_assets: reportData.totalAssets,
          estimated_savings: reportData.estimatedSavings,
          planning_strategies: reportData.strategies?.join(', ') || '',
          priority_level: reportData.priorityLevel || 'medium'
        },
        notes: `Assessment completed on ${reportData.assessmentDate}. 
                Eligibility: ${reportData.eligibilityStatus}
                Key recommendations: ${reportData.keyRecommendations || 'See full report'}`
      };

      const response = await axios.post(
        `${this.ghlBaseUrl}/opportunities`,
        opportunityPayload,
        {
          headers: {
            'Authorization': `Bearer ${this.ghlApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Created GHL opportunity', { 
        opportunityId: response.data.opportunity.id,
        reportId: reportData.reportId 
      });

      return response.data.opportunity;
    } catch (error) {
      logger.error('Failed to create GHL opportunity', { 
        error: error.message,
        reportId: reportData.reportId 
      });
      throw error;
    }
  }

  /**
   * Attach report link/data to GoHighLevel contact
   * @param {String} ghlContactId - GoHighLevel contact ID
   * @param {Object} reportInfo - Report information
   * @returns {Object} Update response
   */
  async attachReportToGHL(ghlContactId, reportInfo) {
    try {
      logger.info('Attaching report to GHL contact', { 
        ghlContactId,
        reportId: reportInfo.reportId 
      });

      if (!this.ghlApiKey) {
        logger.warn('GHL report attachment skipped - integration not configured');
        return null;
      }

      // Add note with report link
      const notePayload = {
        contactId: ghlContactId,
        body: `Medicaid Assessment Report Generated
               
Report ID: ${reportInfo.reportId}
Date: ${reportInfo.generatedDate}
Status: ${reportInfo.eligibilityStatus}

View Full Report: ${reportInfo.reportUrl}

Key Findings:
${reportInfo.keyFindings || 'See full report for details'}`,
        userId: process.env.GHL_USER_ID
      };

      await axios.post(
        `${this.ghlBaseUrl}/contacts/${ghlContactId}/notes`,
        notePayload,
        {
          headers: {
            'Authorization': `Bearer ${this.ghlApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update contact custom fields with report data
      const updatePayload = {
        customFields: {
          latest_report_id: reportInfo.reportId,
          latest_report_date: reportInfo.generatedDate,
          latest_report_url: reportInfo.reportUrl,
          medicaid_eligibility_status: reportInfo.eligibilityStatus,
          next_action_required: reportInfo.nextAction || 'Review report'
        }
      };

      const response = await axios.put(
        `${this.ghlBaseUrl}/contacts/${ghlContactId}`,
        updatePayload,
        {
          headers: {
            'Authorization': `Bearer ${this.ghlApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Attached report to GHL contact', { 
        ghlContactId,
        reportId: reportInfo.reportId 
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to attach report to GHL', { 
        error: error.message,
        ghlContactId,
        reportId: reportInfo.reportId 
      });
      throw error;
    }
  }

  /**
   * Main workflow orchestrator for assessment completion
   * @param {Object} assessmentData - Complete assessment data
   * @returns {Object} Integration results
   */
  async handleAssessmentComplete(assessmentData) {
    const results = {
      success: false,
      ghlContactId: null,
      ghlOpportunityId: null,
      errors: []
    };

    try {
      logger.info('Starting GHL integration workflow', { 
        clientId: assessmentData.clientData.id 
      });

      // Step 1: Sync client to GHL
      let ghlContact;
      try {
        ghlContact = await this.syncClientToGHL(assessmentData.clientData);
        results.ghlContactId = ghlContact?.id;
      } catch (error) {
        results.errors.push({
          step: 'syncClient',
          error: error.message
        });
        logger.error('Client sync failed, continuing with workflow', { error: error.message });
      }

      // Step 2: Create opportunity if contact was synced
      if (ghlContact?.id && assessmentData.reportData) {
        try {
          const opportunity = await this.createGHLOpportunity(
            assessmentData.reportData,
            ghlContact.id
          );
          results.ghlOpportunityId = opportunity?.id;
        } catch (error) {
          results.errors.push({
            step: 'createOpportunity',
            error: error.message
          });
          logger.error('Opportunity creation failed, continuing with workflow', { error: error.message });
        }
      }

      // Step 3: Attach report if contact exists
      if (ghlContact?.id && assessmentData.reportInfo) {
        try {
          await this.attachReportToGHL(ghlContact.id, assessmentData.reportInfo);
        } catch (error) {
          results.errors.push({
            step: 'attachReport',
            error: error.message
          });
          logger.error('Report attachment failed', { error: error.message });
        }
      }

      // Step 4: Trigger any webhooks or additional integrations
      if (process.env.GHL_WEBHOOK_URL) {
        try {
          await this.triggerWebhook(assessmentData, results);
        } catch (error) {
          results.errors.push({
            step: 'webhook',
            error: error.message
          });
          logger.error('Webhook trigger failed', { error: error.message });
        }
      }

      results.success = results.errors.length === 0;
      
      logger.info('GHL integration workflow completed', { 
        success: results.success,
        errorCount: results.errors.length,
        ghlContactId: results.ghlContactId,
        ghlOpportunityId: results.ghlOpportunityId
      });

      return results;
    } catch (error) {
      logger.error('Critical error in GHL integration workflow', { 
        error: error.message,
        stack: error.stack 
      });
      results.errors.push({
        step: 'workflow',
        error: error.message
      });
      return results;
    }
  }

  /**
   * Find existing GHL contact by email
   * @private
   */
  async findGHLContact(email) {
    try {
      const response = await axios.get(
        `${this.ghlBaseUrl}/contacts/lookup`,
        {
          params: { email, locationId: this.ghlLocationId },
          headers: {
            'Authorization': `Bearer ${this.ghlApiKey}`
          }
        }
      );
      return response.data.contact;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update existing GHL contact
   * @private
   */
  async updateGHLContact(contactId, clientData) {
    const updatePayload = {
      customFields: {
        medicaid_client_id: clientData.id,
        medicaid_last_assessment: new Date().toISOString(),
        medicaid_status: 'assessment_updated'
      }
    };

    const response = await axios.put(
      `${this.ghlBaseUrl}/contacts/${contactId}`,
      updatePayload,
      {
        headers: {
          'Authorization': `Bearer ${this.ghlApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.contact;
  }

  /**
   * Update client record with GHL contact ID
   * @private
   */
  async updateClientWithGHLId(clientId, ghlContactId) {
    try {
      await Client.update(
        { ghl_contact_id: ghlContactId },
        { where: { id: clientId } }
      );
      logger.info('Updated client with GHL ID', { clientId, ghlContactId });
    } catch (error) {
      logger.error('Failed to update client with GHL ID', { 
        error: error.message,
        clientId,
        ghlContactId 
      });
    }
  }

  /**
   * Trigger webhook for additional integrations
   * @private
   */
  async triggerWebhook(assessmentData, integrationResults) {
    const webhookPayload = {
      event: 'medicaid_assessment_complete',
      timestamp: new Date().toISOString(),
      data: {
        clientId: assessmentData.clientData.id,
        reportId: assessmentData.reportData?.reportId,
        ghlContactId: integrationResults.ghlContactId,
        ghlOpportunityId: integrationResults.ghlOpportunityId,
        eligibilityStatus: assessmentData.reportData?.eligibilityStatus
      }
    };

    await axios.post(
      process.env.GHL_WEBHOOK_URL,
      webhookPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': process.env.GHL_WEBHOOK_SECRET
        },
        timeout: 5000
      }
    );

    logger.info('Webhook triggered successfully');
  }
}

module.exports = new IntegrationController();