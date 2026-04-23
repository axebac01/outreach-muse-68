import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { parseLeadsFile, type ParsedLead } from "@/lib/parseLeadsFile";
import { useBulkCreateLeads } from "@/hooks/useLeads";
import { useTranslation, Trans } from "react-i18next";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  currentLeadCount: number;
  maxLeads: number;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const ImportLeadsDialog = ({ open, onOpenChange, campaignId, currentLeadCount, maxLeads }: Props) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedLead[]>([]);
  const [parsing, setParsing] = useState(false);
  const bulkCreate = useBulkCreateLeads();

  const reset = () => {
    setFile(null);
    setRows([]);
  };

  const handleFile = async (f: File) => {
    if (f.size > MAX_FILE_SIZE) {
      toast.error(t("import.tooLarge"));
      return;
    }
    setFile(f);
    setParsing(true);
    try {
      const parsed = await parseLeadsFile(f);
      if (parsed.length === 0) {
        toast.error(t("import.noRows"));
      }
      setRows(parsed);
    } catch (e: any) {
      toast.error(e.message || t("import.parseFailed"));
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const available = Number.isFinite(maxLeads) ? Math.max(0, maxLeads - currentLeadCount) : rows.length;
  const toImport = rows.slice(0, available);
  const skipped = rows.length - toImport.length;

  const handleConfirm = async () => {
    if (toImport.length === 0) return;
    try {
      await bulkCreate.mutateAsync({ campaign_id: campaignId, leads: toImport });
      if (skipped > 0) {
        toast.success(t("import.importedPartial", { imported: toImport.length, total: rows.length }));
      } else {
        toast.success(t("import.imported", { count: toImport.length }));
      }
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || t("import.importFailed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("import.title")}</DialogTitle>
          <DialogDescription>
            <Trans i18nKey="import.desc">
              Upload a CSV or Excel file. Required column: <code className="text-xs bg-muted px-1 py-0.5 rounded">email</code>. Optional: name, company, role, website, linkedin, notes.
            </Trans>
          </DialogDescription>
        </DialogHeader>

        {!file && (
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-10 cursor-pointer hover:bg-muted/30 transition-colors">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium">{t("import.click")}</span>
            <span className="text-xs text-muted-foreground">{t("import.fileTypes")}</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        )}

        {file && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium flex-1 truncate">{file.name}</span>
              <Button variant="ghost" size="sm" onClick={reset}>{t("import.change")}</Button>
            </div>

            {parsing && <p className="text-sm text-muted-foreground">{t("import.parsing")}</p>}

            {!parsing && rows.length > 0 && (
              <>
                <div className="text-sm text-muted-foreground">
                  {t("import.found")} <span className="font-medium text-foreground">{rows.length}</span> {t("import.validRows")}
                  {skipped > 0 && (
                    <span className="text-destructive"> {t("import.skipped", { count: skipped })}</span>
                  )}
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium">{t("campaign.name")}</th>
                        <th className="text-left p-2 font-medium">{t("campaign.email")}</th>
                        <th className="text-left p-2 font-medium">{t("campaign.company")}</th>
                        <th className="text-left p-2 font-medium">{t("campaign.role")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="p-2">{r.full_name}</td>
                          <td className="p-2">{r.email}</td>
                          <td className="p-2">{r.company}</td>
                          <td className="p-2 text-muted-foreground">{r.role || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length > 5 && (
                  <p className="text-xs text-muted-foreground">{t("import.moreRows", { count: rows.length - 5 })}</p>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button
            onClick={handleConfirm}
            disabled={toImport.length === 0 || bulkCreate.isPending || parsing}
          >
            {bulkCreate.isPending
              ? t("import.importing")
              : toImport.length === 1
                ? t("import.importBtn", { count: toImport.length })
                : t("import.importBtnPlural", { count: toImport.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportLeadsDialog;
