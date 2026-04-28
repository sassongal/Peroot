#!/usr/bin/env node
// One-shot Hebrew translation of user-facing API error strings.
// Pattern: { error: "<English>" } → { error: "<Hebrew>", code: "<stable_id>" }
// Skips: admin/, cron/, webhooks/, health/, test-*, __tests__

import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "src/app/api");

const SKIP_RE = /[\\/](admin|cron|webhooks|health|__tests__)[\\/]|test-/;

// Map: English error string → [Hebrew, stable code]
const M = {
  "Authentication required": ["נדרשת התחברות", "auth_required"],
  "Not authenticated": ["נדרשת התחברות", "auth_required"],
  "Unauthorized": ["נדרשת התחברות", "auth_required"],
  "Rate limit exceeded. Try again later.": ["חרגת ממגבלת הבקשות. נסה שוב מאוחר יותר", "rate_limited"],
  "Too many requests": ["יותר מדי בקשות", "too_many_requests"],
  "Too many attempts": ["יותר מדי ניסיונות", "too_many_attempts"],
  "Too many attempts. Try again later.": ["יותר מדי ניסיונות. נסה שוב מאוחר יותר", "too_many_attempts"],
  "Too many requests. Try again in a minute.": ["יותר מדי בקשות. נסה שוב בעוד דקה", "too_many_requests"],
  "Too many requests. Please try again later.": ["יותר מדי בקשות. נסה שוב מאוחר יותר", "too_many_requests"],
  "Invalid JSON": ["גוף הבקשה אינו JSON תקין", "invalid_json"],
  "Invalid JSON body": ["גוף הבקשה אינו JSON תקין", "invalid_json"],
  "Invalid request": ["בקשה לא תקינה", "invalid_request"],
  "Invalid request data": ["נתוני הבקשה אינם תקינים", "invalid_request"],
  "Invalid input": ["קלט לא תקין", "invalid_input"],
  "Invalid body": ["גוף בקשה לא תקין", "invalid_body"],
  "Internal error": ["שגיאת שרת פנימית", "internal_error"],
  "Internal server error": ["שגיאת שרת פנימית", "internal_error"],
  "Internal Server Error": ["שגיאת שרת פנימית", "internal_error"],
  "Database operation failed": ["פעולת מסד הנתונים נכשלה", "db_error"],
  "Missing required fields": ["חסרים שדות חובה", "missing_fields"],
  "Missing key": ["חסר מפתח", "missing_key"],
  "Missing url parameter": ["חסר פרמטר URL", "missing_url"],
  "Failed to create user": ["יצירת המשתמש נכשלה", "user_create_failed"],
  "Failed to load folders": ["טעינת התיקיות נכשלה", "load_failed"],
  "Failed to create folder": ["יצירת התיקייה נכשלה", "create_failed"],
  "Failed to update folder": ["עדכון התיקייה נכשל", "update_failed"],
  "Failed to delete folder": ["מחיקת התיקייה נכשלה", "delete_failed"],
  "Maximum folder limit reached (50)": ["הגעת למגבלת התיקיות (50)", "limit_reached"],
  "Invalid folder data": ["נתוני התיקייה אינם תקינים", "invalid_request"],
  "Invalid update data": ["נתוני העדכון אינם תקינים", "invalid_request"],
  "Valid folder ID required": ["נדרש מזהה תיקייה תקין", "invalid_id"],
  "Failed to load library": ["טעינת הספרייה נכשלה", "load_failed"],
  "Failed to load variables": ["טעינת המשתנים נכשלה", "load_failed"],
  "Failed to save variables": ["שמירת המשתנים נכשלה", "save_failed"],
  "Failed to load ledger": ["טעינת ההיסטוריה נכשלה", "load_failed"],
  "Failed to load history": ["טעינת ההיסטוריה נכשלה", "load_failed"],
  "Failed to save history": ["שמירת ההיסטוריה נכשלה", "save_failed"],
  "Failed to load popularity": ["טעינת הנתונים נכשלה", "load_failed"],
  "Failed to update popularity": ["עדכון הנתונים נכשל", "update_failed"],
  "Failed to fetch subscription status": ["טעינת סטטוס המנוי נכשלה", "load_failed"],
  "Failed to create referral code": ["יצירת קוד ההפניה נכשלה", "create_failed"],
  "Failed to redeem code": ["מימוש הקוד נכשל", "redeem_failed"],
  "Failed to fetch versions": ["טעינת הגרסאות נכשלה", "load_failed"],
  "Failed to restore version": ["שחזור הגרסה נכשל", "restore_failed"],
  "Failed to parse suggestion": ["שגיאה בעיבוד ההצעה", "parse_failed"],
  "Failed to fetch PageSpeed data": ["טעינת נתוני PageSpeed נכשלה", "load_failed"],
  "Failed to complete onboarding": ["השלמת ההכרות נכשלה", "onboarding_failed"],
  "Failed to delete account": ["מחיקת החשבון נכשלה", "delete_failed"],
  "Failed to delete all user data. Please try again or contact support.": [
    "מחיקת כל הנתונים נכשלה. נסה שוב או פנה לתמיכה",
    "delete_failed",
  ],
  "Maximum memory limit reached": ["הגעת למגבלת הזיכרון", "limit_reached"],
  "Not found": ["לא נמצא", "not_found"],
  "Invalid id": ["מזהה לא תקין", "invalid_id"],
  "Invalid code format": ["פורמט הקוד אינו תקין", "invalid_code"],
  "Prompt not found": ["הפרומפט לא נמצא", "not_found"],
  "Version not found": ["הגרסה לא נמצאה", "not_found"],
  "Invalid URL format": ["כתובת URL אינה תקינה", "invalid_url"],
  "URL must use http or https": ["הכתובת חייבת להתחיל ב-http או https", "invalid_url"],
  "URL host is not allowed": ["הדומיין אינו מורשה", "host_not_allowed"],
  "PageSpeed API key not configured": ["מפתח PageSpeed לא מוגדר", "not_configured"],
  "AI returned invalid format. Please try again.": [
    "ה-AI החזיר תשובה בפורמט לא תקין. נסה שוב",
    "ai_invalid_format",
  ],
  "Generated chain is incomplete. Please try again.": [
    "השרשרת שנוצרה אינה שלמה. נסה שוב",
    "ai_incomplete",
  ],
  "Server is busy. Please try again in a moment.": [
    "השרת עמוס. נסה שוב בעוד רגע",
    "server_busy",
  ],
};

