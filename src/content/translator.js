import { MESSAGE_ACTIONS } from '../shared/constants.js';

/**
 * Initialize the translator bridge.
 * Communicates with the service worker via port-based messaging for streaming.
 *
 * @returns {Object} Translator with translate() method
 */
export function initTranslator() {
  let activePort = null;

  /**
   * Abort any in-progress translation.
   */
  function abort() {
    if (activePort) {
      try {
        activePort.disconnect();
      } catch {
        // Port may already be disconnected
      }
      activePort = null;
    }
  }

  /**
   * Translate text by streaming from the service worker.
   *
   * @param {string} text - Text to translate
   * @param {string} targetLang - Target language code
   * @param {Object} callbacks
   * @param {Function} callbacks.onChunk - Called with each text chunk
   * @param {Function} callbacks.onComplete - Called with full translated text
   * @param {Function} callbacks.onError - Called with error { code, message }
   * @param {string} [pageUrl] - Current page URL
   * @param {string} [pageTitle] - Current page title
   */
  function translate(text, targetLang, callbacks, pageUrl, pageTitle) {
    abort(); // Cancel any previous translation

    const port = chrome.runtime.connect({ name: 'translate' });
    activePort = port;

    port.onMessage.addListener((msg) => {
      switch (msg.type) {
        case 'chunk':
          callbacks.onChunk(msg.content);
          break;
        case 'done':
          callbacks.onComplete(msg.content);
          activePort = null;
          break;
        case 'error':
          callbacks.onError({ code: msg.code, message: msg.message });
          activePort = null;
          break;
      }
    });

    port.onDisconnect.addListener(() => {
      if (activePort === port) {
        const error = chrome.runtime.lastError;
        if (error) {
          callbacks.onError({ code: 'DISCONNECT', message: error.message });
        }
        activePort = null;
      }
    });

    port.postMessage({
      action: MESSAGE_ACTIONS.TRANSLATE,
      text,
      sourceLang: 'auto',
      targetLang,
      pageUrl: pageUrl || window.location.href,
      pageTitle: pageTitle || document.title,
    });
  }

  return { translate, abort };
}
