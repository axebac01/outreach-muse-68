import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const UpgradeBanner = ({ message }: { message: string }) => (
  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
      <p className="text-sm font-medium">{message}</p>
    </div>
    <Button size="sm" asChild>
      <Link to="/pricing">Upgrade</Link>
    </Button>
  </div>
);

export default UpgradeBanner;
