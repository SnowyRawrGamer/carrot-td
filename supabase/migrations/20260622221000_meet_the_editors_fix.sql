
CREATE POLICY "Allow public to see who is an editor" ON public.user_roles FOR SELECT TO anon, authenticated USING (role IN ('editor', 'owner'));
