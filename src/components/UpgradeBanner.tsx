import { Link } from "react-router-dom";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const UpgradeBanner = ({ message }: { message: string }) => {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Rocket className="h-5 w-5 text-primary flex-shrink-0" />
        <div>
          <p className="text-sm font-medium">{message}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t("upgrade.subtext")}</p>
        </div>
      </div>
      <Button size="sm" asChild>
        <Link to="/pricing">{t("upgrade.seePlans")}</Link>
      </Button>
    </div>
  );
};

export default UpgradeBanner;
