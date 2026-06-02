import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Inbox as InboxIcon, RefreshCw, Send, Loader2, Mail, MailOpen, ArrowDown, ArrowUp, Search, Sparkles, Ban, AlertCircle } from "lucide-react";
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
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("inbox_show_all") === "1";
  });
  const [view, setView] = useState<"inbox" | "sent">(() => {
    if (typeof window === "undefined") return "inbox";
    return (localStorage.getItem("inbox_view") as "inbox" | "sent") || "inbox";
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("inbox_show_all", showAll ? "1" : "0");
    }
  }, [showAll]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("inbox_view", view);
    }
  }, [view]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [replyTouched, setReplyTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

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
    sentiment: sentimentFilter === "all" ? undefined : sentimentFilter,
    showAll,
    view,
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

  const lastInbound = useMemo(
    () => [...messages].reverse().find((m) => m.direction === "inbound") ?? null,
    [messages],
  );

  // Auto-select first thread on load
  useEffect(() => {
    if (!selectedId && filteredThreads.length > 0) setSelectedId(filteredThreads[0].id);
  }, [filteredThreads, selectedId]);

  // Reset reply state when switching threads
  useEffect(() => {
    setReply("");
    setReplyTouched(false);
  }, [selected?.id]);

  // Auto-fill reply with AI suggestion when available and user hasn't typed
  useEffect(() => {
    if (!lastInbound || replyTouched) return;
    if (lastInbound.suggested_reply && !reply) {
      setReply(lastInbound.suggested_reply);
    }
  }, [lastInbound?.id, lastInbound?.suggested_reply, replyTouched]);

  // Mark as read on open
  useEffect(() => {
    if (selected && selected.unread_count > 0) {
      markThreadRead(selected).then(() => {
        qc.invalidateQueries({ queryKey: ["inbox_threads", user?.id] });
        qc.invalidateQueries({ queryKey: ["inbox_unread_count", user?.id] });
      });
    }
  }, [selected?.id]);

  const handleAnalyze = async (force = false) => {
    if (!lastInbound) return;
    setAnalyzing(true);
    try {
      const { error } = await supabase.functions.invoke("analyze-inbound-email", {
        body: { message_id: lastInbound.id, force },
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["inbox_messages"] });
      qc.invalidateQueries({ queryKey: ["inbox_threads", user?.id] });
      toast.success("AI-analys klar");
    } catch (e: any) {
      toast.error(e?.message ?? "Analys misslyckades");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddUnsubscribe = async () => {
    if (!lastInbound || !user) return;
    try {
      await supabase.from("unsubscribes").insert({
        user_id: user.id,
        email: lastInbound.from_address,
        sequence_id: selected?.sequence_id ?? null,
        source: "inbox_request",
      });
      toast.success("Avregistrerad");
    } catch (e: any) {
      toast.error(e?.message ?? "Kunde inte avregistrera");
    }
  };

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
    const recipient = lastInbound?.from_address ?? selected.participants.find((p) => {
      const acc = accounts.find((a) => a.id === selected.email_account_id);
      return p !== acc?.email.toLowerCase();
    });
    if (!recipient) {
      toast.error("Hittar ingen mottagare för svaret");
      return;
    }
    const subject = /^re:/i.test(selected.subject ?? "")
      ? (selected.subject ?? "")
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
      setReplyTouched(false);
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

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] xl:grid-cols-[280px_360px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[500px]">
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
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Sentiment</label>
              <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla</SelectItem>
                  <SelectItem value="positive">Positiva</SelectItem>
                  <SelectItem value="neutral">Neutrala</SelectItem>
                  <SelectItem value="negative">Negativa</SelectItem>
                  <SelectItem value="auto_reply">Auto-svar</SelectItem>
                  <SelectItem value="unsubscribe_request">Avregistreringar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Sök</label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input className="pl-7" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Avsändare, ämne…" />
              </div>
            </div>
            <div className="pt-2 border-t space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Omfång</label>
              <div className="flex gap-1">
                <Button size="sm" variant={!showAll ? "secondary" : "ghost"} onClick={() => setShowAll(false)} className="flex-1 text-xs">Endast leads</Button>
                <Button size="sm" variant={showAll ? "secondary" : "ghost"} onClick={() => setShowAll(true)} className="flex-1 text-xs">Visa alla</Button>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {showAll
                  ? "Visar alla mejl i dina synkade konton."
                  : "Visar bara mejl till/från dina leads och kampanjsvar."}
              </p>
            </div>
          </div>

          {/* Thread list */}
          <div className="rounded-lg border bg-card overflow-hidden flex flex-col xl:col-auto lg:col-span-1">
            <div className="border-b flex">
              <button
                onClick={() => { setView("inbox"); setSelectedId(null); }}
                className={`flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${view === "inbox" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                <InboxIcon className="h-3.5 w-3.5 inline mr-1.5" />Inkorg
              </button>
              <button
                onClick={() => { setView("sent"); setSelectedId(null); }}
                className={`flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${view === "sent" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                <Send className="h-3.5 w-3.5 inline mr-1.5" />Skickat
              </button>
            </div>
            <div className="px-3 py-2 border-b text-xs text-muted-foreground">
              {filteredThreads.length} {filteredThreads.length === 1 ? "konversation" : "konversationer"}
            </div>
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Laddar…</div>
              ) : filteredThreads.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground space-y-2">
                  {view === "sent" ? (
                    <p>Inga utskickade mejl som väntar på svar.</p>
                  ) : showAll ? (
                    <p>Inga svar ännu. Klicka <strong>Hämta nytt</strong> för att synka.</p>
                  ) : (
                    <>
                      <p>Inga svar från dina kampanjer ännu.</p>
                      <p className="text-xs">När en lead svarar dyker det upp här. För att se utskick du gjort, klicka på <strong>Skickat</strong>.</p>
                    </>
                  )}
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
          <div className="rounded-lg border bg-card overflow-hidden hidden lg:flex flex-col lg:col-span-2 xl:col-span-1">
            {!selected ? (
              <div className="flex-1 grid place-items-center text-sm text-muted-foreground p-6 text-center">
                Välj en konversation för att läsa och svara.
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b space-y-2">
                  <div>
                    <div className="font-medium truncate">{selected.subject || "(utan ämne)"}</div>
                    <div className="text-xs text-muted-foreground truncate">{selected.participants.join(", ")}</div>
                  </div>
                  {lastInbound && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <SentimentBadge sentiment={lastInbound.sentiment} />
                      {lastInbound.category && (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                          {categoryLabel(lastInbound.category)}
                        </Badge>
                      )}
                      {lastInbound.language && (
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {lastInbound.language}
                        </Badge>
                      )}
                      {!lastInbound.ai_analyzed_at && !lastInbound.ai_analysis_error && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Loader2 className="h-2.5 w-2.5 animate-spin" /> Analyserar…
                        </Badge>
                      )}
                      {lastInbound.ai_analysis_error && (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <AlertCircle className="h-2.5 w-2.5" /> AI-fel
                        </Badge>
                      )}
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1 ml-auto"
                        onClick={() => handleAnalyze(true)} disabled={analyzing}>
                        {analyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        Analysera om
                      </Button>
                    </div>
                  )}
                </div>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {messages.map((m) => (
                      <MessageBubble key={m.id} m={m} />
                    ))}
                  </div>
                </ScrollArea>
                <div className="border-t p-3 space-y-2 bg-muted/20">
                  {lastInbound?.sentiment === "unsubscribe_request" && (
                    <div className="rounded-md bg-destructive/10 text-destructive text-xs p-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5"><Ban className="h-3.5 w-3.5" /> Avregistreringsbegäran</span>
                      <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={handleAddUnsubscribe}>
                        Lägg till i avregistrerade
                      </Button>
                    </div>
                  )}
                  {lastInbound?.sentiment === "negative" && (
                    <div className="rounded-md bg-muted text-muted-foreground text-xs p-2 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" /> Avsändaren verkar inte intresserad — överväg att inte svara.
                    </div>
                  )}
                  {lastInbound?.suggested_reply && reply === lastInbound.suggested_reply && !replyTouched && (
                    <div className="flex items-center justify-between text-xs text-primary">
                      <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI-förslag · redigera fritt</span>
                      <button
                        onClick={() => { setReply(""); setReplyTouched(true); }}
                        className="hover:underline"
                      >Rensa</button>
                    </div>
                  )}
                  <Textarea
                    value={reply}
                    onChange={(e) => { setReply(e.target.value); setReplyTouched(true); }}
                    placeholder="Skriv ditt svar…"
                    className="min-h-[100px] bg-background"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground truncate">
                      Från {accounts.find((a) => a.id === selected.email_account_id)?.email}
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

const sentimentDotClass = (s: string | null | undefined) => {
  switch (s) {
    case "positive": return "bg-success";
    case "negative": return "bg-destructive";
    case "neutral": return "bg-warning";
    case "auto_reply": return "bg-info";
    case "unsubscribe_request": return "bg-primary";
    default: return "bg-muted-foreground/30";
  }
};

const SENTIMENT_LABEL: Record<string, string> = {
  positive: "Positivt",
  negative: "Negativt",
  neutral: "Neutralt",
  auto_reply: "Auto-svar",
  unsubscribe_request: "Avregistrering",
};

const CATEGORY_LABEL: Record<string, string> = {
  interested: "Intresserad",
  not_interested: "Ej intresserad",
  question: "Fråga",
  meeting_request: "Mötesförfrågan",
  objection: "Invändning",
  out_of_office: "Frånvaro",
  wrong_person: "Fel person",
  other: "Övrigt",
};

const categoryLabel = (c: string | null | undefined) => (c ? CATEGORY_LABEL[c] ?? c : "");

const SentimentBadge = ({ sentiment }: { sentiment: string | null | undefined }) => {
  if (!sentiment) return null;
  const label = SENTIMENT_LABEL[sentiment] ?? sentiment;
  return (
    <Badge variant="outline" className="text-[10px] gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${sentimentDotClass(sentiment)}`} />
      {label}
    </Badge>
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
            <div className="flex items-center gap-1.5">
              {thread.last_sentiment && (
                <span className={`h-2 w-2 rounded-full shrink-0 ${sentimentDotClass(thread.last_sentiment)}`}
                  title={SENTIMENT_LABEL[thread.last_sentiment] ?? thread.last_sentiment} />
              )}
              <div className={`text-sm truncate ${unread ? "font-semibold" : ""}`}>{otherParticipant}</div>
            </div>
            <div className="text-sm truncate mt-0.5 flex items-center gap-1.5">
              <span className={unread ? "font-medium" : "text-muted-foreground"}>
                {thread.subject || "(utan ämne)"}
              </span>
              {!thread.is_lead_related && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 shrink-0 text-muted-foreground border-muted-foreground/30">
                  Ej lead
                </Badge>
              )}
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
            {thread.last_category && (
              <span className="text-[9px] text-muted-foreground truncate max-w-[80px]">{categoryLabel(thread.last_category)}</span>
            )}
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
