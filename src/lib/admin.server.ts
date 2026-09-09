import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AppRole } from "./constants";

const DOMAIN = "maqraah.local";

export function toEmail(username: string) {
  return `${username.trim().toLowerCase()}@${DOMAIN}`;
}

export function normalizeUsername(username: string) {
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

/** يولّد معرّف دخول تقني فريد خلف الكواليس (لا تراه الإدارة) */
async function generateTechnicalUsername(preferred: string) {
  const base = normalizeUsername(preferred) || "user";
  for (let i = 0; i < 12; i += 1) {
    const candidate = i === 0 ? base : `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `user${Date.now()}`;
}


export async function countStaff() {
  const { count, error } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((r) => r.role);
  if (!roles.includes("manager") && !roles.includes("deputy")) {
    throw new Error("لا تملكين صلاحية تنفيذ هذا الإجراء");
  }
  return roles as AppRole[];
}

export async function assertManager(userId: string) {
  const roles = await assertAdmin(userId);
  if (!roles.includes("manager")) {
    throw new Error("هذا الإجراء متاح للمديرة فقط");
  }
}

export async function createStaff(input: {
  fullName: string;
  username: string;
  password: string;
  phone?: string;
  phoneCode?: string;
  role: AppRole;
  notes?: string;
  birthDate?: string;
  educationLevel?: string;
  occupation?: string;
  originCountry?: string;
  residenceCountry?: string;
}) {
  const display = input.username.trim() || input.fullName.trim();
  if (!display) throw new Error("اسم الدخول مطلوب");
  if (input.password.length < 6) throw new Error("كلمة المرور يجب ألا تقل عن ٦ أحرف");

  // معرّف تقني مخفي تمامًا عن الإدارة، الاسم العربي يُحفظ للعرض
  const username = await generateTechnicalUsername(display);

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: toEmail(username),
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (createError || !created.user) {
    throw new Error(
      createError?.message?.includes("already")
        ? "اسم الدخول مستخدم مسبقًا"
        : (createError?.message ?? "تعذر إنشاء الحساب"),
    );
  }

  const userId = created.user.id;
  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: userId,
    full_name: input.fullName,
    username,
    username_display: display,
    phone: input.phone ?? null,
    phone_code: input.phoneCode ?? null,
    birth_date: input.birthDate || null,
    education_level: input.educationLevel || null,
    occupation: input.occupation || null,
    origin_country: input.originCountry || null,
    residence_country: input.residenceCountry || null,
    notes: input.notes ?? null,
  });
  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    throw new Error(profileError.message);
  }

  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .insert({ user_id: userId, role: input.role });
  if (roleError) throw new Error(roleError.message);

  return { id: userId, username, display };
}


export async function setPassword(userId: string, password: string) {
  if (password.length < 6) throw new Error("كلمة المرور يجب ألا تقل عن ٦ أحرف");
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
  if (error) throw new Error(error.message);
}

export async function replaceRole(userId: string, role: AppRole) {
  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
  const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
  if (error) throw new Error(error.message);
}

export async function logAction(
  actorId: string | null,
  module: string,
  action: string,
  details?: Record<string, string>,
) {
  await supabaseAdmin.from("system_logs").insert({
    actor_id: actorId,
    module,
    action,
    details: details ? JSON.parse(JSON.stringify(details)) : null,
  });
}

export async function listDirectory() {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("full_name, username, status")
    .eq("status", "active")
    .order("full_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({ full_name: p.full_name, username: p.username }));
}
