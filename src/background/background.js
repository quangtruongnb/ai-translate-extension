import { MESSAGE_ACTIONS } from '../shared/constants.js';
import {
  getSettings,
  saveSettings,
  getProviders,
  saveProvider,
  deleteProvider,
  getHistory,
  clearHistory,
  getPromptTemplates,
  savePromptTemplate,
  deletePromptTemplate,
  getTranslationCount,
} from '../shared/storage.js';
import { translateText, createProvider } from './api-router.js';
import { saveTranslation } from './history.js';

/**
 * Handle port-based connections for streaming translation.
 */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'translate') return;

  port.onMessage.addListener(async (msg) => {
    if (msg.action !== MESSAGE_ACTIONS.TRANSLATE) return;

    const { text, sourceLang, targetLang, pageUrl, pageTitle } = msg;

    try {
      const { provider, stream } = await translateText(text, sourceLang, targetLang);
      let fullText = '';

      for await (const chunk of stream) {
        fullText += chunk;
        port.postMessage({ type: 'chunk', content: chunk });
      }

      port.postMessage({ type: 'done', content: fullText });

      // Save to history in background
      saveTranslation({
        sourceText: text,
        translatedText: fullText,
        sourceLang,
        targetLang,
        providerName: provider.name,
        model: provider.model,
        pageUrl: pageUrl || '',
        pageTitle: pageTitle || '',
      }).catch(console.error);
    } catch (error) {
      port.postMessage({
        type: 'error',
        code: error.code || 'UNKNOWN',
        message: error.message || 'Translation failed',
      });
    }
  });
});

/**
 * Handle one-shot messages for settings, providers, history, etc.
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg)
    .then(sendResponse)
    .catch((err) => sendResponse({ error: err.message }));
  return true; // Keep channel open for async response
});

/**
 * Route a message to the appropriate handler.
 * @param {Object} msg
 * @returns {Promise<*>}
 */
async function handleMessage(msg) {
  switch (msg.action) {
    // Settings
    case MESSAGE_ACTIONS.GET_SETTINGS:
      return getSettings();
    case MESSAGE_ACTIONS.UPDATE_SETTINGS:
      return saveSettings(msg.settings);

    // Providers
    case MESSAGE_ACTIONS.GET_PROVIDERS:
      return getProviders();
    case MESSAGE_ACTIONS.SAVE_PROVIDER:
      return saveProvider(msg.provider);
    case MESSAGE_ACTIONS.DELETE_PROVIDER:
      return deleteProvider(msg.id);

    // History
    case MESSAGE_ACTIONS.GET_HISTORY:
      return getHistory();
    case MESSAGE_ACTIONS.CLEAR_HISTORY:
      return clearHistory();
    case MESSAGE_ACTIONS.GET_TRANSLATION_COUNT:
      return getTranslationCount();

    // Prompt Templates
    case MESSAGE_ACTIONS.GET_PROMPT_TEMPLATES:
      return getPromptTemplates();
    case MESSAGE_ACTIONS.SAVE_PROMPT_TEMPLATE:
      return savePromptTemplate(msg.template);
    case MESSAGE_ACTIONS.DELETE_PROMPT_TEMPLATE:
      return deletePromptTemplate(msg.id);

    // Test Connection
    case MESSAGE_ACTIONS.TEST_CONNECTION:
      return testConnection(msg.provider);

    default:
      throw new Error(`Unknown action: ${msg.action}`);
  }
}

/**
 * Test a provider connection by attempting a small translation.
 * @param {Object} profile - Provider profile to test
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function testConnection(profile) {
  try {
    const provider = createProvider(profile);
    let result = '';
    for await (const chunk of provider.translate('Hello', 'English', 'Vietnamese')) {
      result += chunk;
    }
    return { success: true, message: `Connection OK — translated to: "${result}"` };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * On install, open settings if no providers are configured.
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const providers = await getProviders();
    if (providers.length === 0) {
      chrome.tabs.create({ url: chrome.runtime.getURL('src/settings/settings.html') });
    }
  }
});

console.log('AI Translate service worker loaded');
