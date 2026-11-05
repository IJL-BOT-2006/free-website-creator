import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ROLE_LABELS, type AppRole } from "@/lib/constants";

export type PendingAction =
  | { type: "create_announcement"; title: string; content: string }
  | {
      type: "create_task";
      title: string;
      assignee_name: string;
      assignee_id: string | null;
      due_date: string | null;
    }
  | { type: "update_circle_schedule"; circle_id: string; circle_name: string; days: string[]; time_text: string }
  | { type: "create_circle"; name: string; circle_type: string; level: string | null; days: string[]; time_text: string }
  | {
      type: "create_student";
      full_name: string;
      phone: string | null;
      circle_id: string | null;
      circle_name: string | null;
      level: string | null;
      notes: string | null;
    }
  | { type: "create_account"; full_name: string; username: string; role: AppRole; phone: string | null }
  | { type: "student_event"; student_id: string; student_name: string; event: "warning" | "pledge"; reason: string };

export type Preview = { title: string; lines: string[] };
type AssistantReply = { answer: string; pendingAction?: PendingAction; preview?: Preview };
type ChatMessage = { role: "user" | "assistant"; content: string };

type Prop = { type: string; description?: string; items?: { type: string } };
function fn(name: string, description: string, properties: Record<string, Prop> = {}, required: string[] = []) {
  return { type: "function" as const, function: { name, description, parameters: { type: "object", properties, required } } };
}
const S = (description: string): Prop => ({ type: "string", description });
const DAYS: Prop = { type: "array", items: { type: "string" }, description: "أيام الحلقة مثل: سبت، اثنين، أربعاء" };

const READ_TOOLS = [
  fn("get_overview", "ملخص عام: أعداد الطالبات والحلقات والكادر والطلبات المعلقة والمهام المفتوحة ونسبة حضور آخر ٣٠ يومًا"),
  fn("list_students", "قائمة طالبات (حتى ٢٥) مع تصفية اختيارية بالحلقة أو الحالة", {
    circle_name: S("اسم الحلقة، اختياري"),
    status: S("active أو paused أو warned أو expelled، اختياري"),
  }),
  fn("list_circles", "قائمة الحلقات النشطة مع أيامها ووقتها وعدد طالباتها"),
  fn("list_staff", "قائمة الكادر مع الرتب وحالة الحسابات"),
  fn("get_student_summary", "بيانات طالبة: الحلقة، نسبة الحضور، التنبيهات، التعهدات، الحالة", { name: S("اسم الطالبة أو جزء منه") }, ["name"]),
  fn("get_circle_summary", "بيانات حلقة: النوع، المستوى، الموعد، المعلمات، عدد الطالبات", { name: S("اسم الحلقة أو جزء منه") }, ["name"]),
  fn("get_teacher_summary", "بيانات معلمة أو مشرفة: الرتبة، الحلقات، نسبة الحضور", { name: S("اسم المعلمة أو جزء منه") }, ["name"]),
  fn("get_pending_requests", "عدد الطلبات بانتظار المراجعة وأنواعها"),
  fn("get_open_tasks", "المهام غير المكتملة، مع تصفية اختيارية باسم المكلّفة", { assignee_name: S("اسم المكلّفة، اختياري") }),
  fn("get_attendance_stats", "إحصائيات حضور الطالبات لفترة مع تصفية اختيارية بالحلقة", {
    period: S("today أو week أو month"),
    circle_name: S("اسم الحلقة، اختياري"),
  }),
];

const STAFF_WRITE_TOOLS = [
  fn(
    "propose_circle_schedule_update",
    "تجهّز اقتراح تعديل أيام أو وقت حلقة. لا تنفّذه، المستخدمة تؤكد بعدها.",
    { circle_name: S("اسم الحلقة"), days: DAYS, time_text: S("الوقت الجديد كنص") },
    ["circle_name"],
  ),
  fn(
    "propose_student_event",
    "تجهّز اقتراح تسجيل تنبيه أو تعهد لطالبة. لا تنفّذه، المستخدمة تؤكد بعدها.",
    { student_name: S("اسم الطالبة"), event: S("warning أو pledge"), reason: S("السبب أو نص التعهد") },
    ["student_name", "event", "reason"],
  ),
];

