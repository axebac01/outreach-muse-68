import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Inbox as InboxIcon, RefreshCw, Send, Loader2, Mail, MailOpen, ArrowDown, ArrowUp, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  useInboxThreads,
  useThreadMessages,
  useInboxRealtime,
  markThreadRead,
  type InboxThread,
} from "@/hooks/useInbox";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { useAuth } from "@/context/AuthContext";

const Inbox = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  useInboxRealtime();

  const [accountId, setAccountId] = useState<string>("all");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ["email_accounts_simple", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_accounts")
        .select("id, email, status")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: threads = [], isLoading } = useInboxThreads({
    accountId: accountId === "all" ? undefined : accountId,
    onlyUnread,
  });

  const filteredThreads = useMemo(() => {
    if (!search.trim()) return threads;
    const s = search.toLowerCase();
    return threads.filter((t) =>
      (t.subject ?? "").toLowerCase().includes(s) ||
      (t.last_snippet ?? "").toLowerCase().includes(s) ||
      t.participants.some((p) => p.toLowerCase().includes(s))
    );
  }, [threads, search]);

  const selected = useMemo(
    () => filteredThreads.find((t) => t.id === selectedId) ?? null,
    [filteredThreads, selectedId],
  );

  const { data: messages = [] } = useThreadMessages(selected);

  // Auto-select first thread on load
  useEffect(() => {
    if (!selectedId && filteredThreads.length > 0) setSelectedId(filteredThreads[0].id);
  }, [filteredThreads, selectedId]);

  // Mark as read on open
  useEffect(() => {
    if (selected && selected.unread_count > 0) {
      markThreadRead(selected).then(() => {
        qc.invalidateQueries({ queryKey: ["inbox_threads", user?.id] });
        qc.invalidateQueries({ queryKey: ["inbox_unread_count", user?.id] });
      });
    }
  }, [selected?.id]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-inbox", { body: {} });
      if (error) throw error;
      const count = data?.new_messages ?? 0;
      toast.success(count > 0 ? `${count} nytt mejl hämtat` : "Inga nya mejl");
      qc.invalidateQueries({ queryKey: ["inbox_threads", user?.id] });
    } catch (e: any) {
      toast.error(e?.message ?? "Kunde inte synka");
    } finally {
      setSyncing(false);
    }
  };

  const handleSendReply = async () => {
    if (!selected || !reply.trim() || messages.length === 0) return;
    const lastInbound = [...messages].reverse().find((m) => m.direction === "inbound");
    const recipient = lastInbound?.from_address ?? selected.participants.find((p) => {
      const acc = accounts.find((a) => a.id === selected.email_account_id);
      return p !== acc?.email.toLowerCase();
    });
    if (!recipient) {
      toast.error("Hittar ingen mottagare för svaret");
      return;
    }
    const subject = (selected.subject ?? "").startsWith("Re:")
      ? selected.subject
      : `Re: ${selected.subject ?? ""}`.trim();
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          email_account_id: selected.email_account_id,
          to: recipient,
          subject,
          body_text: reply,
          lead_id: selected.lead_id,
          sequence_id: selected.sequence_id,
          thread_key: selected.thread_key,
          in_reply_to: lastInbound?.message_id_header ?? undefined,
        },
      });
      if (error) throw error;
      setReply("");
      toast.success("Svar skickat");
      qc.invalidateQueries({ queryKey: ["inbox_messages"] });
      qc.invalidateQueries({ queryKey: ["inbox_threads", user?.id] });
    } catch (e: any) {
      toast.error(e?.message ?? "Kunde inte skicka");
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <div className="container max-w-7xl py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <InboxIcon className="h-6 w-6 text-primary" /> Unibox
            </h1>
            <p className="text-sm text-muted-foreground">
              Alla svar från alla mejlkonton och kampanjer på ett ställe
            </p>
          </div>
          <Button onClick={handleSync} disabled={syncing} variant="outline" className="gap-2">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Hämta nytt
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_360px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[500px]">
          {/* Filters */}
          <div className="space-y-4 rounded-lg border p-3 bg-card overflow-y-auto">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Mejlkonto</label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla konton</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Status</label>
              <div className="flex gap-1">
                <Button size="sm" variant={!onlyUnread ? "secondary" : "ghost"} onClick={() => setOnlyUnread(false)} className="flex-1">Alla</Button>
                <Button size="sm" variant={onlyUnread ? "secondary" : "ghost"} onClick={() => setOnlyUnread(true)} className="flex-1">Olästa</Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Sök</label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input className="pl-7" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Avsändare, ämne…" />
              </div>
            </div>
          </div>

          {/* Thread list */}
          <div className="rounded-lg border bg-card overflow-hidden flex flex-col xl:col-auto lg:col-span-1">
            <div className="px-3 py-2 border-b text-xs text-muted-foreground">
              {filteredThreads.length} {filteredThreads.length === 1 ? "konversation" : "konversationer"}
            </div>
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Laddar…</div>
              ) : filteredThreads.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Inga konversationer ännu. Klicka <strong>Hämta nytt</strong> för att synka.
                </div>
              ) : (
                <ul className="divide-y">
                  {filteredThreads.map((t) => (
                    <ThreadRow key={t.id} thread={t} accounts={accounts} active={t.id === selectedId}
                      onClick={() => setSelectedId(t.id)} />
                  ))}
                </ul>
              )}
            </ScrollArea>
          </div>

          {/* Conversation */}
          <div className="rounded-lg border bg-card overflow-hidden flex flex-col xl:col-auto lg:hidden xl:flex">
            {!selected ? (
              <div className="flex-1 grid place-items-center text-sm text-muted-foreground p-6 text-center">
                Välj en konversation för att läsa och svara.
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b">
                  <div className="font-medium truncate">{selected.subject || "(utan ämne)"}</div>
                  <div className="text-xs text-muted-foreground truncate">{selected.participants.join(", ")}</div>
                </div>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {messages.map((m) => (
                      <MessageBubble key={m.id} m={m} />
                    ))}
                  </div>
                </ScrollArea>
                <div className="border-t p-3 space-y-2 bg-muted/20">
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Skriv ditt svar…"
                    className="min-h-[100px] bg-background"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      Svar skickas från {accounts.find((a) => a.id === selected.email_account_id)?.email}
                    </span>
                    <Button onClick={handleSendReply} disabled={!reply.trim() || sending} size="sm" className="gap-2">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Skicka svar
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

const ThreadRow = ({ thread, accounts, active, onClick }: {
  thread: InboxThread;
  accounts: { id: string; email: string }[];
  active: boolean;
  onClick: () => void;
}) => {
  const unread = thread.unread_count > 0;
  const accEmail = accounts.find((a) => a.id === thread.email_account_id)?.email ?? "";
  const otherParticipant = thread.participants.find((p) => p !== accEmail.toLowerCase()) ?? "(okänd)";
  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full text-left px-3 py-2.5 hover:bg-accent transition-colors ${active ? "bg-accent" : ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className={`text-sm truncate ${unread ? "font-semibold" : ""}`}>{otherParticipant}</div>
            <div className={`text-sm truncate ${unread ? "font-medium" : "text-muted-foreground"}`}>
              {thread.subject || "(utan ämne)"}
            </div>
            <div className="text-xs text-muted-foreground truncate mt-0.5">
              {thread.last_direction === "outbound" ? "Du: " : ""}{thread.last_snippet}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: false, locale: sv })}
            </span>
            {unread && <Badge className="h-4 min-w-4 px-1 text-[10px]">{thread.unread_count}</Badge>}
          </div>
        </div>
      </button>
    </li>
  );
};

const MessageBubble = ({ m }: { m: any }) => {
  const out = m.direction === "outbound";
  return (
    <div className={`flex ${out ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${out ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
        <div className={`text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1 ${out ? "opacity-80" : "text-muted-foreground"}`}>
          {out ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {out ? "Skickat" : "Mottaget"} · {m.from_address}
          {m.is_read ? <MailOpen className="h-3 w-3 ml-1" /> : <Mail className="h-3 w-3 ml-1" />}
        </div>
        <div className="whitespace-pre-wrap break-words">{m.body_text || (m.body_html ? m.body_html.replace(/<[^>]+>/g, " ") : "")}</div>
        <div className={`text-[10px] mt-1.5 ${out ? "opacity-70" : "text-muted-foreground"}`}>
          {new Date(m.received_at || m.sent_at || m.created_at).toLocaleString("sv-SE")}
        </div>
      </div>
    </div>
  );
};

export default Inbox;
