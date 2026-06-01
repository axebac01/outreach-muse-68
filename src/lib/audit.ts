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

/**
 * Audit logging goes through the `log-audit` edge function, which validates
 * the caller's JWT server-side and inserts with the verified user_id using
 * the service role. The client cannot forge user_id, ip, or user_agent.
 */
export async function logAudit(
  event: AuditEvent,
  details?: {
    resource_type?: string;
    resource_id?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return; // unauthenticated — nothing to log
    await supabase.functions.invoke("log-audit", {
      body: {
        event_type: event,
        resource_type: details?.resource_type,
        resource_id: details?.resource_id,
        metadata: details?.metadata ?? {},
      },
    });
  } catch {
    // Audit logging must never break the user flow.
  }
}
