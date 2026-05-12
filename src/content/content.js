import { initSelector } from './selector.js';
import { createTooltip } from './tooltip.js';
import { initTranslator } from './translator.js';
import { MESSAGE_ACTIONS } from '../shared/constants.js';
import { getLanguageByCode } from '../shared/languages.js';

/**
 * AI Translate Content Script
 * Creates a Shadow DOM container and wires selector → translator → tooltip.
 */
(async function init() {
  // Check if extension is enabled
  let settings;
  try {
    settings = await chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.GET_SETTINGS });
  } catch {
    console.warn('AI Translate: Could not load settings');
    return;
  }

  if (!settings?.enabled) return;

  // Check if current site is disabled
  const currentUrl = window.location.href;
  if (settings.disabledSites?.some((pattern) => currentUrl.includes(pattern))) {
    return;
  }

  // Create Shadow DOM container
  const host = document.createElement('div');
  host.id = 'ai-translate-root';
  host.style.cssText = 'all: initial; position: fixed; top: 0; left: 0; z-index: 2147483647; pointer-events: none;';
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });

  // Inject styles into shadow DOM
  const style = document.createElement('style');
  style.textContent = getStyles();
  shadow.appendChild(style);

  // Create container for interactive elements
  const container = document.createElement('div');
  container.style.cssText = 'pointer-events: auto;';
  shadow.appendChild(container);

  // Initialize modules
  const tooltip = createTooltip(container);
  const translator = initTranslator();
  const selector = initSelector(container, handleTranslateRequest, settings.selectionDelay || 300);

  // Get active provider info for display
  let activeProvider = null;
  try {
    const providers = await chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.GET_PROVIDERS });
    activeProvider = providers?.find((p) => p.id === settings.activeProviderId) || providers?.[0];
  } catch {
    // Will show error when user tries to translate
  }

  /**
   * Handle a translate request from the selector.
   * @param {{ text: string, rect: DOMRect }} param
   */
  function handleTranslateRequest({ text, rect }) {
    // Remove the selector icon
    selector.removeIcon();

    const targetLang = getLanguageByCode(settings.targetLang);
    const targetName = targetLang?.name || settings.targetLang;
    const modelName = activeProvider?.model || 'Unknown';

    // Show loading tooltip
    tooltip.showLoading(rect, 'Auto-detect', targetName, modelName);

    // Start translation
    translator.translate(
      text,
      settings.targetLang,
      {
        onChunk: (chunk) => {
          tooltip.updateContent(chunk);
        },
        onComplete: (fullText) => {
          tooltip.showResult(fullText);
        },
        onError: (error) => {
          let message = error.message || 'Translation failed';
          if (error.code === 'NO_PROVIDER') {
            message = 'No provider configured — click to set up';
          }
          tooltip.showError(message, () => {
            handleTranslateRequest({ text, rect });
          });
        },
      },
      window.location.href,
      document.title
    );
  }

  // Dismiss tooltip on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      tooltip.dismiss();
      translator.abort();
    }
  });

  // Dismiss tooltip on click outside
  document.addEventListener('mousedown', (e) => {
    if (e.target && container.contains(e.target)) return;
    const path = e.composedPath();
    if (path.some((el) => el === host)) return;
    tooltip.dismiss();
  });

  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.settings) {
      settings = { ...settings, ...changes.settings.newValue };
    }
  });
})();

/**
 * Get the CSS styles for the content script UI.
 * Defined here to be injected into Shadow DOM.
 */
function getStyles() {
  return `
    /* Floating translate icon */
    .ait-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #6c5ce7, #a29bfe);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(108, 92, 231, 0.4);
      font-size: 16px;
      line-height: 1;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      animation: ait-fade-in 0.2s ease;
      user-select: none;
      z-index: 2147483647;
    }
    .ait-icon:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(108, 92, 231, 0.6);
    }

    /* Tooltip bubble */
    .ait-tooltip {
      background: #2d3436;
      color: #dfe6e9;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      max-width: 420px;
      min-width: 200px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      animation: ait-fade-in 0.2s ease;
      overflow: hidden;
      z-index: 2147483647;
    }

    .ait-tooltip-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .ait-tooltip-lang {
      font-size: 11px;
      color: #6c5ce7;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .ait-tooltip-model {
      font-size: 11px;
      color: #636e72;
    }

    .ait-tooltip-actions {
      margin-left: auto;
      display: flex;
      gap: 4px;
    }

    .ait-tooltip-btn {
      width: 24px;
      height: 24px;
      border: none;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.1);
      color: #b2bec3;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      padding: 0;
      transition: background 0.15s ease;
    }
    .ait-tooltip-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .ait-tooltip-content {
      min-height: 0;
      padding: 12px 14px;
      overflow-y: auto;
    }

    .ait-tooltip-result {
      color: #f5f6fa;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .ait-tooltip-loading {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #b2bec3;
    }

    .ait-tooltip-error {
      color: #e17055;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .ait-tooltip-retry {
      padding: 4px 12px;
      background: rgba(108, 92, 231, 0.3);
      color: #a29bfe;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }
    .ait-tooltip-retry:hover {
      background: rgba(108, 92, 231, 0.5);
    }

    /* Spinner */
    .ait-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #6c5ce7;
      border-top-color: transparent;
      border-radius: 50%;
      animation: ait-spin 0.8s linear infinite;
    }

    @keyframes ait-spin {
      to { transform: rotate(360deg); }
    }

    @keyframes ait-fade-in {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
}
