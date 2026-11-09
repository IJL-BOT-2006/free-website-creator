import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { ExamAttempt, ExamLesson, ExamLink } from './exam-core';
import type { Json } from '@/integrations/supabase/types';
const token = z.string().regex(/^[a-f0-9]{48}$/);
const capability = z.object({ id: z.string().uuid(), secret: token });
export const examCatalog = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc('exam_catalog');
  if (error) throw new Error(error.message);
  return data as unknown as ExamLesson[];
});
export const copyExamLink = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ level: z.number().int().min(0).max(5), lessons: z.array(z.string().min(1)).min(1).max(200), count: z.number().int().positive() }).parse(v))
  .handler(async ({ data: v, context }) => {
    const { data, error } = await context.supabase.rpc('exam_copy_link', { _level: v.level, _lessons: v.lessons, _count: v.count });
    if (error) throw new Error(error.message);
    return data as unknown as ExamLink;
  });
export const examResults = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [attempts, links, notes] = await Promise.all([
    context.supabase.from('exam_attempts').select('id,link_id,student_name,snapshot,reading_items,responses,grades,status,pending,score,total,started_at,submitted_at').eq('status', 'submitted').order('submitted_at', { ascending: false }).limit(200),
    context.supabase.from('exam_links').select('*').order('created_at', { ascending: false }).limit(200),
    context.supabase.from('exam_notifications').select('*').order('created_at', { ascending: false }).limit(100),
  ]);
  const err = attempts.error || links.error || notes.error;
  if (err) throw new Error(err.message);
  return { attempts: attempts.data as unknown as ExamAttempt[], links: links.data as ExamLink[], notifications: notes.data ?? [] };
});
export const gradeExamAnswer = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid(), qid: z.string().min(1), score: z.number().min(0).max(100) }).parse(v))
  .handler(async ({ data: v, context }) => {
    const { error } = await context.supabase.rpc('exam_grade', { _id: v.id, _qid: v.qid, _score: v.score });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const toggleExamLink = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(v))
  .handler(async ({ data: v, context }) => {
    const { data, error } = await context.supabase.from('exam_links').update({ active: v.active }).eq('id', v.id).select('id').single();
    if (error || !data) throw new Error('غير مسموح بتعديل الرابط');
    return { ok: true };
  });
export const readExamNotification = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v)).handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('exam_notifications').update({ seen: true }).eq('id', data.id).eq('user_id', context.userId);
    if (error) throw new Error(error.message);
  });
export const publicExamLink = createServerFn({ method: 'POST' }).inputValidator((v: unknown) => z.object({ token }).parse(v)).handler(async ({ data: v }) => {
  const { publicExamClient } = await import('./exam.server');
  const { data, error } = await publicExamClient().rpc('exam_public_link', { _token: v.token });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('الرابط غير متاح أو تم تعطيله');
  return data as { level: number; count: number; lessons: { id: string; title: string }[] };
});
export const startExamAttempt = createServerFn({ method: 'POST' }).inputValidator((v: unknown) => z.object({ token, name: z.string().trim().min(2).max(100), secret: token }).parse(v)).handler(async ({ data: v }) => {
  const { publicExamClient } = await import('./exam.server');
  const { data, error } = await publicExamClient().rpc('exam_start', { _token: v.token, _name: v.name, _secret: v.secret });
  if (error) throw new Error(error.message);
  return data as ExamAttempt;
});
export const resumeExamAttempt = createServerFn({ method: 'POST' }).inputValidator((v: unknown) => capability.parse(v)).handler(async ({ data: v }) => {
  const { publicExamClient } = await import('./exam.server');
  const { data, error } = await publicExamClient().rpc('exam_public_attempt', { _id: v.id, _secret: v.secret });
  if (error) throw new Error(error.message);
  return data as ExamAttempt;
});
export const saveExamAttempt = createServerFn({ method: 'POST' }).inputValidator((v: unknown) => capability.extend({ responses: z.record(z.union([z.string().max(5000), z.array(z.string().max(5000)).max(100)])).refine(x => Object.keys(x).length <= 1000), submit: z.boolean() }).parse(v)).handler(async ({ data: v }) => {
  const { publicExamClient } = await import('./exam.server');
  const { data, error } = await publicExamClient().rpc('exam_save', { _id: v.id, _secret: v.secret, _responses: v.responses as Json, _submit: v.submit });
  if (error) throw new Error(error.message);
  return data as ExamAttempt;
});