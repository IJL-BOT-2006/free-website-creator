ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_announcements boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_tasks boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_requests boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "circle staff update schedule" ON public.circles;
CREATE POLICY "circle staff update schedule"
ON public.circles
FOR UPDATE
TO authenticated
USING (public.can_view_circle(auth.uid(), id))
WITH CHECK (public.can_view_circle(auth.uid(), id));