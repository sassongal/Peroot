
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

let dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('DATABASE_URL is missing');
    process.exit(1);
}

// FIX: Remove square brackets if present around the password
// format: postgresql://user:[password]@host...
if (dbUrl.includes(':[') && dbUrl.includes(']@')) {
    console.log('Detected square brackets in password. Removing them...');
    dbUrl = dbUrl.replace(/:\[(.*?)]@/, ':$1@');
    console.log('New Connection String (masked):', dbUrl.replace(/:([^:@]+)@/, ':***@'));
}

const client = new Client({
    connectionString: dbUrl,
});

const migrations = [
    'supabase/migrations/20260124_user_roles.sql',
    'supabase/migrations/20260124_public_library_system.sql'
];

async function run() {
    try {
        await client.connect();
        console.log('✓ Connected successfully!');

        for (const migrationFile of migrations) {
            const filePath = path.join(process.cwd(), migrationFile);
            if (!fs.existsSync(filePath)) {
                console.error(`File not found: ${migrationFile}`);
                continue;
            }

            console.log(`Running: ${migrationFile}...`);
            const sql = fs.readFileSync(filePath, 'utf8');
            await client.query(sql);
            console.log(`✓ Applied: ${migrationFile}`);
        }
        
    } catch (err) {
        console.error('Fatal Error:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