const ADMIN_WRITE_TOOLS = [
  fn("propose_announcement", "تجهّز اقتراح إعلان جديد. لا تنشره، المستخدمة تؤكد بعدها.", { title: S("العنوان"), content: S("النص") }, ["title", "content"]),
  fn(
    "propose_task",
    "تجهّز اقتراح مهمة جديدة. لا تنشئها، المستخدمة تؤكد بعدها.",
    { title: S("عنوان المهمة"), assignee_name: S("اسم المكلّفة"), due_date: S("YYYY-MM-DD، اختياري") },
    ["title", "assignee_name"],
  ),
  fn(
    "propose_create_circle",
    "تجهّز اقتراح إنشاء حلقة جديدة. لا تنشئها، المستخدمة تؤكد بعدها.",
    { name: S("اسم الحلقة"), circle_type: S("مثل: قرآن كريم، تمهيدي"), level: S("المستوى، اختياري"), days: DAYS, time_text: S("الوقت كنص") },
    ["name", "circle_type"],
  ),
  fn(
    "propose_create_student",
    "تجهّز اقتراح إضافة طالبة جديدة. لا تضيفها، المستخدمة تؤكد بعدها.",
    { full_name: S("الاسم الكامل"), phone: S("الجوال، اختياري"), circle_name: S("اسم الحلقة، اختياري"), level: S("المستوى، اختياري"), notes: S("ملاحظات، اختياري") },
    ["full_name"],
  ),
  fn(
    "propose_create_account",
    "تجهّز اقتراح إنشاء حساب كادر. كلمة المرور يولدها النظام تلقائيًا، لا تطلبيها ولا تكتبيها.",
    { full_name: S("الاسم الكامل"), username: S("اسم الدخول بالعربية، اختياري"), role: S("teacher أو supervisor أو deputy أو manager"), phone: S("الجوال، اختياري") },
    ["full_name", "role"],
  ),
];

const ADMIN_TOOL_NAMES = new Set(ADMIN_WRITE_TOOLS.map((t) => t.function.name));
const ADMIN_ACTIONS = new Set(["create_announcement", "create_task", "create_circle", "create_student", "create_account"]);

const CAPABILITIES: Record<AppRole, string> = {
  manager: "قراءة كل بيانات النظام، وتجهيز: إعلان، مهمة، حلقة، طالبة، حساب كادر بأي رتبة، تعديل موعد حلقة، تنبيه أو تعهد لطالبة.",
  deputy: "قراءة كل بيانات النظام، وتجهيز: إعلان، مهمة، حلقة، طالبة، حساب كادر (ما عدا رتبة المديرة)، تعديل موعد حلقة، تنبيه أو تعهد لطالبة.",
  supervisor: "قراءة بيانات حلقاتها وطالباتها ومعلماتها، وتجهيز: تعديل موعد حلقة، تنبيه أو تعهد لطالبة فقط.",
  teacher: "قراءة بيانات حلقتها وطالباتها، وتجهيز: تعديل موعد حلقة، تنبيه أو تعهد لطالبة فقط.",
};

