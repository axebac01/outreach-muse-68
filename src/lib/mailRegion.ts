/**
 * Alla anrop som leder till en SMTP- eller IMAP-inloggning måste köras i samma
 * region. Annars ser mejlleverantören (t.ex. Websupport/Loopia) inloggningar
 * från flera länder inom kort tid och slår på sitt kapningsskydd:
 *   551 Blocking access, logged in from multiple non-neighboring countries
 *
 * Frankfurt (eu-central-1) är närmast våra svenska kunder av de regioner som
 * plattformen kör i.
 */
export const MAIL_REGION = "eu-central-1";

export const mailRegionHeaders = { "x-region": MAIL_REGION } as const;
