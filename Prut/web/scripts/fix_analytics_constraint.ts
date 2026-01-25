
import { Client } from 'pg';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('DATABASE_URL is missing');
    process.exit(1);
}

const client = new Client({
    connectionString: dbUrl,
});

async function run() {
    try {
        await client.connect();
        console.log('✓ Connected successfully!');

        console.log('Updating prompt_usage_events constraint...');
        await client.query(`
            ALTER TABLE public.prompt_usage_events 
            DROP CONSTRAINT IF EXISTS prompt_usage_events_event_type_check;

            ALTER TABLE public.prompt_usage_events 
            ADD CONSTRAINT prompt_usage_events_event_type_check 
            CHECK (event_type IN ('copy', 'save', 'refine', 'enhance'));
        `);
        console.log('✓ Constraint updated successfully.');

    } catch (err) {
        console.error('Fatal Error:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
