-- Add policy to allow editors and owners to read all profiles
-- This is necessary for the loadouts moderation panel to show the creator's name/email.
CREATE POLICY "editors read all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (public.is_editor(auth.uid()));
