const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Create two different pool connections - one to postgres DB to create the medicaid_planning DB
const adminPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: 'postgres', // Connect to default postgres database first
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false
});

const appPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'medicaid_planning',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false
});

async function createDatabase() {
  try {
    console.log('🏗️  Creating medicaid_planning database if it doesn\'t exist...');
    await adminPool.query('CREATE DATABASE medicaid_planning');
    console.log('✅ Database medicaid_planning created successfully!');
  } catch (error) {
    if (error.code === '42P04') {
      console.log('ℹ️  Database medicaid_planning already exists');
    } else {
      console.error('❌ Failed to create database:', error.message);
      throw error;
    }
  }
}

async function setupDatabase() {
  try {
    console.log('🚀 Setting up Medicaid Planning Database...\n');
    
    // First create the database if it doesn't exist
    await createDatabase();
    
    // Test connection to the medicaid_planning database
    console.log('1️⃣  Testing database connection...');
    await appPool.query('SELECT NOW()');
    console.log('✅ Database connection successful!\n');
    
    // Read and execute schema
    console.log('2️⃣  Creating database schema...');
    const schemaPath = path.join(__dirname, '../migrations/001_initial_schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await appPool.query(schema);
    console.log('✅ Database schema created successfully!\n');
    
    // Seed initial data
    console.log('3️⃣  Seeding initial data...');
    await seedInitialData();
    console.log('✅ Initial data seeded successfully!\n');
    
    // Verify setup
    console.log('4️⃣  Verifying database setup...');
    await verifySetup();
    console.log('✅ Database verification complete!\n');
    
    console.log('🎉 DATABASE SETUP COMPLETE!');
    console.log('\n📋 What\'s been created:');
    console.log('   • PostgreSQL database: medicaid_planning');
    console.log('   • Database user: medicaid_admin');
    console.log('   • 13 tables for complete Medicaid planning workflow');
    console.log('   • Test admin user (see credentials below)');
    console.log('   • Medicaid rules for FL, CA, NY, TX');
    console.log('\n🔐 Admin Login Credentials:');
    console.log('   Email: admin@medicaidplanning.com');
    console.log('   Password: admin123');
    console.log('\n🛠️  Next Steps:');
    console.log('   1. Test the API endpoints');
    console.log('   2. Verify database connectivity from application');
    console.log('   3. Set up monitoring and logging');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    // Clean up connections
    await adminPool.end().catch(() => {});
    await appPool.end().catch(() => {});
  }
}

async function seedInitialData() {
  try {
    // Create admin user
    console.log('   📝 Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await appPool.query(`
      INSERT INTO users (
        email, password_hash, first_name, last_name, role, organization
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
    `, [
      'admin@medicaidplanning.com', 
      hashedPassword, 
      'Admin', 
      'User', 
      'admin',
      'Medicaid Planning Solutions'
    ]);
    
    console.log('   ✅ Admin user created');
    
    // Create sample planner user
    console.log('   📝 Creating sample planner...');
    const plannerPassword = await bcrypt.hash('planner123', 10);
    
    await appPool.query(`
      INSERT INTO users (
        email, password_hash, first_name, last_name, role, organization, phone, license_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (email) DO NOTHING
    `, [
      'planner@medicaidplanning.com', 
      plannerPassword, 
      'John', 
      'Smith', 
      'planner',
      'Medicaid Planning Solutions',
      '(555) 123-4567',
      'MP-2024-001'
    ]);
    
    console.log('   ✅ Sample planner created');
    
    // Seed Medicaid rules for key states
    console.log('   📝 Seeding Medicaid rules...');
    const medicaidRulesData = [
      {
        state_code: 'FL',
        effective_date: '2024-01-01',
        individual_resource_limit: 200000,
        individual_income_limit: 290100,
        community_spouse_resource_allowance_min: 2972400,
        community_spouse_resource_allowance_max: 14862000,
        community_spouse_income_allowance: 372600,
        has_estate_recovery: true,
        lookback_period_months: 60,
        penalty_divisor: 950000,
      },
      {
        state_code: 'CA',
        effective_date: '2024-01-01',
        individual_resource_limit: 200000,
        individual_income_limit: 290100,
        community_spouse_resource_allowance_min: 2972400,
        community_spouse_resource_allowance_max: 14862000,
        community_spouse_income_allowance: 372600,
        has_estate_recovery: true,
        lookback_period_months: 60,
        penalty_divisor: 1200000,
      },
      {
        state_code: 'NY',
        effective_date: '2024-01-01',
        individual_resource_limit: 200000,
        individual_income_limit: 290100,
        community_spouse_resource_allowance_min: 2972400,
        community_spouse_resource_allowance_max: 14862000,
        community_spouse_income_allowance: 372600,
        has_estate_recovery: true,
        lookback_period_months: 60,
        penalty_divisor: 1100000,
      },
      {
        state_code: 'TX',
        effective_date: '2024-01-01',
        individual_resource_limit: 200000,
        individual_income_limit: 290100,
        community_spouse_resource_allowance_min: 2972400,
        community_spouse_resource_allowance_max: 14862000,
        community_spouse_income_allowance: 372600,
        has_estate_recovery: false,
        lookback_period_months: 60,
        penalty_divisor: 850000,
      }
    ];

    for (const rule of medicaidRulesData) {
      await appPool.query(`
        INSERT INTO medicaid_rules (
          state_code, effective_date, individual_resource_limit, individual_income_limit,
          community_spouse_resource_allowance_min, community_spouse_resource_allowance_max,
          community_spouse_income_allowance, has_estate_recovery, lookback_period_months,
          penalty_divisor
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (state_code, effective_date) DO NOTHING
      `, [
        rule.state_code, rule.effective_date, rule.individual_resource_limit, 
        rule.individual_income_limit, rule.community_spouse_resource_allowance_min,
        rule.community_spouse_resource_allowance_max, rule.community_spouse_income_allowance,
        rule.has_estate_recovery, rule.lookback_period_months, rule.penalty_divisor
      ]);
    }
    
    console.log('   ✅ Medicaid rules seeded for FL, CA, NY, TX');
    
    // Add sample care providers
    console.log('   📝 Adding sample care providers...');
    await appPool.query(`
      INSERT INTO care_providers (
        name, provider_type, phone, email, accepts_medicaid, medicaid_certified,
        private_pay_rate, medicaid_rate, cms_rating, address
      ) VALUES 
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10),
      ($11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    `, [
      'Sunrise Senior Living', 'assisted_living', '(555) 987-6543', 'info@sunrisesenior.com',
      true, true, 350.00, 280.00, 4, JSON.stringify({
        street: '123 Care Way',
        city: 'Miami',
        state: 'FL',
        zip: '33139'
      }),
      'Golden Years Nursing Home', 'nursing_home', '(555) 456-7890', 'admin@goldenyears.com',
      true, true, 450.00, 320.00, 3, JSON.stringify({
        street: '456 Health Blvd',
        city: 'Tampa',
        state: 'FL',
        zip: '33601'
      })
    ]);
    
    console.log('   ✅ Sample care providers added');
    
  } catch (error) {
    console.error('Failed to seed initial data:', error);
    throw error;
  }
}

async function verifySetup() {
  try {
    // Check table counts
    const tableResult = await appPool.query(`
      SELECT count(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(`   📊 Created ${tableResult.rows[0].table_count} tables`);
    
    // Check user count
    const userResult = await appPool.query('SELECT count(*) as user_count FROM users');
    console.log(`   👥 Created ${userResult.rows[0].user_count} users`);
    
    // Check rules count
    const rulesResult = await appPool.query('SELECT count(*) as rules_count FROM medicaid_rules');
    console.log(`   📋 Created ${rulesResult.rows[0].rules_count} Medicaid rule sets`);
    
    // Check providers count
    const providersResult = await appPool.query('SELECT count(*) as providers_count FROM care_providers');
    console.log(`   🏥 Created ${providersResult.rows[0].providers_count} care providers`);
    
  } catch (error) {
    console.error('Verification failed:', error);
    throw error;
  }
}

// Run the setup
setupDatabase();