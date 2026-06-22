-- Update the status check constraint for site_notes to include new categories
ALTER TABLE public.site_notes DROP CONSTRAINT IF EXISTS site_notes_status_check;

ALTER TABLE public.site_notes ADD CONSTRAINT site_notes_status_check 
CHECK (status IN ('viewer_ideas', 'declined', 'idea', 'maybe', 'working', 'almost', 'completed'));
