// Email provider catalog — drives the SMTP/IMAP connect guides.
// Steps and notes are bilingual (sv/en) so we avoid bloating i18n files
// with per-provider walkthrough copy. UI chrome ("Step 1", buttons, etc.)
// remains in i18n.

export type LocalizedText = { sv: string; en: string };

export type ProviderStep = {
  title: LocalizedText;
  description: LocalizedText;
  /** Optional deeplink — opens in a new tab via a button below the step. */
  linkUrl?: string;
  linkLabel?: LocalizedText;
};

export type EmailProvider = {
  id: string;
  label: string;
  /** Tailwind background class for the tile icon chip. */
  tileTint: string;
  /** Email domains for autodetection, e.g. ["gmail.com"]. */
  emailDomains: string[];
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  /** True when the provider requires an app-specific password (not the user's main password). */
  requiresAppPassword: boolean;
  /** Estimated time to complete the setup, e.g. "~3 min". */
  estimatedTime: LocalizedText;
  /** Steps shown in the guide. Usually 2–4 numbered items. */
  steps: ProviderStep[];
  /** Extra warning shown at the bottom of the guide. */
  note?: LocalizedText;
  /** Placeholder shown in the password field. */
  passwordPlaceholder?: string;
  /** Recommended badge in the picker. */
  recommended?: boolean;
};

