import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";

import { askAssistant, executeAssistantAction } from "@/lib/assistant.functions";
import type { PendingAction, Preview } from "@/lib/assistant.functions";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS, type AppRole } from "@/lib/constants";
import { Logo } from "@/components/logo";
import { PageHeader } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";

export const Route = createFileRoute("/_app/assistant")({
  head: () => ({
    meta: [
      { title: "المساعد الذكي — مقرأة حبل الله المتين" },
      { name: "description", content: "مساعد ذكي يعمل ضمن صلاحيات رتبتك لإدارة المقرأة." },
      { property: "og:title", content: "المساعد الذكي — مقرأة حبل الله المتين" },
      { property: "og:description", content: "مساعد ذكي لإدارة المقرأة." },
    ],
  }),
  component: AssistantPage,
});

type ChatMessage = { role: "user" | "assistant"; content: string };

const ABILITIES: Record<AppRole, string[]> = {
  manager: ["كل بيانات المقرأة", "حلقات وطالبات وحسابات", "إعلانات ومهام", "مواعيد وتنبيهات"],
  deputy: ["كل بيانات المقرأة", "حلقات وطالبات وحسابات الكادر", "إعلانات ومهام", "مواعيد وتنبيهات"],
  supervisor: ["بيانات حلقاتك وطالباتك", "تعديل مواعيد الحلقات", "تنبيهات وتعهدات الطالبات"],
  teacher: ["بيانات حلقتك وطالباتك", "تعديل موعد الحلقة", "تنبيهات وتعهدات الطالبات"],
};

const SUGGESTIONS: Record<AppRole, string[]> = {
  manager: [
    "أعطيني ملخصًا عامًا عن المقرأة",
    "كم نسبة الحضور هذا الشهر؟",
    "أنشئي إعلانًا عن اجتماع المعلمات الأسبوعي",
    "ما هي المهام المفتوحة حاليًا؟",
  ],
  deputy: [
    "أعطيني ملخصًا عامًا عن المقرأة",
    "كم الطلبات المعلّقة حاليًا؟",
    "أنشئي مهمة لمراجعة تقارير الحفظ",
    "ما حضور الطالبات اليوم؟",
  ],
  supervisor: ["اعرضي لي حلقاتي", "كم نسبة الحضور هذا الأسبوع؟", "ما المهام المفتوحة؟", "ما بيانات إحدى معلماتي؟"],
  teacher: ["اعرضي لي طالبات حلقتي", "كم نسبة الحضور هذا الأسبوع؟", "ما المهام المفتوحة؟", "ما موعد حلقتي؟"],
};

function AssistantPage() {
  const { role } = useAuth();
  const roleKey: AppRole = role ?? "teacher";
  const askFn = useServerFn(askAssistant);
  const executeFn = useServerFn(executeAssistantAction);
  const qc = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"ready" | "submitted" | "error">("ready");
  const [pending, setPending] = useState<{ action: PendingAction; preview: Preview } | null>(null);
  const [executing, setExecuting] = useState(false);
  const busy = useRef(false);

  async function send(text: string) {
    const value = text.trim();
    if (!value || busy.current) return;
    busy.current = true;
    setPending(null);
    const next: ChatMessage[] = [...messages, { role: "user", content: value }];
    setMessages(next);
    setStatus("submitted");
    try {
      const res = await askFn({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: res.answer }]);
      if (res.pendingAction && res.preview) setPending({ action: res.pendingAction, preview: res.preview });
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      toast.error(e instanceof Error ? e.message : "تعذر الاتصال بالمساعد");
    } finally {
      busy.current = false;
    }
  }

  async function confirmAction() {
    if (!pending) return;
    setExecuting(true);
    try {
      const res = await executeFn({ data: { action: pending.action } });
      toast.success("تم التنفيذ");
      setMessages((m) => [...m, { role: "assistant", content: `✅ ${res.message}` }]);
      setPending(null);
      for (const k of ["tasks", "announcements", "circles", "students", "staff"]) {
        qc.invalidateQueries({ queryKey: [k] });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر تنفيذ الإجراء");
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-10rem)] max-w-3xl flex-col">
      <PageHeader
        title="المساعد الذكي"
        description="اسأليه عن بيانات المقرأة أو اطلبي منه تجهيز إجراء، ولن يُنفَّذ شيء قبل تأكيدك."
        actions={
          messages.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setMessages([]);
                setPending(null);
              }}
            >
              محادثة جديدة
            </Button>
          )
        }
      />

      <div className="mb-4 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-primary">
          <ShieldCheck className="size-4" /> مساعد {ROLE_LABELS[roleKey]} — يعمل ضمن صلاحيات رتبتك فقط
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ABILITIES[roleKey].map((a) => (
            <span key={a} className="rounded-full bg-background px-2.5 py-1 text-[11px] text-muted-foreground ring-1 ring-border">
              {a}
            </span>
          ))}
        </div>
      </div>

      <div className="card-panel flex min-h-0 flex-1 flex-col overflow-hidden">
        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="gap-5">
            {messages.length === 0 ? (
              <ConversationEmptyState
                icon={<Logo className="size-14" />}
                title="كيف أقدر أساعدك اليوم؟"
                description="اختاري اقتراحًا جاهزًا أو اكتبي طلبك بالأسفل."
              >
                <div className="mt-4 grid w-full gap-2 sm:grid-cols-2">
                  {SUGGESTIONS[roleKey].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-xl border border-border bg-background px-3 py-2.5 text-right text-xs leading-6 transition-colors hover:border-primary/50 hover:bg-primary/5"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </ConversationEmptyState>
            ) : (
              messages.map((m, i) => (
                <Message from={m.role} key={i}>
                  <MessageContent>
                    <MessageResponse>{m.content}</MessageResponse>
                  </MessageContent>
                </Message>
              ))
            )}
            {status === "submitted" && <Shimmer className="px-1 text-sm">جارٍ التفكير…</Shimmer>}
            {pending && (
              <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4">
                <p className="mb-2 text-xs font-semibold text-primary">
                  بانتظار تأكيدك — لن يُنفَّذ شيء قبل الضغط على «تأكيد وتنفيذ»
                </p>
                <p className="font-semibold">{pending.preview.title}</p>
                <ul className="mb-3 mt-1 space-y-0.5 text-sm text-muted-foreground">
                  {pending.preview.lines.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <Button size="sm" onClick={confirmAction} disabled={executing}>
                    <CheckCircle2 className="size-4" /> تأكيد وتنفيذ
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setPending(null)} disabled={executing}>
                    <XCircle className="size-4" /> إلغاء
                  </Button>
                </div>
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t border-border p-3">
          <PromptInput
            onSubmit={(message) => {
              void send(message.text);
            }}
          >
            <PromptInputTextarea placeholder="اكتبي طلبك هنا..." />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status === "error" ? "error" : status} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
