# AI Translate — Browser Extension Design Spec

A browser extension (Chrome + Firefox) for AI-powered text translation. Users select text on any webpage, click a floating translate icon, and see the translation in a tooltip bubble. Supports OpenAI-compatible and Anthropic Claude APIs with multiple configurable provider profiles.

## Core Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Translation mode | Selection-based | Focused, non-intrusive UX |
| Trigger mechanism | Floating icon near selection | Discoverable, avoids accidental triggers |
| Result display | Tooltip/bubble | Compact, stays in reading context |
| API protocols | OpenAI-compatible + Anthropic Messages | Maximum provider flexibility |
| Source language | Auto-detected by AI model | No user friction |
| Target language | User-configured | Set once in settings/popup |
| Tech stack | Vite + vanilla JS | Modern build, no framework overhead |
| Manifest | V3 | Required for Chrome, now supported by Firefox |
| Architecture | Modular content scripts | Clean separation of concerns |

---

## 1. Architecture

### 1.1 Component Overview

```
┌─────────────────────────────────────────────────────────┐
│  Content Scripts (injected into web pages)               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│  │ selector.js   │→│ translator.js│→│ tooltip.js       │ │
│  │ Text selection│ │ API messaging│ │ Result rendering │ │
│  │ Icon display  │ │ Stream chunks│ │ Copy/dismiss     │ │
│  └──────────────┘ └──────────────┘ └──────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ chrome.runtime.sendMessage
┌────────────────────────▼────────────────────────────────┐
│  Service Worker (background.js)                          │
│  ┌──────────────┐ ┌──────────────┐                       │
│  │ API Router   │ │ Provider     │                       │
│  │ OpenAI compat│ │ Profiles     │                       │
│  │ Anthropic API│ │ Management   │                       │
│  └──────────────┘ └──────────────┘                       │
└────────────────────────┬────────────────────────────────┘
                         │ chrome.storage.local
┌────────────────────────▼────────────────────────────────┐
│  Storage                                                 │
│  Provider profiles, translation history, prompt          │
│  templates, user preferences                             │
└─────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────────────────────┐
│  Popup (popup.html)│  │  Options Page (settings.html)    │
│  Quick provider    │  │  Full settings management        │
│  switch, toggle,   │  │  Providers, prompts, history,    │
│  target language   │  │  general preferences             │
└──────────────────┘  └──────────────────────────────────┘
```

### 1.2 Content Script Modules

All three modules are bundled by Vite into a single content script but written as separate source files for maintainability.

**selector.js** — Text selection detection and floating icon:
- Listens for `mouseup` events on the document
- After a 300ms debounce delay, checks if there's a non-empty text selection
- Renders a small floating 🌐 icon at the top-right corner of the selection bounding rect
- Icon has a tooltip hint: "Click to translate"
- Click handler sends selected text to `translator.js`
- Dismisses icon on click elsewhere, new selection, or Escape key

**translator.js** — API communication bridge:
- Receives selected text from `selector.js`
- Sends `chrome.runtime.sendMessage` to the service worker with `{ action: "translate", text, sourceLang: "auto", targetLang }`
- Receives streamed response chunks via port-based messaging
- Manages loading/error/success states and forwards to `tooltip.js`

**tooltip.js** — Translation result rendering:
- Creates a Shadow DOM container to isolate styles from the host page
- Renders a dark-themed tooltip bubble positioned below the selection
- States: loading (spinner + "Translating..."), result (translated text), error (message + Retry button)
- Shows detected source language → target language label and active model name
- Action buttons: Copy (copies translation to clipboard), Dismiss (✕)
- Auto-dismisses when user clicks outside, presses Escape, or makes a new selection

### 1.3 Service Worker (background.js)

- Receives translation requests from content scripts via `chrome.runtime.onMessage`
- Loads the active provider profile from `chrome.storage.local`
- Routes to the correct API handler (OpenAI-compatible or Anthropic)
- Returns translation response via port-based streaming
- Manages provider profile CRUD operations
- Saves completed translations to history storage
- Handles errors (network, auth, rate limit) with structured error responses

### 1.4 Shadow DOM Isolation

All injected UI (translate icon + tooltip) is rendered inside a Shadow DOM attached to a container `<div>`. This ensures:
- Extension styles don't leak into the page
- Page styles don't break the extension UI
- Works consistently across all websites

---

## 2. User Interaction Flow

### 2.1 Happy Path

1. User selects text on any webpage
2. After 300ms debounce, a floating 🌐 icon appears near the top-right of the selection
3. User clicks the icon
4. A dark tooltip bubble appears below the selection with:
   - Language label: "English → Vietnamese" (source auto-detected)
   - Model name: "via GPT-4o"
   - Loading spinner with "Translating..." text
