# Peroot Chrome Extension - Design Document

## Overview

A Chrome extension that brings Peroot's AI prompt enhancement to any webpage. Users can enhance prompts via right-click context menu or a popup launcher without leaving their current tab.

## Features

### 1. Right-Click Enhance
- Select text on any page, right-click → "שדרג עם Peroot"
- Floating dark-themed panel appears near the selection
- Streams enhanced result in real-time
- Replace in-place (editable fields) or copy to clipboard

### 2. Popup Launcher
- Click Peroot icon in toolbar
- Compact 380px wide popup with textarea, tone selector
- Enter to enhance, streaming result, one-click copy
- Shows user credit balance

### 3. Insert to Active Field
- From popup, "Insert" button sends enhanced text to the active tab's focused input field

## Architecture

```
chrome-extension/
├── manifest.json             # Manifest V3
├── background/service-worker.js  # Context menu, auth relay
├── popup/                    # Toolbar popup UI
├── content/                  # Injected floating panel
└── icons/
```

**Auth:** Leverages existing peroot.space session cookies. Extension has `host_permissions` for `peroot.space/*`, so `fetch` with `credentials: "include"` sends cookies automatically. No separate login — opens peroot.space/login if not authenticated.

**API:** All calls go to existing `/api/enhance` endpoint. New lightweight `/api/me` endpoint returns user info (tier, credits) for the extension header.

**No new server infrastructure needed.** The extension is a pure frontend client.

## Technical Decisions

- **Manifest V3** (required for Chrome Web Store since 2024)
- **No bundler** — plain JS, keeps it simple and reviewable
- **Streaming via ReadableStream** — same real-time feel as the web app
- **Draggable panel** — user can reposition the floating result panel
- **Credit deduction** — same as web app (uses existing `/api/enhance` credit logic)

## Publishing

1. Test locally: chrome://extensions → Load unpacked → select `chrome-extension/`
2. Create Chrome Web Store developer account ($5 one-time fee)
3. Package as .zip and upload to Chrome Web Store
4. After approval, add "Download Extension" button to peroot.space
