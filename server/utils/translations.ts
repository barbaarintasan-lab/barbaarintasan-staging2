/**
 * Utility functions for translation handling
 */

/**
 * Checks if the language is Somali (default language)
 * @param language - Language code to check
 * @returns true if the language is Somali or not specified
 */
export function isSomaliLanguage(language: string | undefined): boolean {
  return !language || language === 'so' || language === 'somali';
}

/**
 * Normalizes language codes to database format
 * @param language - Language code to normalize
 * @returns Normalized language code for database queries
 */
export function normalizeLanguageCode(language: string): string {
  return language === 'en' ? 'english' : language;
}
