import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CreateCampaignInlineDialog from "./CreateCampaignInlineDialog";
import { Plus } from "lucide-react";

const CREATE_NEW_VALUE = "__create_new__";

interface Sequence {
  id: string;
  name: string;
}

interface Props {
  sequences: Sequence[];
  value: string;
  onChange: (sequenceId: string) => void;
  className?: string;
  placeholder?: string;
}

export default function ImportToSequencePicker({
  sequences,
  value,
  onChange,
  className,
  placeholder = "Välj sekvens (valfritt)",
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleChange = (v: string) => {
    if (v === CREATE_NEW_VALUE) {
      setDialogOpen(true);
      return;
    }
    onChange(v);
  };

  return (
    <>
      <Select value={value || undefined} onValueChange={handleChange}>
        <SelectTrigger className={className ?? "w-[240px]"}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={CREATE_NEW_VALUE}>
            <span className="flex items-center gap-2 font-medium text-primary">
              <Plus className="h-3.5 w-3.5" /> Skapa ny kampanj…
            </span>
          </SelectItem>
          {sequences.length > 0 && (
            <div className="my-1 h-px bg-border" />
          )}
          {sequences.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <CreateCampaignInlineDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={({ sequenceId }) => onChange(sequenceId)}
      />
    </>
  );
}
