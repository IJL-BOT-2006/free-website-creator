import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_student_summary",
      description:
        "يرجع بيانات طالبة معينة: اسم الحلقة، نسبة الحضور، عدد التنبيهات، عدد التعهدات، الحالة",
      parameters: {
        type: "object",
        properties: { name: { type: "string", description: "اسم الطالبة أو جزء منه" } },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pending_requests",
      description: "يرجع عدد الطلبات بانتظار المراجعة وأنواعها",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_announcement",
      description:
        "تقترح إنشاء إعلان جديد بعنوان ونص محددين. لا تُنشئه مباشرة، فقط تجهّز الاقتراح لعرضه على المستخدمة للتأكيد.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_task",
      description:
        "تقترح إنشاء مهمة جديدة بعنوان واسم المكلّفة بها. لا تُنشئها مباشرة، فقط تجهّز الاقتراح لعرضه على المستخدمة للتأكيد.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          assignee_name: { type: "string", description: "اسم المعلمة أو المشرفة المكلّفة" },
          due_date: { type: "string", description: "بصيغة YYYY-MM-DD، اختياري" },
        },
        required: ["title", "assignee_name"],
      },
    },
  },
] as const;

async function callGateway(key: string, messages: unknown[]) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      tools: TOOLS,
    }),
  });
  if (res.status === 429) throw new Error("تم تجاوز عدد الطلبات المسموح، حاولي بعد قليل");
  if (res.status === 402) throw new Error("انتهى رصيد المساعد الذكي، يرجى شحن الرصيد");
  if (!res.ok) throw new Error(`تعذر الحصول على رد من المساعد [${res.status}]`);
  return res.json();
}

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { messages: ChatMessage[] }) => data)
  .handler(async ({ data, context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("المساعد غير مهيأ حاليًا، تواصلي مع الدعم الفني");

    const history = (data.messages ?? [])
      .filter((m) => m && typeof m.content === "string" && m.content.trim())
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));

    if (!history.length) throw new Error("اكتبي رسالتك أولًا");

    const systemMessage = {
      role: "system",
      content:
        "أنتِ «المساعد الذكي» لمقرأة نسائية لتحفيظ القرآن اسمها «حبل الله المتين». لا تستخدمي اسمًا شخصيًا لنفسك. أجيبي بالعربية الفصحى المهذبة، باختصار ووضوح، بصيغة المؤنث. عند سؤالك عن بيانات فعلية (طالبة، طلبات) استخدمي الأدوات المتاحة بدل التخمين. عند طلب إنشاء إعلان أو مهمة، استخدمي propose_announcement أو propose_task ولا تدّعي أنك أنشأتِها فعليًا — التنفيذ الفعلي يتم بعد تأكيد المستخدمة فقط.",
    };

    const messages: Record<string, unknown>[] = [systemMessage, ...history];
    let json = await callGateway(key, messages);
    let msg = json.choices?.[0]?.message;

    if (msg?.tool_calls?.length) {
      for (const call of msg.tool_calls as { id: string; function: { name: string; arguments: string } }[]) {
        const name = call.function?.name;
        if (name === "propose_announcement" || name === "propose_task") {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(call.function?.arguments ?? "{}");
          } catch {
            args = {};
          }

          if (name === "propose_announcement") {
            return {
              answer: `جهّزت اقتراح إعلان بعنوان "${String(args["title"] ?? "")}" — راجعيه وأكّدي النشر بالأسفل.`,
              pendingAction: {
                type: "create_announcement",
                title: String(args["title"] ?? ""),
                content: String(args["content"] ?? ""),
              } as PendingAction,
            };
          }

          const assigneeName = String(args["assignee_name"] ?? "");
          const { data: staffMatch } = await context.supabase
            .from("profiles")
            .select("id, full_name")
            .ilike("full_name", `%${assigneeName}%`)
            .limit(1)
            .maybeSingle();
          return {
            answer: `جهّزت اقتراح مهمة بعنوان "${String(args["title"] ?? "")}" للمكلّفة ${staffMatch?.full_name ?? assigneeName} — راجعيها وأكّدي الإنشاء بالأسفل.`,
            pendingAction: {
              type: "create_task",
              title: String(args["title"] ?? ""),
              assignee_name: staffMatch?.full_name ?? assigneeName,
              assignee_id: staffMatch?.id ?? null,
              due_date: args["due_date"] ? String(args["due_date"]) : null,
            } as PendingAction,
          };
        }
      }

      messages.push(msg);
      for (const call of msg.tool_calls as { id: string; function: { name: string; arguments: string } }[]) {
        const name = call.function?.name;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function?.arguments ?? "{}");
        } catch {
          args = {};
        }
        let toolResult = "لا نتيجة";

        if (name === "get_student_summary") {
          const search = String(args["name"] ?? "");
          const { data: student } = await context.supabase
            .from("students")
            .select("id, full_name, status, warnings_count, pledges_count, circle_id")
            .ilike("full_name", `%${search}%`)
            .limit(1)
            .maybeSingle();

          if (!student) {
            toolResult = "لم يتم العثور على طالبة بهذا الاسم.";
          } else {
            const { data: circle } = student.circle_id
              ? await context.supabase
                  .from("circles")
                  .select("name")
                  .eq("id", student.circle_id)
                  .maybeSingle()
              : { data: null };
            const { data: attendance } = await context.supabase
              .from("student_attendance")
              .select("status")
              .eq("student_id", student.id);
            const total = attendance?.length ?? 0;
            const present = attendance?.filter((a) => a.status === "present").length ?? 0;
            const rate = total ? Math.round((present / total) * 100) : null;
            toolResult = JSON.stringify({
              full_name: student.full_name,
              circle: circle?.name ?? "بدون حلقة",
              status: student.status,
              warnings_count: student.warnings_count,
              pledges_count: student.pledges_count,
              attendance_rate: rate,
              attendance_sessions: `${present}/${total}`,
            });
          }
        }

        if (name === "get_pending_requests") {
          const { data: reqs } = await context.supabase
            .from("requests")
            .select("request_type, priority, created_at")
            .eq("status", "pending");
          toolResult = JSON.stringify({ count: reqs?.length ?? 0, requests: reqs ?? [] });
        }

        messages.push({ role: "tool", tool_call_id: call.id, content: toolResult });
      }

      json = await callGateway(key, messages);
      msg = json.choices?.[0]?.message;
    }

    return { answer: msg?.content ?? "لا يوجد رد" };
  });

export const executeAssistantAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { action: PendingAction }) => data)
  .handler(async ({ data, context }) => {
    const { action } = data;

    if (action.type === "create_announcement") {
      const { error } = await context.supabase.from("announcements").insert({
        title: action.title,
        content: action.content,
        audience: "all",
        published: true,
        created_by: context.userId,
      });
      if (error) throw new Error("تعذر إنشاء الإعلان: " + error.message);
      return { ok: true, message: "تم نشر الإعلان" };
    }

    if (action.type === "create_task") {
      if (!action.assignee_id) {
        throw new Error("تعذر تحديد المكلّفة بالمهمة، أضيفيها يدويًا من صفحة المهام");
      }
      const { error } = await context.supabase.from("tasks").insert({
        title: action.title,
        assignee_id: action.assignee_id,
        due_date: action.due_date,
        status: "in_progress",
        priority: "normal",
        created_by: context.userId,
      });
      if (error) throw new Error("تعذر إنشاء المهمة: " + error.message);
      return { ok: true, message: "تم إنشاء المهمة" };
    }

    throw new Error("إجراء غير معروف");
  });