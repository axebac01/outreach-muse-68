// Rekommenderade DNS-poster + länkar till vanliga DNS-paneler.
// Används av DnsFixDialog för att visa konkreta, kopieringsbara värden.

export type SenderKind = "gmail" | "outlook" | "smtp";

export const senderKind = (provider: string): SenderKind => {
  const p = (provider ?? "").toLowerCase();
  if (p.includes("gmail") || p.includes("google")) return "gmail";
  if (p.includes("outlook") || p.includes("microsoft") || p.includes("office")) return "outlook";
  return "smtp";
};

export const spfValue = (kind: SenderKind): string => {
  switch (kind) {
    case "gmail":
      return "v=spf1 include:_spf.google.com ~all";
    case "outlook":
      return "v=spf1 include:spf.protection.outlook.com ~all";
    default:
      return "v=spf1 include:DIN-LEVERANTORS-SPF ~all";
  }
};

export const dmarcValue = (domain: string): string =>
  `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`;

export const dkimGuide = (
  kind: SenderKind,
): { url: string; provider: string } => {
  switch (kind) {
    case "gmail":
      return {
        provider: "Google Workspace",
        url: "https://support.google.com/a/answer/174124",
      };
    case "outlook":
      return {
        provider: "Microsoft 365",
        url: "https://learn.microsoft.com/microsoft-365/security/office-365-security/email-authentication-dkim-configure",
      };
    default:
      return {
        provider: "webbhotell / egen server",
        url: "https://www.mailhardener.com/kb/how-to-set-up-dkim",
      };
  }
};

export const dnsPanels: { name: string; url: string }[] = [
  { name: "Loopia", url: "https://customerzone.loopia.se/domains" },
  { name: "One.com", url: "https://www.one.com/admin/dns-settings.do" },
  { name: "Websupport", url: "https://admin.websupport.se/sv/domain" },
  { name: "Miss Hosting", url: "https://my.misshosting.com/clientarea.php" },
  { name: "Cloudflare", url: "https://dash.cloudflare.com/?to=/:account/:zone/dns" },
  { name: "GoDaddy", url: "https://dcc.godaddy.com/control/dnsmanagement" },
  { name: "Namecheap", url: "https://ap.www.namecheap.com/domains/list/" },
];
