import { DEFAULT_SYSTEM_PROMPT } from '../../shared/constants.js';

/**
 * Base class for AI translation providers.
 * All providers must extend this and implement the translate() async generator.
 */
export class BaseProvider {
  /**
   * @param {Object} config
   * @param {string} config.baseUrl - API base URL
   * @param {string} config.apiKey - API key
   * @param {string} config.model - Model name
   * @param {number} [config.temperature=0.3] - Temperature
   * @param {string|null} [config.systemPrompt=null] - Custom system prompt (null = use default)
   */
  constructor({ baseUrl, apiKey, model, temperature = 0.3, systemPrompt = null }) {
    this.baseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
    this.apiKey = apiKey;
    this.model = model;
    this.temperature = temperature;
    this.customSystemPrompt = systemPrompt;
  }

  /**
   * Build the system prompt with variable substitution.
   * @param {string} sourceLang - Source language name (or "auto")
   * @param {string} targetLang - Target language name
   * @returns {string}
   */
  buildSystemPrompt(sourceLang, targetLang) {
    const template = this.customSystemPrompt || DEFAULT_SYSTEM_PROMPT;
    return template
      .replace(/\{sourceLang\}/g, sourceLang)
      .replace(/\{targetLang\}/g, targetLang);
  }

  /**
   * Translate text. Must be implemented by subclasses.
   * @param {string} text - Text to translate
   * @param {string} sourceLang - Source language (or "auto")
   * @param {string} targetLang - Target language name
   * @yields {string} Translation text chunks
   */
  async *translate(text, sourceLang, targetLang) {
    throw new Error('translate() must be implemented by subclass');
  }

  /**
   * Parse an SSE stream from a fetch Response.
   * Yields each `data:` line's content as a string.
   * @param {Response} response
   * @yields {string} Raw data line content
   */
  async *parseSSEStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            if (data === '[DONE]') return;
            yield data;
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim().startsWith('data: ')) {
        const data = buffer.trim().slice(6);
        if (data !== '[DONE]') {
          yield data;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
