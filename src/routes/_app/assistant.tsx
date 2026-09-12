import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

import { askAssistant, executeAssistantAction } from "@/lib/assistant.functions";
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
      { name: "description", content: "مساعدة ذكية لصياغة الرسائل والتقارير وخطط المتابعة الإدارية للمقرأة." },
      { property: "og:title", content: "المساعد الذكي — مقرأة حبل الله المتين" },
      { property: "og:description", content: "مساعدة ذكية لصياغة الرسائل والتقارير." },
    ],
  }),
  component: AssistantPage,
});

type ChatMessage = { role: "user" | "assistant"; content: string };

type PendingAction =
  | { type: "create_announcement"; title: string; content: string }
  | {
      type: "create_task";
      title: string;
      assignee_name: string;
      assignee_id: string | null;
      due_date: string | null;
    };

const SUGGESTIONS = [
  "اكتبي رسالة تنبيه أولى لطالبة كثيرة الغياب",
  "لخّصي لي تقرير أداء أسبوعي لحلقة تجويد",
  "اقترحي خطة متابعة لطالبة متعثرة في الحفظ",
  "صيغي إعلانًا للمعلمات عن اجتماع دوري",
];

function AssistantPage() {
  const askFn = useServerFn(askAssistant);
  const executeFn = useServerFn(executeAssistantAction);
  const qc = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"ready" | "submitted" | "error">("ready");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [executing, setExecuting] = useState(false);
  const busy = useRef(false);

  async function send(text: string) {
    const value = text.trim();
    if (!value || busy.current) return;
    busy.current = true;
    setPendingAction(null);
    const next: ChatMessage[] = [...messages, { role: "user", content: value }];
    setMessages(next);
    setStatus("submitted");
    try {
      const res = await askFn({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: res.answer }]);
      if (res.pendingAction) setPendingAction(res.pendingAction as PendingAction);
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      toast.error(e instanceof Error ? e.message : "تعذر الاتصال بالمساعد");
    } finally {
      busy.current = false;
    }
  }

  async function confirmAction() {
    if (!pendingAction) return;
    setExecuting(true);
    try {
      const res = await executeFn({ data: { action: pendingAction } });
      toast.success(res.message);
      setMessages((m) => [...m, { role: "assistant", content: `✅ ${res.message}` }]);
      setPendingAction(null);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["announcements"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر تنفيذ الإجراء");
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[32rem] max-w-3xl flex-col lg:h-[calc(100vh-11rem)]">
      <PageHeader
        title="المساعد الذكي"
        description="اطلبي صياغة رسالة، تلخيص تقرير، بيانات طالبة، أو إنشاء إعلان ومهمة."
      />

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
                  {SUGGESTIONS.map((s) => (
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
            {status === "submitted" && (
              <Shimmer className="px-1 text-sm">جارٍ التفكير…</Shimmer>
            )}
            {pendingAction && (
              <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4">
                <p className="mb-2 text-xs font-semibold text-primary">بانتظار تأكيدك</p>
                {pendingAction.type === "create_announcement" ? (
                  <div className="mb-3 text-sm">
                    <p className="font-semibold">{pendingAction.title}</p>
                    <p className="mt-1 text-muted-foreground">{pendingAction.content}</p>
                  </div>
                ) : (
                  <div className="mb-3 text-sm">
                    <p className="font-semibold">{pendingAction.title}</p>
                    <p className="mt-1 text-muted-foreground">
                      المكلّفة: {pendingAction.assignee_name}
                      {pendingAction.due_date ? ` · الموعد: ${pendingAction.due_date}` : ""}
                    </p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={confirmAction} disabled={executing}>
                    <CheckCircle2 className="size-4" /> تأكيد وتنفيذ
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setPendingAction(null)} disabled={executing}>
                    <XCircle className="size-4" /> إلغاء
                  </Button>
                </div>
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t border-border p-3">
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const value = input;
              setInput("");
              void send(value);
            }}
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const value = input;
                  setInput("");
                  void send(value);
                }
              }}
              rows={2}
              placeholder="اكتبي طلبك هنا..."
              className="min-h-[3rem] flex-1 resize-none"
            />
            <Button type="submit" size="icon" disabled={status === "submitted" || !input.trim()}>
              <SendHorizonal className="size-4" />
              <span className="sr-only">إرسال</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
