import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { ExamQuestion } from '@/lib/exam-core';
export function ExamAnswer({ question: q, value, onChange, disabled }: { question: ExamQuestion; value?: string | string[]; onChange: (v: string | string[]) => void; disabled?: boolean }) {
  if (q.kind === 'single' || q.kind === 'boolean') return <RadioGroup value={typeof value === 'string' ? value : ''} onValueChange={onChange} disabled={disabled} className="gap-3">{q.options?.map((o, i) => <label key={o} className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"><RadioGroupItem value={o} id={`${q.id}-${i}`} /> <span className="text-sm leading-7">{o}</span></label>)}</RadioGroup>;
  if (q.kind === 'multi') return <div className="space-y-3">{q.options?.map(o => <label key={o} className="flex items-center gap-3 rounded-lg border p-4"><Checkbox disabled={disabled} checked={Array.isArray(value) && value.includes(o)} onCheckedChange={checked => onChange(checked ? [...(Array.isArray(value) ? value : []), o] : (Array.isArray(value) ? value : []).filter(v => v !== o))} /><span className="text-sm leading-7">{o}</span></label>)}</div>;
  if (q.kind === 'order') {
    const items = Array.isArray(value) ? value : (q.options ?? []);
    const move = (i: number, step: number) => { const next = [...items]; const target = next[i + step]; const current = next[i]; if (target === undefined || current === undefined) return; next[i] = target; next[i + step] = current; onChange(next); };
    return <div className="space-y-2">{items.map((item, i) => <div key={`${item}-${i}`} className="flex items-center gap-2 rounded-lg border p-3"><span className="text-muted-foreground">{i + 1}</span><span className="flex-1">{item}</span><Button variant="ghost" size="icon" aria-label="تحريك لأعلى" disabled={disabled || i === 0} onClick={() => move(i, -1)}><ArrowUp className="size-4" /></Button><Button variant="ghost" size="icon" aria-label="تحريك لأسفل" disabled={disabled || i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown className="size-4" /></Button></div>)}</div>;
  }
  if (['matching', 'classify', 'table'].includes(q.kind) && q.options?.length) return <div className="space-y-3">{q.options.map((row, i) => <label key={row} className="grid gap-2 sm:grid-cols-2 sm:items-center"><span className="text-sm">{row}</span><Input aria-label={row} disabled={disabled} value={Array.isArray(value) ? value[i] ?? '' : ''} onChange={e => { const next = Array.isArray(value) ? [...value] : q.options?.map(() => '') ?? []; next[i] = e.target.value; onChange(next); }} /></label>)}</div>;
  return <Textarea aria-label="الإجابة" value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)} disabled={disabled} className="min-h-32 text-base leading-8" maxLength={5000} />;
}