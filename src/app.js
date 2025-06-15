// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./config/logger');
const config = require('./config/config');
const { requestTransformer, responseTransformer } = require('./middleware/dataTransformer');
const { sanitizeInputs } = require('./middleware/inputSanitization');

// Initialize express app
const app = express();

// Security middleware - CRITICAL: Add before all other middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting - CRITICAL: Prevent API abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/api/health' || req.path === '/'
});

// Stricter rate limiting for planning endpoints
const planningLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit planning requests to 20 per hour
  message: {
    error: 'Planning rate limit exceeded',
    message: 'Too many planning requests. Please try again in 1 hour.',
    retryAfter: 60 * 60
  }
});

app.use('/api/', apiLimiter);
app.use('/api/planning', planningLimiter);

// TEMPORARY CORS Configuration - Allow frontend domain
const corsOptions = {
  origin: ['https://d3btqqunljs3nt.cloudfront.net', 'https://eligibilityApp.nationalmedicaidplanning.com', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Continue with other middleware
app.use(express.json({ limit: '10mb' })); // Set reasonable payload limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// SECURITY: Input sanitization - MUST come after JSON parsing
app.use(sanitizeInputs);

app.use(requestTransformer);
app.use(responseTransformer);

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Create simple health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.env
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.env
  });
});

// Root route for API health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Shield Your Assets API is running',
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.env
  });
});

// API Routes
app.use('/api/eligibility', require('./routes/eligibilityRoutes'));
app.use('/api/planning', require('./routes/planningRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/webhooks', require('./routes/webhookRoutes'));

// 404 handler
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    error: 'Not Found',
    message: `The requested resource ${req.url} was not found`,
    status: 'error'
  });
});

// SECURE Error handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // SECURITY: Use secure logger to prevent sensitive data exposure
  const SecureLogger = require('./utils/secureLogger').SecureLogger;
  SecureLogger.error(`API Error: ${err.message}`, err);
  
  // SECURITY: Never expose stack traces or internal details in production
  const isProduction = config.env === 'production';
  
  res.status(err.status || 500).json({
    error: isProduction ? 'Internal Server Error' : (err.name || 'Internal Server Error'),
    message: isProduction ? 'Something went wrong' : err.message,
    status: 'error',
    // SECURITY: Never expose error details in production
    ...(isProduction ? {} : { details: err.details })
  });
});

module.exports = app;