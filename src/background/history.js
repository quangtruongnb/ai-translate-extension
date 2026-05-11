import { addHistoryEntry, getTranslationCount } from '../shared/storage.js';

/**
 * Save a completed translation to history.
 * @param {Object} params
 * @param {string} params.sourceText
 * @param {string} params.translatedText
 * @param {string} params.sourceLang
 * @param {string} params.targetLang
 * @param {string} params.providerName
 * @param {string} params.model
 * @param {string} params.pageUrl
 * @param {string} params.pageTitle
 * @returns {Promise<Object>}
 */
export async function saveTranslation({
  sourceText,
  translatedText,
  sourceLang,
  targetLang,
  providerName,
  model,
  pageUrl,
  pageTitle,
}) {
  return addHistoryEntry({
    sourceText,
    translatedText,
    sourceLang,
    targetLang,
    providerName,
    model,
    pageUrl,
    pageTitle,
  });
}

/**
 * Get translation counts for today and total.
 * @returns {Promise<{ today: number, total: number }>}
 */
export { getTranslationCount };
