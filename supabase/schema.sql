-- ProposalForge Database Schema
-- Run this in Supabase SQL Editor in order.
-- Per SPEC.md Section 5 + Agent Prompt Rule 6: RLS on every table.

-- ============================================
-- 1. PROFILES
-- ============================================
CREATE TABLE profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  location text,
  linkedin_url text,
  github_url text,
  summary text,
  experience_years_dev int,
  experience_years_ai int,
  tone_preference text DEFAULT 'professional_friendly',
  pph_title text,
  pph_about text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. PROJECTS
-- ============================================
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  tech_stack text[],
  project_type text NOT NULL,
  highlights text[],
  live_url text,
  github_url text,
  display_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. SKILLS
-- ============================================
CREATE TABLE skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  proficiency text DEFAULT 'proficient'
);

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skills"
  ON skills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skills"
  ON skills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skills"
  ON skills FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own skills"
  ON skills FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. JOB POSTINGS
-- ============================================
CREATE TABLE job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  raw_text text NOT NULL,
  job_title text,
  platform text,
  classified_type text,
  type_overridden boolean DEFAULT false,
  key_requirements text[],
  budget numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own job postings"
  ON job_postings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own job postings"
  ON job_postings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own job postings"
  ON job_postings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own job postings"
  ON job_postings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. GENERATED OUTPUTS
-- ============================================
CREATE TABLE generated_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  job_posting_id uuid REFERENCES job_postings(id) ON DELETE CASCADE,
  output_type text NOT NULL,
  proposal_body text NOT NULL,
  milestone_table jsonb,
  bid_strategy text,
  bid_strategy_reason text,
  context_snapshot jsonb NOT NULL,
  version int DEFAULT 1,
  is_edited boolean DEFAULT false,
  edited_body text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE generated_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own outputs"
  ON generated_outputs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own outputs"
  ON generated_outputs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own outputs"
  ON generated_outputs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own outputs"
  ON generated_outputs FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 6. TOKEN USAGE LOGS
-- ============================================
CREATE TABLE token_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  call_type text NOT NULL,
  output_id uuid REFERENCES generated_outputs(id) ON DELETE SET NULL,
  tokens_used int NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE token_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own token logs"
  ON token_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own token logs"
  ON token_usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
