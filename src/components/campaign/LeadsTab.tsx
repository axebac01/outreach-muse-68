import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Upload, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useSequenceLeads,
  useAddSequenceLeads,
  useDeleteSequenceLead,
  useSequenceSendStats,
  type LeadSendStat,
} from "@/hooks/useSequence";
import { CsvColumnMapper } from "@/components/CsvColumnMapper";

type LeadStatusFilter = "all" | "sent" | "scheduled" | "failed" | "none" | "replied";

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  sent: { label: "Skickat", variant: "default" },
  scheduled: { label: "Schemalagt", variant: "secondary" },
  failed: { label: "Misslyckades", variant: "destructive" },
  replied: { label: "Svarat", variant: "default" },
  none: { label: "Inte skickat", variant: "outline" },
};

const deriveStatus = (leadStatus: string, stat?: LeadSendStat): keyof typeof STATUS_META => {
  if (leadStatus === "replied") return "replied";
  if (!stat) return "none";
  if (stat.lastStatus === "failed") return "failed";
  if (stat.sent > 0) return "sent";
  if (stat.scheduled > 0) return "scheduled";
  return "none";
};

export const LeadsTab = ({ sequenceId }: { sequenceId: string }) => {
  const { data: leads = [] } = useSequenceLeads(sequenceId);
  const { data: stats } = useSequenceSendStats(sequenceId);
  const addLeads = useAddSequenceLeads(sequenceId);
  const deleteLead = useDeleteSequenceLead(sequenceId);
  const [statusFilter, setStatusFilter] = useState<LeadStatusFilter>("all");

  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [showMapper, setShowMapper] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const [manual, setManual] = useState({
    email: "",
    full_name: "",
    first_name: "",
    last_name: "",
    role: "",
    phone: "",
    company: "",
  });

  const onFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5MB)");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    try {
      let rows: Record<string, any>[] = [];
      if (ext === "csv") {
        await new Promise<void>((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (res) => {
              rows = res.data as Record<string, any>[];
              resolve();
            },
            error: reject,
          });
        });
      } else if (ext === "xlsx" || ext === "xls") {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        rows = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      } else {
        toast.error("Unsupported file. Use CSV or Excel.");
        return;
      }
      if (rows.length === 0) {
        toast.error("No rows found in file");
        return;
      }
      setParsedHeaders(Object.keys(rows[0]));
      setParsedRows(rows);
      setShowMapper(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to parse file");
    }
  };

  const handleConfirmImport = async (mapped: Array<Record<string, string>>) => {
    try {
      const res = await addLeads.mutateAsync(mapped as any);
      toast.success(`Importerade ${res.count} leads`);
      setShowMapper(false);
      setParsedRows([]);
      setParsedHeaders([]);
    } catch (e: any) {
      toast.error(e?.message ?? "Import misslyckades");
    }
  };

  const addManual = async () => {
    if (!manual.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manual.email)) {
      toast.error("Giltig e-post krävs");
      return;
    }
    try {
      await addLeads.mutateAsync([
        {
          email: manual.email,
          full_name: manual.full_name || null,
          first_name: manual.first_name || null,
          last_name: manual.last_name || null,
          role: manual.role || null,
          phone: manual.phone || null,
          company: manual.company || null,
        },
      ]);
      setManual({ email: "", full_name: "", first_name: "", last_name: "", role: "", phone: "", company: "" });
      toast.success("Lead tillagd");
    } catch (e: any) {
      toast.error(e?.message ?? "Misslyckades");
    }
  };

  return (
    <div className="space-y-6">
      {showMapper ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mappa kolumner till lead-fält</CardTitle>
          </CardHeader>
          <CardContent>
            <CsvColumnMapper
              headers={parsedHeaders}
              rows={parsedRows}
              onConfirm={handleConfirmImport}
              onCancel={() => setShowMapper(false)}
              isImporting={addLeads.isPending}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ladda upp fil</CardTitle>
            </CardHeader>
            <CardContent>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="w-full border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/40 transition-colors"
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <div className="text-sm font-medium">Klicka för att ladda upp CSV eller Excel</div>
                <div className="text-xs text-muted-foreground mt-1">CSV, XLSX, XLS · max 5MB</div>
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                  e.target.value = "";
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lägg till manuellt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">E-post *</Label>
                  <Input value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Förnamn</Label>
                  <Input value={manual.first_name} onChange={(e) => setManual({ ...manual, first_name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Efternamn</Label>
                  <Input value={manual.last_name} onChange={(e) => setManual({ ...manual, last_name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Företag</Label>
                  <Input value={manual.company} onChange={(e) => setManual({ ...manual, company: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Roll</Label>
                  <Input value={manual.role} onChange={(e) => setManual({ ...manual, role: e.target.value })} />
                </div>
              </div>
              <Button onClick={addManual} className="w-full gap-2" disabled={addLeads.isPending}>
                <Plus className="h-4 w-4" /> Lägg till lead
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Leads ({leads.length})</CardTitle>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LeadStatusFilter)}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla statusar</SelectItem>
              <SelectItem value="sent">Skickat</SelectItem>
              <SelectItem value="scheduled">Schemalagt</SelectItem>
              <SelectItem value="failed">Misslyckades</SelectItem>
              <SelectItem value="replied">Svarat</SelectItem>
              <SelectItem value="none">Inte skickat</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Inga leads än. Lägg till några manuellt eller ladda upp en fil.
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-post</TableHead>
                    <TableHead>Namn</TableHead>
                    <TableHead>Företag</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Skickade</TableHead>
                    <TableHead>Senaste aktivitet</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads
                    .filter((l) => statusFilter === "all" || deriveStatus(l.status, stats?.byLeadId.get(l.id)) === statusFilter)
                    .map((l) => {
                      const stat = stats?.byLeadId.get(l.id);
                      const key = deriveStatus(l.status, stat);
                      const meta = STATUS_META[key];
                      const totalSteps = stats?.totalSteps ?? 0;
                      return (
                        <TableRow key={l.id}>
                          <TableCell className="text-sm">{l.email}</TableCell>
                          <TableCell className="text-sm">{l.full_name ?? `${l.first_name ?? ""} ${l.last_name ?? ""}`.trim()}</TableCell>
                          <TableCell className="text-sm">{l.company ?? "—"}</TableCell>
                          <TableCell><Badge variant={meta.variant}>{meta.label}</Badge></TableCell>
                          <TableCell className="text-sm">{(stat?.sent ?? 0)} / {totalSteps}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {stat?.lastAt ? new Date(stat.lastAt).toLocaleString() : "—"}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => deleteLead.mutate(l.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
