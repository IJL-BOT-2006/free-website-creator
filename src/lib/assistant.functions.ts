import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { question: string }) => data)
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("المساعد غير مهيأ");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash",
        messages: [
          {
            role: "system",
            content:
              "أنتِ مساعدة إدارية لمقرأة نسائية لتحفيظ القرآن اسمها «حبل الله المتين». أجيبي بالعربية باختصار ووضوح، وبأسلوب محترم، وساعدي في صياغة الرسائل والتقارير والقرارات الإدارية.",
          },
          { role: "user", content: data.question },
        ],
      }),
    });
    if (!res.ok) throw new Error(`تعذر الحصول على رد [${res.status}]`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { answer: json.choices?.[0]?.message?.content ?? "لا يوجد رد" };
  });
