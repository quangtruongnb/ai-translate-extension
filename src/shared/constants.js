/** Default system prompt for translation */
export const DEFAULT_SYSTEM_PROMPT =
  'You are a translator. Translate the following text to {targetLang}. Return ONLY the translated text, no explanations, no additional commentary.';

/** Provider types */
export const PROVIDER_TYPES = {
  OPENAI_COMPATIBLE: 'openai-compatible',
  ANTHROPIC: 'anthropic',
};

/** Message actions for chrome.runtime messaging */
export const MESSAGE_ACTIONS = {
  TRANSLATE: 'translate',
  GET_SETTINGS: 'getSettings',
  UPDATE_SETTINGS: 'updateSettings',
  GET_PROVIDERS: 'getProviders',
  SAVE_PROVIDER: 'saveProvider',
  DELETE_PROVIDER: 'deleteProvider',
  GET_ACTIVE_PROVIDER: 'getActiveProvider',
  GET_HISTORY: 'getHistory',
  ADD_HISTORY: 'addHistory',
  CLEAR_HISTORY: 'clearHistory',
  GET_PROMPT_TEMPLATES: 'getPromptTemplates',
  SAVE_PROMPT_TEMPLATE: 'savePromptTemplate',
  DELETE_PROMPT_TEMPLATE: 'deletePromptTemplate',
  TEST_CONNECTION: 'testConnection',
  GET_TRANSLATION_COUNT: 'getTranslationCount',
};

/** Storage keys */
export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  PROVIDERS: 'providers',
  HISTORY: 'history',
  PROMPT_TEMPLATES: 'promptTemplates',
};

/** Default user settings */
export const DEFAULT_SETTINGS = {
  enabled: true,
  targetLang: 'vi',
  selectionDelay: 300,
  tooltipTheme: 'dark',
  maxHistorySize: 500,
  activeProviderId: null,
  disabledSites: [],
  keyboardShortcut: null,
};

/** Maximum text length for translation */
export const MAX_TEXT_LENGTH = 5000;

/** Translation request timeout in milliseconds */
export const TRANSLATION_TIMEOUT = 30000;
