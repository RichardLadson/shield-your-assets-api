# Custom Domain Configuration Guide

This guide explains how to configure a custom domain for the Shield Your Assets API.

## Prerequisites
- Domain name registered with a domain registrar
- SSL certificate created and validated (see SSL_SETUP_GUIDE.md)

## Option 1: Using Route53 (Recommended)

### 1. Create Hosted Zone

```bash
# Create a hosted zone for your domain
aws route53 create-hosted-zone \
  --name yourdomain.com \
  --caller-reference $(date +%s) \
  --region us-east-1
```

### 2. Update Domain Nameservers

1. Get the nameservers from Route53:
```bash
aws route53 get-hosted-zone \
  --id <your-hosted-zone-id> \
  --query "DelegationSet.NameServers" \
  --region us-east-1
```

2. Update your domain registrar to use these nameservers

### 3. Create A Record

```bash
# Get the ALB's hosted zone ID and DNS name
ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name shield-assets-prod-ecs \
  --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerDNS'].OutputValue" \
  --output text \
  --region us-east-1)

# Create alias record pointing to ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id <your-hosted-zone-id> \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.yourdomain.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "'${ALB_DNS}'",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }' \
  --region us-east-1
```

Note: `Z35SXDOTRQ7X7K` is the hosted zone ID for ALBs in us-east-1. See [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/elb.html) for other regions.

## Option 2: Using External DNS Provider

If using an external DNS provider (GoDaddy, Namecheap, etc.):

1. Create a CNAME record:
   - Name: `api` (or `www` for root domain)
   - Value: `shield-assets-prod-alb-416980762.us-east-1.elb.amazonaws.com`
   - TTL: 300 seconds

2. Note: CNAME records cannot be used for root domains. For root domain, use:
   - ANAME/ALIAS record if your provider supports it
   - Or use a subdomain like `api.yourdomain.com`

## Post-Configuration Steps

### 1. Test DNS Resolution

```bash
# Test DNS resolution
nslookup api.yourdomain.com

# Test with curl
curl https://api.yourdomain.com/api/health
```

### 2. Update Application Configuration

Update your frontend and any documentation with the new domain:
- API Endpoint: `https://api.yourdomain.com`
- Update environment variables
- Update CORS settings if needed

### 3. Update CloudFormation Outputs (Optional)

Add the custom domain as an output to your CloudFormation stack for reference:

```yaml
Outputs:
  CustomDomain:
    Description: Custom domain for the API
    Value: https://api.yourdomain.com
    Export:
      Name: !Sub ${EnvironmentName}-CUSTOM-DOMAIN
```

## Current Configuration

**Current Access Points:**
- ALB DNS: http://shield-assets-prod-alb-416980762.us-east-1.elb.amazonaws.com
- Future Custom Domain: https://api.yourdomain.com

## DNS Propagation

- DNS changes can take 24-48 hours to propagate globally
- Use tools like `dig` or online DNS checkers to verify propagation
- Most changes propagate within 1-4 hours

## Troubleshooting

1. **Certificate Validation Failed**
   - Ensure CNAME records are correctly added
   - Check certificate status: `aws acm describe-certificate`

2. **Domain Not Resolving**
   - Verify nameservers are updated at registrar
   - Check Route53 hosted zone configuration
   - Wait for DNS propagation

3. **SSL Errors**
   - Ensure certificate covers the domain/subdomain
   - Check ALB listener configuration
   - Verify certificate is validated and active