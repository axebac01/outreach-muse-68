import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

const EmptyState = ({ title, description, actionLabel, actionHref }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
      <Inbox className="h-6 w-6 text-muted-foreground" />
    </div>
    <h3 className="font-semibold text-lg mb-1">{title}</h3>
    <p className="text-muted-foreground text-sm max-w-sm mb-6">{description}</p>
    {actionLabel && actionHref && (
      <Button asChild>
        <Link to={actionHref}>{actionLabel}</Link>
      </Button>
    )}
  </div>
);

export default EmptyState;
