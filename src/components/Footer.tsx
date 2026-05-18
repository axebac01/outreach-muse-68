import { Link } from "react-router-dom";
import { LEGAL } from "@/config/legal";

const Footer = () => (
  <footer className="border-t bg-muted/30">
    <div className="container py-8 grid gap-6 md:grid-cols-3 text-sm">
      <div className="space-y-2">
        <div className="font-semibold">{LEGAL.productName}</div>
        <p className="text-muted-foreground text-xs">
          {LEGAL.companyName} · Org.nr {LEGAL.orgNumber}
        </p>
        <p className="text-muted-foreground text-xs">{LEGAL.address}</p>
      </div>
      <div className="space-y-2">
        <div className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
          Juridik
        </div>
        <ul className="space-y-1">
          <li><Link to="/legal/privacy" className="hover:underline">Integritetspolicy</Link></li>
          <li><Link to="/legal/terms" className="hover:underline">Användarvillkor</Link></li>
          <li><Link to="/legal/cookies" className="hover:underline">Cookie-policy</Link></li>
          <li><Link to="/legal/subprocessors" className="hover:underline">Underbiträden</Link></li>
          <li><Link to="/dsr" className="hover:underline">Datarättigheter (GDPR)</Link></li>
        </ul>
      </div>
      <div className="space-y-2">
        <div className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
          Kontakt
        </div>
        <ul className="space-y-1">
          <li>
            <a href={`mailto:${LEGAL.contactEmail}`} className="hover:underline">
              {LEGAL.contactEmail}
            </a>
          </li>
          <li>
            <a href={`mailto:${LEGAL.privacyEmail}`} className="hover:underline">
              {LEGAL.privacyEmail} (integritet)
            </a>
          </li>
        </ul>
      </div>
    </div>
    <div className="container py-4 border-t text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
      <span>© {new Date().getFullYear()} {LEGAL.companyName}</span>
      <span>Byggd för B2B-outreach inom EU/GDPR.</span>
    </div>
  </footer>
);

export default Footer;
