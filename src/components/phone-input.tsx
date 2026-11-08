import { X } from "lucide-react";
import { COUNTRIES, flagOf } from "@/lib/countries";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PhoneInput({
  code,
  phone,
  onCode,
  onPhone,
}: {
  code: string;
  phone: string;
  onCode: (v: string) => void;
  onPhone: (v: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <Select value={code} onValueChange={onCode}>
        <SelectTrigger className="w-32 shrink-0">
          <SelectValue placeholder="الدولة" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.dial}>
              <span className="flex items-center gap-2">
                <span>{c.flag}</span>
                <span dir="ltr">{c.dial}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        dir="ltr"
        inputMode="tel"
        className="min-w-0 flex-1 text-right"
        value={phone}
        placeholder="9xxxxxxxx"
        onChange={(e) => onPhone(e.target.value.replace(/[^\d]/g, ""))}
      />
    </div>
  );
}

const splitCountries = (v: string) =>
  v
    .split(/[،,]/)
    .map((s) => s.trim())
    .filter(Boolean);

export function CountrySelect({
  value,
  onChange,
  placeholder = "اختاري الدولة",
  multiple = false,
  max = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiple?: boolean;
  max?: number;
}) {
  if (!multiple) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.name}>
              <span className="flex items-center gap-2">
                <span>{c.flag}</span>
                {c.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const selected = splitCountries(value);
  const add = (name: string) => {
    if (selected.includes(name) || selected.length >= max) return;
    onChange([...selected, name].join("، "));
  };
  const remove = (name: string) => onChange(selected.filter((n) => n !== name).join("، "));

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((n) => (
            <span
              key={n}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 py-1 pr-3 pl-1.5 text-xs font-medium text-primary"
            >
              {flagOf(n)} {n}
              <button
                type="button"
                onClick={() => remove(n)}
                aria-label={`إزالة ${n}`}
                className="rounded-full p-0.5 hover:bg-primary/20"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {selected.length < max && (
        <Select value="" onValueChange={add}>
          <SelectTrigger>
            <SelectValue placeholder={selected.length ? "إضافة جنسية أخرى" : placeholder} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {COUNTRIES.filter((c) => !selected.includes(c.name)).map((c) => (
              <SelectItem key={c.code} value={c.name}>
                <span className="flex items-center gap-2">
                  <span>{c.flag}</span>
                  {c.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
