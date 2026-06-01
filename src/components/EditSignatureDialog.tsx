import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUpdateEmailAccount, type EmailAccount } from "@/hooks/useEmailAccounts";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { toUserMessage } from "@/lib/errorMessages";

interface Props {
  account: EmailAccount | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function EditSignatureDialog({ account, open, onOpenChange }: Props) {
  const update = useUpdateEmailAccount();
  const { t } = useTranslation();
  const [senderName, setSenderName] = useState("");
  const [signature, setSignature] = useState("");

  useEffect(() => {
    setSenderName(account?.sender_name ?? "");
    setSignature(account?.signature ?? "");
  }, [account?.id, open]);

  const save = async () => {
    if (!account) return;
    try {
      await update.mutateAsync({
        id: account.id,
        patch: {
          sender_name: senderName.trim() || null,
          signature: signature.trim() || null,
        },
      });
      toast.success("Saved");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(toUserMessage(e, t, "errors.generic.unknown"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit signature</DialogTitle>
          <DialogDescription>
            Set the sender name and signature for {account?.email}. These are available in
            sequences as <code className="font-mono text-xs">{`{{sender_name}}`}</code> and{" "}
            <code className="font-mono text-xs">{`{{sender_signature}}`}</code>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sn">Sender name</Label>
            <Input
              id="sn"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Alex Smith"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sig">Signature</Label>
            <Textarea
              id="sig"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder={"Best,\nAlex\nFounder, Acme"}
              rows={6}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
