export type AppRole = "manager" | "deputy" | "supervisor" | "teacher";

export const ROLE_LABELS: Record<AppRole, string> = {
  manager: "المديرة",
  deputy: "نائبة المديرة",
  supervisor: "المشرفة",
  teacher: "المعلمة",
};

export const ROLE_ORDER: AppRole[] = ["manager", "deputy", "supervisor", "teacher"];

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  suspended: "موقوف",
  archived: "مؤرشف",
};

export const STUDENT_STATUS_LABELS: Record<string, string> = {
  active: "نشطة",
  paused: "متوقفة",
  warned: "في التنبيه",
  expelled: "مفصولة",
};

export const CIRCLE_STATUS_LABELS: Record<string, string> = {
  active: "نشطة",
  paused: "متوقفة",
  closed: "مغلقة",
};

export const ATTENDANCE_LABELS: Record<string, string> = {
  present: "حاضرة",
  excused: "غائبة بعذر",
  unexcused: "غائبة بدون عذر",
};

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار المراجعة",
  approved: "تمت الموافقة",
  rejected: "تم الرفض",
  archived: "مؤرشف",
};

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  expel_student: "طلب فصل طالبة",
  transfer_teacher: "طلب نقل معلمة",
  other: "طلب آخر",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  in_progress: "قيد التنفيذ",
  done: "تم الإنجاز",
  not_done: "لم يتم",
};

export const AUDIENCE_LABELS: Record<string, string> = {
  all: "الجميع",
  teachers: "المعلمات",
  supervisors: "المشرفات",
  admin: "الإدارة",
};

export const WEEK_DAYS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

export const CIRCLE_TYPES = ["قرآن كريم", "تمهيدي", "تجويد", "أخرى"];

export const RESOURCE_CATEGORIES = ["منهج", "نموذج", "استكر", "رابط", "ملف إداري"];

export const LOGIN_EMAIL_DOMAIN = "maqraah.local";

export function usernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@${LOGIN_EMAIL_DOMAIN}`;
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ar", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ar", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const WARNING_LEVEL_LABELS: Record<string, string> = {
  "1": "التنبيه الأول",
  "2": "التنبيه الثاني",
  "3": "التنبيه الثالث",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "منخفضة",
  normal: "عادية",
  high: "عالية",
  urgent: "عاجلة",
};

export const PRIORITY_TONES: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  low: "default",
  normal: "info",
  high: "warning",
  urgent: "danger",
};

export const EDUCATION_LEVELS = [
  "ابتدائي",
  "متوسط",
  "ثانوي",
  "دبلوم",
  "بكالوريوس",
  "ماجستير",
  "دكتوراه",
];

export const RESOURCE_FOLDERS = [
  "المناهج",
  "النماذج الإدارية",
  "الاستكرات والشهادات",
  "روابط مفيدة",
  "ملفات عامة",
];
