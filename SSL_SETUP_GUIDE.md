# SSL Certificate Setup Guide

This guide explains how to set up SSL/TLS for the Shield Your Assets API once you have a custom domain.

## Prerequisites
- Custom domain name registered
- Route53 hosted zone created for your domain
- Access to domain's DNS settings

## Steps to Enable SSL

### 1. Request ACM Certificate

```bash
# Request a certificate for your domain
aws acm request-certificate \
  --domain-name yourdomain.com \
  --subject-alternative-names "*.yourdomain.com" \
  --validation-method DNS \
  --region us-east-1

# Note the CertificateArn from the output
```

### 2. Validate the Certificate

1. Get the validation records:
```bash
aws acm describe-certificate \
  --certificate-arn <your-certificate-arn> \
  --region us-east-1
```

2. Add the CNAME records to your DNS (Route53 or your domain registrar)

3. Wait for validation (usually takes 5-30 minutes):
```bash
aws acm wait certificate-validated \
  --certificate-arn <your-certificate-arn> \
  --region us-east-1
```

### 3. Update the ALB with HTTPS Listener

Create a new file `ssl-update.yaml`:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'SSL Update for Shield Assets ALB'

Parameters:
  EnvironmentName:
    Type: String
    Default: shield-assets-prod
  
  CertificateArn:
    Type: String
    Description: ACM Certificate ARN

Resources:
  HTTPSListener:
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
      DefaultActions:
        - Type: forward
          TargetGroupArn: !ImportValue
            Fn::Sub: ${EnvironmentName}-TARGET-GROUP-ARN
      LoadBalancerArn: !ImportValue
        Fn::Sub: ${EnvironmentName}-ALB-ARN
      Port: 443
      Protocol: HTTPS
      SslPolicy: ELBSecurityPolicy-TLS-1-2-2017-01
      Certificates:
        - CertificateArn: !Ref CertificateArn
  
  HTTPListenerRule:
    Type: AWS::ElasticLoadBalancingV2::ListenerRule
    Properties:
      Actions:
        - Type: redirect
          RedirectConfig:
            Protocol: HTTPS
            Port: 443
            StatusCode: HTTP_301
      Conditions:
        - Field: path-pattern
          Values: ["/*"]
      ListenerArn: !ImportValue
        Fn::Sub: ${EnvironmentName}-HTTP-LISTENER-ARN
      Priority: 1
```

Deploy the SSL update:
```bash
aws cloudformation deploy \
  --template-file ssl-update.yaml \
  --stack-name shield-assets-prod-ssl \
  --parameter-overrides \
    EnvironmentName=shield-assets-prod \
    CertificateArn=<your-certificate-arn> \
  --region us-east-1
```

### 4. Update Application Configuration

Update your frontend application to use HTTPS:
- Change API endpoint from `http://` to `https://`
- Update CORS settings if needed

## Current Status

The application is currently accessible via:
- HTTP: http://shield-assets-prod-alb-416980762.us-east-1.elb.amazonaws.com

Once SSL is configured with a custom domain, it will be accessible via:
- HTTPS: https://yourdomain.com

## Security Notes

- The ALB security group already allows port 443 (HTTPS)
- HTTP traffic will be automatically redirected to HTTPS
- Use at least TLS 1.2 for security compliance
- Consider implementing HSTS headers in your application