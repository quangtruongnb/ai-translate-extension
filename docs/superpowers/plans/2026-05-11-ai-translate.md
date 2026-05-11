# AI Translate Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chrome/Firefox browser extension for AI-powered text translation via selection → icon → tooltip flow.

**Architecture:** Modular MV3 extension with content scripts (selector, translator, tooltip in Shadow DOM), service worker for secure API calls, popup for quick settings, and full options page. Vite bundles everything.

**Tech Stack:** Vite, vanilla JS (ES modules), CSS custom properties, chrome.storage.local, Manifest V3

**Spec:** `docs/superpowers/specs/2026-05-11-ai-translate-extension-design.md`

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.js`, `manifest.json`
- Create: `src/assets/icons/` (generate 16/48/128px icons)

- [ ] **Step 1: Initialize npm project**
Run: `npm init -y` in project root

- [ ] **Step 2: Install dependencies**
Run: `npm install -D vite @crxjs/vite-plugin@beta webextension-polyfill`

- [ ] **Step 3: Create vite.config.js**
Configure `@crxjs/vite-plugin` with manifest path. Use `defineManifest` if needed.

- [ ] **Step 4: Create manifest.json**
MV3 manifest with permissions: `["storage", "activeTab"]`, host_permissions: `["<all_urls>"]`, content_scripts pointing to `src/content/content.js`, background service_worker `src/background/background.js`, popup `src/popup/popup.html`, options_page `src/settings/settings.html`.

- [ ] **Step 5: Create placeholder entry files**
Create empty files: `src/background/background.js`, `src/content/content.js`, `src/content/content.css`, `src/popup/popup.html`, `src/popup/popup.js`, `src/popup/popup.css`, `src/settings/settings.html`, `src/settings/settings.js`, `src/settings/settings.css`

- [ ] **Step 6: Create extension icons**
Generate simple 🌐 globe icons at 16x16, 48x48, 128x128 in `src/assets/icons/`

- [ ] **Step 7: Verify build**
Run: `npm run build` — should produce `dist/` with manifest and bundled files.

- [ ] **Step 8: Commit**
`git add . && git commit -m "feat: project scaffolding with Vite + MV3"`

---

### Task 2: Shared Utilities & Constants

**Files:**
- Create: `src/shared/constants.js`, `src/shared/languages.js`, `src/shared/utils.js`, `src/shared/storage.js`

- [ ] **Step 1: Create constants.js**
Export: `DEFAULT_SETTINGS` (enabled, targetLang "vi", selectionDelay 300, tooltipTheme "dark", maxHistorySize 500), `STORAGE_KEYS`, `MESSAGE_ACTIONS` (translate, getSettings, updateSettings, etc.), `PROVIDER_TYPES` ("openai-compatible", "anthropic"), `DEFAULT_SYSTEM_PROMPT`.

- [ ] **Step 2: Create languages.js**
Export array of `{ code, name, flag }` objects for common languages (Vietnamese, English, Japanese, Korean, Chinese, French, German, Spanish, etc.). Export helper `getLanguageByCode(code)`.

- [ ] **Step 3: Create utils.js**
Export: `generateId()` (crypto.randomUUID), `truncateText(text, maxLen)`, `formatTimestamp(ts)`.

- [ ] **Step 4: Create storage.js**
Wrapper around `chrome.storage.local` using `webextension-polyfill`. Export: `getSettings()`, `saveSettings(partial)`, `getProviders()`, `saveProvider(profile)`, `deleteProvider(id)`, `getActiveProvider()`, `getHistory()`, `addHistoryEntry(entry)`, `clearHistory()`, `getPromptTemplates()`, `savePromptTemplate(tmpl)`, `deletePromptTemplate(id)`.

- [ ] **Step 5: Commit**
`git commit -m "feat: shared utilities, constants, and storage abstraction"`

---

### Task 3: API Provider Layer

**Files:**
- Create: `src/background/providers/base-provider.js`, `src/background/providers/openai-provider.js`, `src/background/providers/anthropic-provider.js`, `src/background/api-router.js`

- [ ] **Step 1: Create base-provider.js**
Abstract class `BaseProvider` with constructor taking `{ baseUrl, apiKey, model, temperature, systemPrompt }`. Abstract async generator method `translate(text, sourceLang, targetLang)`. Helper method `buildSystemPrompt(sourceLang, targetLang)` that substitutes template variables.

- [ ] **Step 2: Create openai-provider.js**
Extends `BaseProvider`. `translate()` calls `{baseUrl}/chat/completions` with `stream: true`. Parses SSE response line-by-line, extracts `choices[0].delta.content`, yields text chunks. Handles `[DONE]` sentinel. Headers: `Authorization: Bearer {apiKey}`.

- [ ] **Step 3: Create anthropic-provider.js**
Extends `BaseProvider`. `translate()` calls `{baseUrl}/v1/messages` with `stream: true`. Headers: `x-api-key`, `anthropic-version: 2023-06-01`. Parses SSE events, extracts text from `content_block_delta` events. System prompt goes in top-level `system` field (not as a message).

- [ ] **Step 4: Create api-router.js**
Export `createProvider(profile)` that returns `OpenAIProvider` or `AnthropicProvider` based on `profile.type`. Export `translateText(text, sourceLang, targetLang)` that loads active provider from storage, creates provider instance, calls translate, and returns async generator.

- [ ] **Step 5: Test manually**
Load extension in Chrome, open background service worker console, test `translateText` directly.

- [ ] **Step 6: Commit**
`git commit -m "feat: API provider layer (OpenAI-compatible + Anthropic)"`

---

### Task 4: Service Worker (background.js)

**Files:**
- Create: `src/background/background.js`, `src/background/history.js`

- [ ] **Step 1: Create history.js**
Export: `saveTranslation({ sourceText, translatedText, sourceLang, targetLang, providerName, model, pageUrl, pageTitle })` — adds entry with id/timestamp to history in storage, trims to maxHistorySize. Export `getTranslationCount()` returning `{ today, total }`.

- [ ] **Step 2: Create background.js**
Listen on `chrome.runtime.onConnect` for port-based streaming. Handle message actions:
- `translate`: create provider, stream translation chunks back via port, save to history on completion.
- `getSettings`, `updateSettings`: proxy to storage.
- `getProviders`, `saveProvider`, `deleteProvider`: proxy to storage.
- `getHistory`, `clearHistory`: proxy to storage/history.
- `getPromptTemplates`, `savePromptTemplate`, `deletePromptTemplate`: proxy to storage.
- `testConnection`: attempt a small translation to verify API key works.

Error handling: catch network/auth/rate-limit errors, send structured error via port.

- [ ] **Step 3: Verify**
Load extension, check service worker registers without errors.

- [ ] **Step 4: Commit**
`git commit -m "feat: service worker with message routing and history"`

---

### Task 5: Content Scripts — Selector Module

**Files:**
- Create: `src/content/selector.js`, `src/content/content.js`, `src/content/content.css`

- [ ] **Step 1: Create content.css**
Styles for translate icon (positioned absolute, 32x32, gradient background, border-radius, box-shadow, hover scale, fade-in animation). All selectors scoped inside Shadow DOM so they use `:host` or class selectors.

- [ ] **Step 2: Create selector.js**
Export `initSelector(onTranslateRequest)` callback-based module:
- Listen `mouseup` on document with 300ms debounce.
- On non-empty selection: get bounding rect, create/position floating icon near top-right of selection.
- On icon click: call `onTranslateRequest({ text, rect })`.
- Dismiss icon on: click elsewhere, Escape key, new selection.
- Skip whitespace-only selections and selections within our own Shadow DOM.

- [ ] **Step 3: Create content.js**
Entry point that imports `selector.js`, `translator.js` (stub), `tooltip.js` (stub). Creates Shadow DOM container `<div id="ai-translate-root">` with shadow. Imports `content.css` into shadow. Calls `initSelector()`.

- [ ] **Step 4: Verify**
Build and reload extension. Select text on any page → floating icon should appear. Click elsewhere → icon dismissed.

- [ ] **Step 5: Commit**
`git commit -m "feat: content script with text selection and floating icon"`

---

### Task 6: Content Scripts — Tooltip Module

**Files:**
- Create: `src/content/tooltip.js`

- [ ] **Step 1: Create tooltip.js**
Export `createTooltip(shadowRoot)` returning object with methods:
- `showLoading(rect, sourceLang, targetLang, model)` — render dark tooltip below rect with spinner.
- `updateContent(text)` — append streamed text chunk to result area.
- `showResult(fullText)` — final state with copy + dismiss buttons.
- `showError(message, onRetry)` — error state with retry button.
- `dismiss()` — remove tooltip.
- Copy button uses `navigator.clipboard.writeText()`.
- Position tooltip below selection rect, adjust if near viewport edge.
- Auto-dismiss on click outside shadow DOM, Escape key.

- [ ] **Step 2: Add tooltip CSS to content.css**
Dark theme tooltip: `background: #2d3436`, rounded corners, box-shadow, arrow pointing up. Loading spinner animation. Fade-in transition.

