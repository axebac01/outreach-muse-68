import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { sv as svLocale, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useUpdateSequence, type Sequence } from "@/hooks/useSequence";
import { cn } from "@/lib/utils";

const COMMON_TIMEZONES = [
  "UTC",
  "Europe/Stockholm", "Europe/London", "Europe/Berlin", "Europe/Paris", "Europe/Madrid", "Europe/Helsinki",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Sao_Paulo",
  "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney",
];
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const ScheduleTab = ({ sequence }: { sequence: Sequence }) => {
  const { i18n } = useTranslation();
  const update = useUpdateSequence(sequence.id);
  const sendingDays: string[] = (sequence.sending_days as any) ?? [];

  const toggleDay = (d: string) => {
    const next = sendingDays.includes(d) ? sendingDays.filter((x) => x !== d) : [...sendingDays, d];
    update.mutate({ sending_days: next as any });
  };

  const dateLocale = i18n.language?.startsWith("sv") ? svLocale : enUS;
  const startDate = sequence.start_at ? new Date(sequence.start_at) : null;
  const startTime = startDate ? format(startDate, "HH:mm") : "09:00";
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const commit = (date: Date | null, time: string) => {
    if (!date) {
      update.mutate({ start_at: null });
      return;
    }
    const [h, m] = (time || "09:00").split(":").map((n) => parseInt(n, 10) || 0);
    const next = new Date(date);
    next.setHours(h, m, 0, 0);
    update.mutate({ start_at: next.toISOString() });
  };

  const setQuick = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    commit(d, startTime);
  };
  const setNextMonday = () => {
    const d = new Date(today);
    const diff = (8 - d.getDay()) % 7 || 7;
    d.setDate(d.getDate() + diff);
    commit(d, startTime);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold">Schema</h2>
        <p className="text-muted-foreground text-sm">När och hur ofta kampanjen skickar mejl.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Starttid</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Tidszon</Label>
              <Select value={sequence.timezone} onValueChange={(v) => update.mutate({ timezone: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Starta</Label>
              <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP", { locale: dateLocale }) : "Välj datum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate ?? undefined}
                      onSelect={(d) => commit(d ?? null, startTime)}
                      disabled={(d) => d < today}
                      initialFocus
                      weekStartsOn={1}
                      locale={dateLocale}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <Input type="time" step={300} value={startTime} onChange={(e) => commit(startDate ?? today, e.target.value)} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <Button type="button" size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setQuick(0)}>Idag</Button>
                <Button type="button" size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setQuick(1)}>Imorgon</Button>
                <Button type="button" size="sm" variant="secondary" className="h-7 text-xs" onClick={setNextMonday}>Nästa måndag</Button>
                {startDate && (
                  <Button type="button" size="sm" variant="ghost" className="h-7 text-xs ml-auto text-muted-foreground" onClick={() => commit(null, startTime)}>
                    <X className="h-3 w-3 mr-1" /> Rensa
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Sändningsfönster</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => {
              const on = sendingDays.includes(d);
              return (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                    on ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground"
                  }`}>
                  {({ mon: "Mån", tue: "Tis", wed: "Ons", thu: "Tor", fri: "Fre", sat: "Lör", sun: "Sön" } as any)[d]}
                </button>
              );
            })}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Från</Label>
              <Input type="time" value={sequence.sending_window_start} onChange={(e) => update.mutate({ sending_window_start: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Till</Label>
              <Input type="time" value={sequence.sending_window_end} onChange={(e) => update.mutate({ sending_window_end: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Svarshantering</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Pausa när lead svarar</div>
              <div className="text-xs text-muted-foreground">Stoppa fortsatta uppföljningar för leads som svarar.</div>
            </div>
            <Switch checked={sequence.pause_on_reply} onCheckedChange={(v) => update.mutate({ pause_on_reply: v })} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
