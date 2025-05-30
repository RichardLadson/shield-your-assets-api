# GoHighLevel Email Automation Setup

## Overview
Instead of building email functionality in your app, leverage GoHighLevel's powerful automation features to automatically email reports to clients.

## Why Use GHL for Email?
- ✅ No additional code needed
- ✅ Professional email tracking (opens, clicks)
- ✅ Built-in unsubscribe management
- ✅ Automated follow-up sequences
- ✅ All client communications in one place
- ✅ A/B testing capabilities
- ✅ Better deliverability

## Setup Instructions

### Step 1: Create Email Template

1. **Navigate to**: Marketing → Emails → Templates
2. **Create New Template**: "Medicaid Assessment Report"
3. **Template Content**:

```html
Subject: Your Medicaid Planning Assessment Report is Ready

Hi {{contact.first_name}},

Thank you for completing your Medicaid planning assessment. Your personalized report is now ready!

Based on your financial information, we've identified strategies that could help protect approximately {{opportunity.custom_field.protectable_assets}} of your assets while qualifying for Medicaid benefits.

**View Your Report:** {{opportunity.custom_field.report_url}}

Your report includes:
✓ Detailed eligibility analysis
✓ Asset protection strategies
✓ Personalized recommendations
✓ Next steps for implementation

The report will be available for 30 days. We recommend downloading a copy for your records.

If you have questions or would like to discuss implementing these strategies, please don't hesitate to reach out.

Best regards,
[Your Name]
[Your Company]
[Phone Number]
```

### Step 2: Create Automation Workflow

1. **Navigate to**: Automation → Workflows
2. **Create New Workflow**: "Medicaid Assessment Report Delivery"
3. **Trigger**: 
   - Type: "Opportunity Stage Change"
   - Pipeline: "Medicaid Planning"
   - Stage: "Assessment Complete"

4. **Add Actions**:
   ```
   [Trigger: Opportunity Created/Updated]
        ↓
   [Wait: 1 minute] (optional - ensures data is synced)
        ↓
   [Send Email: Medicaid Assessment Report Template]
        ↓
   [Add Tag: "Report Sent"]
        ↓
   [Create Task: "Follow up in 2 days"]
   ```

### Step 3: Configure Custom Fields

Create these custom fields in Opportunities:
- `report_url` (Text) - The shareable report link
- `protectable_assets` (Currency) - Amount that can be protected
- `assessment_date` (Date) - When assessment was completed
- `eligibility_status` (Dropdown) - Qualified/Not Qualified/Needs Planning

### Step 4: Test the Workflow

1. Run your test endpoint: `GET /api/planning/test-ghl-integration`
2. Check if opportunity is created in GHL
3. Verify email is sent automatically
4. Confirm merge fields populate correctly

## Advanced Workflows

### Follow-Up Sequence
```
Day 0: Initial report email
Day 2: "Did you review your report?" check-in
Day 7: "Ready to implement these strategies?" offer
Day 14: "Limited time to protect assets" urgency
Day 30: "Report expiring soon" reminder
```

### Segmented Communications
- **Qualified**: Focus on implementation
- **Not Qualified**: Alternative strategies
- **High Assets**: Premium service offering
- **Low Assets**: Budget-friendly options

## Integration Points

Your app automatically sends this data to GHL:
```javascript
{
  contact: {
    firstName, lastName, email, phone
  },
  opportunity: {
    name: "Medicaid Planning - [Client Name]",
    customFields: {
      report_url: "https://yourapp.com/reports/[token]",
      protectable_assets: 150000,
      assessment_date: "2024-01-28",
      eligibility_status: "Qualified"
    }
  }
}
```

## Monitoring & Optimization

### Track These Metrics:
- Email open rates (target: >40%)
- Report link clicks (target: >30%)
- Follow-up response rates
- Conversion to paid consultations

### A/B Test:
- Subject lines
- Send times
- Email templates
- Follow-up intervals

## Troubleshooting

**Email Not Sending?**
- Check workflow is active
- Verify trigger conditions
- Confirm custom fields have data
- Check contact has valid email

**Merge Fields Not Working?**
- Ensure exact field names
- Verify data is in GHL
- Check field type matches

**Low Open Rates?**
- Test different subject lines
- Adjust send times
- Check spam scores

## Benefits Over In-App Email

1. **Zero Maintenance**: No email servers, no deliverability issues
2. **Professional Features**: Tracking, analytics, automation
3. **Compliance**: Built-in unsubscribe, CAN-SPAM compliant
4. **Scalability**: Handles thousands of emails automatically
5. **Integration**: Part of your complete client journey

Your app focuses on what it does best (assessments), while GHL handles what it does best (communication and automation)!