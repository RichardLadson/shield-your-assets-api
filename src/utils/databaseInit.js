const pool = require('../../config/database');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

/**
 * Check if essential tables exist and create them if needed
 */
async function initializeDatabase() {
  try {
    logger.info('🔧 Checking database initialization...');
    
    // Check if medicaid_rules table has the correct schema
    const schemaCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'medicaid_rules' 
      AND table_schema = 'public' 
      AND column_name = 'state_code'
    `);
    
    const hasCorrectSchema = schemaCheck.rows.length > 0;
    
    if (!hasCorrectSchema) {
      logger.info('📋 Database tables missing or have incorrect schema. Creating database schema...');
      await createEssentialTables();
      await seedMedicaidRules();
      logger.info('✅ Database initialization complete!');
    } else {
      logger.info('✅ Database tables exist with correct schema, skipping initialization');
    }
    
  } catch (error) {
    logger.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Create all required tables using migration files
 */
async function createEssentialTables() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if tables already exist before recreating schema
    const tablesExist = await client.query(`
      SELECT count(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('medicaid_rules', 'clients', 'users', 'assessments')
    `);
    
    if (parseInt(tablesExist.rows[0].table_count) > 0) {
      logger.info('✅ Tables already exist, skipping schema creation');
      await client.query('COMMIT');
      return;
    }
    
    // Create basic tables since migration files might not exist
    logger.info('📋 Creating basic database tables...');
    await createBasicTables(client);
    
    await client.query('COMMIT');
    logger.info('✅ Database schema created successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('❌ Failed to create database schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Fallback function to create basic tables if migration files are missing
 */
async function createBasicTables(client) {
  // Create medicaid_rules table
  await client.query(`
    CREATE TABLE medicaid_rules (
      id SERIAL PRIMARY KEY,
      state_code VARCHAR(2) NOT NULL UNIQUE,
      individual_resource_limit INTEGER,
      community_spouse_resource_allowance_min INTEGER,
      community_spouse_resource_allowance_max INTEGER,
      individual_income_limit INTEGER,
      community_spouse_income_allowance INTEGER,
      lookback_period_months INTEGER,
      penalty_divisor DECIMAL(10,2),
      state_specific_rules JSONB,
      effective_date DATE DEFAULT CURRENT_DATE,
      expiration_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create other essential tables
  await client.query(`
    CREATE TABLE clients (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(20),
      age INTEGER,
      marital_status VARCHAR(20),
      health_status VARCHAR(50),
      state VARCHAR(2),
      assigned_planner_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await client.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'planner',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await client.query(`
    CREATE TABLE estate_recovery_rules (
      id SERIAL PRIMARY KEY,
      state_code VARCHAR(2) NOT NULL,
      rule_name VARCHAR(100) NOT NULL,
      rule_value TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await client.query(`
    CREATE TABLE assessments (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES clients(id),
      assets JSONB NOT NULL,
      income JSONB NOT NULL,
      demographics JSONB NOT NULL,
      countable_assets DECIMAL(12,2),
      non_countable_assets DECIMAL(12,2),
      total_monthly_income DECIMAL(10,2),
      eligibility_status VARCHAR(50),
      recommended_strategies JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Seed essential Medicaid rules for common states
 */
async function seedMedicaidRules() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Florida rules (using the correct schema)
    await client.query(`
      INSERT INTO medicaid_rules (
        state_code, 
        individual_resource_limit, 
        community_spouse_resource_allowance_min,
        community_spouse_resource_allowance_max,
        individual_income_limit, 
        community_spouse_income_allowance,
        lookback_period_months, 
        penalty_divisor,
        state_specific_rules
      ) VALUES (
        'FL', 
        2000, 
        30828, 
        154140, 
        2901, 
        2901, 
        60, 
        350.00,
        '{"home_equity_limit": 688000, "vehicle_exemption": 4650}'::jsonb
      ) ON CONFLICT (state_code) DO NOTHING
    `);
    
    // California rules
    await client.query(`
      INSERT INTO medicaid_rules (
        state_code, 
        individual_resource_limit, 
        individual_income_limit, 
        lookback_period_months, 
        penalty_divisor
      ) VALUES (
        'CA', 
        2000, 
        1563, 
        60, 
        350.00
      ) ON CONFLICT (state_code) DO NOTHING
    `);
    
    // New York rules
    await client.query(`
      INSERT INTO medicaid_rules (
        state_code, 
        individual_resource_limit, 
        individual_income_limit, 
        lookback_period_months, 
        penalty_divisor
      ) VALUES (
        'NY', 
        2000, 
        1563, 
        60, 
        350.00
      ) ON CONFLICT (state_code) DO NOTHING
    `);
    
    // Texas rules
    await client.query(`
      INSERT INTO medicaid_rules (
        state_code, 
        individual_resource_limit, 
        individual_income_limit, 
        lookback_period_months, 
        penalty_divisor
      ) VALUES (
        'TX', 
        2000, 
        2523, 
        60, 
        350.00
      ) ON CONFLICT (state_code) DO NOTHING
    `);
    
    await client.query('COMMIT');
    logger.info('✅ Medicaid rules seeded successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('❌ Failed to seed Medicaid rules:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  initializeDatabase
};