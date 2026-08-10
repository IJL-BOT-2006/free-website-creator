import { COUNTRIES } from "@/lib/countries";
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
      <Select value={code || "+963"} onValueChange={onCode}>
        <SelectTrigger className="w-32 shrink-0">
          <SelectValue />
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

export function CountrySelect({
  value,
  onChange,
  placeholder = "اختاري الدولة",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
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