export const EMAIL_PROVIDERS: EmailProvider[] = [
  {
    id: "gmail",
    label: "Gmail",
    tileTint: "bg-[#EA4335]/10 text-[#EA4335]",
    emailDomains: ["gmail.com", "googlemail.com"],
    smtp_host: "smtp.gmail.com",
    smtp_port: 465,
    smtp_secure: true,
    imap_host: "imap.gmail.com",
    imap_port: 993,
    imap_secure: true,
    requiresAppPassword: true,
    estimatedTime: { sv: "~3 min", en: "~3 min" },
    passwordPlaceholder: "xxxx xxxx xxxx xxxx",
    steps: [
      {
        title: {
          sv: "Aktivera 2-stegsverifiering",
          en: "Enable 2-Step Verification",
        },
        description: {
          sv: "Google kräver det innan du kan skapa app-lösenord. Hoppa över om det redan är på.",
          en: "Google requires it before you can create app passwords. Skip if already enabled.",
        },
        linkUrl: "https://myaccount.google.com/signinoptions/two-step-verification",
        linkLabel: { sv: "Öppna Google-säkerhet", en: "Open Google security" },
      },
      {
        title: { sv: "Skapa ett app-lösenord", en: "Create an app password" },
        description: {
          sv: "Namnge det \"MailLead\" så är det lätt att hitta senare. Google visar 16 tecken — kopiera dem.",
          en: "Name it \"MailLead\" so you can find it later. Google shows 16 characters — copy them.",
        },
        linkUrl: "https://myaccount.google.com/apppasswords",
        linkLabel: { sv: "Öppna Google app-lösenord", en: "Open Google app passwords" },
      },
      {
        title: { sv: "Klistra in nedan", en: "Paste it below" },
        description: {
          sv: "Vi sparar lösenordet krypterat och använder det bara för att skicka och hämta mejl från denna inkorg.",
          en: "We store the password encrypted and only use it to send and fetch mail from this inbox.",
        },
      },
    ],
    note: {
      sv: "Google Workspace: 2-stegsverifiering måste vara på. Vissa organisationer har stängt av app-lösenord — fråga IT-admin om det inte funkar.",
      en: "Google Workspace: 2-Step Verification must be on. Some organizations disable app passwords — ask your IT admin if it doesn't work.",
    },
  },
  {
    id: "outlook-smtp",
    label: "Outlook / Microsoft 365",
    tileTint: "bg-[#0078D4]/10 text-[#0078D4]",
    emailDomains: [],
    smtp_host: "smtp.office365.com",
    smtp_port: 587,
    smtp_secure: false,
    imap_host: "outlook.office365.com",
    imap_port: 993,
    imap_secure: true,
    requiresAppPassword: true,
    estimatedTime: { sv: "~3 min", en: "~3 min" },
    passwordPlaceholder: "xxxxxxxxxxxxxxxx",
    steps: [
      {
        title: {
          sv: "Aktivera tvåstegsverifiering",
          en: "Enable two-step verification",
        },
        description: {
          sv: "Krävs för app-lösenord. För jobb/skola måste din admin tillåta app-lösenord i Entra ID.",
          en: "Required for app passwords. For work/school, your admin must allow app passwords in Entra ID.",
        },
        linkUrl: "https://account.microsoft.com/security",
        linkLabel: { sv: "Öppna Microsoft säkerhet", en: "Open Microsoft security" },
      },
      {
        title: { sv: "Skapa ett app-lösenord", en: "Create an app password" },
        description: {
          sv: "Gå till Säkerhet → Avancerade säkerhetsalternativ → App-lösenord → Skapa nytt. Kopiera det 16-teckens lösenordet.",
          en: "Go to Security → Advanced security options → App passwords → Create new. Copy the 16-character password.",
        },
        linkUrl: "https://account.microsoft.com/security/app-passwords",
        linkLabel: { sv: "Öppna app-lösenord", en: "Open app passwords" },
      },
      {
        title: { sv: "Klistra in nedan", en: "Paste it below" },
        description: {
          sv: "Använd hela mejladressen som användarnamn. SMTP-port 587 (STARTTLS) används automatiskt.",
          en: "Use the full email address as username. SMTP port 587 (STARTTLS) is used automatically.",
        },
      },
    ],
    note: {
      sv: "Personliga @outlook.com / @hotmail.com-konton: Microsoft stängde av SMTP AUTH 2024. Använd Microsoft OAuth-knappen istället.",
      en: "Personal @outlook.com / @hotmail.com: Microsoft disabled SMTP AUTH in 2024. Use the Microsoft OAuth button instead.",
    },
  },
  {
    id: "yahoo",
    label: "Yahoo Mail",
    tileTint: "bg-[#6001D2]/10 text-[#6001D2]",
    emailDomains: ["yahoo.com", "yahoo.se", "ymail.com", "rocketmail.com"],
    smtp_host: "smtp.mail.yahoo.com",
    smtp_port: 465,
    smtp_secure: true,
    imap_host: "imap.mail.yahoo.com",
    imap_port: 993,
    imap_secure: true,
    requiresAppPassword: true,
    estimatedTime: { sv: "~3 min", en: "~3 min" },
    steps: [
      {
        title: { sv: "Aktivera tvåstegsverifiering", en: "Enable two-step verification" },
        description: {
          sv: "Logga in på Yahoo → Kontoinformation → Kontosäkerhet → Tvåstegsverifiering.",
          en: "Sign in to Yahoo → Account Info → Account Security → Two-step verification.",
        },
        linkUrl: "https://login.yahoo.com/account/security",
        linkLabel: { sv: "Öppna Yahoo-säkerhet", en: "Open Yahoo security" },
      },
      {
        title: { sv: "Generera ett app-lösenord", en: "Generate an app password" },
        description: {
          sv: "Samma sida → \"Generera och hantera app-lösenord\" → Skapa nytt → Namnge det MailLead.",
          en: "Same page → \"Generate and manage app passwords\" → Create new → Name it MailLead.",
        },
        linkUrl: "https://login.yahoo.com/account/security/app-passwords",
        linkLabel: { sv: "Öppna app-lösenord", en: "Open app passwords" },
      },
      {
        title: { sv: "Klistra in nedan", en: "Paste it below" },
        description: {
          sv: "Yahoo visar ett 16-tecken lösenord en gång — kopiera direkt.",
          en: "Yahoo shows a 16-character password once — copy it right away.",
        },
      },
    ],
  },
  {
    id: "icloud",
    label: "iCloud Mail",
    tileTint: "bg-foreground/10 text-foreground",
    emailDomains: ["icloud.com", "me.com", "mac.com"],
    smtp_host: "smtp.mail.me.com",
    smtp_port: 587,
    smtp_secure: false,
    imap_host: "imap.mail.me.com",
    imap_port: 993,
    imap_secure: true,
    requiresAppPassword: true,
    estimatedTime: { sv: "~3 min", en: "~3 min" },
    passwordPlaceholder: "xxxx-xxxx-xxxx-xxxx",
    steps: [
      {
        title: { sv: "Aktivera tvåfaktorsautentisering", en: "Enable two-factor authentication" },
        description: {
          sv: "Krävs av Apple för att kunna skapa app-specifika lösenord. Hoppa över om det redan är på.",
          en: "Required by Apple to create app-specific passwords. Skip if already enabled.",
        },
        linkUrl: "https://appleid.apple.com/account/manage",
        linkLabel: { sv: "Öppna Apple-ID", en: "Open Apple ID" },
      },
      {
        title: { sv: "Skapa app-specifikt lösenord", en: "Create app-specific password" },
        description: {
          sv: "Apple ID → Inloggning och säkerhet → App-specifika lösenord → Skapa lösenord → Namnge det MailLead.",
          en: "Apple ID → Sign-In and Security → App-Specific Passwords → Generate → Name it MailLead.",
        },
        linkUrl: "https://account.apple.com/account/manage",
        linkLabel: { sv: "Öppna app-lösenord", en: "Open app passwords" },
      },
      {
        title: { sv: "Klistra in nedan", en: "Paste it below" },
        description: {
          sv: "Använd din @icloud.com-adress som användarnamn även om du har ett @me.com-alias.",
          en: "Use your @icloud.com address as the username even if you have a @me.com alias.",
        },
      },
    ],
  },
  {
    id: "fastmail",
    label: "Fastmail",
    tileTint: "bg-[#0067B9]/10 text-[#0067B9]",
    emailDomains: ["fastmail.com", "fastmail.fm"],
    smtp_host: "smtp.fastmail.com",
    smtp_port: 465,
    smtp_secure: true,
    imap_host: "imap.fastmail.com",
    imap_port: 993,
    imap_secure: true,
    requiresAppPassword: true,
    estimatedTime: { sv: "~2 min", en: "~2 min" },
    steps: [
      {
        title: { sv: "Öppna App passwords", en: "Open App passwords" },
        description: {
          sv: "Inställningar → Privacy & Security → Integrations → App passwords.",
          en: "Settings → Privacy & Security → Integrations → App passwords.",
        },
        linkUrl: "https://app.fastmail.com/settings/security/integrations",
        linkLabel: { sv: "Öppna Fastmail-inställningar", en: "Open Fastmail settings" },
      },
      {
        title: { sv: "Generera nytt lösenord", en: "Generate a new password" },
        description: {
          sv: "Välj \"Mail (IMAP/POP/SMTP)\" som åtkomst. Namnge det MailLead.",
          en: "Choose \"Mail (IMAP/POP/SMTP)\" as access. Name it MailLead.",
        },
      },
      {
        title: { sv: "Klistra in nedan", en: "Paste it below" },
        description: {
          sv: "Använd hela mejladressen som användarnamn.",
          en: "Use the full email address as the username.",
        },
      },
    ],
  },
  {
    id: "zoho",
    label: "Zoho Mail",
    tileTint: "bg-[#E42527]/10 text-[#E42527]",
    emailDomains: ["zoho.com", "zoho.eu"],
    smtp_host: "smtp.zoho.com",
    smtp_port: 465,
    smtp_secure: true,
    imap_host: "imap.zoho.com",
    imap_port: 993,
    imap_secure: true,
    requiresAppPassword: true,
    estimatedTime: { sv: "~3 min", en: "~3 min" },
    steps: [
      {
        title: { sv: "Aktivera tvåfaktorsautentisering", en: "Enable two-factor authentication" },
        description: {
          sv: "Zoho kräver TFA för app-lösenord. Aktivera under Security i din Zoho-profil.",
          en: "Zoho requires TFA for app passwords. Enable under Security in your Zoho profile.",
        },
        linkUrl: "https://accounts.zoho.com/home#security/tfa",
        linkLabel: { sv: "Öppna Zoho-säkerhet", en: "Open Zoho security" },
      },
      {
        title: { sv: "Generera app-lösenord", en: "Generate app password" },
        description: {
          sv: "Security → App Passwords → Generate New Password → Namnge det MailLead.",
          en: "Security → App Passwords → Generate New Password → Name it MailLead.",
        },
        linkUrl: "https://accounts.zoho.com/home#security/device",
        linkLabel: { sv: "Öppna app-lösenord", en: "Open app passwords" },
      },
      {
        title: { sv: "Klistra in nedan", en: "Paste it below" },
        description: {
          sv: "Om du använder Zoho EU (zoho.eu) ändra server till smtp.zoho.eu och imap.zoho.eu under \"Visa avancerat\".",
          en: "If you use Zoho EU (zoho.eu) change the server to smtp.zoho.eu and imap.zoho.eu under \"Show advanced\".",
        },
      },
    ],
  },
];

