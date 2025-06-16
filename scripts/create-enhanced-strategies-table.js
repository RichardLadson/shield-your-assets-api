#!/usr/bin/env node

/**
 * Enhanced Strategy Table Creation Script
 * Creates the new enhanced_strategies table for Option B implementation
 */

const { Pool } = require('pg');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

async function createEnhancedStrategiesTable() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🚀 Creating enhanced_strategies table...');
    
    // Create the enhanced strategies table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS enhanced_strategies (
        id SERIAL PRIMARY KEY,
        formal_name VARCHAR(255) NOT NULL UNIQUE,
        friendly_name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        timing_category VARCHAR(50) NOT NULL CHECK (timing_category IN ('immediate', 'short_term', 'long_term')),
        badge_color VARCHAR(20) NOT NULL,
        badge_text VARCHAR(100) NOT NULL,
        savings_description TEXT,
        emotional_hook TEXT,
        plain_english_explanation TEXT,
        real_benefits JSONB DEFAULT '[]'::jsonb,
        what_to_know TEXT[] DEFAULT ARRAY[]::TEXT[],
        effectiveness_metrics JSONB DEFAULT '{}'::jsonb,
        bottom_line TEXT,
        effectiveness_score INTEGER CHECK (effectiveness_score >= 1 AND effectiveness_score <= 10),
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await pool.query(createTableQuery);
    console.log('✅ Enhanced strategies table created successfully');
    
    // Create indexes for better performance
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_enhanced_strategies_category ON enhanced_strategies(category);
      CREATE INDEX IF NOT EXISTS idx_enhanced_strategies_timing ON enhanced_strategies(timing_category);
      CREATE INDEX IF NOT EXISTS idx_enhanced_strategies_active ON enhanced_strategies(is_active);
      CREATE INDEX IF NOT EXISTS idx_enhanced_strategies_effectiveness ON enhanced_strategies(effectiveness_score);
      CREATE INDEX IF NOT EXISTS idx_enhanced_strategies_formal_name ON enhanced_strategies(formal_name);
    `;
    
    await pool.query(createIndexes);
    console.log('✅ Database indexes created successfully');
    
    // Create updated_at trigger
    const createTrigger = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
      
      DROP TRIGGER IF EXISTS update_enhanced_strategies_updated_at ON enhanced_strategies;
      CREATE TRIGGER update_enhanced_strategies_updated_at
        BEFORE UPDATE ON enhanced_strategies
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;
    
    await pool.query(createTrigger);
    console.log('✅ Updated timestamp trigger created successfully');
    
    // Verify table structure
    const verifyQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'enhanced_strategies' 
      ORDER BY ordinal_position;
    `;
    
    const result = await pool.query(verifyQuery);
    console.log('\n📋 Table structure verified:');
    console.table(result.rows);
    
    console.log('\n🎉 Enhanced strategies table setup complete!');
    
  } catch (error) {
    console.error('❌ Error creating enhanced strategies table:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  createEnhancedStrategiesTable()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createEnhancedStrategiesTable };