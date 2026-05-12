# AI Translate

AI Translate is a browser extension for translating selected text with configurable AI providers. It supports OpenAI-compatible APIs and Anthropic, lets users switch provider profiles, and keeps translation controls close to the browsing flow.

## Features

- Translate selected text directly from the page
- Configure multiple provider profiles
- Use OpenAI-compatible or Anthropic backends
- Switch active provider and target language from the popup
- Customize prompt templates for language pairs
- Review and search translation history
- Adjust tooltip behavior, history size, disabled sites, and import/export settings

## Installation

### Prerequisites

- Node.js
- npm

### Install From Source

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build the extension:

   ```bash
   npm run build
   ```

3. Load the built extension in your browser.

#### Chromium-Based Browsers

1. Open the browser extensions page.
2. Enable Developer Mode.
3. Choose **Load unpacked**.
4. Select the `dist` directory from this repository.

#### Firefox Development Run

Use the built-in Firefox workflow:

```bash
npm run start:firefox
```

This builds the extension, patches the generated manifest for Firefox compatibility, and launches it with `web-ext`.

### Build Packaged Artifacts

To create distributable extension packages:

```bash
npm run package
```

The command builds the extension, applies the Firefox manifest patch, and writes packaged artifacts into `packages`.

## Provider Configuration

On first install, the extension opens the settings page automatically if no provider profile exists.

1. Open **Settings** and go to **Providers**.
2. Select **Add Provider**.
3. Fill in the provider fields:
   - **Profile Name**: A label for the provider profile
   - **Provider Type**: `OpenAI Compatible` or `Anthropic`
   - **Base URL**: Defaults to the standard endpoint for the selected provider type
   - **Model**: The model name accepted by that provider
   - **API Key**: Your provider credential
   - **Temperature**: Sampling temperature used for translation requests
4. Select **Test Connection** to validate the provider details.
5. Select **Save**.

The first saved provider is activated automatically. After that, you can change the active provider either from **Settings > Providers** or from the extension popup.

### Provider Notes

#### OpenAI Compatible

Use this for OpenAI-style APIs that expose compatible chat completion behavior. The settings form defaults the base URL to:

```text
https://api.openai.com/v1
```

Enter the exact model name supported by your API provider.

#### Anthropic

Use this for Anthropic-compatible access. The settings form defaults the base URL to:

```text
https://api.anthropic.com
```

Enter the Anthropic model name you want the extension to call.

## Basic Usage

1. Select text on a webpage.
2. Click the translate icon that appears near the selection.
3. Review the translated result in the tooltip.
4. Use the popup to change the active provider, target language, or enabled state.

## Additional Settings

The settings page also includes:

- **Prompts**: Default system prompt and per-language templates
- **History**: Searchable translation history with clear-all support
- **General**:
  - Target language
  - Selection delay
  - Tooltip theme
  - Maximum history size
  - Disabled sites
  - Settings import/export

## Development Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development workflow |
| `npm run build` | Build the extension into `dist` |
| `npm run generate-icons` | Regenerate extension icon assets |
| `npm run start:firefox` | Build, patch the Firefox manifest, and launch with `web-ext` |
| `npm run package` | Build packaged extension artifacts into `packages` |

## Project Structure

```text
src/
  background/   Background service worker and provider routing
  content/      Page selector and translation tooltip
  popup/        Browser action popup
  settings/     Provider, prompt, history, and general settings UI
  shared/       Shared constants, storage, languages, and utilities
scripts/
  fix-firefox-manifest.js
  generate-icons.js
```
