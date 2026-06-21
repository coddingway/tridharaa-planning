-- Run this in Neon SQL Editor

CREATE TABLE IF NOT EXISTS ideas (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  member_name TEXT        NOT NULL,
  idea_text   TEXT        NOT NULL,
  category    TEXT        NOT NULL,
  status      TEXT        DEFAULT 'open' CHECK (status IN ('open', 'approved', 'task')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id     UUID        REFERENCES ideas(id) ON DELETE SET NULL,
  title       TEXT        NOT NULL,
  assigned_to TEXT,
  progress    TEXT        DEFAULT 'todo' CHECK (progress IN ('todo', 'in-progress', 'done')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
