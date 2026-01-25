/**
 * Run All Migrations Script
 * 
 * This script runs all SQL migrations from the supabase/migrations folder
 * in alphabetical order. It's idempotent - safe to run multiple times.
 * 
 * Usage: npm run db:migrate
 */

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('❌ DATABASE_URL is missing in .env.local');
    process.exit(1);
}

const client = new Client({
    connectionString: dbUrl,
});

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations');

async function run() {
    try {
        await client.connect();
        console.log('✓ Connected to database');

        // Get all .sql files sorted alphabetically
        const files = fs.readdirSync(MIGRATIONS_DIR)
            .filter(f => f.endsWith('.sql'))
            .sort();

        console.log(`Found ${files.length} migration files.\n`);

        for (const file of files) {
            const filePath = path.join(MIGRATIONS_DIR, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            console.log(`Running: ${file}...`);
            try {
                await client.query(sql);
                console.log(`  ✓ Success`);
            } catch (err: any) {
                // Handle common idempotent errors gracefully
                if (err.code === '42P07') { // relation already exists
                    console.log(`  ⚠ Skipped (table already exists)`);
                } else if (err.code === '42710') { // policy/object already exists
                    console.log(`  ⚠ Skipped (policy/object already exists)`);
                } else if (err.code === '23505') { // unique violation (seed data)
                    console.log(`  ⚠ Skipped (duplicate key - data already seeded)`);
                } else {
                    console.error(`  ❌ Error: ${err.message}`);
                }
            }
        }

        console.log('\n✓ All migrations processed.');

    } catch (err) {
        console.error('❌ Fatal Error:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
