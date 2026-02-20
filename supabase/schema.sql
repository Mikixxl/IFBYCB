-- TeamFlow Database Schema
-- Run this in the Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- PROFILES (extends auth.users)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email         TEXT NOT NULL,
  full_name     TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────
-- PROJECTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  color         TEXT DEFAULT '#3b82f6' NOT NULL,
  owner_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ─────────────────────────────────────────────
-- PROJECT MEMBERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_members (
  project_id    UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role          TEXT CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
  joined_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (project_id, user_id)
);

-- ─────────────────────────────────────────────
-- TASKS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id                      UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id              UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title                   TEXT NOT NULL,
  description             TEXT,
  status                  TEXT CHECK (status IN ('todo', 'in_progress', 'review', 'done')) DEFAULT 'todo' NOT NULL,
  priority                TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium' NOT NULL,
  assignee_id             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date                DATE,
  position                INTEGER DEFAULT 0 NOT NULL,
  apple_reminder_id       TEXT,          -- CalDAV UID for Apple Reminders
  apple_calendar_event_id TEXT,          -- CalDAV UID for Apple Calendar
  created_by              UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at              TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS tasks_assignee_id_idx ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks(status);

-- ─────────────────────────────────────────────
-- CHAT MESSAGES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id    UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content       TEXT NOT NULL,
  message_type  TEXT CHECK (message_type IN ('text', 'task_ref', 'system')) DEFAULT 'text' NOT NULL,
  task_ref_id   UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS chat_messages_project_id_idx ON public.chat_messages(project_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON public.chat_messages(created_at);

-- ─────────────────────────────────────────────
-- CALDAV ACCOUNTS (Apple iOS Sync)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.caldav_accounts (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  server_url      TEXT NOT NULL DEFAULT 'https://caldav.icloud.com',
  username        TEXT NOT NULL,
  display_name    TEXT NOT NULL,
  sync_reminders  BOOLEAN DEFAULT true NOT NULL,
  sync_calendar   BOOLEAN DEFAULT true NOT NULL,
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────

-- Profiles: users can read all profiles (needed for member lists), update own
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Projects: only project members can see projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select_members" ON public.projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = projects.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "projects_insert_authenticated" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "projects_update_owner_or_admin" ON public.projects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = projects.id AND user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "projects_delete_owner" ON public.projects
  FOR DELETE USING (owner_id = auth.uid());

-- Project Members
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_members_select" ON public.project_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "project_members_insert_owner_admin" ON public.project_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "project_members_delete_owner_admin" ON public.project_members
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin')
    )
  );

-- Tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select_members" ON public.tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = tasks.project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_insert_members" ON public.tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = tasks.project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_update_members" ON public.tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = tasks.project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_delete_members" ON public.tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = tasks.project_id AND user_id = auth.uid()
    )
  );

-- Chat Messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_select_members" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = chat_messages.project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "chat_insert_members" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = chat_messages.project_id AND user_id = auth.uid()
    )
  );

-- CalDAV Accounts (only own)
ALTER TABLE public.caldav_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "caldav_select_own" ON public.caldav_accounts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "caldav_insert_own" ON public.caldav_accounts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "caldav_update_own" ON public.caldav_accounts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "caldav_delete_own" ON public.caldav_accounts
  FOR DELETE USING (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- REALTIME (enable for tables used in subscriptions)
-- ─────────────────────────────────────────────
-- Run in Supabase Dashboard > Database > Replication:
-- Enable realtime for: tasks, chat_messages

-- Or via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- ─────────────────────────────────────────────
-- FUNCTIONS
-- ─────────────────────────────────────────────

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
