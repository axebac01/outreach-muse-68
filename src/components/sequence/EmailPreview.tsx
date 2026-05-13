import { renderTemplate, type RenderVars, type LeadVars } from "@/lib/renderTemplate";
import { sanitizeEmailHtml } from "@/lib/sanitizeHtml";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export type PreviewLead = LeadVars & { id: string; label: string };

interface Props {
  subject: string | null | undefined;
  body: string;
  lead: LeadVars | null;
  inheritedSubject?: string | null;
  leadOptions?: PreviewLead[];
  selectedLeadId?: string | null;
  onSelectLead?: (id: string | null) => void;
}

const SAMPLE: LeadVars = {
  first_name: "Alex",
  last_name: "Smith",
  full_name: "Alex Smith",
  company: "Acme Inc",
  role: "Head of Sales",
  email: "alex@acme.com",
  phone: "+46 70 123 45 67",
};

export const EmailPreview = ({
  subject,
  body,
  lead,
  inheritedSubject,
  leadOptions,
  selectedLeadId,
  onSelectLead,
}: Props) => {
  const sample: RenderVars = {
    ...SAMPLE,
    ...(lead ?? {}),
    sender_name: "Your Name",
    sender_email: "you@yourdomain.com",
    sender_signature: "Your Name\nYour Company",
    unsubscribe_url: "#unsubscribe-preview",
  };

  const finalSubject = subject?.trim() ? subject : inheritedSubject;
  const renderedSubject = renderTemplate(finalSubject ?? "", sample);
  const renderedBody = renderTemplate(body ?? "", sample);

  // Detect missing variables actually used in template
  const used = new Set<string>();
  const re = /\{\{\s*([a-zA-Z_]+)\s*\}\}/g;
  for (const t of [finalSubject ?? "", body ?? ""]) {
    let m;
    while ((m = re.exec(t)) !== null) used.add(m[1].toLowerCase());
  }
  const missing: string[] = [];
  if (lead) {
    for (const k of ["first_name", "last_name", "full_name", "company", "role", "phone"]) {
      if (used.has(k) && !(lead as any)[k]) missing.push(k);
    }
  }

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">Preview</div>
          {leadOptions && leadOptions.length > 0 && onSelectLead && (
            <Select
              value={selectedLeadId ?? "__sample__"}
              onValueChange={(v) => onSelectLead(v === "__sample__" ? null : v)}
            >
              <SelectTrigger className="h-7 w-[180px] text-xs">
                <SelectValue placeholder="Förhandsvisa som…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__sample__">Exempeldata</SelectItem>
                {leadOptions.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">To: </span>
          {sample.full_name} &lt;{sample.email}&gt;
        </div>
        <div className="text-sm font-medium">
          {subject?.trim() ? "" : inheritedSubject ? <span className="text-muted-foreground italic">Re: </span> : null}
          {renderedSubject || <span className="text-muted-foreground italic">No subject</span>}
        </div>
        {missing.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {missing.map((m) => (
              <Badge key={m} variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                saknar {`{{${m}}}`}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {renderedBody ? (
          <div
            className="prose prose-sm max-w-none text-sm leading-relaxed min-h-[200px]"
            dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(renderedBody) }}
          />
        ) : (
          <div className="text-sm leading-relaxed min-h-[200px] text-muted-foreground italic">
            Email body preview will appear here.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
