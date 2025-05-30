const axios = require('axios');
const logger = require('../../config/logger');

class GHLIntegrationService {
  constructor() {
    this.baseURL = 'https://services.leadconnectorhq.com';
    this.clientId = process.env.GHL_CLIENT_ID;
    this.clientSecret = process.env.GHL_CLIENT_SECRET;
    this.redirectUri = process.env.GHL_REDIRECT_URI;
    
    // Rate limiting configuration
    this.rateLimits = {
      burst: { requests: 100, window: 10000 }, // 100 requests per 10 seconds
      daily: { requests: 200000, window: 86400000 } // 200k requests per day
    };
    
    // Request tracking for rate limiting
    this.requestTracking = {
      burst: [],
      daily: []
    };
    
    // Token storage (in production, use persistent storage like Redis)
    this.tokenCache = new Map();
    
    // Retry configuration
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 60000  // 60 seconds
    };
  }

  /**
   * OAuth Authentication Methods
   */
  
  // Generate OAuth authorization URL
  getAuthorizationUrl(state) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'contacts.readonly contacts.write opportunities.readonly opportunities.write',
      state: state
    });
    
    return `${this.baseURL}/oauth/authorize?${params.toString()}`;
  }
  
  // Exchange authorization code for access token
  async exchangeCodeForToken(code) {
    try {
      logger.info('Exchanging authorization code for access token');
      
      const response = await this.makeRequest({
        method: 'POST',
        url: `${this.baseURL}/oauth/token`,
        data: {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.redirectUri
        },
        skipAuth: true
      });
      
      const tokenData = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: Date.now() + (response.data.expires_in * 1000),
        locationId: response.data.locationId,
        companyId: response.data.companyId,
        userId: response.data.userId
      };
      
      // Store token (in production, use persistent storage)
      this.tokenCache.set(tokenData.userId, tokenData);
      
      logger.info('Successfully obtained access token', { userId: tokenData.userId });
      return tokenData;
    } catch (error) {
      logger.error('Failed to exchange code for token', error);
      throw this.handleApiError(error);
    }
  }
  
  // Refresh access token
  async refreshAccessToken(userId) {
    try {
      const tokenData = this.tokenCache.get(userId);
      if (!tokenData || !tokenData.refreshToken) {
        throw new Error('No refresh token available');
      }
      
      logger.info('Refreshing access token', { userId });
      
      const response = await this.makeRequest({
        method: 'POST',
        url: `${this.baseURL}/oauth/token`,
        data: {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: tokenData.refreshToken
        },
        skipAuth: true
      });
      
      const updatedTokenData = {
        ...tokenData,
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || tokenData.refreshToken,
        expiresAt: Date.now() + (response.data.expires_in * 1000)
      };
      
      this.tokenCache.set(userId, updatedTokenData);
      
      logger.info('Successfully refreshed access token', { userId });
      return updatedTokenData;
    } catch (error) {
      logger.error('Failed to refresh access token', error);
      throw this.handleApiError(error);
    }
  }
  
  // Get valid access token (refresh if needed)
  async getValidAccessToken(userId) {
    const tokenData = this.tokenCache.get(userId);
    if (!tokenData) {
      throw new Error('No token found for user');
    }
    
    // Check if token is expired or about to expire (5 minute buffer)
    if (Date.now() >= tokenData.expiresAt - 300000) {
      logger.info('Access token expired or expiring soon, refreshing', { userId });
      const refreshedData = await this.refreshAccessToken(userId);
      return refreshedData.accessToken;
    }
    
    return tokenData.accessToken;
  }

  /**
   * Contact Management Methods
   */
  
  // Create or update a contact
  async createOrUpdateContact(userId, contactData) {
    try {
      logger.info('Creating/updating contact', { userId, email: contactData.email });
      
      // First, try to find existing contact by email
      const existingContact = await this.findContactByEmail(userId, contactData.email);
      
      if (existingContact) {
        // Update existing contact
        return await this.updateContact(userId, existingContact.id, contactData);
      } else {
        // Create new contact
        const locationId = this.tokenCache.get(userId)?.locationId;
        if (!locationId) {
          throw new Error('Location ID not found');
        }
        
        const response = await this.makeRequest({
          method: 'POST',
          url: `${this.baseURL}/contacts/`,
          data: {
            locationId: locationId,
            ...contactData
          },
          userId
        });
        
        logger.info('Successfully created contact', { 
          userId, 
          contactId: response.data.contact.id 
        });
        
        return response.data.contact;
      }
    } catch (error) {
      logger.error('Failed to create/update contact', error);
      throw this.handleApiError(error);
    }
  }
  
  // Find contact by email
  async findContactByEmail(userId, email) {
    try {
      logger.info('Searching for contact by email', { userId, email });
      
      const response = await this.makeRequest({
        method: 'GET',
        url: `${this.baseURL}/contacts/`,
        params: {
          email: email
        },
        userId
      });
      
      if (response.data.contacts && response.data.contacts.length > 0) {
        logger.info('Found existing contact', { 
          userId, 
          contactId: response.data.contacts[0].id 
        });
        return response.data.contacts[0];
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to search for contact', error);
      throw this.handleApiError(error);
    }
  }
  
  // Update contact
  async updateContact(userId, contactId, updateData) {
    try {
      logger.info('Updating contact', { userId, contactId });
      
      const response = await this.makeRequest({
        method: 'PUT',
        url: `${this.baseURL}/contacts/${contactId}`,
        data: updateData,
        userId
      });
      
      logger.info('Successfully updated contact', { userId, contactId });
      return response.data.contact;
    } catch (error) {
      logger.error('Failed to update contact', error);
      throw this.handleApiError(error);
    }
  }
  
  // Add note to contact
  async addNoteToContact(userId, contactId, noteContent) {
    try {
      logger.info('Adding note to contact', { userId, contactId });
      
      const response = await this.makeRequest({
        method: 'POST',
        url: `${this.baseURL}/contacts/${contactId}/notes`,
        data: {
          body: noteContent
        },
        userId
      });
      
      logger.info('Successfully added note to contact', { userId, contactId });
      return response.data.note;
    } catch (error) {
      logger.error('Failed to add note to contact', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * Opportunity Management Methods
   */
  
  // Create opportunity for Medicaid planning
  async createMedicaidPlanningOpportunity(userId, contactId, opportunityData) {
    try {
      logger.info('Creating Medicaid planning opportunity', { userId, contactId });
      
      const locationId = this.tokenCache.get(userId)?.locationId;
      if (!locationId) {
        throw new Error('Location ID not found');
      }
      
      const defaultData = {
        name: 'Medicaid Planning Consultation',
        status: 'open',
        monetaryValue: 0,
        ...opportunityData
      };
      
      const response = await this.makeRequest({
        method: 'POST',
        url: `${this.baseURL}/opportunities/`,
        data: {
          locationId: locationId,
          contactId: contactId,
          ...defaultData
        },
        userId
      });
      
      logger.info('Successfully created opportunity', { 
        userId, 
        opportunityId: response.data.opportunity.id 
      });
      
      return response.data.opportunity;
    } catch (error) {
      logger.error('Failed to create opportunity', error);
      throw this.handleApiError(error);
    }
  }
  
  // Update opportunity
  async updateOpportunity(userId, opportunityId, updateData) {
    try {
      logger.info('Updating opportunity', { userId, opportunityId });
      
      const response = await this.makeRequest({
        method: 'PUT',
        url: `${this.baseURL}/opportunities/${opportunityId}`,
        data: updateData,
        userId
      });
      
      logger.info('Successfully updated opportunity', { userId, opportunityId });
      return response.data.opportunity;
    } catch (error) {
      logger.error('Failed to update opportunity', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * Webhook Handling
   */
  
  // Verify webhook signature
  verifyWebhookSignature(payload, signature) {
    // Implement webhook signature verification based on GHL's security requirements
    // This is a placeholder - actual implementation depends on GHL's webhook security
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.clientSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return signature === expectedSignature;
  }
  
  // Process webhook
  async processWebhook(event, payload) {
    try {
      logger.info('Processing webhook', { event, payload });
      
      switch (event) {
        case 'contact.created':
          await this.handleContactCreated(payload);
          break;
        case 'contact.updated':
          await this.handleContactUpdated(payload);
          break;
        case 'opportunity.created':
          await this.handleOpportunityCreated(payload);
          break;
        case 'opportunity.updated':
          await this.handleOpportunityUpdated(payload);
          break;
        default:
          logger.warn('Unhandled webhook event', { event });
      }
    } catch (error) {
      logger.error('Failed to process webhook', { event, error });
      throw error;
    }
  }
  
  // Webhook handlers (implement based on your business logic)
  async handleContactCreated(payload) {
    logger.info('Handling contact created webhook', { contactId: payload.id });
    // Implement your business logic here
  }
  
  async handleContactUpdated(payload) {
    logger.info('Handling contact updated webhook', { contactId: payload.id });
    // Implement your business logic here
  }
  
  async handleOpportunityCreated(payload) {
    logger.info('Handling opportunity created webhook', { opportunityId: payload.id });
    // Implement your business logic here
  }
  
  async handleOpportunityUpdated(payload) {
    logger.info('Handling opportunity updated webhook', { opportunityId: payload.id });
    // Implement your business logic here
  }

  /**
   * Rate Limiting and Request Management
   */
  
  // Check rate limits
  checkRateLimits() {
    const now = Date.now();
    
    // Clean up old burst requests
    this.requestTracking.burst = this.requestTracking.burst.filter(
      timestamp => now - timestamp < this.rateLimits.burst.window
    );
    
    // Clean up old daily requests
    this.requestTracking.daily = this.requestTracking.daily.filter(
      timestamp => now - timestamp < this.rateLimits.daily.window
    );
    
    // Check burst limit
    if (this.requestTracking.burst.length >= this.rateLimits.burst.requests) {
      const oldestRequest = this.requestTracking.burst[0];
      const waitTime = this.rateLimits.burst.window - (now - oldestRequest);
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }
    
    // Check daily limit
    if (this.requestTracking.daily.length >= this.rateLimits.daily.requests) {
      throw new Error('Daily rate limit exceeded. Please try again tomorrow.');
    }
  }
  
  // Track request
  trackRequest() {
    const now = Date.now();
    this.requestTracking.burst.push(now);
    this.requestTracking.daily.push(now);
  }
  
  // Make request with retry logic
  async makeRequest(options, retryCount = 0) {
    try {
      // Check rate limits before making request
      this.checkRateLimits();
      
      // Build request configuration
      const config = {
        method: options.method,
        url: options.url,
        params: options.params,
        data: options.data,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Version': '2021-07-28'
        }
      };
      
      // Add authorization header if not skipped
      if (!options.skipAuth) {
        const accessToken = await this.getValidAccessToken(options.userId);
        config.headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      // Track the request
      this.trackRequest();
      
      // Log the request
      logger.info('Making API request', {
        method: config.method,
        url: config.url,
        params: config.params
      });
      
      // Make the request
      const response = await axios(config);
      
      // Log successful response
      logger.info('API request successful', {
        method: config.method,
        url: config.url,
        status: response.status
      });
      
      return response;
    } catch (error) {
      // Handle rate limiting (429) with retry
      if (error.response?.status === 429 && retryCount < this.retryConfig.maxRetries) {
        const retryAfter = error.response.headers['retry-after'] 
          ? parseInt(error.response.headers['retry-after']) * 1000 
          : this.calculateBackoffDelay(retryCount);
        
        logger.warn('Rate limited, retrying after delay', {
          retryCount,
          retryAfter: retryAfter / 1000
        });
        
        await this.delay(retryAfter);
        return this.makeRequest(options, retryCount + 1);
      }
      
      // Handle auth errors (401) with token refresh
      if (error.response?.status === 401 && !options.skipAuth && retryCount === 0) {
        logger.warn('Unauthorized, attempting token refresh');
        await this.refreshAccessToken(options.userId);
        return this.makeRequest(options, retryCount + 1);
      }
      
      // Handle other retryable errors
      if (this.isRetryableError(error) && retryCount < this.retryConfig.maxRetries) {
        const delay = this.calculateBackoffDelay(retryCount);
        
        logger.warn('Retryable error, retrying after delay', {
          error: error.message,
          retryCount,
          delay: delay / 1000
        });
        
        await this.delay(delay);
        return this.makeRequest(options, retryCount + 1);
      }
      
      // Log and throw the error
      logger.error('API request failed', {
        method: options.method,
        url: options.url,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      throw error;
    }
  }
  
  // Calculate exponential backoff delay
  calculateBackoffDelay(retryCount) {
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(2, retryCount),
      this.retryConfig.maxDelay
    );
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }
  
  // Check if error is retryable
  isRetryableError(error) {
    if (!error.response) {
      // Network errors are retryable
      return true;
    }
    
    const status = error.response.status;
    // Retry on 5xx errors and specific 4xx errors
    return status >= 500 || status === 408 || status === 429;
  }
  
  // Delay helper
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Handle API errors
  handleApiError(error) {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return new Error(`Bad Request: ${data.message || 'Invalid request parameters'}`);
        case 401:
          return new Error('Unauthorized: Invalid or expired access token');
        case 403:
          return new Error('Forbidden: Insufficient permissions');
        case 404:
          return new Error('Not Found: Resource does not exist');
        case 429:
          return new Error('Rate Limited: Too many requests');
        case 500:
          return new Error('Internal Server Error: GHL service error');
        default:
          return new Error(`API Error (${status}): ${data.message || 'Unknown error'}`);
      }
    }
    
    if (error.request) {
      return new Error('Network Error: Unable to reach GHL API');
    }
    
    return error;
  }
}

module.exports = GHLIntegrationService;