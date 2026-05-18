import { supabase } from "@/integrations/supabase/client";

export type AuditEvent =
  | "auth.sign_in"
  | "auth.sign_out"
  | "auth.sign_up"
  | "auth.password_reset"
  | "email_account.connected"
  | "email_account.disconnected"
  | "sequence.launched"
  | "sequence.paused"
  | "leads.imported"
  | "dsr.submitted"
  | "settings.changed";

export async function logAudit(
  event: AuditEvent,
  details?: {
    resource_type?: string;
    resource_id?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("audit_log").insert({
      user_id: user.id,
      event_type: event,
      resource_type: details?.resource_type ?? null,
      resource_id: details?.resource_id ?? null,
      metadata: details?.metadata ?? {},
      user_agent: navigator.userAgent.slice(0, 500),
    });
  } catch {
    // Audit logging must never break the user flow.
  }
}
