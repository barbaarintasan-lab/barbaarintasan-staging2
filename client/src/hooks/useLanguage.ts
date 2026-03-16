import { useTranslation } from 'react-i18next';

/**
 * Custom hook to get the current language code for API calls
 * Maps i18next language codes to API-compatible format
 */
export function useLanguage() {
  const { i18n } = useTranslation();
  
  // Get current language from i18n
  const currentLang = i18n.language || 'so';
  
  // Map to API format - only support Somali and English
  let apiLang: 'so' | 'en' = 'so';
  if (currentLang === 'en' || currentLang === 'english') {
    apiLang = 'en';
  } else if (currentLang === 'so' || currentLang === 'somali') {
    apiLang = 'so';
  }
  // Default to Somali for any unsupported language
  
  return {
    currentLanguage: currentLang,
    apiLanguage: apiLang,
    isSomali: apiLang === 'so',
    isEnglish: apiLang === 'en',
  };
}
