// Superuser database connection utility
// Only load dotenv in development
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config({ path: '.env.superuser' });
  } catch (err) {
    // dotenv is not available - likely in production mode without dev dependencies
    console.log('dotenv not available in superuser-connect.js - using environment variables directly');
  }
}
const { Pool } = require('pg');

const superuserPool = new Pool({
    host: process.env.SUPERUSER_DB_HOST,
    port: process.env.SUPERUSER_DB_PORT,
    database: process.env.SUPERUSER_DB_NAME,
    user: process.env.SUPERUSER_DB_USER,
    password: process.env.SUPERUSER_DB_PASSWORD
});

async function runSuperuserQuery(query, params = []) {
    try {
        const result = await superuserPool.query(query, params);
        return result;
    } catch (error) {
        console.error('Superuser query error:', error.message);
        throw error;
    }
}

// Example usage
async function showDatabaseInfo() {
    try {
        console.log('🔐 Connected as superuser:', process.env.SUPERUSER_DB_USER);
        
        const dataDir = await runSuperuserQuery('SHOW data_directory');
        console.log('📁 Data Directory:', dataDir.rows[0].data_directory);
        
        const users = await runSuperuserQuery('SELECT usename, usesuper FROM pg_user ORDER BY usename');
        console.log('👥 Database Users:');
        users.rows.forEach(user => {
            console.log(`  - ${user.usename}${user.usesuper ? ' (SUPERUSER)' : ''}`);
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await superuserPool.end();
    }
}

// Run if called directly
if (require.main === module) {
    showDatabaseInfo();
}

module.exports = { superuserPool, runSuperuserQuery };