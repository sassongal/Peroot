
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars from .env.local
dotenv.config({ path: '.env.local' });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('DATABASE_URL is missing in .env.local');
    process.exit(1);
}

const client = new Client({
    connectionString: dbUrl,
});

const migrations = [
    'supabase/migrations/20260124_user_roles.sql',
    'supabase/migrations/20260124_public_library_system.sql'
];

async function runMigrations() {
    try {
        await client.connect();
        console.log('Connected to database.');

        for (const migrationFile of migrations) {
            const filePath = path.join(process.cwd(), migrationFile);
            if (!fs.existsSync(filePath)) {
                console.error(`Migration file not found: ${filePath}`);
                continue;
            }

            console.log(`Running migration: ${migrationFile}...`);
            const sql = fs.readFileSync(filePath, 'utf8');
            await client.query(sql);
            console.log(`✓ Success: ${migrationFile}`);
        }

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigrations();