5. Translation streams in, replacing the spinner
6. User can: copy translation, dismiss tooltip, or click elsewhere to auto-dismiss

### 2.2 Error Handling

| Error | Tooltip Display | Recovery |
|---|---|---|
| Network error | "Connection failed" | Retry button |
| Invalid API key | "Authentication failed — check API key in settings" | Link to settings |
| Rate limited | "Rate limited — try again in a moment" | Retry button with backoff |
| Empty response | "No translation returned" | Retry button |
| Timeout (30s) | "Request timed out" | Retry button |

### 2.3 Dismissal Behaviors

- **Click elsewhere** → tooltip + icon disappear
- **New text selection** → previous tooltip dismissed, new icon appears
- **Scroll away** → tooltip follows selection position briefly, then fades out
- **Escape key** → dismisses tooltip
- **Extension disabled** → no icon appears on selection

---

## 3. API Abstraction Layer

### 3.1 Provider Interface

```javascript
// All providers implement this interface
class BaseProvider {
  constructor(config) { /* baseUrl, apiKey, model, temperature, systemPrompt */ }
  async *translate(text, sourceLang, targetLang) { /* yields string chunks */ }
}
```

### 3.2 OpenAI-Compatible Provider

- **Endpoint**: `{baseUrl}/chat/completions` — base URL includes version path (e.g., `https://api.openai.com/v1`)
- **Headers**: `Authorization: Bearer {apiKey}`, `Content-Type: application/json`
- **Body**: Standard chat completions format with `stream: true`
- **Streaming**: SSE parsing of `data: {...}` lines, extracting `choices[0].delta.content`
- **Compatible with**: OpenAI, Ollama, LM Studio, Together AI, Groq, OpenRouter, vLLM, any OpenAI-compatible server

### 3.3 Anthropic Provider

- **Endpoint**: `{baseUrl}/v1/messages` — base URL does NOT include version (e.g., `https://api.anthropic.com`)
- **Headers**: `x-api-key: {apiKey}`, `anthropic-version: 2023-06-01`, `Content-Type: application/json`
- **Body**: Anthropic Messages API format with `stream: true`
- **Streaming**: SSE parsing, extracting `content_block_delta` events for text chunks

### 3.4 Translation Prompt

**Default system prompt:**
```
You are a translator. Translate the following text to {targetLang}. Return ONLY the translated text, no explanations, no additional commentary.
```

**User message:** The selected text verbatim.

Users can customize the system prompt per language pair via prompt templates. Template variables: `{sourceLang}`, `{targetLang}`, `{text}`.

---

## 4. Data Model

### 4.1 Provider Profile

```javascript
{
  id: "uuid-string",
  name: "My OpenAI",                     // User-friendly display name
  type: "openai-compatible" | "anthropic",
  baseUrl: "https://api.openai.com/v1",  // Includes version for OpenAI-compatible
  apiKey: "sk-...",                       // Stored in chrome.storage.local
  model: "gpt-4o",
  temperature: 0.3,                      // 0-2, default 0.3
  systemPrompt: null                     // null = use default, string = override
}
```

### 4.2 Prompt Template

```javascript
{
  id: "uuid-string",
  name: "English to Vietnamese",
  sourceLang: "en",     // or "*" for any source
  targetLang: "vi",
  systemPrompt: "You are a professional English-Vietnamese translator. Translate naturally, preserving tone and meaning. Return ONLY the translation."
}
```

### 4.3 Translation History Entry

```javascript
{
  id: "uuid-string",
  sourceText: "The quick brown fox...",
  translatedText: "Con cáo nâu nhanh nhẹn...",
  sourceLang: "en",        // Auto-detected
  targetLang: "vi",
  providerName: "My OpenAI",
  model: "gpt-4o",
  pageUrl: "https://example.com/article",
  pageTitle: "Example Article",
  timestamp: 1715400000000
}
```

### 4.4 User Preferences

```javascript
{
  enabled: true,
  targetLang: "vi",
  selectionDelay: 300,        // ms before showing icon
  tooltipTheme: "dark",       // "dark" | "light" | "auto"
  maxHistorySize: 500,
  activeProviderId: "uuid-string",
  disabledSites: [],          // URL patterns to exclude
  keyboardShortcut: null      // Optional keyboard shortcut
}
```

---

## 5. Browser Popup

Compact popup (320px wide) accessible from the toolbar icon:

- **Enable/disable toggle** — turn translation on/off instantly, persists across sessions
- **Provider switcher** — dropdown listing all configured profiles, click to switch active provider
- **Target language selector** — dropdown with country flags, most common languages first
- **Usage stats** — translations today + total count
- **Quick links** — shortcuts to History tab and full Settings page

