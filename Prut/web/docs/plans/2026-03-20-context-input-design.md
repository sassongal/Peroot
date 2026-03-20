# Context Input Feature — Design Doc

**Date:** 2026-03-20
**Status:** Approved spec, ready for implementation
**Impact:** High — transforms Peroot from "text enhancer" to "context-aware AI assistant"

## Core Concept
Users attach files (PDF/DOCX/TXT/CSV/XLSX), URLs, or images alongside their prompt.
Peroot extracts text/description and injects it as context into the enhancement engine.

## UI
- Context icons row below textarea: 📎 File | 🌐 URL | 📷 Image | 🎤 Voice (existing)
- Chips show attached items with name + size + remove button
- States: empty → loading → ready → error

## Backend Flow
1. User writes prompt + attaches context
2. On "Enhance", backend extracts text from attachments
3. Context injected into AI engine as structured `context[]` array
4. AI engine references context content in enhanced prompt

## Constraints
- Per-attachment: 5,000 tokens max
- Total context: 15,000 tokens max
- File size: 10MB (files), 5MB (images)
- Max items: 3 files + 3 URLs + 3 images
- Free users: 1 file/day. Pro: unlimited
- Privacy: files processed in memory, not stored. Session cache 1 hour.

## NPM Dependencies
- `pdf-parse` — PDF text extraction
- `mammoth` — DOCX to text
- `xlsx` (SheetJS) — spreadsheet parsing
- `papaparse` — CSV parsing
- `@mozilla/readability` + `cheerio` — URL content extraction
- Gemini Flash 2.0 — image description via Vision API

## Implementation Phases
1. **UI** — Context icons row + file upload + chips + states
2. **Backend** — Extraction APIs (PDF/DOCX/TXT + URL scraping + token counting)
3. **Integration** — Wire context into enhance API + system prompt adjustment
4. **Image** — Vision API integration for image description
5. **Polish** — Rate limiting, error handling, mobile PWA, caching

## API Schema
```json
{
  "user_prompt": "string",
  "mode": "text | research | image | video | agent",
  "context": [
    {
      "type": "file | url | image",
      "format": "pdf | docx | txt | csv | xlsx",
      "filename": "string",
      "extracted_text": "string (max 5000 tokens)",
      "description": "string (for images)",
      "metadata": {}
    }
  ]
}
```
