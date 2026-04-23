import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check } from "lucide-react";

const LANGS = [
  { code: "en", flag: "🇬🇧", labelKey: "language.english" },
  { code: "sv", flag: "🇸🇪", labelKey: "language.swedish" },
];

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const current = LANGS.find((l) => i18n.language?.startsWith(l.code)) ?? LANGS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-base"
          aria-label={t("language.switch")}
        >
          <span aria-hidden>{current.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => i18n.changeLanguage(l.code)}
            className="gap-2 cursor-pointer"
          >
            <span className="text-base" aria-hidden>{l.flag}</span>
            <span className="flex-1">{t(l.labelKey)}</span>
            {current.code === l.code && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
