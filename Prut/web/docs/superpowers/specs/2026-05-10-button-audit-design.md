# Button & Function Audit — Design Spec
**Date:** 2026-05-10
**Scope:** User-facing pages only (no admin panel)
**Method:** Flow-based code review, fix inline

---

## Goal

Verify every button and interactive function in the user-facing UI is fully wired: handler connected, loading/disabled state correct, auth/credit guards present, error feedback exists. Fix broken items immediately.

---

## Flows (in priority order)

### 1. Home / Prompt Improve
**Files:** `HomeClient.tsx`, `InputSection.tsx`, `PromptInput.tsx`, `HomeViewChrome.tsx`

Check:
- Enhance button: fires `handleEnhance`, disabled while loading, credit guard active
- Mode selector (Standard / Research / Image / Video / Agent): `setSelectedCapability` connected
- Target model selector: `handleSetTargetModel` connected, persisted to localStorage
- Voice language picker: `setVoiceLang` connected
- Context attachment buttons (add file, add URL, add image): handlers connected, error/retry states
- Surprise Me button: `onSurpriseMe` connected
- History strip: `onRestore` connected per item
- Recent personal prompts: `onUsePrompt` connected per item
- Library nav button: `onNavLibrary` connected
- Keyboard shortcut (Cmd/Ctrl+Enter): fires enhance

### 2. Result Actions
**Files:** `ResultSection.tsx`, `HomeResultSection.tsx`, `SmartRefinement.tsx`

Check:
- Copy button: `onCopy` connected, shows check icon on success
- Save button: `onSave` connected, auth guard present
- Save as Favorite: `onSaveAsFavorite` connected
- Save as Template: `onSaveAsTemplate` connected
- Back button: `onBack` connected
- Improve Again: `onImproveAgain` connected
- Quick Refine chips: `onQuickRefine` connected per chip
- Retry Stream: `onRetryStream` connected
- Reset to Original: `onResetToOriginal` connected
- Share button: `onShare` connected
- Score breakdown: drawer opens on click
- Variable fields: `onVariableChange` connected per field
- SmartRefinement answers: `onAnswerChange` + `onRefine` connected

### 3. Personal Library
**Files:** `PersonalLibraryView.tsx`, `PersonalLibraryGrid.tsx`, `PromptCard.tsx`, `PersonalLibraryModals.tsx`, chains components, `MemoryPalaceSidebar.tsx`, `MemoryPalaceDrawer.tsx`

Check:
- Use prompt: `incrementUseCount` + loads into input
- Edit prompt: modal opens, save/cancel connected
- Delete prompt: confirm dialog → delete RPC connected
- Favorite toggle: `handleToggleFavorite` connected
- Share prompt: share URL generated and copied
- Search/filter: `PromptSearch` input connected
- Graph view toggle: `localViewType` toggle connected
- Memory Palace sidebar collapse: localStorage persisted
- Memory Palace neighbor click: navigates to prompt
- Chains: build, run, save, delete, share all connected
- Version history: opens modal, restore version connected
- Import chain from URL: `peroot:import-shared-chain` event handled
- Add new prompt: modal opens, save connected

### 4. Settings
**Files:** `settings/page.tsx`, `SettingsProfileSection.tsx`, `SettingsBillingSection.tsx`, `SettingsReferralSection.tsx`, `SettingsDataSection.tsx`, `SettingsDangerSection.tsx`, `SettingsMemorySection.tsx`, `CreditsPanel.tsx`

Check:
- Save display name: `isSavingName` loading state, Supabase update connected
- Billing: upgrade/manage subscription → LemonSqueezy checkout connected
- Referral: copy referral link connected
- Export data: download triggers, `isExporting` state
- Clear history: confirm dialog → `clearHistory` connected
- Delete account: double-confirm flow → delete RPC connected
- Memory/variable section: save/clear connected
- Credits panel: refresh connected

### 5. Auth
**Files:** `login/page.tsx`, `reset-password/page.tsx`, `google-button.tsx`

Check:
- Email/password login: form submit connected, loading state, error feedback
- Google OAuth button: Supabase OAuth flow connected
- Forgot password: sends reset email, feedback shown
- Reset password form: new password submit connected

### 6. Pricing
**Files:** `pricing/page.tsx`

Check:
- Upgrade CTA button: LemonSqueezy checkout URL connected
- Plan toggle (monthly/annual) if present: switches price displayed
- FAQ expand/collapse if present

---

## Fix Criteria

An item is **broken** if any of:
- `onClick` / `onSubmit` is `undefined` or missing
- Handler is an empty `() => {}`  (no-op)
- Loading state never disables the button (double-fire risk)
- Auth guard absent on a feature that requires login
- No error feedback path (silent failure)
- Prop is passed but the receiving component never uses it

An item is **OK** if the handler connects all the way to an API call, state update, or navigation — even if the underlying API has bugs (those are out of scope for this audit).

---

## Deliverable

A fixed codebase where every listed button passes the fix criteria above. Any item that can't be fixed in this session (e.g. requires backend work) is noted as a comment with `// TODO(audit):`.