/** Find a provider by email domain (e.g. "user@gmail.com" → Gmail). */
export function detectProviderByEmail(email: string): EmailProvider | undefined {
  const at = email.indexOf("@");
  if (at < 0) return undefined;
  const domain = email.slice(at + 1).toLowerCase().trim();
  if (!domain) return undefined;
  return EMAIL_PROVIDERS.find((p) => p.emailDomains.includes(domain));
}

export function getProvider(id: string): EmailProvider | undefined {
  return EMAIL_PROVIDERS.find((p) => p.id === id);
}

/**
 * Filtered provider list for the UI. Gmail is hidden by default in
 * production because Google requires the paid CASA security review for
 * `gmail.send`/`gmail.readonly` scopes. Set
 * `VITE_ENABLE_GOOGLE_OAUTH=true` to surface the Gmail app-password guide.
 */
export function getVisibleProviders(): EmailProvider[] {
  const googleEnabled =
    String(import.meta.env.VITE_ENABLE_GOOGLE_OAUTH ?? "")
      .toLowerCase() === "true";
  return EMAIL_PROVIDERS.filter((p) => p.id !== "gmail" || googleEnabled);
}

/** Pick the right language variant for a LocalizedText. */
export function localized(text: LocalizedText, lang: string): string {
  return lang.startsWith("sv") ? text.sv : text.en;
}

