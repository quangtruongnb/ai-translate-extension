import { BaseProvider } from './base-provider.js';

/**
 * Provider for Anthropic's Messages API.
 *
 * Base URL does NOT include version path (e.g., https://api.anthropic.com).
 * Endpoint: {baseUrl}/v1/messages
 */
export class AnthropicProvider extends BaseProvider {
  /**
   * Translate text using the Anthropic Messages API with streaming.
   * @param {string} text
   * @param {string} sourceLang
   * @param {string} targetLang
   * @yields {string} Translation text chunks
   */
  async *translate(text, sourceLang, targetLang) {
    const systemPrompt = this.buildSystemPrompt(sourceLang, targetLang);
    const url = `${this.baseUrl}/v1/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: 'user', content: text },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw this._parseError(response.status, errorBody);
    }

    for await (const data of this.parseSSEStream(response)) {
      try {
        const parsed = JSON.parse(data);

        // Anthropic streaming events:
        // - content_block_delta: contains text chunks
        // - message_stop: end of message
        if (parsed.type === 'content_block_delta') {
          const text = parsed.delta?.text;
          if (text) {
            yield text;
          }
        }
      } catch {
        // Skip malformed JSON lines
      }
    }
  }

  /**
   * Parse an API error into a structured error.
   * @param {number} status
   * @param {string} body
   * @returns {Error}
   */
  _parseError(status, body) {
    let message;
    try {
      const parsed = JSON.parse(body);
      message = parsed.error?.message || parsed.message || body;
    } catch {
      message = body;
    }

    if (status === 401) {
      const err = new Error(`Authentication failed — check API key in settings`);
      err.code = 'AUTH_ERROR';
      return err;
    }
    if (status === 429) {
      const err = new Error(`Rate limited — try again in a moment`);
      err.code = 'RATE_LIMIT';
      return err;
    }
    const err = new Error(`API error (${status}): ${message}`);
    err.code = 'API_ERROR';
    return err;
  }
}
