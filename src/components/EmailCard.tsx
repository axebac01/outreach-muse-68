import CopyButton from "./CopyButton";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

interface EmailCardProps {
  title: string;
  content: string;
  subjectLine?: string;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

const EmailCard = ({ title, content, subjectLine, onRegenerate, isRegenerating }: EmailCardProps) => {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border-l-2 border-l-primary border border-border bg-card p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">{title}</h4>
        <div className="flex items-center gap-2">
          {onRegenerate && (
            <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={isRegenerating} className="gap-1.5 text-muted-foreground">
              <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
              {isRegenerating ? t("outreach.regenerating") : t("outreach.regenerate")}
            </Button>
          )}
          <CopyButton text={subjectLine ? `${t("outreach.subject")}: ${subjectLine}\n\n${content}` : content} />
        </div>
      </div>
      {subjectLine && (
        <div className="text-sm">
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground mr-2">{t("outreach.subject")}</span>
          <span className="font-medium">{subjectLine}</span>
        </div>
      )}
      <div className="whitespace-pre-line text-sm text-muted-foreground leading-relaxed">
        {content}
      </div>
    </div>
  );
};

export default EmailCard;
