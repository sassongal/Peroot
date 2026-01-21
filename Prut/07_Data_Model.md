# [מסמך 7] Data Model + DB Schema

### Entities
1.  **Users** (`public.users` - מנוהל ע"י Supabase Auth):
    *   `id` (UUID, PK), `email`, `full_name`, `avatar_url`, `created_at`.
2.  **Profiles** (הרחבת משתמש):
    *   `id` (FK to users), `plan_tier` (enum: free, pro), `credits_balance`, `onboarding_completed`.
3.  **Prompts**:
    *   `id` (UUID), `user_id` (FK), `original_text` (Text), `enhanced_text` (Text), `category` (String), `tone` (String), `is_favorite` (Boolean), `created_at`.
4.  **Templates**:
    *   `id`, `title`, `description`, `structure_json`, `category`, `tags` (Array).

### Retention
*   לוגים של שימוש טכני (UsageLogs) יישמרו ל-30 יום.
*   היסטוריית משתמש (Prompts) תישמר ללא הגבלה כל עוד החשבון פעיל (Soft delete).

#### Checklist להשלמה
- [ ] כתיבת סקריפט SQL ראשוני (Migration 001).
- [ ] הגדרת RLS (Row Level Security) ב-Supabase להגנה על מידע משתמשים.
