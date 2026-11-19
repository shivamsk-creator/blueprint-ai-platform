-- Local Development Seed Data (optional, executed by `supabase db reset`)
-- Note: In hosted environments, create users via Supabase Auth; workspace bootstrap runs via /onboarding.

-- Enable Supabase Realtime publications for live AI job status & notifications (D-010)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_jobs;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_job_events;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
