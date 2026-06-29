ALTER VIEW public.public_editors SET (security_invoker=false);
GRANT SELECT ON public.public_editors TO anon, authenticated;