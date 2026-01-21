# [מסמך 8] API Spec

(ב-Next.js אלו יהיו Server Actions או Route Handlers)

### `POST /api/enhance`
*   **Request:**
    ```json
    {
      "originalText": "כתוב פוסט על AI",
      "options": {
        "category": "marketing",
        "tone": "funny",
        "language": "he"
      }
    }
    ```
*   **Response (Streamed):**
    ```json
    {
      "enhancedText": "...",
      "explanation": "הוספתי הומור...",
      "usage": { "tokens": 150 }
    }
    ```

### `GET /api/templates`
*   **Query Params:** `category`, `search`.
*   **Response:** List of templates.

### `POST /api/prompts/save`
*   **Request:** `prompt_id` (if update) or payload to create new.

#### Checklist להשלמה
- [ ] הגדרת Zod Schemas לולידציה של כל קלט.
- [ ] טיפול בשגיאות (429 Too Many Requests, 500 LLM Error).
