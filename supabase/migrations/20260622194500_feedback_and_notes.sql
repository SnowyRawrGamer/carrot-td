-- 1. Create feedback table
CREATE TABLE public.site_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Bug Report', 'Feedback', 'Other')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'maybe')),
    admin_response TEXT,
    note_id UUID REFERENCES public.site_notes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add RLS to feedback
ALTER TABLE public.site_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feedback" 
ON public.site_feedback FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback" 
ON public.site_feedback FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Editors can view all feedback" 
ON public.site_feedback FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('editor', 'owner')));

CREATE POLICY "Editors can update feedback" 
ON public.site_feedback FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('editor', 'owner')));

-- 3. Function to enforce pending limit
CREATE OR REPLACE FUNCTION public.enforce_feedback_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT count(*) FROM public.site_feedback WHERE user_id = NEW.user_id AND status = 'pending') >= 3 THEN
        RAISE EXCEPTION 'You already have 3 pending submissions.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_limit_trigger
BEFORE INSERT ON public.site_feedback
FOR EACH ROW EXECUTE FUNCTION public.enforce_feedback_limit();

-- 4. Update site_notes constraint for the new labels
ALTER TABLE public.site_notes DROP CONSTRAINT IF EXISTS site_notes_status_check;
ALTER TABLE public.site_notes ADD CONSTRAINT site_notes_status_check 
CHECK (status IN ('viewer_ideas', 'declined', 'idea', 'maybe', 'accepted', 'working', 'completed'));

-- 5. Backfill/Update existing notes to align with new UI labels
UPDATE public.site_notes SET status = 'working' WHERE status = 'almost';
UPDATE public.site_notes SET status = 'accepted' WHERE status = 'working';
