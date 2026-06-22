
DROP POLICY IF EXISTS "editors read all profiles" ON public.profiles;

CREATE POLICY "authors read comments on own notes"
  ON public.site_note_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.site_notes n
      WHERE n.id = site_note_comments.note_id
        AND n.created_by = auth.uid()
    )
    OR author_id = auth.uid()
  );

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_editor(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_profiles() FROM anon, authenticated, PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;
