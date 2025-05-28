const pool = require('../config/database');

async function testConnection() {
  try {
    console.log('🔍 Testing PostgreSQL database connection...\n');
    
    // Test basic connection
    console.log('1️⃣  Testing basic connection...');
    const result = await pool.query('SELECT NOW(), version()');
    console.log('✅ Connection successful!');
    console.log(`📅 Current time: ${result.rows[0].now}`);
    console.log(`🗄️  PostgreSQL version: ${result.rows[0].version.split(' ').slice(0, 2).join(' ')}\n`);
    
    // Test database and user permissions
    console.log('2️⃣  Testing database permissions...');
    await pool.query('SELECT current_database(), current_user');
    console.log('✅ Database permissions verified\n');
    
    // Check if tables exist (if setup was already run)
    console.log('3️⃣  Checking database structure...');
    const tableCount = await pool.query(`
      SELECT count(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const tableCountNum = parseInt(tableCount.rows[0].table_count);
    
    if (tableCountNum === 0) {
      console.log('📋 No tables found - database is ready for setup');
      console.log('   Next step: Run node scripts/setup-database.js');
    } else {
      console.log(`📊 Found ${tableCountNum} tables - database appears to be set up`);
      
      // Show some details about existing data
      const stats = await pool.query(`
        SELECT 
          (SELECT count(*) FROM users) as users,
          (SELECT count(*) FROM clients) as clients,
          (SELECT count(*) FROM cases) as cases,
          (SELECT count(*) FROM medicaid_rules) as rules
      `);
      
      console.log('📊 Database Statistics:');
      console.log(`   👥 Users: ${stats.rows[0].users}`);
      console.log(`   🏠 Clients: ${stats.rows[0].clients}`);
      console.log(`   📁 Cases: ${stats.rows[0].cases}`);
      console.log(`   📋 Medicaid Rules: ${stats.rows[0].rules}`);
    }
    
    console.log('\n🎉 Database connection test completed successfully!');
    
    // Test connection pooling
    console.log('\n4️⃣  Testing connection pool...');
    const poolInfo = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };
    console.log('✅ Connection pool info:', poolInfo);
    
    console.log('\n✅ ALL TESTS PASSED! Your database is ready to use.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('💡 Error details:', {
      code: error.code,
      detail: error.detail
    });
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n🔧 TROUBLESHOOTING - Connection Refused:');
      console.error('   1. Is PostgreSQL installed? Check with: psql --version');
      console.error('   2. Is PostgreSQL running?');
      console.error('      • macOS: brew services start postgresql@15');
      console.error('      • Windows: Check Services app for PostgreSQL');
      console.error('      • Linux: sudo systemctl start postgresql');
      console.error('   3. Is PostgreSQL listening on port 5432? Check with: lsof -i :5432');
    } else if (error.code === '3D000') {
      console.error('\n🔧 TROUBLESHOOTING - Database doesn\'t exist:');
      console.error('   1. Connect to PostgreSQL: psql -U postgres');
      console.error('   2. Create database: CREATE DATABASE medicaid_planning;');
      console.error('   3. Create user: CREATE USER medicaid_app WITH PASSWORD \'secure_password_123\';');
      console.error('   4. Grant privileges: GRANT ALL PRIVILEGES ON DATABASE medicaid_planning TO medicaid_app;');
    } else if (error.code === '28P01') {
      console.error('\n🔧 TROUBLESHOOTING - Authentication failed:');
      console.error('   1. Check your .env file for correct username/password');
      console.error('   2. Make sure the medicaid_app user exists in PostgreSQL');
      console.error('   3. Verify the password matches what\'s in .env');
    } else if (error.code === '28000') {
      console.error('\n🔧 TROUBLESHOOTING - Invalid authorization:');
      console.error('   1. Check pg_hba.conf file for authentication settings');
      console.error('   2. Make sure local connections are allowed');
    }
    
    console.error('\n📋 Configuration Check:');
    console.error('   Database Host:', process.env.DB_HOST || 'localhost');
    console.error('   Database Port:', process.env.DB_PORT || '5432');
    console.error('   Database Name:', process.env.DB_NAME || 'medicaid_planning');
    console.error('   Database User:', process.env.DB_USER || 'medicaid_app');
    console.error('   Password Set:', process.env.DB_PASSWORD ? 'Yes' : 'No');
    
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await pool.end();
  process.exit(0);
});

testConnection();