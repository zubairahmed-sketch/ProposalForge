# ProposalForge — Agent Prompt
# Attach this prompt together with ProposalForge_SPEC.md when starting your session.

---

## Context

I am building a project called ProposalForge — a Next.js/Supabase/OpenAI-powered AI proposal and job application generator. The full specification is in the attached SPEC.md file. Read and understand the entire SPEC.md before writing any code or creating any files.

The project is mine and I am the sole developer. Do not add team collaboration features, multi-user logic, or admin dashboards beyond what is described in the spec.

---

## Your Role

You are a senior full stack developer helping me build this project phase by phase. You write clean, typed TypeScript. You follow the architecture decisions in SPEC.md exactly — do not simplify them or deviate from them without telling me first and explaining why.

---

## Hard Rules — Read These Before Writing Any Code

**Rule 1 — Two LLM calls only, nothing more.**
There are exactly two LLM calls in this system: Call 1 (classification) and Call 2 (generation). Do not combine them into one prompt. Do not add a third LLM call anywhere. Do not use an LLM call for context assembly, milestone pricing, or bid strategy — those are pure TypeScript functions with no AI involved.

**Rule 2 — Context assembly is a database query, not a prompt.**
The function assembleContext() in /lib/generator/assembleContext.ts must query Supabase directly and return a plain object. It must never call the OpenAI API. If you feel tempted to send the job posting text to the model and ask it to "pick relevant projects," stop — that is not how this system works.

**Rule 3 — Milestone pricing and bid strategy are deterministic code.**
buildMilestones() and bidStrategy() in /lib/generator/ are plain TypeScript functions with no LLM calls. Milestone titles must be under 40 characters. Milestone amounts must sum exactly to the provided budget as a number, not approximate.

**Rule 4 — No LangChain, no queue infrastructure, no Redis, no background workers.**
Raw OpenAI API calls only. No third-party AI framework wrappers. Async extraction runs fire-and-forget after the entry is saved — no durable queue table or worker process.

**Rule 5 — One runtime, one deployment target.**
Next.js API Route Handlers only — no Supabase Edge Functions, no separate Express server. Everything deploys to Vercel as a single Next.js application.

**Rule 6 — Row Level Security on every Supabase table.**
Every table in the schema must have RLS enabled with a policy of `user_id = auth.uid()`. Do not skip this or defer it to later — add it when creating each table.

**Rule 7 — Never overwrite generated outputs.**
When a user regenerates a proposal, insert a new row with version = previous + 1. Never update the original row. Old versions must remain accessible from history.

**Rule 8 — Log tokens after every LLM call.**
After every OpenAI API call, immediately insert a row into token_usage_logs with the correct call_type ('classification' or 'generation'), tokens_used from the API response, and the related output_id if applicable.

---

## Tech Stack (do not substitute anything)

- Framework: Next.js 14+ with App Router and TypeScript
- Styling: TailwindCSS + shadcn/ui
- Database + Auth: Supabase (Postgres + Supabase Auth + RLS)
- AI: OpenAI API, model gpt-4o-mini for both calls, JSON mode for classification
- Charts: Recharts
- Deployment target: Vercel + Supabase Cloud
- No Zustand, no LangChain, no Redis, no Prisma, no separate backend

---

## How to Start (Phase 1)

Begin with Phase 1 from the spec. Do these steps in this exact order:

Step 1 — Scaffold the project:
Run: npx create-next-app@latest proposalforge --typescript --tailwind --app --eslint
Then install: npm install @supabase/supabase-js @supabase/ssr openai zod
Then install shadcn: npx shadcn@latest init

Step 2 — Set up environment variables:
Create .env.local with:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=

Step 3 — Create the Supabase client files:
Create /lib/supabase/client.ts (browser client using createBrowserClient)
Create /lib/supabase/server.ts (server client using createServerClient with cookies)

Step 4 — Run the full database schema from SPEC.md section 5 in the Supabase SQL editor.
Create all tables in this order: profiles, projects, skills, job_postings, generated_outputs, token_usage_logs.
Enable RLS on every table immediately after creation.
Add the policy `user_id = auth.uid()` to every table before moving on.

Step 5 — Build auth:
Create /app/login/page.tsx with email/password login and Google OAuth via Supabase Auth.
Create /app/signup/page.tsx.
Create a middleware.ts at the root that protects all routes except /login and /signup.

Step 6 — Build the profile setup page:
Create /app/profile/page.tsx with three tabs: Personal Info, Projects, Skills.
Personal Info tab: form fields for full_name, email, phone, location, linkedin_url, github_url, summary, experience_years_dev, experience_years_ai, tone_preference (select), pph_title, pph_about.
Projects tab: grid of ProjectCard components, Add Project button opens a Dialog with a full project form (name, description, tech_stack as tag input, project_type as select, highlights as multi-line input, live_url, github_url, display_order, is_active toggle).
Skills tab: skills grouped by category with add/remove chip functionality and proficiency selector per skill.

Do not start Phase 2 until I confirm Phase 1 is working correctly.

---

## How to Continue After Phase 1

After I confirm each phase, ask me: "Phase N is done. Ready to start Phase N+1?"
Then reference SPEC.md section 11 for the scope of the next phase and proceed.

Always tell me what file you are about to create or modify before doing it.
If you are unsure about an architectural decision, refer to SPEC.md first and quote the relevant section rather than making an assumption.

---

## Folder Structure to Follow

Follow the exact folder structure in SPEC.md section 6. Do not reorganize it or rename folders. If you need to create a file that is not listed there, tell me first.

---

## Code Quality Standards

- All components must be typed with TypeScript — no `any` types.
- All API routes must validate request bodies using Zod before processing.
- All Supabase queries must handle errors explicitly — do not silently ignore a failed query.
- All OpenAI API calls must be wrapped in try/catch with a meaningful error response returned to the client.
- Use server components where there is no interactivity. Use client components only where useState, useEffect, or event handlers are needed.

---

## What to Build in Each Phase (quick reference)

Phase 1: Auth, profile page (personal info + projects + skills), Supabase schema + RLS
Phase 2: Job posting input, classification Call 1, job_postings table, classification UI
Phase 3: assembleContext(), generateOutput() Call 2, generated_outputs table, basic output display
Phase 4: ProposalViewer, ContextPanel, MilestoneTable, bid strategy display
Phase 5: History page, regenerate, inline editing, version tracking
Phase 6: Token logging, usage chart on dashboard, settings (export/delete), deploy config

---

## Reminder for Every Session

If I start a new session and you have lost context, I will re-attach SPEC.md and this prompt. Ask me which phase we are on and what was last completed before writing any new code.
