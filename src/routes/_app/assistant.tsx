import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { askAssistant } from "@/lib/assistant.functions";
import { PageHeader } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_app/assistant")({
  head: () => ({
    meta: [
      { title: "المساعد الذكي — مقرأة حبل الله المتين" },
      { name: "description", content: "مساعد ذكي لصياغة الرسائل والتقارير الإدارية للمقرأة." },
      { property: "og:title", content: "المساعد الذكي — مقرأة حبل الله المتين" },
      { property: "og:description", content: "مساعد ذكي لصياغة الرسائل والتقارير." },
    ],
  }),
  component: AssistantPage,
});

function AssistantPage() {
  const askFn = useServerFn(askAssistant);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const ask = useMutation({
    mutationFn: async () => askFn({ data: { question } }),
    onSuccess: (r) => setAnswer(r.answer),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="المساعد الذكي"
        description="اطلبي صياغة رسالة، تلخيص تقرير، أو اقتراح خطة متابعة."
      />
      <div className="card-panel space-y-4 p-6">
        <Textarea
          rows={4}
          value={question}
          placeholder="اكتبي سؤالك أو طلبك هنا..."
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Button onClick={() => ask.mutate()} disabled={ask.isPending || !question.trim()}>
          {ask.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          إرسال
        </Button>
      </div>
      {answer && (
        <div className="card-panel mt-4 p-6 text-sm whitespace-pre-wrap">{answer}</div>
      )}
    </div>
  );
}
