# GoHighLevel Integration Guide

## Quick Start

### 1. Get Your GHL Credentials

1. Log into your GoHighLevel account
2. Navigate to **Settings > Business Profile > API Keys**
3. Generate a new API key (requires Pro plan or above)
4. Note your Location ID from **Settings > Business Profile**

### 2. Configure Environment Variables

Add these to your `.env` file:

```bash
# Required for basic integration
GHL_API_KEY=your_api_key_here
GHL_LOCATION_ID=your_location_id_here

# Optional - for advanced features
GHL_BASE_URL=https://rest.gohighlevel.com/v2
GHL_PIPELINE_ID=your_pipeline_id  # Find in Pipelines section
GHL_STAGE_ID=your_initial_stage_id  # Find in Pipeline stages
GHL_USER_ID=your_user_id  # Find in Settings > My Staff
GHL_WEBHOOK_URL=https://yourapp.com/api/webhooks/ghl
GHL_WEBHOOK_SECRET=your_webhook_secret

# For OAuth (future implementation)
GHL_CLIENT_ID=your_oauth_client_id
GHL_CLIENT_SECRET=your_oauth_client_secret
GHL_REDIRECT_URI=https://yourapp.com/api/auth/ghl/callback
```

### 3. Test the Integration

Start your backend server and test:

```bash
curl http://localhost:3001/api/planning/test-ghl-integration
```

Expected response:
```json
{
  "success": true,
  "message": "GHL integration test completed",
  "configuration": {
    "hasApiKey": true,
    "hasLocationId": true,
    "isConfigured": true
  },
  "results": {
    "contactCreated": true,
    "contactId": "ghl_contact_id",
    "opportunityCreated": true,
    "opportunityId": "ghl_opportunity_id"
  }
}
```

## Integration Features

### Automatic Sync on Assessment Completion

When a Medicaid planning assessment is completed:

1. **Contact Creation/Update**
   - Creates or updates contact in GHL
   - Syncs: name, email, phone, address
   - Adds custom fields for Medicaid data

2. **Opportunity Creation**
   - Creates opportunity in your pipeline
   - Sets monetary value
   - Includes assessment summary

3. **Report Storage**
   - Adds report link as contact note
   - Includes assessment findings
   - Stores shareable report URL

### Webhook Events

The integration listens for these GHL events:
- `contact.created`
- `contact.updated`
- `opportunity.created`
- `opportunity.status_changed`

## Custom Fields in GHL

Create these custom fields in your GHL account for better data organization:

1. **Contact Custom Fields**
   - `medicaid_assessment_date` (Date)
   - `client_id` (Text)
   - `eligibility_status` (Dropdown: qualified, not_qualified, pending)
   - `total_assets` (Number)
   - `monthly_income` (Number)
   - `spouse_status` (Dropdown: single, married, divorced, widowed)

2. **Opportunity Custom Fields**
   - `assessment_report_url` (URL)
   - `planning_type` (Text)
   - `estimated_savings` (Number)

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check your API key is correct
   - Ensure API key has necessary permissions

2. **403 Forbidden**
   - Verify your account has API access (Pro plan required)
   - Check location ID is correct

3. **429 Rate Limited**
   - The integration handles rate limiting automatically
   - If persistent, check your daily usage

4. **Network Errors**
   - Check your server can reach GHL API
   - Verify firewall settings

### Debug Mode

Enable debug logging:
```bash
DEBUG=ghl:* npm start
```

## API Usage

### Manual Sync

To manually sync a client:
```javascript
POST /api/webhooks/assessment-complete
{
  "clientId": "your_client_id",
  "assessmentId": "your_assessment_id"
}
```

### OAuth Flow (Future)

When OAuth is implemented:
1. Direct users to: `/api/auth/ghl`
2. Handle callback at: `/api/auth/ghl/callback`
3. Tokens stored securely in database

## Security Best Practices

1. **Never commit credentials** - Use environment variables
2. **Rotate API keys** regularly
3. **Use webhook secrets** for webhook verification
4. **Implement IP whitelisting** if available
5. **Monitor API usage** for anomalies

## Next Steps

1. **Set up GHL pipelines** for Medicaid planning workflow
2. **Create email templates** for automated client communication
3. **Configure automations** for follow-up sequences
4. **Set up reporting dashboards** in GHL

## Support

- GHL Developer Docs: https://developers.gohighlevel.com
- GHL Support: support@gohighlevel.com
- Your App Issues: [Create an issue in your repo]