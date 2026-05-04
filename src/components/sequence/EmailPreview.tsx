import { renderTemplate, type RenderVars, type LeadVars } from "@/lib/renderTemplate";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface Props {
  subject: string | null | undefined;
  body: string;
  lead: LeadVars | null;
  inheritedSubject?: string | null;
}

export const EmailPreview = ({ subject, body, lead, inheritedSubject }: Props) => {
  const sample: RenderVars = {
    first_name: "Alex",
    last_name: "Smith",
    full_name: "Alex Smith",
    company: "Acme Inc",
    role: "Head of Sales",
    email: "alex@acme.com",
    phone: "+46 70 123 45 67",
    ...(lead ?? {}),
    sender_name: "Your Name",
    sender_email: "you@yourdomain.com",
    sender_signature: "Your Name\nYour Company",
    unsubscribe_url: "#unsubscribe-preview",
  };

  const finalSubject = subject?.trim() ? subject : inheritedSubject;
  const renderedSubject = renderTemplate(finalSubject ?? "", sample);
  const renderedBody = renderTemplate(body ?? "", sample);

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <div className="text-xs text-muted-foreground">Preview</div>
        <div className="text-sm">
          <span className="text-muted-foreground">To: </span>
          {sample.full_name} &lt;{sample.email}&gt;
        </div>
        <div className="text-sm font-medium">
          {subject?.trim() ? "" : inheritedSubject ? <span className="text-muted-foreground italic">Re: </span> : null}
          {renderedSubject || <span className="text-muted-foreground italic">No subject</span>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="whitespace-pre-wrap text-sm leading-relaxed min-h-[200px]">
          {renderedBody || <span className="text-muted-foreground italic">Email body preview will appear here.</span>}
        </div>
      </CardContent>
    </Card>
  );
};
