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
    user_id?: string;
    resource_type?: string;
    resource_id?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    let userId = details?.user_id;
    if (!userId) {
      // Synchronously read cached session — no network roundtrip.
      const { data } = await supabase.auth.getSession();
      userId = data.session?.user.id;
    }
    if (!userId) return;
    await supabase.from("audit_log").insert([{
      user_id: userId,
      event_type: event,
      resource_type: details?.resource_type,
      resource_id: details?.resource_id,
      metadata: (details?.metadata ?? {}) as never,
      user_agent: navigator.userAgent.slice(0, 500),
    }]);
  } catch {
    // Audit logging must never break the user flow.
  }
}
