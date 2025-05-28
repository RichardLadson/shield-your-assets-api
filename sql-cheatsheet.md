# PostgreSQL Database Cheat Sheet

## Connection Commands
```bash
# Connect as superuser
psql -h localhost -p 5432 -d medicaid_planning -U richardladson

# Connect as app user  
psql -h localhost -p 5432 -d medicaid_planning -U medicaid_app
```

## Essential psql Commands (once connected)

### Database Overview
```sql
-- List all tables
\dt

-- Describe a table structure
\d benefit_rules
\d estate_recovery_rules
\d clients

-- List all databases
\l

-- Show current database and user
SELECT current_database(), current_user;

-- Show database size
SELECT pg_size_pretty(pg_database_size(current_database()));
```

### Viewing Your Data
```sql
-- Count records in each table
SELECT COUNT(*) FROM benefit_rules;
SELECT COUNT(*) FROM estate_recovery_rules;
SELECT COUNT(*) FROM clients;
SELECT COUNT(*) FROM users;

-- View sample benefit rules
SELECT state, program, individual_amount, couple_amount 
FROM benefit_rules 
WHERE state = 'FL' 
ORDER BY program;

-- View estate recovery rules
SELECT state, home_protection_strength, recovery_aggressiveness 
FROM estate_recovery_rules 
WHERE state IN ('FL', 'CA', 'NY')
ORDER BY state;

-- View clients
SELECT first_name, last_name, email, state, created_at 
FROM clients 
ORDER BY created_at DESC;

-- View users
SELECT email, first_name, last_name, role, created_at 
FROM users;
```

### Advanced Queries
```sql
-- Find states with strongest home protection
SELECT state, home_protection_strength, protected_assets 
FROM estate_recovery_rules 
WHERE home_protection_strength = 'very_strong';

-- Compare SSI benefits across states
SELECT state, individual_amount as ssi_individual, couple_amount as ssi_couple
FROM benefit_rules 
WHERE program = 'ssi' 
ORDER BY individual_amount DESC 
LIMIT 10;

-- Find states with no estate recovery
SELECT state, recovery_aggressiveness 
FROM estate_recovery_rules 
WHERE recovery_aggressiveness = 'none';
```

### Utility Commands
```sql
-- Exit psql
\q

-- Clear screen
\! clear

-- Show help
\?

-- Show SQL command help
\h SELECT

-- Execute SQL from file
\i /path/to/file.sql

-- Output query results to file
\o /path/to/output.txt
SELECT * FROM benefit_rules WHERE state = 'FL';
\o
```

## Quick Database Stats
```sql
-- Complete database overview
SELECT 
    schemaname,
    tablename,
    attname,
    typename,
    attnum
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
JOIN pg_catalog.pg_type t ON a.atttypid = t.oid
WHERE c.relkind = 'r' 
    AND n.nspname = 'public'
    AND attnum > 0
    AND NOT attisdropped
ORDER BY schemaname, tablename, attnum;
```