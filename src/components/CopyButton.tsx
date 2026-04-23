import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const CopyButton = ({ text, label }: { text: string; label?: string }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const displayLabel = label ?? t("common.copy");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(t("copy.toast"));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? t("common.copied") : displayLabel}
    </Button>
  );
};

export default CopyButton;
