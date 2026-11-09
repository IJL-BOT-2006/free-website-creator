export type ExamKind = 'single' | 'multi' | 'boolean' | 'written' | 'fill' | 'matching' | 'order' | 'classify' | 'correction' | 'table';
export type ExamQuestion = { id: string; lessonId?: string; lessonTitle?: string; kind: ExamKind; prompt: string; options?: string[]; answer?: string | string[]; explanation?: string; points: number };
export type ReadingItem = { id: string; text: string; lessonTitle?: string };
export type ExamLesson = { id: string; level: number; title: string; source: string; available: number; active: boolean };
export type ExamLink = { id: string; token: string; level: number; lesson_ids: string[]; question_count: number; active: boolean; owner_id: string };
export type ExamAttempt = { id: string; link_id: string; student_name: string; status: 'started' | 'submitted'; snapshot: ExamQuestion[]; reading_items: ReadingItem[]; responses: Record<string, string | string[]>; grades: Record<string, number>; pending: number; score: number; total: number; started_at: string; submitted_at: string | null };
export const LEVEL_TITLES = ['التمهيدي — القاعدة النورانية', 'المستوى الأول', 'المستوى الثاني', 'المستوى الثالث', 'المستوى الرابع', 'المستوى الخامس'];
export const KIND_TITLES: Record<ExamKind, string> = { single: 'اختيار الإجابة', multi: 'اختيار أكثر من إجابة', boolean: 'صح أو خطأ', written: 'إجابة كتابية', fill: 'أكملي الفراغ', matching: 'توصيل', order: 'ترتيب', classify: 'تصنيف', correction: 'تصحيح الخطأ', table: 'أكملي الجدول' };
export function validateQuestionCount(count: number, available: number) {
  if (!Number.isInteger(count) || count < 1) throw new Error('اكتبي عددًا صحيحًا لا يقل عن سؤال واحد');
  if (count > available) throw new Error(`المتاح ${available} سؤالًا مختلفًا في الدروس المحددة`);
  return count;
}
export function selectionKey(level: number, lessons: string[], count: number) {
  return `${level}:${[...new Set(lessons)].sort().join(',')}:${count}`;
}
export function normalizeReading(text: string) {
  return text.normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/[^\u0621-\u063A\u0641-\u064A\s]/g, '').replace(/\s+/g, ' ').trim();
}
export function isReadingMatch(expected: string, heard: string) {
  const target = normalizeReading(expected);
  return target.length > 0 && target === normalizeReading(heard);
}