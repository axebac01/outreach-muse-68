import { KeyboardEvent, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ChipInputProps {
  /** Comma-separated string value (kept for compatibility with existing state) */
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  id?: string;
}

export default function ChipInput({ value, onChange, placeholder, id }: ChipInputProps) {
  const [draft, setDraft] = useState("");
  const chips = value
    ? value.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const commit = (raw: string) => {
    const next = raw.trim();
    if (!next) return;
    if (chips.includes(next)) {
      setDraft("");
      return;
    }
    onChange([...chips, next].join(", "));
    setDraft("");
  };

  const removeAt = (idx: number) => {
    const next = chips.filter((_, i) => i !== idx);
    onChange(next.join(", "));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && draft === "" && chips.length > 0) {
      removeAt(chips.length - 1);
    }
  };

  return (
    <div className="space-y-1.5">
      <Input
        id={id}
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(",")) commit(v.slice(0, -1));
          else setDraft(v);
        }}
        onBlur={() => draft && commit(draft)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
      />
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {chips.map((c, i) => (
            <Badge key={`${c}-${i}`} variant="secondary" className="gap-1 pr-1 font-normal">
              {c}
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="rounded-sm hover:bg-background/60 p-0.5"
                aria-label={`Ta bort ${c}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
