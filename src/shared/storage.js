import { STORAGE_KEYS, DEFAULT_SETTINGS } from './constants.js';
import { generateId } from './utils.js';

/**
 * Get a value from chrome.storage.local.
 * @param {string} key
 * @param {*} defaultValue
 * @returns {Promise<*>}
 */
async function get(key, defaultValue = null) {
  const result = await chrome.storage.local.get(key);
  return result[key] ?? defaultValue;
}

/**
 * Set a value in chrome.storage.local.
 * @param {string} key
 * @param {*} value
 */
async function set(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

// --- Settings ---

/**
 * Get user settings, merged with defaults.
 * @returns {Promise<Object>}
 */
export async function getSettings() {
  const stored = await get(STORAGE_KEYS.SETTINGS, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

/**
 * Update user settings (partial update).
 * @param {Object} partial - Partial settings to merge
 * @returns {Promise<Object>} Updated settings
 */
export async function saveSettings(partial) {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await set(STORAGE_KEYS.SETTINGS, updated);
  return updated;
}

// --- Providers ---

/**
 * Get all provider profiles.
 * @returns {Promise<Array>}
 */
export async function getProviders() {
  return get(STORAGE_KEYS.PROVIDERS, []);
}

/**
 * Save a provider profile (creates or updates by id).
 * @param {Object} profile
 * @returns {Promise<Object>} Saved profile
 */
export async function saveProvider(profile) {
  const providers = await getProviders();
  const existing = providers.findIndex((p) => p.id === profile.id);

  if (existing >= 0) {
    providers[existing] = profile;
  } else {
    profile.id = profile.id || generateId();
    providers.push(profile);
  }

  await set(STORAGE_KEYS.PROVIDERS, providers);
  return profile;
}

/**
 * Delete a provider profile by id.
 * @param {string} id
 */
export async function deleteProvider(id) {
  const providers = await getProviders();
  const filtered = providers.filter((p) => p.id !== id);
  await set(STORAGE_KEYS.PROVIDERS, filtered);

  // If the deleted provider was active, clear activeProviderId
  const settings = await getSettings();
  if (settings.activeProviderId === id) {
    await saveSettings({ activeProviderId: filtered[0]?.id || null });
  }
}

/**
 * Get the active provider profile.
 * @returns {Promise<Object|null>}
 */
export async function getActiveProvider() {
  const settings = await getSettings();
  const providers = await getProviders();

  if (!settings.activeProviderId) {
    return providers[0] || null;
  }

  return providers.find((p) => p.id === settings.activeProviderId) || providers[0] || null;
}

// --- Translation History ---

/**
 * Get translation history.
 * @returns {Promise<Array>}
 */
export async function getHistory() {
  return get(STORAGE_KEYS.HISTORY, []);
}

/**
 * Add a translation entry to history.
 * Trims history to maxHistorySize.
 * @param {Object} entry
 * @returns {Promise<Object>} Saved entry with id and timestamp
 */
export async function addHistoryEntry(entry) {
  const history = await getHistory();
  const settings = await getSettings();

  const saved = {
    ...entry,
    id: generateId(),
    timestamp: Date.now(),
  };

  history.unshift(saved);

  // Trim to max size
  if (history.length > settings.maxHistorySize) {
    history.length = settings.maxHistorySize;
  }

  await set(STORAGE_KEYS.HISTORY, history);
  return saved;
}

/**
 * Clear all translation history.
 */
export async function clearHistory() {
  await set(STORAGE_KEYS.HISTORY, []);
}

/**
 * Get translation counts (today and total).
 * @returns {Promise<{ today: number, total: number }>}
 */
export async function getTranslationCount() {
  const history = await getHistory();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();

  const today = history.filter((h) => h.timestamp >= todayMs).length;
  return { today, total: history.length };
}

// --- Prompt Templates ---

/**
 * Get all prompt templates.
 * @returns {Promise<Array>}
 */
export async function getPromptTemplates() {
  return get(STORAGE_KEYS.PROMPT_TEMPLATES, []);
}

/**
 * Save a prompt template (creates or updates by id).
 * @param {Object} template
 * @returns {Promise<Object>} Saved template
 */
export async function savePromptTemplate(template) {
  const templates = await getPromptTemplates();
  const existing = templates.findIndex((t) => t.id === template.id);

  if (existing >= 0) {
    templates[existing] = template;
  } else {
    template.id = template.id || generateId();
    templates.push(template);
  }

  await set(STORAGE_KEYS.PROMPT_TEMPLATES, templates);
  return template;
}

/**
 * Delete a prompt template by id.
 * @param {string} id
 */
export async function deletePromptTemplate(id) {
  const templates = await getPromptTemplates();
  const filtered = templates.filter((t) => t.id !== id);
  await set(STORAGE_KEYS.PROMPT_TEMPLATES, filtered);
}
