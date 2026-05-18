import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LEGAL } from "@/config/legal";

interface LegalPageProps {
  title: string;
  children: ReactNode;
}

export const LegalPage = ({ title, children }: LegalPageProps) => (
  <div className="min-h-screen bg-background">
    <header className="border-b">
      <div className="container py-4 flex items-center justify-between">
        <Link to="/" className="font-semibold text-lg">{LEGAL.productName}</Link>
        <nav className="flex gap-4 text-sm text-muted-foreground">
          <Link to="/legal/privacy" className="hover:text-foreground">Integritet</Link>
          <Link to="/legal/terms" className="hover:text-foreground">Villkor</Link>
          <Link to="/legal/cookies" className="hover:text-foreground">Cookies</Link>
          <Link to="/dsr" className="hover:text-foreground">Datarättigheter</Link>
        </nav>
      </div>
    </header>
    <main className="container max-w-3xl py-12">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1>{title}</h1>
        <p className="text-sm text-muted-foreground">
          Senast uppdaterad: {LEGAL.lastUpdated}
        </p>
        {children}
      </article>
      <div className="mt-12 pt-6 border-t text-xs text-muted-foreground">
        <p>
          {LEGAL.companyName} · Org.nr {LEGAL.orgNumber} · {LEGAL.address} ·{" "}
          <a href={`mailto:${LEGAL.contactEmail}`} className="underline">
            {LEGAL.contactEmail}
          </a>
        </p>
      </div>
    </main>
  </div>
);

export default LegalPage;
