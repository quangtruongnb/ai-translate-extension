import { BaseProvider } from './base-provider.js';

/**
 * Provider for OpenAI-compatible APIs.
 * Works with: OpenAI, Ollama, LM Studio, Together AI, Groq, OpenRouter, vLLM, etc.
 *
 * Base URL should include the version path (e.g., https://api.openai.com/v1).
 * Endpoint: {baseUrl}/chat/completions
 */
export class OpenAIProvider extends BaseProvider {
  /**
   * Translate text using the OpenAI chat completions API with streaming.
   * @param {string} text
   * @param {string} sourceLang
   * @param {string} targetLang
   * @yields {string} Translation text chunks
   */
  async *translate(text, sourceLang, targetLang) {
    const systemPrompt = this.buildSystemPrompt(sourceLang, targetLang);
    const url = `${this.baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: this.temperature,
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
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          yield content;
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