async function callGateway(key: string, messages: unknown[], tools?: unknown[]) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, ...(tools ? { tools } : {}) }),
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
const str = (v: unknown) => (v == null ? "" : String(v).trim());
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const tally = (rows: Record<string, unknown>[] | null, k: string) => {
  const o: Record<string, number> = {};
  for (const r of rows ?? []) {
    const v = String(r[k]);
    o[v] = (o[v] ?? 0) + 1;
  }
  return o;
};
function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(10);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { messages: ChatMessage[] }) => data)
  .handler(async ({ data, context }): Promise<AssistantReply> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("المساعد غير مهيأ حاليًا، تواصلي مع الدعم الفني");
    const sb = context.supabase;

    const history = (data.messages ?? [])
      .filter((m) => m && typeof m.content === "string" && m.content.trim())
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));
    if (!history.length) throw new Error("اكتبي رسالتك أولًا");

    const { data: roleRow } = await sb.from("user_roles").select("role").eq("user_id", context.userId).limit(1).maybeSingle();
    const role = (roleRow?.role as AppRole | undefined) ?? "teacher";
    const adminRole = role === "manager" || role === "deputy";
    const tools = [...READ_TOOLS, ...STAFF_WRITE_TOOLS, ...(adminRole ? ADMIN_WRITE_TOOLS : [])];
    const today = isoDate(new Date());

    const findCircle = async (name: string) => {
      const { data: c } = await sb
        .from("circles")
        .select("id, name, days, time_text")
        .eq("archived", false)
        .ilike("name", `%${name}%`)
        .limit(1)
        .maybeSingle();
      return c;
    };

    const runReadTool = async (name: string, args: Record<string, unknown>): Promise<string> => {
      if (name === "get_overview") {
        const since = isoDate(new Date(Date.now() - 29 * 86400000));
        const [st, ci, ur, rq, tk, att] = await Promise.all([
          sb.from("students").select("status"),
          sb.from("circles").select("id").eq("archived", false),
          sb.from("user_roles").select("role"),
          sb.from("requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
          sb.from("tasks").select("id", { count: "exact", head: true }).neq("status", "done"),
          sb.from("student_attendance").select("status").gte("session_date", since),
        ]);
        const total = att.data?.length ?? 0;
        const present = att.data?.filter((a) => a.status === "present").length ?? 0;
        return JSON.stringify({
          students_total: st.data?.length ?? 0,
          students_by_status: tally(st.data, "status"),
          active_circles: ci.data?.length ?? 0,
          staff_by_role: tally(ur.data, "role"),
          pending_requests: rq.count ?? 0,
          open_tasks: tk.count ?? 0,
          attendance_last_30_days: { total, present, rate: total ? Math.round((present / total) * 100) : null },
        });
      }

      if (name === "list_students") {
        let circleId: string | null = null;
        if (str(args["circle_name"])) {
          const c = await findCircle(str(args["circle_name"]));
          if (!c) return "لم يتم العثور على حلقة بهذا الاسم.";
          circleId = c.id;
        }
        let q = sb.from("students").select("full_name, status, warnings_count, circle_id").order("full_name").limit(25);
        if (circleId) q = q.eq("circle_id", circleId);
        if (str(args["status"])) q = q.eq("status", str(args["status"]) as "active");
        const [{ data: rows }, { data: cs }] = await Promise.all([q, sb.from("circles").select("id, name")]);
        const nameById = new Map((cs ?? []).map((c) => [c.id, c.name]));
        return JSON.stringify({
          shown: rows?.length ?? 0,
          students: (rows ?? []).map((s) => ({
            name: s.full_name,
            status: s.status,
            warnings: s.warnings_count,
            circle: s.circle_id ? (nameById.get(s.circle_id) ?? "—") : "بدون حلقة",
          })),
        });
      }

      if (name === "list_circles") {
        const [{ data: cs }, { data: st }] = await Promise.all([
          sb.from("circles").select("id, name, circle_type, days, time_text, status").eq("archived", false).order("name"),
          sb.from("students").select("circle_id"),
        ]);
        const counts = new Map<string, number>();
        for (const s of st ?? []) if (s.circle_id) counts.set(s.circle_id, (counts.get(s.circle_id) ?? 0) + 1);
        return JSON.stringify({
          circles: (cs ?? []).map((c) => ({
            name: c.name,
            type: c.circle_type,
            days: c.days,
            time: c.time_text,
            status: c.status,
            students: counts.get(c.id) ?? 0,
          })),
        });
      }

      if (name === "list_staff") {
        const [{ data: ps }, { data: rs }] = await Promise.all([
          sb.from("profiles").select("id, full_name, status").order("full_name"),
          sb.from("user_roles").select("user_id, role"),
        ]);
        const roleBy = new Map((rs ?? []).map((r) => [r.user_id, r.role]));
        return JSON.stringify({
          staff: (ps ?? []).map((p) => ({
            name: p.full_name,
            role: ROLE_LABELS[roleBy.get(p.id) as AppRole] ?? "—",
            status: p.status,
          })),
        });
      }

      if (name === "get_student_summary") {
        const { data: student } = await sb
          .from("students")
          .select("id, full_name, status, warnings_count, pledges_count, circle_id")
          .ilike("full_name", `%${str(args["name"])}%`)
          .limit(1)
          .maybeSingle();
        if (!student) return "لم يتم العثور على طالبة بهذا الاسم.";
        const { data: circle } = student.circle_id
          ? await sb.from("circles").select("name").eq("id", student.circle_id).maybeSingle()
          : { data: null };
        const { data: att } = await sb.from("student_attendance").select("status").eq("student_id", student.id);
        const total = att?.length ?? 0;
        const present = att?.filter((a) => a.status === "present").length ?? 0;
        return JSON.stringify({
          full_name: student.full_name,
          circle: circle?.name ?? "بدون حلقة",
          status: student.status,
          warnings_count: student.warnings_count,
          pledges_count: student.pledges_count,
          attendance_rate: total ? Math.round((present / total) * 100) : null,
          attendance_sessions: `${present}/${total}`,
        });
      }

      if (name === "get_circle_summary") {
        const { data: circle } = await sb
          .from("circles")
          .select("id, name, circle_type, level, days, time_text, status")
          .ilike("name", `%${str(args["name"])}%`)
          .limit(1)
          .maybeSingle();
        if (!circle) return "لم يتم العثور على حلقة بهذا الاسم.";
        const [{ count }, { data: links }] = await Promise.all([
          sb.from("students").select("id", { count: "exact", head: true }).eq("circle_id", circle.id),
          sb.from("circle_teachers").select("teacher_id").eq("circle_id", circle.id),
        ]);
        const ids = (links ?? []).map((t) => t.teacher_id);
        const { data: ts } = ids.length ? await sb.from("profiles").select("full_name").in("id", ids) : { data: [] };
        return JSON.stringify({
          name: circle.name,
          type: circle.circle_type,
          level: circle.level,
          days: circle.days,
          time: circle.time_text,
          status: circle.status,
          students_count: count ?? 0,
          teachers: (ts ?? []).map((t) => t.full_name),
        });
      }

      if (name === "get_teacher_summary") {
        const { data: t } = await sb
          .from("profiles")
          .select("id, full_name")
          .ilike("full_name", `%${str(args["name"])}%`)
          .limit(1)
          .maybeSingle();
        if (!t) return "لم يتم العثور على معلمة أو مشرفة بهذا الاسم.";
        const [{ data: r }, { data: links }, { data: att }] = await Promise.all([
          sb.from("user_roles").select("role").eq("user_id", t.id).limit(1).maybeSingle(),
          sb.from("circle_teachers").select("circle_id").eq("teacher_id", t.id),
          sb.from("teacher_attendance").select("status").eq("teacher_id", t.id),
        ]);
        const ids = (links ?? []).map((c) => c.circle_id);
        const { data: cs } = ids.length ? await sb.from("circles").select("name").in("id", ids) : { data: [] };
        const total = att?.length ?? 0;
        const present = att?.filter((a) => a.status === "present").length ?? 0;
        return JSON.stringify({
          full_name: t.full_name,
          role: r?.role ? (ROLE_LABELS[r.role as AppRole] ?? r.role) : "—",
          circles: (cs ?? []).map((c) => c.name),
          attendance_rate: total ? Math.round((present / total) * 100) : null,
        });
      }

      if (name === "get_pending_requests") {
        const { data: reqs } = await sb.from("requests").select("request_type, priority, created_at").eq("status", "pending");
        return JSON.stringify({ count: reqs?.length ?? 0, requests: reqs ?? [] });
      }

      if (name === "get_open_tasks") {
        const { data: openTasks } = await sb
          .from("tasks")
          .select("title, due_date, priority, status, assignee_id")
          .neq("status", "done")
          .order("due_date", { ascending: true })
          .limit(15);
        let rows = openTasks ?? [];
        const who = str(args["assignee_name"]);
        const ids = [...new Set(rows.map((t) => t.assignee_id))];
        const { data: people } = ids.length ? await sb.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
        const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name]));
        if (who) rows = rows.filter((t) => (nameById.get(t.assignee_id) ?? "").includes(who));
        return JSON.stringify({
          count: rows.length,
          tasks: rows.map((t) => ({
            title: t.title,
            assignee: nameById.get(t.assignee_id) ?? "—",
            due: t.due_date,
            priority: t.priority,
          })),
        });
      }

      if (name === "get_attendance_stats") {
        const period = str(args["period"]) || "month";
        const from =
          period === "today"
            ? today
            : period === "week"
              ? isoDate(new Date(Date.now() - 6 * 86400000))
              : `${today.slice(0, 7)}-01`;
        let q = sb.from("student_attendance").select("status").gte("session_date", from).lte("session_date", today);
        if (str(args["circle_name"])) {
          const c = await findCircle(str(args["circle_name"]));
          if (!c) return "لم يتم العثور على حلقة بهذا الاسم.";
          q = q.eq("circle_id", c.id);
        }
        const { data: rows } = await q;
        const total = rows?.length ?? 0;
        const n = (s: string) => rows?.filter((r) => r.status === s).length ?? 0;
        return JSON.stringify({
          period,
          from,
          to: today,
          total,
          present: n("present"),
          excused: n("excused"),
          unexcused: n("unexcused"),
          rate: total ? Math.round((n("present") / total) * 100) : null,
        });
      }

      return "هذه الأداة غير متاحة لرتبتك.";
    };

    const buildProposal = async (name: string, args: Record<string, unknown>): Promise<AssistantReply> => {
      if (ADMIN_TOOL_NAMES.has(name) && !adminRole) {
        return { answer: "هذا الإجراء من صلاحيات الإدارة (المديرة أو نائبتها). أقدر أساعدك بتعديل موعد حلقة أو تسجيل تنبيه أو تعهد لطالبة." };
      }

      if (name === "propose_announcement") {
        const title = str(args["title"]);
        const content = str(args["content"]);
        return {
          answer: `جهّزت إعلانًا بعنوان «${title}». راجعيه وأكّدي من البطاقة بالأسفل.`,
          pendingAction: { type: "create_announcement", title, content },
          preview: { title: `إعلان: ${title}`, lines: [content] },
        };
      }

      if (name === "propose_task") {
        const title = str(args["title"]);
        const who = str(args["assignee_name"]);
        const due = str(args["due_date"]) || null;
        const { data: m } = await sb.from("profiles").select("id, full_name").ilike("full_name", `%${who}%`).limit(1).maybeSingle();
        const assignee = m?.full_name ?? who;
        return {
          answer: `جهّزت مهمة «${title}» للمكلّفة ${assignee}. راجعيها وأكّدي بالأسفل.`,
          pendingAction: { type: "create_task", title, assignee_name: assignee, assignee_id: m?.id ?? null, due_date: due },
          preview: { title: `مهمة: ${title}`, lines: [`المكلّفة: ${assignee}`, due ? `الموعد: ${due}` : "بدون موعد نهائي"] },
        };
      }

      if (name === "propose_create_circle") {
        const cname = str(args["name"]);
        const ctype = str(args["circle_type"]) || "قرآن كريم";
        const level = str(args["level"]) || null;
        const days = Array.isArray(args["days"]) ? (args["days"] as string[]) : [];
        const time = str(args["time_text"]);
        return {
          answer: `جهّزت حلقة جديدة باسم «${cname}». راجعيها وأكّدي بالأسفل.`,
          pendingAction: { type: "create_circle", name: cname, circle_type: ctype, level, days, time_text: time },
          preview: {
            title: `حلقة جديدة: ${cname}`,
            lines: [`النوع: ${ctype}`, level ? `المستوى: ${level}` : "", days.length ? `الأيام: ${days.join("، ")}` : "", time ? `الوقت: ${time}` : ""].filter(Boolean),
          },
        };
      }

      if (name === "propose_create_student") {
        const full = str(args["full_name"]);
        const phone = str(args["phone"]) || null;
        const level = str(args["level"]) || null;
        const notes = str(args["notes"]) || null;
        let circle: { id: string; name: string } | null = null;
        if (str(args["circle_name"])) {
          const c = await findCircle(str(args["circle_name"]));
          if (!c) return { answer: `ما لقيت حلقة باسم «${str(args["circle_name"])}». تأكدي من الاسم أو أضيفي الطالبة بدون حلقة.` };
          circle = { id: c.id, name: c.name };
        }
        return {
          answer: `جهّزت إضافة الطالبة «${full}». راجعي وأكّدي بالأسفل.`,
          pendingAction: { type: "create_student", full_name: full, phone, circle_id: circle?.id ?? null, circle_name: circle?.name ?? null, level, notes },
          preview: {
            title: `طالبة جديدة: ${full}`,
            lines: [circle ? `الحلقة: ${circle.name}` : "بدون حلقة", phone ? `الجوال: ${phone}` : "", level ? `المستوى: ${level}` : ""].filter(Boolean),
          },
        };
      }

      if (name === "propose_create_account") {
        const full = str(args["full_name"]);
        const username = str(args["username"]) || full;
        const wanted = str(args["role"]);
        const newRole: AppRole = (["manager", "deputy", "supervisor", "teacher"] as const).find((r) => r === wanted) ?? "teacher";
        if (newRole === "manager" && role !== "manager") {
          return { answer: "إنشاء حساب بنفس رتبة المديرة من صلاحيات المديرة فقط. أقدر أجهّز حساب معلمة أو مشرفة أو نائبة." };
        }
        const phone = str(args["phone"]) || null;
        return {
          answer: `جهّزت إنشاء حساب «${full}» برتبة ${ROLE_LABELS[newRole]}. كلمة المرور المؤقتة ستظهر لك بعد التأكيد.`,
          pendingAction: { type: "create_account", full_name: full, username, role: newRole, phone },
          preview: {
            title: `حساب جديد: ${full}`,
            lines: [`الرتبة: ${ROLE_LABELS[newRole]}`, `اسم الدخول: ${username}`, phone ? `الجوال: ${phone}` : "", "كلمة المرور: مؤقتة، يولدها النظام"].filter(Boolean),
          },
        };
      }

      if (name === "propose_circle_schedule_update") {
        const c = await findCircle(str(args["circle_name"]));
        if (!c) return { answer: `ما لقيت حلقة باسم «${str(args["circle_name"])}».` };
        const days = Array.isArray(args["days"]) ? (args["days"] as string[]) : (c.days ?? []);
        const time = str(args["time_text"]) || c.time_text || "";
        return {
          answer: `جهّزت تعديل موعد حلقة «${c.name}». راجعي وأكّدي بالأسفل.`,
          pendingAction: { type: "update_circle_schedule", circle_id: c.id, circle_name: c.name, days, time_text: time },
          preview: { title: `تعديل موعد: ${c.name}`, lines: [`الأيام: ${days.join("، ") || "—"}`, `الوقت: ${time || "—"}`] },
        };
      }

      if (name === "propose_student_event") {
        const { data: s } = await sb.from("students").select("id, full_name").ilike("full_name", `%${str(args["student_name"])}%`).limit(1).maybeSingle();
        if (!s) return { answer: `ما لقيت طالبة باسم «${str(args["student_name"])}».` };
        const event = str(args["event"]) === "pledge" ? "pledge" : "warning";
        const reason = str(args["reason"]);
        return {
          answer: `جهّزت تسجيل ${event === "warning" ? "تنبيه" : "تعهد"} للطالبة ${s.full_name}. راجعي وأكّدي بالأسفل.`,
          pendingAction: { type: "student_event", student_id: s.id, student_name: s.full_name, event, reason },
          preview: { title: `${event === "warning" ? "تنبيه" : "تعهد"}: ${s.full_name}`, lines: [reason] },
        };
      }

      return { answer: "هذا الإجراء غير متاح." };
    };

    const systemMessage = {
      role: "system",
      content: `أنتِ «المساعد الذكي» لمقرأة نسائية لتحفيظ القرآن اسمها «حبل الله المتين». لا تستخدمي اسمًا شخصيًا لنفسك. أجيبي بالعربية الفصحى المهذبة الدافئة، بصيغة المؤنث، بإيجاز ووضوح وبأسلوب عملي، ويمكنك استخدام قوائم قصيرة وأرقام واضحة.

رتبة المستخدمة الحالية: ${ROLE_LABELS[role] ?? "مستخدمة"}.
صلاحياتك معها: ${CAPABILITIES[role]}
كل ما تقرئينه أو تجهّزينه يمر عبر حساب هذه المستخدمة وبصلاحياتها الفعلية. إن طلبت شيئًا خارج صلاحية رتبتها فاعتذري بلطف ووضّحي أنه من صلاحيات رتبة أعلى، واقترحي البديل المتاح.

القواعد:
١) للأسئلة عن بيانات فعلية استخدمي أدوات القراءة دائمًا ولا تخمّني. وللأسئلة العامة (كم عدد، ما وضع، أعطيني ملخصًا) ابدئي بـ get_overview أو القوائم. وإن لم تجدي بيانات فقولي ذلك بوضوح.
٢) عند طلب إنشاء أو تعديل استخدمي أداة propose_* فورًا إن كانت المعلومات كافية، وإلا اسألي عن الناقص بسؤال واحد قصير. لا تدّعي التنفيذ أبدًا؛ التنفيذ يتم فقط بعد أن تضغط المستخدمة «تأكيد وتنفيذ».
٣) لا تطلبي كلمات مرور ولا تكتبيها؛ النظام يولّد كلمة مؤقتة عند إنشاء حساب.
٤) تاريخ اليوم: ${today}.`,
    };

    const messages: Record<string, unknown>[] = [systemMessage, ...history];
    let msg = (await callGateway(key, messages, tools)).choices?.[0]?.message;

    for (let round = 0; round < 4 && msg?.tool_calls?.length; round += 1) {
      const calls = msg.tool_calls as { id: string; function: { name: string; arguments: string } }[];
      const proposal = calls.find((c) => c.function.name.startsWith("propose_"));
      if (proposal) return buildProposal(proposal.function.name, safeArgs(proposal.function.arguments));

      messages.push(msg);
      for (const call of calls) {
        const result = await runReadTool(call.function.name, safeArgs(call.function.arguments));
        messages.push({ role: "tool", tool_call_id: call.id, content: result });
      }
      msg = (await callGateway(key, messages, round < 3 ? tools : undefined)).choices?.[0]?.message;
    }

    const text = typeof msg?.content === "string" ? msg.content.trim() : "";
    return {
      answer: text || "ما قدرت أكوّن ردًا واضحًا من النتائج المتاحة. جرّبي تصيغين السؤال بشكل أدق، مثلاً بذكر الاسم الكامل أو اسم الحلقة.",
    };
  });

