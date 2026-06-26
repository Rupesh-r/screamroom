-- ============================================================
-- SCREAMROOM — Supabase Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── USERS TABLE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  username        TEXT UNIQUE NOT NULL,
  display_name    TEXT,
  id_hash         TEXT NOT NULL,          -- SHA-256 of govt ID, never stored raw
  dob             DATE NOT NULL,
  is_verified     BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── POSTS TABLE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  post_type       TEXT NOT NULL CHECK (post_type IN ('shout', 'gossip', 'vent')),
  is_ghost        BOOLEAN DEFAULT true,   -- true = anonymous, false = show username
  vibe_score      INT DEFAULT 0,          -- AI-generated intensity 0-100
  ai_tag          TEXT,                   -- AI-generated mood tag
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── REACTIONS TABLE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE,
  emoji           TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (post_id, user_id, emoji)        -- one per emoji per user per post
);

-- ── DM THREADS TABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dm_threads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a   UUID REFERENCES public.users(id) ON DELETE CASCADE,
  participant_b   UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (participant_a, participant_b)
);

-- ── DM MESSAGES TABLE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dm_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       UUID REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  sender_id       UUID REFERENCES public.users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE public.users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

-- Posts: anyone can read, authenticated users can insert their own
CREATE POLICY "Public posts readable" ON public.posts
  FOR SELECT USING (true);
CREATE POLICY "Auth users insert posts" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own posts" ON public.posts
  FOR DELETE USING (auth.uid() = user_id);

-- Reactions: anyone can read, auth can insert/delete own
CREATE POLICY "Public reactions readable" ON public.reactions
  FOR SELECT USING (true);
CREATE POLICY "Auth users react" ON public.reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own reactions" ON public.reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Users: only own profile readable in full; ghost posts never reveal user_id mapping
CREATE POLICY "Users read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_created ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_type    ON public.posts(post_type);
CREATE INDEX IF NOT EXISTS idx_reactions_post ON public.reactions(post_id);

-- ── REAL-TIME ─────────────────────────────────────────────────
-- Enable realtime on posts and reactions (run in Supabase dashboard
-- under Database > Replication, or via:)
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;

-- ── SEED DATA (optional demo posts) ──────────────────────────
-- INSERT INTO public.posts (content, post_type, is_ghost, vibe_score, ai_tag) VALUES
-- ('My boss just took credit for my idea IN FRONT OF EVERYONE', 'shout', true, 92, 'Workplace Rage'),
-- ('Heard the new hire is already looking for another job lol', 'gossip', true, 65, 'Office Drama'),
-- ('I have been faking confidence for 3 years and I am exhausted', 'vent', true, 78, 'Burnout');