let filesChanged = 0;
let totalReplacements = 0;

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_RE.test(full)) continue;
      await walk(full);
    } else if (e.isFile() && e.name.endsWith(".ts")) {
      if (SKIP_RE.test(full)) continue;
      await processFile(full);
    }
  }
}

async function processFile(file) {
  let src = await fs.readFile(file, "utf8");
  const orig = src;
  let count = 0;

  for (const [eng, [heb, code]] of Object.entries(M)) {
    // Match: { error: "<eng>" }  →  { error: "<heb>", code: "<code>" }
    // Avoid double-tagging files that already have a code field.
    const escaped = eng.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\{\\s*error:\\s*"${escaped}"\\s*\\}`, "g");
    src = src.replace(re, () => {
      count++;
      return `{ error: ${JSON.stringify(heb)}, code: "${code}" }`;
    });

    // Also handle multi-property objects: { error: "<eng>", retryAfter: ... }
    const re2 = new RegExp(`error:\\s*"${escaped}"(?=\\s*[,}])`, "g");
    src = src.replace(re2, () => {
      count++;
      return `error: ${JSON.stringify(heb)}, code: "${code}"`;
    });
  }

  if (src !== orig) {
    await fs.writeFile(file, src, "utf8");
    filesChanged++;
    totalReplacements += count;
    console.log(`  ${path.relative(process.cwd(), file)}  (${count})`);
  }
}

console.log("Translating user-facing API error strings to Hebrew...\n");
await walk(ROOT);
console.log(`\nDone. ${filesChanged} files changed, ${totalReplacements} replacements.`);
