import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole } from "./constants";

export const needsBootstrap = createServerFn({ method: "GET" }).handler(async () => {
  const { countStaff } = await import("./admin.server");
  return { needsSetup: (await countStaff()) === 0 };
});

export const bootstrapManager = createServerFn({ method: "POST" })
  .inputValidator((data: { fullName: string; username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { countStaff, createStaff, logAction } = await import("./admin.server");
    if ((await countStaff()) > 0) {
      throw new Error("تم إعداد النظام مسبقًا");
    }
    const result = await createStaff({ ...data, role: "manager" });
    await logAction(result.id, "الإعدادات", "إنشاء حساب المديرة الأولى");
    return result;
  });

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      fullName: string;
      username: string;
      password: string;
      phone?: string;
      role: AppRole;
      notes?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, createStaff, logAction } = await import("./admin.server");
    await assertAdmin(context.userId);
    const result = await createStaff(data);
    await logAction(context.userId, "الحسابات", `إنشاء حساب: ${data.fullName}`);
    return result;
  });

export const resetAccountPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; password: string }) => data)
  .handler(async ({ data, context }) => {
    const { assertAdmin, setPassword, logAction } = await import("./admin.server");
    await assertAdmin(context.userId);
    await setPassword(data.userId, data.password);
    await logAction(context.userId, "الحسابات", "إعادة تعيين كلمة المرور", {
      target: data.userId,
    });
    return { ok: true };
  });

export const changeMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data, context }) => {
    const { setPassword, logAction } = await import("./admin.server");
    await setPassword(context.userId, data.password);
    await logAction(context.userId, "الحسابات", "تغيير كلمة المرور الشخصية");
    return { ok: true };
  });

export const changeAccountRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; role: AppRole }) => data)
  .handler(async ({ data, context }) => {
    const { assertManager, replaceRole, logAction } = await import("./admin.server");
    await assertManager(context.userId);
    await replaceRole(data.userId, data.role);
    await logAction(context.userId, "الحسابات", "تغيير الرتبة", { target: data.userId });
    return { ok: true };
  });
