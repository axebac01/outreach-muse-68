import { useState } from "react";
import LegalPage from "@/components/legal/LegalPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import { LEGAL } from "@/config/legal";

type RequestType = "access" | "deletion" | "rectification" | "portability" | "objection" | "other";

const TYPES: { value: RequestType; label: string }[] = [
  { value: "deletion", label: "Radering (rätten att bli glömd)" },
  { value: "access", label: "Tillgång till mina uppgifter" },
  { value: "rectification", label: "Rättelse av felaktiga uppgifter" },
  { value: "portability", label: "Dataportabilitet (exportera mina uppgifter)" },
  { value: "objection", label: "Invändning mot behandling" },
  { value: "other", label: "Annat" },
];

const Dsr = () => {
  const [email, setEmail] = useState("");
  const [type, setType] = useState<RequestType>("deletion");
  const [description, setDescription] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Ange en giltig e-postadress.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-dsr`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            request_type: type,
            description: description.trim() || null,
            company_website: companyWebsite, // honeypot — must be empty
          }),
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Misslyckades att skicka.");
      }
      setSubmitted(true);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LegalPage title="Datarättigheter (GDPR)">
      <p>
        Har du fått ett mejl från en kund hos {LEGAL.productName}? Här kan du
        utöva dina rättigheter enligt GDPR — t.ex. begära radering av dina
        uppgifter eller invända mot behandling. Vi vidarebefordrar din
        förfrågan till rätt avsändare och behandlar den inom 30 dagar.
      </p>

      {submitted ? (
        <Alert className="not-prose border-success/40 bg-success/5">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription>
            Tack! Din förfrågan är mottagen. Vi återkommer till{" "}
            <strong>{email}</strong> inom 30 dagar. Vid frågor: mejla{" "}
            <a href={`mailto:${LEGAL.privacyEmail}`} className="underline">
              {LEGAL.privacyEmail}
            </a>.
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={submit} className="not-prose space-y-4 mt-6 p-6 border rounded-lg bg-card">
          <div className="space-y-2">
            <Label htmlFor="dsr-email">Din e-postadress *</Label>
            <Input
              id="dsr-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="namn@exempel.se"
              required
            />
            <p className="text-xs text-muted-foreground">
              Vi använder denna för att hitta dina uppgifter och svara dig.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dsr-type">Vilken rättighet vill du utöva? *</Label>
            <Select value={type} onValueChange={(v) => setType(v as RequestType)}>
              <SelectTrigger id="dsr-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dsr-desc">Beskriv din förfrågan (valfritt)</Label>
            <Textarea
              id="dsr-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="T.ex. vilket mejl/avsändare det gäller"
              rows={4}
              maxLength={4000}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Skickar..." : "Skicka förfrågan"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Genom att skicka godkänner du att vi behandlar din e-postadress för
            att hantera din förfrågan. Se vår{" "}
            <a href="/legal/privacy" className="underline">integritetspolicy</a>.
          </p>
        </form>
      )}
    </LegalPage>
  );
};

export default Dsr;
