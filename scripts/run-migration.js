const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function runMigration(migrationFile) {
    try {
        console.log(`🚀 Running migration: ${migrationFile}`);
        
        const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        await pool.query(sql);
        
        console.log(`✅ Migration completed successfully: ${migrationFile}`);
    } catch (error) {
        console.error(`❌ Migration failed: ${migrationFile}`);
        console.error('Error:', error.message);
        throw error;
    }
}

async function main() {
    try {
        await runMigration('002_rules_migration.sql');
        console.log('🎉 All migrations completed!');
        process.exit(0);
    } catch (error) {
        console.error('💥 Migration failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { runMigration };