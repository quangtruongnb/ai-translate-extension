/** Language definitions with display names and flag emojis */
export const LANGUAGES = [
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
];

/**
 * Get a language object by its code.
 * @param {string} code - Language code (e.g., 'vi', 'en')
 * @returns {{ code: string, name: string, flag: string } | undefined}
 */
export function getLanguageByCode(code) {
  return LANGUAGES.find((lang) => lang.code === code);
}

/**
 * Get display text for a language code (e.g., "🇻🇳 Vietnamese").
 * @param {string} code - Language code
 * @returns {string}
 */
export function getLanguageDisplay(code) {
  const lang = getLanguageByCode(code);
  if (!lang) return code;
  return `${lang.flag} ${lang.name}`;
}
