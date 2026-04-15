import { GeneratedEmail } from "@/types";
import CopyButton from "./CopyButton";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface EmailCardProps {
  title: string;
  content: string;
  subjectLine?: string;
}

const EmailCard = ({ title, content, subjectLine }: EmailCardProps) => {
  const handleRegenerate = () => {
    toast.success("Email regenerated!");
  };

  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{title}</h4>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleRegenerate} className="gap-1.5 text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate
          </Button>
          <CopyButton text={subjectLine ? `Subject: ${subjectLine}\n\n${content}` : content} />
        </div>
      </div>
      {subjectLine && (
        <div className="text-sm">
          <span className="font-medium text-muted-foreground">Subject:</span>{" "}
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