- [ ] **Step 3: Verify**
Test tooltip rendering by temporarily calling `showLoading()` and `showResult()` from selector click handler.

- [ ] **Step 4: Commit**
`git commit -m "feat: tooltip module with loading/result/error states"`

---

### Task 7: Content Scripts — Translator Bridge

**Files:**
- Create: `src/content/translator.js`
- Modify: `src/content/content.js` (wire everything together)

- [ ] **Step 1: Create translator.js**
Export `initTranslator()` returning `{ translate(text, callbacks) }`:
- Opens port via `chrome.runtime.connect({ name: "translate" })`.
- Sends `{ action: "translate", text, sourceLang: "auto", targetLang }` (load targetLang from storage).
- On port message: route to `callbacks.onChunk(text)`, `callbacks.onComplete(fullText)`, `callbacks.onError(error)`.
- Handles abort of previous translation if new one starts.

- [ ] **Step 2: Update content.js**
Wire selector → translator → tooltip:
- `onTranslateRequest`: show loading tooltip, call `translator.translate()`, stream chunks to `tooltip.updateContent()`, on complete call `tooltip.showResult()`, on error call `tooltip.showError()` with retry.

- [ ] **Step 3: End-to-end test**
Configure a provider in storage (manually via console), select text, click icon → should see translation appear in tooltip.

