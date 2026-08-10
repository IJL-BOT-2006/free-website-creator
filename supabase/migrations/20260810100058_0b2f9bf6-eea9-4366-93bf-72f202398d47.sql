CREATE POLICY "staff read media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND public.is_staff(auth.uid()));
CREATE POLICY "staff upload media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND public.is_staff(auth.uid()) AND owner = auth.uid());
CREATE POLICY "staff update own media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND owner = auth.uid());
CREATE POLICY "staff delete own media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND (owner = auth.uid() OR public.is_admin(auth.uid())));