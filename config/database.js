const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'medicaid_planning',
  user: process.env.DB_USER || 'medicaid_app',
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
});

// Test connection and log events
pool.on('connect', (client) => {
  if (process.env.DB_LOGGING === 'true') {
    console.log('📊 New PostgreSQL connection established');
  }
});

pool.on('error', (err, client) => {
  console.error('🚨 PostgreSQL connection error:', err);
  process.exit(-1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down database connection pool...');
  pool.end();
});

module.exports = pool;