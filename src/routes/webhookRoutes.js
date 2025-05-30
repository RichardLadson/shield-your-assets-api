const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const logger = require('../config/logger');

// Middleware to capture raw body for webhook signature verification
const rawBodyMiddleware = express.raw({ type: 'application/json' });

/**
 * Verify GoHighLevel webhook signature
 * @param {Buffer} rawBody - Raw request body
 * @param {string} signature - Signature from headers
 * @param {string} secret - Webhook secret
 * @returns {boolean} - Whether signature is valid
 */
const verifyWebhookSignature = (rawBody, signature, secret) => {
  try {
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );
  } catch (error) {
    logger.error('Error verifying webhook signature:', error);
    return false;
  }
};

/**
 * POST /api/webhooks/ghl
 * Main webhook endpoint for GoHighLevel events
 */
router.post('/ghl', rawBodyMiddleware, async (req, res) => {
  try {
    // Get signature from headers
    const signature = req.headers['x-ghl-signature'] || req.headers['x-webhook-signature'];
    const webhookSecret = process.env.GHL_WEBHOOK_SECRET;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(req.body, signature, webhookSecret);
      
      if (!isValid) {
        logger.warn('Invalid webhook signature received');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } else if (webhookSecret) {
      logger.warn('Webhook received without signature');
      return res.status(401).json({ error: 'Missing signature' });
    }

    // Parse the webhook payload
    const payload = JSON.parse(req.body.toString());
    const { event, data } = payload;

    logger.info('GoHighLevel webhook received', {
      event,
      dataKeys: Object.keys(data || {})
    });

    // Route to appropriate handler based on event type
    switch (event) {
      case 'contact.created':
        await handleContactCreated(data);
        break;
      
      case 'contact.updated':
        await handleContactUpdated(data);
        break;
      
      case 'opportunity.created':
        await handleOpportunityCreated(data);
        break;
      
      case 'opportunity.status_changed':
        await handleOpportunityStatusChanged(data);
        break;
      
      case 'form.submitted':
        await handleFormSubmitted(data);
        break;
      
      default:
        logger.info(`Unhandled webhook event: ${event}`);
    }

    // Always respond quickly to webhook
    res.status(200).json({ received: true });

  } catch (error) {
    logger.error('Error processing GoHighLevel webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/webhooks/assessment-complete
 * Internal webhook when assessment is done
 */
router.post('/assessment-complete', express.json(), async (req, res) => {
  try {
    // Verify internal API key
    const apiKey = req.headers['x-api-key'];
    const internalApiKey = process.env.INTERNAL_API_KEY;

    if (internalApiKey && apiKey !== internalApiKey) {
      logger.warn('Invalid API key for internal webhook');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { assessmentId, clientId, results, reportUrl } = req.body;

    // Validate required fields
    if (!assessmentId || !clientId) {
      return res.status(400).json({ 
        error: 'Missing required fields: assessmentId and clientId' 
      });
    }

    logger.info('Assessment complete webhook received', {
      assessmentId,
      clientId,
      hasResults: !!results,
      hasReportUrl: !!reportUrl
    });

    // Process assessment completion
    await handleAssessmentComplete({
      assessmentId,
      clientId,
      results,
      reportUrl
    });

    res.status(200).json({ 
      success: true,
      message: 'Assessment completion processed'
    });

  } catch (error) {
    logger.error('Error processing assessment complete webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/ghl/callback
 * OAuth callback endpoint for GoHighLevel
 */
router.get('/auth/ghl/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Handle OAuth errors
    if (error) {
      logger.error('GoHighLevel OAuth error:', {
        error,
        error_description
      });
      return res.redirect(`/auth/error?message=${encodeURIComponent(error_description || error)}`);
    }

    // Validate required parameters
    if (!code || !state) {
      logger.warn('Missing OAuth callback parameters');
      return res.redirect('/auth/error?message=Missing%20required%20parameters');
    }

    logger.info('GoHighLevel OAuth callback received', {
      hasCode: !!code,
      state
    });

    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code);

    if (!tokenData || !tokenData.access_token) {
      logger.error('Failed to exchange code for token');
      return res.redirect('/auth/error?message=Failed%20to%20authenticate');
    }

    // Store token and complete authentication
    await storeAuthToken(tokenData, state);

    // Redirect to success page
    res.redirect('/auth/success');

  } catch (error) {
    logger.error('Error processing GoHighLevel OAuth callback:', error);
    res.redirect('/auth/error?message=Authentication%20failed');
  }
});

// Event Handlers
async function handleContactCreated(data) {
  try {
    logger.info('Processing contact created event', { contactId: data.id });
    // TODO: Implement contact creation logic
  } catch (error) {
    logger.error('Error handling contact created:', error);
    throw error;
  }
}

async function handleContactUpdated(data) {
  try {
    logger.info('Processing contact updated event', { contactId: data.id });
    // TODO: Implement contact update logic
  } catch (error) {
    logger.error('Error handling contact updated:', error);
    throw error;
  }
}

async function handleOpportunityCreated(data) {
  try {
    logger.info('Processing opportunity created event', { opportunityId: data.id });
    // TODO: Implement opportunity creation logic
  } catch (error) {
    logger.error('Error handling opportunity created:', error);
    throw error;
  }
}

async function handleOpportunityStatusChanged(data) {
  try {
    logger.info('Processing opportunity status changed event', {
      opportunityId: data.id,
      status: data.status
    });
    // TODO: Implement status change logic
  } catch (error) {
    logger.error('Error handling opportunity status changed:', error);
    throw error;
  }
}

async function handleFormSubmitted(data) {
  try {
    logger.info('Processing form submitted event', { formId: data.form_id });
    // TODO: Implement form submission logic
  } catch (error) {
    logger.error('Error handling form submitted:', error);
    throw error;
  }
}

async function handleAssessmentComplete(data) {
  try {
    logger.info('Processing assessment completion', {
      assessmentId: data.assessmentId,
      clientId: data.clientId
    });
    // TODO: Implement assessment completion logic
    // - Update GoHighLevel contact
    // - Create/update opportunity
    // - Send notification
  } catch (error) {
    logger.error('Error handling assessment completion:', error);
    throw error;
  }
}

async function exchangeCodeForToken(code) {
  try {
    // TODO: Implement OAuth token exchange
    // This would make a POST request to GoHighLevel's token endpoint
    logger.info('Exchanging authorization code for token');
    
    // Placeholder for actual implementation
    return {
      access_token: 'placeholder_token',
      refresh_token: 'placeholder_refresh',
      expires_in: 3600
    };
  } catch (error) {
    logger.error('Error exchanging code for token:', error);
    throw error;
  }
}

async function storeAuthToken(tokenData, state) {
  try {
    logger.info('Storing authentication token');
    // TODO: Implement secure token storage
    // - Encrypt tokens
    // - Store in database
    // - Associate with user/account
  } catch (error) {
    logger.error('Error storing auth token:', error);
    throw error;
  }
}

module.exports = router;