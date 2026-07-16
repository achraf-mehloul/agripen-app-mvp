
-- Pest reports (community-shared, visible to all authenticated users in same wilaya)
CREATE TABLE public.pest_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wilaya text,
  baladia text,
  latitude double precision,
  longitude double precision,
  pest_name text NOT NULL,
  plant text,
  severity text NOT NULL DEFAULT 'medium',
  notes text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pest_reports TO authenticated;
GRANT ALL ON public.pest_reports TO service_role;
ALTER TABLE public.pest_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY pest_read_all ON public.pest_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY pest_insert_own ON public.pest_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY pest_update_own ON public.pest_reports FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY pest_delete_own ON public.pest_reports FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Farm timeline events (irrigation, fertilization, harvest, disease, note)
CREATE TABLE public.farm_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  farm_id uuid,
  kind text NOT NULL,
  title text NOT NULL,
  detail text,
  amount numeric,
  unit text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farm_events TO authenticated;
GRANT ALL ON public.farm_events TO service_role;
ALTER TABLE public.farm_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_own ON public.farm_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Push subscriptions (web-push infrastructure; sender is a future edge function)
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY push_own ON public.push_subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX pest_reports_wilaya_idx ON public.pest_reports (wilaya, created_at DESC);
CREATE INDEX farm_events_user_time_idx ON public.farm_events (user_id, occurred_at DESC);
