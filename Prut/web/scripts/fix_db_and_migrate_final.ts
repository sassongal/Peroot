
import { Client } from 'pg';
import fs from 'fs';
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

        // 1. Create User Roles Table (Idempotent)
        console.log('Migrating: user_roles...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.user_roles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'editor')),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, role)
            );
            
            ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

            DO $$ BEGIN
                CREATE POLICY "Admins can manage roles" ON public.user_roles
                    FOR ALL USING (
                        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
                        OR (SELECT count(*) FROM public.user_roles) = 0
                    );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;

            DO $$ BEGIN
                CREATE POLICY "Users can view own roles" ON public.user_roles
                    FOR SELECT USING (auth.uid() = user_id);
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
        console.log('✓ Applied: user_roles');

        // 2. Public Library System (Idempotent)
        console.log('Migrating: public_library_prompts...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.library_categories (
                id TEXT PRIMARY KEY,
                name_en TEXT NOT NULL,
                name_he TEXT NOT NULL,
                icon TEXT,
                sort_order INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS public.public_library_prompts (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                category_id TEXT REFERENCES public.library_categories(id),
                use_case TEXT,
                prompt TEXT NOT NULL,
                variables TEXT[] DEFAULT '{}',
                output_format TEXT,
                quality_checks TEXT[] DEFAULT '{}',
                capability_mode TEXT DEFAULT 'STANDARD',
                source_metadata JSONB DEFAULT '{}',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            ALTER TABLE public.library_categories ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.public_library_prompts ENABLE ROW LEVEL SECURITY;

            -- Policies
            DO $$ BEGIN
                CREATE POLICY "Public library is readable by all" ON public.library_categories FOR SELECT USING (true);
                CREATE POLICY "Public prompts are readable by all" ON public.public_library_prompts FOR SELECT USING (is_active = true);
                
                CREATE POLICY "Admins can manage categories" ON public.library_categories FOR ALL 
                    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

                CREATE POLICY "Admins can manage public prompts" ON public.public_library_prompts FOR ALL 
                    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;

            -- Seed Categories
            INSERT INTO public.library_categories (id, name_en, name_he, icon)
            VALUES 
                ('marketing', 'Marketing', 'שיווק', 'Megaphone'),
                ('sales', 'Sales', 'מכירות', 'BadgeDollarSign'),
                ('social', 'Social Media', 'רשתות חברתיות', 'Share2'),
                ('dev', 'Development', 'פיתוח', 'Code2'),
                ('education', 'Education', 'חינוך והדרכה', 'GraduationCap'),
                ('creative', 'Creative', 'יצירתיות', 'Palette'),
                ('general', 'General', 'כללי', 'Box')
            ON CONFLICT (id) DO NOTHING;

            -- Create Indexes if not exist
            CREATE INDEX IF NOT EXISTS idx_public_prompts_cat ON public.public_library_prompts(category_id);
            CREATE INDEX IF NOT EXISTS idx_public_prompts_active ON public.public_library_prompts(is_active);
        `);
        console.log('✓ Applied: public_library_prompts');

        
    } catch (err) {
        console.error('Fatal Error:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
