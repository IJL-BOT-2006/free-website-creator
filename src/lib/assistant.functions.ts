import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
const ROLE_LABELS: Record<string, string> = {
  admin: "مديرة",
  deputy: "نائبة مديرة",
  supervisor: "مشرفة",
  teacher: "معلمة",
};
type AppRole = keyof typeof ROLE_LABELS;

type ChatMessage = { role: "user" | "assistant"; content: string };

type PendingAction =
  | { type: "create_announcement"; title: string; content: string }
  | {
      type: "create_task";
      title: string;
      assignee_name: string;
      assignee_id: string | null;
      due_date: string | null;
    }
  | {
      type: "update_circle_schedule";
      circle_id: string;
      circle_name: string;
      days: string[];
      time_text: string;
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
      name: "get_circle_summary",
      description: "يرجع بيانات حلقة معينة: النوع، المستوى، الأيام والوقت، الحالة، المعلمات، عدد الطالبات",
      parameters: {
        type: "object",
        properties: { name: { type: "string", description: "اسم الحلقة أو جزء منه" } },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_teacher_summary",
      description: "يرجع بيانات معلمة أو مشرفة: رتبتها، حلقاتها، نسبة حضورها",
      parameters: {
        type: "object",
        properties: { name: { type: "string", description: "اسم المعلمة أو جزء منه" } },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_open_tasks",
      description: "يرجع قائمة المهام غير المكتملة، مع إمكانية التصفية باسم المكلّفة",
      parameters: {
        type: "object",
        properties: {
          assignee_name: { type: "string", description: "اسم المكلّفة، اختياري" },
        },
      },
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
  {
    type: "function",
    function: {
      name: "propose_circle_schedule_update",
      description:
        "تقترح تعديل أيام أو وقت حلقة معينة. لا تُنفّذه مباشرة، فقط تجهّز الاقتراح لعرضه على المستخدمة للتأكيد.",
      parameters: {
        type: "object",
        properties: {
          circle_name: { type: "string" },
          days: {
            type: "array",
            items: { type: "string" },
            description: "أيام الحلقة الجديدة، مثل: سبت، اثنين، أربعاء",
          },
          time_text: { type: "string", description: "وقت الحلقة الجديد كنص، مثل: بعد المغرب" },
        },
        required: ["circle_name"],
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

function safeArgs(raw: string | undefined): Record<string, unknown> {
  try {
    return JSON.parse(raw ?? "{}");
  } catch {
    return {};
  }
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

    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();
    const role = (roleRow?.role as AppRole | undefined) ?? "teacher";
    const roleLabel = ROLE_LABELS[role] ?? "مستخدمة";

    const systemMessage = {
      role: "system",
      content: `أنتِ «المساعد الذكي» لمقرأة نسائية لتحفيظ القرآن اسمها «حبل الله المتين». لا تستخدمي اسمًا شخصيًا لنفسك. أجيبي بالعربية الفصحى المهذبة الدافئة، بإيجاز ووضوح، بصيغة المؤنث، وبأسلوب عملي يساعد على اتخاذ القرار بسرعة.

المستخدمة الحالية رتبتها: ${roleLabel}. كل استعلاماتك وإجراءاتك تمر عبر حساب هذه المستخدمة فعليًا، فهي تلقائيًا مقيّدة بنفس صلاحياتها داخل النظام — لا تفترضي أنك ترين بيانات لا تراها هي. إن رجعت أداة نتيجة فارغة أو فشل إجراء بسبب الصلاحيات، أخبري المستخدمة بوضوح أن هذا خارج صلاحيتها أو أن البيانات غير متاحة، بدل اختلاق إجابة.

عند سؤالك عن بيانات فعلية (طالبة، معلمة، حلقة، مهام، طلبات) استخدمي الأدوات المتاحة دائمًا بدل التخمين. عند طلب إنشاء إعلان أو مهمة أو تعديل جدول حلقة، استخدمي الأداة المخصصة (propose_*) فورًا دون سؤال إضافي إذا كانت المعلومات كافية، ولا تدّعي أنك نفّذتِ الإجراء فعليًا — التنفيذ الفعلي يتم فقط بعد تأكيد المستخدمة صراحة.`,
    };

    const messages: Record<string, unknown>[] = [systemMessage, ...history];
    let json = await callGateway(key, messages);
    let msg = json.choices?.[0]?.message;

    if (msg?.tool_calls?.length) {
      const calls = msg.tool_calls as { id: string; function: { name: string; arguments: string } }[];

      for (const call of calls) {
        const name = call.function?.name;

        if (name === "propose_announcement") {
          const args = safeArgs(call.function?.arguments);
          return {
            answer: `جهّزت اقتراح إعلان بعنوان "${String(args["title"] ?? "")}" — راجعيه وأكّدي النشر بالأسفل.`,
            pendingAction: {
              type: "create_announcement",
              title: String(args["title"] ?? ""),
              content: String(args["content"] ?? ""),
            } as PendingAction,
          };
        }

        if (name === "propose_task") {
          const args = safeArgs(call.function?.arguments);
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

        if (name === "propose_circle_schedule_update") {
          const args = safeArgs(call.function?.arguments);
          const circleName = String(args["circle_name"] ?? "");
          const { data: circle } = await context.supabase
            .from("circles")
            .select("id, name, days, time_text")
            .ilike("name", `%${circleName}%`)
            .limit(1)
            .maybeSingle();
          if (!circle) {
            return { answer: `ما لقيت حلقة باسم "${circleName}".` };
          }
          const newDays = Array.isArray(args["days"]) ? (args["days"] as string[]) : (circle.days ?? []);
          const newTime = args["time_text"] ? String(args["time_text"]) : (circle.time_text ?? "");
          return {
            answer: `جهّزت اقتراح تعديل موعد حلقة "${circle.name}" إلى (${newDays.join("، ")}) — ${newTime}. راجعي وأكّدي بالأسفل.`,
            pendingAction: {
              type: "update_circle_schedule",
              circle_id: circle.id,
              circle_name: circle.name,
              days: newDays,
              time_text: newTime,
            } as PendingAction,
          };
        }
      }

      messages.push(msg);
      for (const call of calls) {
        const name = call.function?.name;
        const args = safeArgs(call.function?.arguments);
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

        if (name === "get_circle_summary") {
          const search = String(args["name"] ?? "");
          const { data: circle } = await context.supabase
            .from("circles")
            .select("id, name, circle_type, level, days, time_text, status")
            .ilike("name", `%${search}%`)
            .limit(1)
            .maybeSingle();

          if (!circle) {
            toolResult = "لم يتم العثور على حلقة بهذا الاسم.";
          } else {
            const { count: studentsCount } = await context.supabase
              .from("students")
              .select("id", { count: "exact", head: true })
              .eq("circle_id", circle.id);
            const { data: teacherLinks } = await context.supabase
              .from("circle_teachers")
              .select("teacher_id")
              .eq("circle_id", circle.id);
            const teacherIds = (teacherLinks ?? []).map((t) => t.teacher_id);
            let teacherNames: string[] = [];
            if (teacherIds.length) {
              const { data: teachers } = await context.supabase
                .from("profiles")
                .select("full_name")
                .in("id", teacherIds);
              teacherNames = (teachers ?? []).map((t) => t.full_name);
            }
            toolResult = JSON.stringify({
              name: circle.name,
              type: circle.circle_type,
              level: circle.level,
              days: circle.days,
              time: circle.time_text,
              status: circle.status,
              students_count: studentsCount ?? 0,
              teachers: teacherNames,
            });
          }
        }

        if (name === "get_teacher_summary") {
          const search = String(args["name"] ?? "");
          const { data: teacher } = await context.supabase
            .from("profiles")
            .select("id, full_name")
            .ilike("full_name", `%${search}%`)
            .limit(1)
            .maybeSingle();

          if (!teacher) {
            toolResult = "لم يتم العثور على معلمة أو مشرفة بهذا الاسم.";
          } else {
            const { data: roleRow2 } = await context.supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", teacher.id)
              .maybeSingle();
            const { data: circleLinks } = await context.supabase
              .from("circle_teachers")
              .select("circle_id")
              .eq("teacher_id", teacher.id);
            const circleIds = (circleLinks ?? []).map((c) => c.circle_id);
            let circleNames: string[] = [];
            if (circleIds.length) {
              const { data: circlesData } = await context.supabase
                .from("circles")
                .select("name")
                .in("id", circleIds);
              circleNames = (circlesData ?? []).map((c) => c.name);
            }
            const { data: attendance } = await context.supabase
              .from("teacher_attendance")
              .select("status")
              .eq("teacher_id", teacher.id);
            const total = attendance?.length ?? 0;
            const present = attendance?.filter((a) => a.status === "present").length ?? 0;
            const rate = total ? Math.round((present / total) * 100) : null;
            toolResult = JSON.stringify({
              full_name: teacher.full_name,
              role: roleRow2?.role ? (ROLE_LABELS[roleRow2.role as AppRole] ?? roleRow2.role) : "—",
              circles: circleNames,
              attendance_rate: rate,
            });
          }
        }

        if (name === "get_open_tasks") {
          const { data: openTasks } = await context.supabase
            .from("tasks")
            .select("title, due_date, priority, status, assignee_id")
            .neq("status", "done")
            .order("due_date", { ascending: true })
            .limit(15);
          let rows = openTasks ?? [];
          const assigneeName = args["assignee_name"] ? String(args["assignee_name"]) : null;
          if (assigneeName && rows.length) {
            const ids = [...new Set(rows.map((t) => t.assignee_id).filter(Boolean))];
            const { data: people } = await context.supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", ids as string[]);
            const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name]));
            rows = rows.filter((t) => (nameById.get(t.assignee_id) ?? "").includes(assigneeName));
          }
          toolResult = JSON.stringify({ count: rows.length, tasks: rows });
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

    if (action.type === "update_circle_schedule") {
      const { error } = await context.supabase
        .from("circles")
        .update({ days: action.days, time_text: action.time_text })
        .eq("id", action.circle_id);
      if (error) throw new Error("تعذر تحديث موعد الحلقة: " + error.message);
      return { ok: true, message: `تم تحديث موعد حلقة "${action.circle_name}"` };
    }

    throw new Error("إجراء غير معروف");
  });
