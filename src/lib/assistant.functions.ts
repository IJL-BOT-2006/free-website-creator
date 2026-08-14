import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ChatMessage = { role: "user" | "assistant"; content: string };

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { messages: ChatMessage[] }) => data)
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("المساعد غير مهيأ حاليًا، تواصلي مع الدعم الفني");

    const history = (data.messages ?? [])
      .filter((m) => m && typeof m.content === "string" && m.content.trim())
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));

    if (!history.length) throw new Error("اكتبي رسالتك أولًا");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "أنتِ «المساعد الذكي» لمقرأة نسائية لتحفيظ القرآن اسمها «حبل الله المتين». لا تستخدمي اسمًا شخصيًا لنفسك. أجيبي بالعربية الفصحى المهذبة، باختصار ووضوح، بصيغة المؤنث، وساعدي في صياغة الرسائل والتنبيهات والتقارير والقرارات الإدارية وخطط المتابعة. استخدمي تنسيق ماركداون بسيطًا عند الحاجة.",
          },
          ...history,
        ],
      }),
    });

    if (res.status === 429) throw new Error("تم تجاوز عدد الطلبات المسموح، حاولي بعد قليل");
    if (res.status === 402) throw new Error("انتهى رصيد المساعد الذكي، يرجى شحن الرصيد");
    if (!res.ok) throw new Error(`تعذر الحصول على رد من المساعد [${res.status}]`);

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { answer: json.choices?.[0]?.message?.content ?? "لا يوجد رد" };
  });
