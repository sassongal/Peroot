// Maps Hebrew blog slugs to English slugs for SEO redirect support
export const HEBREW_BLOG_SLUGS: Record<string, string> = {
  "איך-לכתוב-פרומפט-טוב": "how-to-write-good-prompt",
  "מדריך-פרומפטים-few-shot": "few-shot-prompting-guide",
  "פרומפטים-לשיווק-באימייל": "ai-email-marketing-prompts",
  "מדריך-דיבוג-עם-ai": "debugging-with-ai-guide",
  "הצעות-עסקיות-עם-ai": "ai-business-proposals",
  "פורטפוליו-פרילנסר-עם-ai": "freelancer-portfolio-with-ai",
  "מדריך-פרומפטים-לרשתות-חברתיות": "social-media-prompts-guide",
  "פרומפטים-למורים-ומבחנים": "ai-tests-assignments-teachers",
  "טיפים-מתקדמים-midjourney": "midjourney-advanced-tips",
  "מדריך-למתחילים-בai": "ai-beginners-complete-guide",
  "5-מיתוסים-על-ai": "5-ai-myths-debunked",
  "פירוט-מול-פרומפטים-ידניים": "peroot-vs-manual-prompts",
  "מדריך-system-prompts": "system-prompts-ai-agents-guide",
  "seo-עם-תוכן-ai": "seo-with-ai-content-guide",
  "סקירת-קוד-עם-ai": "ai-code-review-guide",
  "צאטבוטים-לשירות-לקוחות": "ai-customer-service-chatbots",
  "סיפור-מותג-עם-ai": "brand-storytelling-with-ai",
  "טכניקת-משחק-תפקידים": "role-play-prompting-technique",
  "perplexity-מול-chatgpt": "perplexity-vs-chatgpt-research",
  "סקירת-פירוט-2026": "peroot-review-2026",
};

// Reverse: English to Hebrew
export const ENGLISH_TO_HEBREW_SLUG: Record<string, string> =
  Object.fromEntries(
    Object.entries(HEBREW_BLOG_SLUGS).map(([he, en]) => [en, he])
  );