---

## 6. Settings Page (Options)

Full-page options accessible from popup or `chrome://extensions`:

### 6.1 Providers Tab
- List of provider profile cards with active indicator (green dot)
- Each card: name, model, base URL host, actions (Set Active / Edit / Delete)
- "Add Provider" button opens inline form
- Edit form: profile name, provider type (dropdown), base URL, API key (masked), model name, temperature slider
- "Test Connection" button to validate API key

### 6.2 Prompts Tab
- Default system prompt editor (textarea with reset button)
- Per-language-pair prompt templates (list with add/edit/delete)
- Template variables reference panel: `{sourceLang}`, `{targetLang}`, `{text}`

### 6.3 History Tab
- Searchable, scrollable list of past translations
- Each entry: source text (truncated), translated text, provider, model, page URL, timestamp
- Actions per entry: copy source, copy translation, delete
- Bulk actions: clear all history
- Max history size setting

### 6.4 General Tab
- Target language selector
- Selection delay (ms, slider)
- Tooltip theme: dark / light / auto (matches page)
- Disabled sites list (URL pattern input with add/remove)
- Keyboard shortcut configuration
- Export / import all settings (JSON file)

---

## 7. Build & Project Structure

### 7.1 Tech Stack

- **Build**: Vite with `@crxjs/vite-plugin` or manual multi-entry build for browser extension
- **Language**: Vanilla JavaScript (ES modules)
- **Styling**: CSS with CSS custom properties for theming
- **Storage**: `chrome.storage.local` for all data
- **Target**: Manifest V3, compatible with Chrome and Firefox

### 7.2 Project Structure

```
ai-translate/
├── src/
│   ├── background/
│   │   ├── background.js          # Service worker entry
│   │   ├── api-router.js          # Routes to correct provider
│   │   ├── providers/
│   │   │   ├── base-provider.js   # Base class
│   │   │   ├── openai-provider.js # OpenAI-compatible implementation
│   │   │   └── anthropic-provider.js # Anthropic implementation
│   │   ├── history.js             # Translation history manager
│   │   └── storage.js             # Storage abstraction
│   ├── content/
│   │   ├── content.js             # Entry point (imports modules)
│   │   ├── selector.js            # Text selection + icon
│   │   ├── translator.js          # Translation bridge
│   │   ├── tooltip.js             # Result tooltip (Shadow DOM)
│   │   └── content.css            # Tooltip/icon styles
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── settings/
│   │   ├── settings.html
│   │   ├── settings.js
│   │   └── settings.css
│   ├── shared/
│   │   ├── constants.js           # Shared constants
│   │   ├── languages.js           # Language list with flags
│   │   └── utils.js               # Shared utilities
│   └── assets/
│       └── icons/                 # Extension icons (16, 48, 128px)
├── manifest.json                  # MV3 manifest
├── vite.config.js
├── package.json
└── README.md
```

### 7.3 Manifest V3 Key Permissions

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["<all_urls>"],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["src/content/content.js"],
    "css": ["src/content/content.css"]
  }],
  "background": {
    "service_worker": "src/background/background.js"
  },
  "action": {
    "default_popup": "src/popup/popup.html"
  },
  "options_page": "src/settings/settings.html"
}
```

Note: `host_permissions: ["<all_urls>"]` is needed so the service worker can make API calls to user-configured endpoints (OpenAI, Anthropic, local servers, etc.).

### 7.4 Cross-Browser Compatibility

- Use `chrome.*` APIs with the `webextension-polyfill` package for Firefox compatibility
- Single codebase, build two outputs: one for Chrome (`.zip`), one for Firefox (`.xpi`)
- Firefox-specific: `browser_specific_settings.gecko.id` in manifest

---

## 8. Error Handling & Edge Cases

- **No provider configured**: Tooltip shows "No provider configured — click to set up" with link to settings
- **Empty selection**: Icon does not appear for whitespace-only selections
- **Very long text**: Truncate to 5000 characters with a warning in the tooltip
- **Service worker inactive**: Content script reconnects automatically on message failure
- **Concurrent translations**: Only one active translation at a time; new request cancels previous
- **CORS for local servers**: Service worker makes the API calls (not content script), so CORS is not an issue

---

## 9. Testing Strategy

- **Manual testing**: Load unpacked extension in Chrome, test selection→icon→translate flow on various sites
- **API mocking**: Test provider implementations against mock SSE endpoints
- **Cross-browser**: Test in both Chrome and Firefox (sideloaded)
- **Edge cases**: Test on sites with complex DOM (Shadow DOM pages, iframes, SPAs)