export const executeAssistantAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { action: PendingAction }) => data)
  .handler(async ({ data, context }) => {
    const { action } = data;
    const sb = context.supabase;
    const { data: roleRow } = await sb.from("user_roles").select("role").eq("user_id", context.userId).limit(1).maybeSingle();
    const role = (roleRow?.role as AppRole | undefined) ?? "teacher";
    const adminRole = role === "manager" || role === "deputy";
    if (ADMIN_ACTIONS.has(action.type) && !adminRole) throw new Error("هذا الإجراء من صلاحيات الإدارة فقط");

    const { logAction } = await import("./admin.server");
    const done = async (message: string, detail: string) => {
      await logAction(context.userId, "المساعد الذكي", detail).catch(() => undefined);
      return { ok: true, message };
    };

    if (action.type === "create_announcement") {
      const { error } = await sb.from("announcements").insert({
        title: action.title,
        content: action.content,
        audience: "all",
        published: true,
        created_by: context.userId,
      });
      if (error) throw new Error("تعذر إنشاء الإعلان: " + error.message);
      return done("تم نشر الإعلان", `إنشاء إعلان: ${action.title}`);
    }

    if (action.type === "create_task") {
      if (!action.assignee_id) throw new Error("تعذر تحديد المكلّفة بالمهمة، أضيفيها يدويًا من صفحة المهام");
      const { error } = await sb.from("tasks").insert({
        title: action.title,
        assignee_id: action.assignee_id,
        due_date: action.due_date,
        status: "in_progress",
        priority: "normal",
        created_by: context.userId,
      });
      if (error) throw new Error("تعذر إنشاء المهمة: " + error.message);
      return done("تم إنشاء المهمة", `إنشاء مهمة: ${action.title}`);
    }

    if (action.type === "update_circle_schedule") {
      const { error } = await sb.from("circles").update({ days: action.days, time_text: action.time_text }).eq("id", action.circle_id);
      if (error) throw new Error("تعذر تحديث موعد الحلقة: " + error.message);
      return done(`تم تحديث موعد حلقة «${action.circle_name}»`, `تعديل موعد حلقة: ${action.circle_name}`);
    }

    if (action.type === "create_circle") {
      const { error } = await sb.from("circles").insert({
        name: action.name,
        circle_type: action.circle_type,
        level: action.level,
        days: action.days,
        time_text: action.time_text,
        status: "active",
      });
      if (error) throw new Error("تعذر إنشاء الحلقة: " + error.message);
      return done(`تم إنشاء حلقة «${action.name}»`, `إنشاء حلقة: ${action.name}`);
    }

    if (action.type === "create_student") {
      const { error } = await sb.from("students").insert({
        full_name: action.full_name,
        phone: action.phone,
        circle_id: action.circle_id,
        level: action.level,
        notes: action.notes,
        status: "active",
      });
      if (error) throw new Error("تعذر إضافة الطالبة: " + error.message);
      return done(`تمت إضافة الطالبة «${action.full_name}»`, `إضافة طالبة: ${action.full_name}`);
    }

    if (action.type === "create_account") {
      if (action.role === "manager" && role !== "manager") throw new Error("إنشاء حساب بنفس رتبة المديرة متاح للمديرة فقط");
      const { createStaff } = await import("./admin.server");
      const password = tempPassword();
      const res = await createStaff({
        fullName: action.full_name,
        username: action.username || action.full_name,
        password,
        phone: action.phone ?? undefined,
        role: action.role,
      });
      return done(
        `تم إنشاء حساب «${action.full_name}» (${ROLE_LABELS[action.role]}). اسم الدخول: ${res.display} — كلمة المرور المؤقتة: ${password} — سلّميها لها، وتقدرين تغيّرينها من صفحة المعلمات والمشرفات.`,
        `إنشاء حساب: ${action.full_name}`,
      );
    }

    if (action.type === "student_event") {
      const { data: s } = await sb.from("students").select("warnings_count, pledges_count").eq("id", action.student_id).maybeSingle();
      if (!s) throw new Error("الطالبة غير موجودة أو ليست ضمن صلاحيتك");
      const level = action.event === "warning" ? String(Math.min(s.warnings_count + 1, 3)) : null;
      const { error } = await sb.from("student_events").insert({
        student_id: action.student_id,
        event_type: action.event,
        reason: action.reason,
        to_value: level,
        actor_id: context.userId,
      });
      if (error) throw new Error("تعذر التسجيل: " + error.message);
      const patch =
        action.event === "warning"
          ? { warnings_count: s.warnings_count + 1, status: "warned" as const }
          : { pledges_count: s.pledges_count + 1 };
      const { error: e2 } = await sb.from("students").update(patch).eq("id", action.student_id);
      if (e2) throw new Error("تعذر تحديث بيانات الطالبة: " + e2.message);
      return done(
        `تم تسجيل ${action.event === "warning" ? "التنبيه" : "التعهد"} للطالبة ${action.student_name}`,
        `${action.event === "warning" ? "تنبيه" : "تعهد"} للطالبة: ${action.student_name}`,
      );
    }

    throw new Error("إجراء غير معروف");
  });