- [ ] **Step 4: Commit**
`git commit -m "feat: translator bridge connecting selection to API and tooltip"`

---

### Task 8: Browser Popup

**Files:**
- Create: `src/popup/popup.html`, `src/popup/popup.js`, `src/popup/popup.css`

- [ ] **Step 1: Create popup.html**
320px wide layout with: header (logo + enable/disable toggle), active provider dropdown, target language dropdown with flags, usage stats (today/total), footer links (History, Settings).

- [ ] **Step 2: Create popup.css**
Dark theme (`#1a1a2e` background). Styled toggle switch, dropdown selectors, stat cards, hover effects. Consistent with design mockup.

- [ ] **Step 3: Create popup.js**
On load: fetch settings + providers + history stats from background. Render current state. Event handlers:
- Toggle: update `enabled` in settings.
- Provider dropdown: update `activeProviderId`.
- Language dropdown: update `targetLang`.
- History link: `chrome.tabs.create` to settings page with history tab.
- Settings link: `chrome.runtime.openOptionsPage()`.

- [ ] **Step 4: Verify**
Click extension icon → popup should show with current settings. Toggle/switch should persist.

- [ ] **Step 5: Commit**
`git commit -m "feat: browser popup with provider switch and language selector"`

---

### Task 9: Settings Page — Providers Tab

**Files:**
- Create: `src/settings/settings.html`, `src/settings/settings.js`, `src/settings/settings.css`

- [ ] **Step 1: Create settings.html**
Full page with sidebar navigation (Providers, Prompts, History, General tabs). Main content area. Dark theme matching popup.

- [ ] **Step 2: Create settings.css**
Dark theme, sidebar nav with active tab highlight, form inputs, cards, buttons. Responsive layout. Consistent design system with popup.

- [ ] **Step 3: Create settings.js — tab routing**
Tab switching logic: show/hide tab content divs. URL hash routing (`#providers`, `#prompts`, `#history`, `#general`).

- [ ] **Step 4: Implement Providers tab**
Provider list with cards (name, model, host, active indicator). Add/Edit form: name, type dropdown, baseUrl, apiKey (masked input with show/hide), model, temperature slider. Save/Cancel/Delete actions. "Test Connection" button that sends `testConnection` message to background. Set Active button.

- [ ] **Step 5: Verify**
Add a provider, edit it, delete it, set active. Test connection button should work if valid API key.

- [ ] **Step 6: Commit**
`git commit -m "feat: settings page with providers tab"`

---

### Task 10: Settings Page — Prompts, History, General Tabs

**Files:**
- Modify: `src/settings/settings.js`, `src/settings/settings.html`

- [ ] **Step 1: Implement Prompts tab**
Default system prompt textarea with reset button. Per-language-pair template list with add/edit/delete. Template variable reference panel.

- [ ] **Step 2: Implement History tab**
Searchable list of past translations. Each entry: source (truncated), translation, provider, model, URL, timestamp. Copy/delete per entry. Clear all button. Paginated or virtual scroll for performance.

- [ ] **Step 3: Implement General tab**
Target language selector, selection delay slider (100-1000ms), tooltip theme radio (dark/light/auto), disabled sites textarea (one pattern per line), export/import settings buttons (JSON download/upload).

- [ ] **Step 4: Verify all tabs**
Test each tab's CRUD operations and persistence.

- [ ] **Step 5: Commit**
`git commit -m "feat: settings prompts, history, and general tabs"`

---

### Task 11: Cross-Browser & Polish

**Files:**
- Modify: `manifest.json`, `vite.config.js`, `package.json`

- [ ] **Step 1: Add Firefox compatibility**
Add `browser_specific_settings.gecko.id` to manifest. Ensure `webextension-polyfill` is imported in all entry points. Add build scripts: `build:chrome` and `build:firefox`.

- [ ] **Step 2: Add first-run experience**
On install (`chrome.runtime.onInstalled`): if no providers configured, open settings page automatically.

- [ ] **Step 3: Edge case handling**
Handle: no provider configured (tooltip shows setup link), empty/whitespace selection (skip), text > 5000 chars (truncate with warning), concurrent translations (cancel previous).

- [ ] **Step 4: README.md**
Write README with: description, features, installation (Chrome + Firefox), configuration, development setup, building.

- [ ] **Step 5: Final verification**
Load in Chrome and Firefox. Test full flow: select → icon → translate → tooltip → copy. Test settings, popup, provider switching.

- [ ] **Step 6: Commit**
`git commit -m "feat: cross-browser support, polish, and README"`
