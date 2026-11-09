import { useEffect, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2, ArrowLeft, ArrowRight, Send, RotateCcw, Mic, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { ExamAnswer } from '@/components/exam-answer';
import { publicExamLink, startExamAttempt, resumeExamAttempt, saveExamAttempt } from '@/lib/exam.functions';
import { LEVEL_TITLES, KIND_TITLES, isReadingMatch, type ExamAttempt, type ReadingItem } from '@/lib/exam-core';
export const Route = createFileRoute('/exam/$token')({
  ssr: false,
  head: () => ({ meta: [{ title: 'اختبار الطالبة — حبل الله المتين' }, { name: 'description', content: 'اختبار التجويد وتدريب القراءة لطالبات مقرأة حبل الله المتين.' }, { property: 'og:title', content: 'اختبار الطالبة — حبل الله المتين' }, { property: 'og:description', content: 'أسئلة التجويد والقاعدة النورانية لطالبات المقرأة.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: StudentExam,
});
function newSecret() { return Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join(''); }
type Saved = { id: string; secret: string; draft?: Record<string, string | string[]> };
function StudentExam() {
  const { token } = Route.useParams();
  const linkFn = useServerFn(publicExamLink), startFn = useServerFn(startExamAttempt), resumeFn = useServerFn(resumeExamAttempt), saveFn = useServerFn(saveExamAttempt);
  const link = useQuery({ queryKey: ['student-exam', token], queryFn: () => linkFn({ data: { token } }), retry: false });
  const [name, setName] = useState(''), [attempt, setAttempt] = useState<ExamAttempt | null>(null), [secret, setSecret] = useState(''), [responses, setResponses] = useState<Record<string, string | string[]>>({}), [index, setIndex] = useState(0), [busy, setBusy] = useState(false), [restoring, setRestoring] = useState(true), [confirm, setConfirm] = useState(false), [error, setError] = useState(''), [saveState, setSaveState] = useState('');
  const lastSaved = useRef('');
  const storageKey = `maqraah:exam:${token}`;
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        const saved: Saved = JSON.parse(raw);
        const a = await resumeFn({ data: { id: saved.id, secret: saved.secret } });
        if (cancelled) return;
        setSecret(saved.secret); setAttempt(a); const next = a.status === 'submitted' ? a.responses : saved.draft ?? a.responses; setResponses(next); lastSaved.current = JSON.stringify(a.responses);
      } catch { if (!cancelled) setError('تعذر استعادة المحاولة؛ أعيدي المحاولة قبل بدء اختبار جديد'); }
      finally { if (!cancelled) setRestoring(false); }
    }
    void restore();
    return () => { cancelled = true; };
  }, [storageKey]);
  useEffect(() => {
    if (!attempt || attempt.status === 'submitted' || !secret) return;
    const serialized = JSON.stringify(responses);
    try { localStorage.setItem(storageKey, JSON.stringify({ id: attempt.id, secret, draft: responses })); } catch { setError('تعذر حفظ الإجابات على الجهاز؛ لا تغلقي الصفحة قبل التسليم'); }
    if (serialized === lastSaved.current) return;
    setSaveState('جارٍ الحفظ…');
    const timer = setTimeout(async () => {
      try { await saveFn({ data: { id: attempt.id, secret, responses, submit: false } }); lastSaved.current = serialized; setSaveState('حُفظت الإجابات'); } catch { setSaveState('تعذر الحفظ؛ أعيدي المحاولة'); }
    }, 700);
    return () => clearTimeout(timer);
  }, [responses, attempt?.id, attempt?.status, secret, storageKey]);
  useEffect(() => { if (!attempt || attempt.status === 'submitted') return; const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [attempt?.status]);
  async function start() {
    setBusy(true); setError('');
    try { const s = newSecret(); const a = await startFn({ data: { token, name, secret: s } }); setSecret(s); setAttempt(a); setResponses(a.responses); lastSaved.current = JSON.stringify(a.responses); localStorage.setItem(storageKey, JSON.stringify({ id: a.id, secret: s })); } catch (e) { setError(e instanceof Error ? e.message : 'تعذر البدء'); } finally { setBusy(false); }
  }
  async function submit() {
    if (!attempt) return;
    setBusy(true); setError('');
    try { const a = await saveFn({ data: { id: attempt.id, secret, responses, submit: true } }); setAttempt(a); setResponses(a.responses); localStorage.setItem(storageKey, JSON.stringify({ id: a.id, secret })); setConfirm(false); } catch (e) { setError(e instanceof Error ? e.message : 'تعذر التسليم؛ الإجابات محفوظة على جهازك'); } finally { setBusy(false); }
  }
  const completed = Object.values(responses).filter(v => Array.isArray(v) ? v.some(Boolean) : !!v.trim()).length;
  const q = attempt?.snapshot[index];
  return <main className="min-h-screen bg-background px-4 py-6 sm:py-10"><div className="mx-auto max-w-3xl">
    <header className="mb-8 flex items-center gap-3 border-b pb-5"><Logo className="size-14 shrink-0" /><div><p className="font-display text-lg font-bold">مقرأة حبل الله المتين</p><h1 className="text-sm text-muted-foreground">الاختبار التجريبي</h1></div></header>
    {error && <div role="alert" className="mb-5 space-y-2 rounded-lg border border-destructive/30 p-4 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={() => location.reload()}>إعادة المحاولة</Button></div>}
    {restoring || link.isPending ? <div className="flex justify-center py-16"><Loader2 className="size-7 animate-spin text-primary" /></div> : link.error && !attempt ? <div role="alert" className="py-10 text-center"><p className="font-bold">الرابط غير متاح</p><p className="mt-2 text-sm text-muted-foreground">{link.error.message}</p></div> : attempt?.status === 'submitted' ? <section className="space-y-5 py-10 text-center"><CheckCircle2 className="mx-auto size-14 text-success" /><h2 className="text-2xl font-bold">تم تسليم الاختبار</h2><p>{attempt.student_name}</p><p className="text-sm text-muted-foreground">{attempt.pending > 0 ? `${attempt.pending} إجابة بانتظار مراجعة المعلمة` : `النتيجة: ${attempt.score} من ${attempt.total}`}</p><Button variant="outline" onClick={() => { localStorage.removeItem(storageKey); setAttempt(null); setResponses({}); setIndex(0); setSaveState(''); }}>محاولة جديدة</Button></section> : !attempt ? <form className="space-y-6" onSubmit={e => { e.preventDefault(); void start(); }}><h2 className="text-2xl font-bold">{LEVEL_TITLES[link.data?.level ?? 0]}</h2><div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">{link.data?.lessons.map(l => <span key={l.id}>{l.title}</span>)}</div><p className="text-sm">{link.data?.count} {link.data?.level === 0 ? 'عنصر قراءة' : 'سؤال'}</p><div className="space-y-2"><Label htmlFor="student-name">اسم الطالبة</Label><Input id="student-name" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={e => setName(e.target.value)} /></div><Button type="submit" disabled={busy || name.trim().length < 2 || !!error}>{busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowLeft className="size-4" />} بدء الاختبار</Button></form> : attempt.reading_items.length > 0 ? <ReadingRound items={attempt.reading_items} responses={responses} onChange={(id, value) => setResponses(v => ({ ...v, [id]: value }))} onFinish={() => setConfirm(true)} busy={busy} /> : <section className="space-y-6">
      <div className="space-y-3"><div className="flex justify-between text-sm"><span>{attempt.student_name}</span><span>{completed} / {attempt.snapshot.length}</span></div><Progress value={completed / attempt.snapshot.length * 100} /><p className="text-xs text-muted-foreground">المتبقي {attempt.snapshot.length - completed} · {saveState}</p></div>
      {q && <div className="space-y-5 py-3"><div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{q.lessonTitle}</span><span>{index + 1} · {KIND_TITLES[q.kind]} · {q.points} درجة</span></div><h2 className="text-xl font-bold leading-10">{q.prompt}</h2><ExamAnswer question={q} value={responses[q.id]} disabled={busy} onChange={v => setResponses(current => ({ ...current, [q.id]: v }))} /></div>}
      <div className="flex flex-wrap items-center gap-3 border-t pt-5"><Button variant="outline" disabled={index === 0 || busy} onClick={() => setIndex(i => i - 1)}><ArrowRight className="size-4" /> السابق</Button><Button variant="outline" disabled={index >= attempt.snapshot.length - 1 || busy} onClick={() => setIndex(i => i + 1)}>التالي <ArrowLeft className="size-4" /></Button><Button className="mr-auto" disabled={busy} onClick={() => setConfirm(true)}><Send className="size-4" /> تسليم</Button></div>
    </section>}
    <AlertDialog open={confirm} onOpenChange={setConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>تسليم الاختبار؟</AlertDialogTitle><AlertDialogDescription>لن تتمكني من تعديل الإجابات بعد التسليم.{attempt && completed < attempt.snapshot.length && ` بقي ${attempt.snapshot.length - completed} سؤالًا دون إجابة.`}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>العودة للاختبار</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); void submit(); }}>{busy ? 'جارٍ التسليم…' : 'تأكيد التسليم'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div></main>;
}
type SpeechResult = { results: { [key: number]: { [key: number]: { transcript: string }; isFinal: boolean }; length: number }; resultIndex: number };
type SpeechRecognition = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: SpeechResult) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void; abort: () => void };
function ReadingRound({ items, responses, onChange, onFinish, busy }: { items: ReadingItem[]; responses: Record<string, string | string[]>; onChange: (id: string, value: string) => void; onFinish: () => void; busy: boolean }) {
  const [queue, setQueue] = useState(() => items.filter(i => !String(responses[i.id] ?? '').startsWith('مطابقة مبدئية:')).map(i => i.id)), [round, setRound] = useState(1), [listening, setListening] = useState(false), [heard, setHeard] = useState(''), [message, setMessage] = useState(''), [matched, setMatched] = useState(false), [supported, setSupported] = useState(true);
  const recognition = useRef<SpeechRecognition | null>(null);
  const item = items.find(i => i.id === queue[0]);
  const passed = items.filter(i => String(responses[i.id] ?? '').startsWith('مطابقة مبدئية:')).length;
  useEffect(() => { const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }; setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition)); return () => recognition.current?.abort(); }, []);
  function listen() {
    if (!item) return;
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition };
    const Constructor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Constructor) { setMessage('التعرف على القراءة غير متاح في هذا المتصفح'); return; }
    recognition.current?.abort();
    const rec = new Constructor(); recognition.current = rec; rec.lang = 'ar-SA'; rec.continuous = false; rec.interimResults = false;
    setHeard(''); setMessage(''); setMatched(false);
    rec.onresult = e => { const text = e.results[0]?.[0]?.transcript ?? ''; const ok = isReadingMatch(item.text, text); setHeard(text); setMatched(ok); setMessage(ok ? 'الكلمات مطابقة مبدئيًا؛ المراجعة النهائية للمعلمة' : 'لم تتأكد مطابقة القراءة؛ حاولي مرة أخرى'); onChange(item.id, `${ok ? 'مطابقة مبدئية' : 'تحتاج مراجعة'}: ${text}`); };
    rec.onerror = e => { setListening(false); setMessage(e.error === 'not-allowed' ? 'لم يُسمح بالمايكروفون؛ اسمحي به ثم أعيدي المحاولة' : 'تعذر سماع قراءة واضحة؛ أعيدي المحاولة'); };
    rec.onend = () => setListening(false);
    try { rec.start(); setListening(true); } catch { setListening(false); setMessage('تعذر تشغيل المايكروفون'); }
  }
  function next() {
    recognition.current?.abort(); setListening(false);
    const remaining = queue.slice(1);
    const nextQueue = matched ? remaining : [...remaining, ...(item ? [item.id] : [])];
    setQueue(nextQueue); setMatched(false); setHeard(''); setMessage(''); if (!remaining.length && nextQueue.length) setRound(r => r + 1);
  }
  return <section className="space-y-6"><div className="flex justify-between text-sm"><span>جولة {round}</span><span>{passed} / {items.length}</span></div><Progress value={passed / items.length * 100} />{!item ? <div className="space-y-5 py-10 text-center"><CheckCircle2 className="mx-auto size-12 text-success" /><h2 className="text-xl font-bold">اكتملت جولة القراءة</h2><Button onClick={onFinish} disabled={busy}>تسليم للمعلمة</Button></div> : <><div className="py-8 text-center"><p className="mb-6 text-sm text-muted-foreground">{item.lessonTitle}</p><h2 className="font-display text-4xl font-bold leading-loose sm:text-5xl">{item.text}</h2></div><div className="flex justify-center"><Button size="icon" className="size-20 rounded-full" aria-label={listening ? 'إيقاف الاستماع' : 'بدء القراءة بالمايكروفون'} disabled={!supported || busy} onClick={() => { if (listening) recognition.current?.stop(); else listen(); }}>{listening ? <Square className="size-7" /> : <Mic className="size-8" />}</Button></div>{listening && <p role="status" className="text-center text-sm text-primary">أستمع لقراءتك…</p>}{heard && <p className="text-center text-sm">{heard}</p>}{message && <p role="status" className={`text-center text-sm ${matched ? 'text-success' : 'text-muted-foreground'}`}>{message}</p>}{!supported && <p role="alert" className="text-center text-sm text-destructive">القراءة الصوتية غير متاحة في هذا المتصفح؛ جرّبي متصفحًا يدعم المايكروفون والتعرف على الكلام.</p>}<div className="flex justify-center gap-3 border-t pt-5"><Button variant="outline" onClick={listen} disabled={!supported || listening}><RotateCcw className="size-4" /> إعادة المحاولة</Button><Button onClick={next} disabled={listening}>التالي <ArrowLeft className="size-4" /></Button></div><p className="text-center text-xs text-muted-foreground">{queue.length} عناصر متبقية · مراجعة النطق والتجويد لدى المعلمة</p></>}</section>;
}