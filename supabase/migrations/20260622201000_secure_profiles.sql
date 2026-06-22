-- 1. Drop the insecure blanket select policy
DROP POLICY IF EXISTS "Public can view profile display names" ON public.profiles;

-- 2. Create a secure public view that only exposes non-sensitive profile info
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
    id,
    display_name,
    avatar_url,
    public_name
FROM public.profiles;

-- 3. Grant access to the view
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 4. Add a restrictive policy to profiles that only allows users to see their own email
-- or for authenticated users to see basic info (via the view is better, but this handles direct queries)
CREATE POLICY "Users can view their own profile completely"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- 5. Allow editors to view all profiles (for admin work/email visibility if needed)
CREATE POLICY "Editors can view all profiles"
ON public.profiles FOR SELECT
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('editor', 'owner')));
