import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  label: string;
  placeholder?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
}

export default function MultiSelectFilter({
  label,
  placeholder,
  options,
  value,
  onChange,
  searchable = false,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);

  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };

  const labelFor = (v: string) => options.find((o) => o.value === v)?.label ?? v;

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-9"
          >
            <span className="flex items-center gap-2 truncate">
              <span>{label}</span>
              {value.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  × {value.length}
                </Badge>
              )}
              {value.length === 0 && (
                <span className="text-muted-foreground text-sm">
                  {placeholder ?? "Alla"}
                </span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            {searchable && <CommandInput placeholder={`Sök ${label.toLowerCase()}…`} />}
            <CommandList>
              <CommandEmpty>Inga träffar</CommandEmpty>
              <CommandGroup>
                {options.map((o) => {
                  const checked = value.includes(o.value);
                  return (
                    <CommandItem
                      key={o.value}
                      value={o.label}
                      onSelect={() => toggle(o.value)}
                      className="cursor-pointer"
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          checked
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </div>
                      <span className="flex-1">{o.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((v) => (
            <Badge
              key={v}
              variant="secondary"
              className="gap-1 pr-1 font-normal"
            >
              {labelFor(v)}
              <button
                type="button"
                onClick={() => toggle(v)}
                className="rounded-sm hover:bg-background/60 p-0.5"
                aria-label={`Ta bort ${labelFor(v)}`}
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
