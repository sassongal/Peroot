/**
 * Apply a single migration file and verify it against the live DB.
 *
 * Purpose: a one-command, self-validating path for applying a pending schema
 * change without re-running the whole migration set. Idempotent (relies on the
 * migration's own IF NOT EXISTS guards).
 *
 * Usage:
 *   node scripts/apply-and-verify-migration.mjs [migrationFile]
 *
 * Defaults to the VIDEO_GENERATION enum migration and, for it, asserts the enum
 * label is present after applying. Reads DATABASE_URL from the environment or
 * from Prut/web/.env.local. Never prints the connection string.
 *
 * Exit codes: 0 = applied + verified, 1 = missing DATABASE_URL / apply / verify failed.
 */
import { Client } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DEFAULT_MIGRATION = "20260829000000_add_video_generation_capability_mode.sql";
const migrationFile = process.argv[2] || DEFAULT_MIGRATION;
const migrationPath = path.join(process.cwd(), "supabase", "migrations", migrationFile);

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error(
    "❌ DATABASE_URL is missing.\n" +
      "   Add it to Prut/web/.env.local (Supabase → Project Settings → Database →\n" +
      "   Connection string → URI), then re-run this script.",
  );
  process.exit(1);
}
if (!fs.existsSync(migrationPath)) {
  console.error(`❌ Migration file not found: ${migrationPath}`);
  process.exit(1);
}

const client = new Client({ connectionString: dbUrl });

async function main() {
  await client.connect();
  console.log("✓ Connected to database");

  const sql = fs.readFileSync(migrationPath, "utf8");
  console.log(`Applying: ${migrationFile} ...`);
  await client.query(sql);
  console.log("  ✓ Applied (idempotent)");

  // Targeted verification for the capability_mode enum migration.
  if (migrationFile === DEFAULT_MIGRATION) {
    const { rows } = await client.query(
      `SELECT enumlabel FROM pg_enum e
         JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'capability_mode'
        ORDER BY e.enumsortorder`,
    );
    const labels = rows.map((r) => r.enumlabel);
    console.log(`  capability_mode = [${labels.join(", ")}]`);
    if (!labels.includes("VIDEO_GENERATION")) {
      console.error("❌ Verification FAILED: VIDEO_GENERATION not present in enum.");
      process.exit(1);
    }
    console.log("✅ Verified: VIDEO_GENERATION is present in the live enum.");
  } else {
    console.log("✓ Applied (no targeted verification for this file).");
  }
}

main()
  .catch((err) => {
    console.error("❌ Error:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  })
  .finally(() => client.end());
