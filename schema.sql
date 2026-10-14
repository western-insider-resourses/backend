CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  position INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  featured BOOLEAN NOT NULL DEFAULT false,
  author TEXT NOT NULL DEFAULT 'Editorial Team',
  views INT NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_list_idx ON posts (status, published_at DESC);
CREATE INDEX IF NOT EXISTS posts_category_idx ON posts (category_id);

-- every story has 1 to 3 images (enforced in the API; position 0..2)
CREATE TABLE IF NOT EXISTS post_images (
  id SERIAL PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  public_id TEXT,
  caption TEXT NOT NULL DEFAULT '',
  position INT NOT NULL DEFAULT 0 CHECK (position BETWEEN 0 AND 2),
  UNIQUE (post_id, position)
);

-- parent_id gives you replies to comments (any depth)
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_id INT REFERENCES comments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_post_idx ON comments (post_id, created_at);

CREATE TABLE IF NOT EXISTS likes (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, visitor_id)
);

CREATE TABLE IF NOT EXISTS ads (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  placement TEXT NOT NULL CHECK (placement IN ('header','sidebar','in_article','footer')),
  image_url TEXT,
  image_public_id TEXT,
  link_url TEXT,
  html_code TEXT,              -- e.g. an AdSense <ins> snippet
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social_links (
  id SERIAL PRIMARY KEY,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  position INT NOT NULL DEFAULT 0
);

-- page views and clicks. target looks like "post:slug", "ad:12", "share:whatsapp", "nav:crime"
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('view','click')),
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  path TEXT,
  target TEXT,
  visitor_id TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_time_idx ON events (created_at, type);
CREATE INDEX IF NOT EXISTS events_post_idx ON events (post_id);
