import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { queryClient } from '@/lib/queryClient';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('barbaarintasan-lang', lng);
    queryClient.invalidateQueries();
  };

  const currentLang = i18n.language;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          data-testid="button-language-switcher"
        >
          <Globe className="w-4 h-4" />
          <span className="text-sm font-medium">
            {currentLang === 'so' ? 'SO' : 'EN'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => changeLanguage('so')}
          className={currentLang === 'so' ? 'bg-blue-50 text-blue-700' : ''}
          data-testid="button-lang-somali"
        >
          <span className="mr-2">🇸🇴</span>
          {t("language.somali")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => changeLanguage('en')}
          className={currentLang === 'en' ? 'bg-blue-50 text-blue-700' : ''}
          data-testid="button-lang-english"
        >
          <span className="mr-2">🇬🇧</span>
          {t("language.english")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
