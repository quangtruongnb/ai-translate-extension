import { PROVIDER_TYPES } from '../../shared/constants.js';
import { getActiveProvider, getPromptTemplates } from '../../shared/storage.js';
import { getLanguageByCode } from '../../shared/languages.js';
import { OpenAIProvider } from './providers/openai-provider.js';
import { AnthropicProvider } from './providers/anthropic-provider.js';

/**
 * Create a provider instance from a profile configuration.
 * @param {Object} profile - Provider profile from storage
 * @returns {BaseProvider}
 */
export function createProvider(profile) {
  const config = {
    baseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
    model: profile.model,
    temperature: profile.temperature ?? 0.3,
    systemPrompt: profile.systemPrompt || null,
  };

  switch (profile.type) {
    case PROVIDER_TYPES.OPENAI_COMPATIBLE:
      return new OpenAIProvider(config);
    case PROVIDER_TYPES.ANTHROPIC:
      return new AnthropicProvider(config);
    default:
      throw new Error(`Unknown provider type: ${profile.type}`);
  }
}

/**
 * Find a matching prompt template for the given language pair.
 * Checks for exact match first, then wildcard source, then returns null.
 * @param {string} sourceLang
 * @param {string} targetLang
 * @returns {Promise<Object|null>}
 */
async function findPromptTemplate(sourceLang, targetLang) {
  const templates = await getPromptTemplates();

  // Exact match
  const exact = templates.find(
    (t) => t.sourceLang === sourceLang && t.targetLang === targetLang
  );
  if (exact) return exact;

  // Wildcard source match
  const wildcard = templates.find(
    (t) => t.sourceLang === '*' && t.targetLang === targetLang
  );
  return wildcard || null;
}

/**
 * Translate text using the active provider.
 * Resolves the provider profile, applies prompt templates, and streams translation.
 *
 * @param {string} text - Text to translate
 * @param {string} sourceLang - Source language code (or "auto")
 * @param {string} targetLang - Target language code
 * @returns {Promise<{ provider: Object, stream: AsyncGenerator<string> }>}
 */
export async function translateText(text, sourceLang, targetLang) {
  const profile = await getActiveProvider();
  if (!profile) {
    throw Object.assign(new Error('No provider configured'), { code: 'NO_PROVIDER' });
  }

  // Check for custom prompt template
  const template = await findPromptTemplate(sourceLang, targetLang);

  const config = {
    baseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
    model: profile.model,
    temperature: profile.temperature ?? 0.3,
    systemPrompt: template?.systemPrompt || profile.systemPrompt || null,
  };

  let provider;
  switch (profile.type) {
    case PROVIDER_TYPES.OPENAI_COMPATIBLE:
      provider = new OpenAIProvider(config);
      break;
    case PROVIDER_TYPES.ANTHROPIC:
      provider = new AnthropicProvider(config);
      break;
    default:
      throw new Error(`Unknown provider type: ${profile.type}`);
  }

  // Resolve language names for the prompt
  const sourceDisplay = sourceLang === 'auto' ? 'auto-detected' : (getLanguageByCode(sourceLang)?.name || sourceLang);
  const targetDisplay = getLanguageByCode(targetLang)?.name || targetLang;

  return {
    provider: profile,
    stream: provider.translate(text, sourceDisplay, targetDisplay),
  };
}
