# AI Proposal & Job Application Generator — Build Spec (v1, scoped for a 3–4 week solo build)

**Working name:** ProposalForge *(or: PitchKit, ApplyAI, DraftMate)*
**One-liner:** A tool that takes a job posting or freelance project description, matches it against your stored CV, projects, and skills, and generates a tailored proposal, application email, or cover letter — in a natural, human tone that doesn't read like AI output.

---

## Editor's Note — Why This Project, and What Makes It Different

The meta angle here is genuine: you built this because you were doing it manually in a chat session every time you wanted to apply for something, which is exactly the kind of real pain point that makes a strong interview story. More importantly, it's a project you'll actually use — which means it'll get refined over time in a way that a "showcase" project often doesn't.

What separates this from a basic "generate a cover letter" wrapper is the **context intelligence layer**: the system knows your projects, their tech stacks, which ones are relevant to a given job type (Full Stack vs AI vs Hybrid), and how to position you differently depending on what the client is asking for. The generation step is almost the easy part — the hard part is assembling the right context before you ever make an LLM call, and that's the piece worth engineering carefully.

**Parallels to the AI Memory Engine (same architecture, different domain):**

The core pattern is identical — instead of raw chat history, you assemble a small, relevant context object before each generation call. In the Memory Engine that context was: profile + summary + top facts + habit streaks. Here it's: profile + relevant projects (filtered by job type) + matching skills + tone instructions. Same idea, different data. If you build both, you'll have two projects that demonstrate the same architectural judgment in different product contexts — that's a strong portfolio story.

---

## 1. Project Overview

A personal job application assistant where the user stores their CV once — profile, projects, skills, experience — and then pastes in any job posting or freelance brief to get a tailored, human-sounding proposal, application email, or cover letter generated in seconds. The output type and tone adapt based on the job: a PeoplePerHour project gets a conversational freelancer-style proposal broken into phases and milestones; a full-time job posting gets a professional application email and optional cover letter.

**Core innovation:** the system classifies the job (Full Stack / AI / Hybrid), selects only the relevant subset of your projects and skills, and assembles a tight context object before generation — so the output reads as specifically tailored, not generically competent.

---

## 2. User Stories (v1 scope)

**Profile & portfolio management**
- As a user, I want to store my name, contact details, summary, and experience level once, so I never have to re-enter them per application.
- As a user, I want to add my projects individually — name, description, tech stack, type, live link — so the system knows what I've built.
- As a user, I want to tag each project as Full Stack, AI/ML, Mobile, or Hybrid so the generator can select relevant ones per job.
- As a user, I want to edit or delete any project or skill at any time.

**Job posting input & classification**
- As a user, I want to paste a job posting or freelance brief and have the system automatically classify it (Full Stack / AI / Hybrid) before generating anything, so I can verify it got the type right.
- As a user, I want to override the classification if the system got it wrong.

**Generation**
- As a user, I want to choose the output type — PeoplePerHour proposal, application email, or cover letter — before generating.
- As a user, I want the generated proposal to sound like a real freelancer, not a bulleted AI checklist.
- As a user, I want a PPH proposal to include a separate milestone pricing table if I provide a budget.
- As a user, I want to see which projects and skills were selected for a given output, so I understand why it said what it said.

**History & editing**
- As a user, I want all generated outputs saved so I can revisit, edit, copy, or export them.
- As a user, I want to regenerate a different version of any output without re-entering the job posting.
- As a user, I want to manually edit the generated text before copying it.

**Settings**
- As a user, I want to export all my data (profile, projects, generated outputs) as JSON.
- As a user, I want to delete my account and all data.

*(Voice input, team/multi-profile support, browser extension autofill, and direct PPH API integration are real future features — see section 12 — not v1 requirements.)*

---

## 3. Core Features (MVP Scope)

| # | Feature |
|---|---|
| 1 | Auth (email/password + Google OAuth via Supabase Auth) |
| 2 | Profile setup — name, contact, summary, experience level, tone preference |
| 3 | Project portfolio — add/edit/delete projects with name, description, tech stack, type tag, live link |
| 4 | Skills manager — categorized skills list (Frontend, Backend, Database, AI, Mobile) |
| 5 | Job posting input + AI classification (Full Stack / AI / Hybrid) with manual override |
| 6 | Output type selector — PPH Proposal / Application Email / Cover Letter |
| 7 | Context assembly — selects relevant projects + skills based on job type |
| 8 | Generation — tailored output in natural, human-sounding prose |
| 9 | PPH extras — milestone pricing table if budget is provided, bid strategy suggestion |
| 10 | Context transparency panel — "which projects and skills were used for this output" |
| 11 | Generation history — all outputs saved, editable, copyable |
| 12 | Regenerate — same job posting, fresh output variation |
| 13 | Token-usage dashboard — cost per generation over time |
| 14 | Settings — export data (JSON), delete account |

---

## 4. Context Assembly Architecture (this is the part that matters)

### Flow

```
Job Posting (pasted text)
     |
     v
[Call 1: Classification - gpt-4o-mini]
     |
     v
job_type: 'fullstack' | 'ai' | 'hybrid' | 'mobile'
output_type: 'pph_proposal' | 'email' | 'cover_letter'
key_requirements: string[]   <- extracted from the posting
budget: number | null        <- extracted if present
     |
     v
[Context Assembly] -> pure DB queries, NO LLM call
     |   profile + relevant_projects (filtered by job_type tag)
     |   + matching_skills (filtered by category)
     |   + tone instructions (from profile.tone_preference)
     |   + output_type formatting rules
     v
[Call 2: Generation - gpt-4o-mini]
     |
     v
generated_output (prose proposal / email / cover letter)
+ milestone_table (if PPH + budget present)
+ bid_strategy (if PPH)
     |
     v
Saved to generated_outputs table
Context snapshot also saved (which projects/skills were used)
     |
     v
token_usage_logs (call_type: 'classification' | 'generation')
```

### Key design decisions

**Classification before generation.** A single upfront classification call costs almost nothing and shapes everything downstream — which projects get selected, what tone the system prompt uses, whether milestone pricing logic runs. Skipping it and trying to handle everything in one giant prompt is how you get generic outputs. Keep them as two distinct calls.

**Context assembly is a DB query, not an LLM call.** Same principle as the Memory Engine: the intelligence is in how you filter and select data, not in asking the model to figure out what's relevant from a blob of unstructured text. Projects are tagged with a `type` field; the assembly step simply queries `WHERE type = job_type OR type = 'hybrid'`. Fast, deterministic, auditable.

**Context snapshot saves what was used.** Every generated output stores a JSONB snapshot of the projects and skills that were assembled for it. This is what powers the transparency panel ("here's why the proposal mentioned CivicEye and not Urban Footwear") — and it means you can always explain the output without re-running the query.

**Prose generation, not template filling.** The system prompt instructs the model to write in natural paragraphs, mention experience in the flow of explaining approach rather than listing it, and avoid checklist formatting entirely. The prompt also includes a "what not to do" section — no ✔ symbols, no bullet inventories of skills, no restating the client's requirements back at them line by line.

---

## 5. Database Schema (Supabase / Postgres)

```sql
-- profiles: core identity and preferences
profiles (
  user_id uuid primary key references auth.users,
  full_name text,
  email text,
  phone text,
  location text,
  linkedin_url text,
  github_url text,
  summary text,                         -- professional summary (freeform)
  experience_years_dev int,             -- ~2 for Full Stack
  experience_years_ai int,              -- ~1-3 for AI/ML
  tone_preference text default 'professional_friendly',
                                        -- 'professional_friendly' | 'direct' | 'formal'
  pph_title text,                       -- PeoplePerHour headline
  pph_about text,                       -- PeoplePerHour about section
  created_at timestamptz default now()
);

-- projects: the portfolio the generator draws from
projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  name text not null,
  description text not null,            -- what it does, problem it solves
  tech_stack text[],                    -- ['React.js', 'Node.js', 'MongoDB', ...]
  project_type text not null,           -- 'fullstack' | 'ai' | 'mobile' | 'hybrid'
  highlights text[],                    -- key achievements (kept short, used in prompts)
  live_url text,
  github_url text,
  display_order int default 0,          -- control which projects appear first
  is_active boolean default true,       -- soft-delete / hide without losing data
  created_at timestamptz default now()
);

-- skills: categorized for selective inclusion in prompts
skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  name text not null,
  category text not null,               -- 'frontend' | 'backend' | 'database' | 'ai' | 'mobile' | 'tools'
  proficiency text default 'proficient' -- 'familiar' | 'proficient' | 'expert'
);

-- job_postings: saved inputs
job_postings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  raw_text text not null,               -- the pasted job posting
  job_title text,                       -- user-provided or extracted
  platform text,                        -- 'peopleperhour' | 'linkedin' | 'email' | 'other'
  classified_type text,                 -- 'fullstack' | 'ai' | 'mobile' | 'hybrid'
  type_overridden boolean default false,-- did user manually change the classification?
  key_requirements text[],              -- extracted by Call 1
  budget numeric,                       -- extracted if present (PPH projects)
  created_at timestamptz default now()
);

-- generated_outputs: every generation saved
generated_outputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  job_posting_id uuid references job_postings(id),
  output_type text not null,            -- 'pph_proposal' | 'email' | 'cover_letter'
  proposal_body text not null,          -- the main prose output
  milestone_table jsonb,                -- [{title, amount}] for PPH proposals
  bid_strategy text,                    -- 'full_budget' | 'bid_lower' | 'ask_questions'
  bid_strategy_reason text,
  context_snapshot jsonb not null,      -- {projects_used: [...], skills_used: [...]}
  version int default 1,                -- incremented on regenerate
  is_edited boolean default false,      -- did user edit the raw output?
  edited_body text,                     -- user's edited version (kept separate from original)
  created_at timestamptz default now()
);

-- token_usage_logs: powers cost dashboard
token_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  call_type text not null,              -- 'classification' | 'generation'
  output_id uuid references generated_outputs(id),
  tokens_used int not null,
  created_at timestamptz default now()
);
```

Enable Row Level Security on every table — `user_id = auth.uid()` policies. This is the full security baseline for v1.

---

## 6. Backend Architecture

### Folder Structure (Next.js App Router — one runtime, one deploy target)

```
/app
  /api
    /profile/route.ts                      -> GET / PATCH profile
    /projects/route.ts                     -> GET / POST projects
    /projects/[id]/route.ts                -> PATCH / DELETE project
    /skills/route.ts                       -> GET / POST / DELETE skills
    /jobs/route.ts                         -> POST save job posting
    /jobs/[id]/route.ts                    -> GET / DELETE job posting
    /generate/classify/route.ts            -> POST Call 1 — classify job posting
    /generate/proposal/route.ts            -> POST Call 2 — generate output
    /generate/[outputId]/regenerate/route.ts -> POST regenerate (same job, new version)
    /outputs/route.ts                      -> GET all generated outputs
    /outputs/[id]/route.ts                 -> GET / PATCH (edit body) / DELETE output
    /usage/route.ts                        -> GET token usage logs
    /settings/export/route.ts             -> GET full data export (JSON)
  /onboarding/page.tsx
  /dashboard/page.tsx
  /profile/page.tsx
  /generate/page.tsx
  /history/page.tsx
  /settings/page.tsx

/lib
  /supabase/client.ts, server.ts
  /openai/client.ts
  /generator/classifyJob.ts              -> Call 1 logic
  /generator/assembleContext.ts          -> pure DB queries, no LLM
  /generator/generateOutput.ts           -> Call 2 logic
  /generator/buildMilestones.ts          -> milestone pricing from budget
  /generator/bidStrategy.ts             -> bid strategy logic
  /tokenTracking.ts                      -> logs token_usage_logs after every LLM call

/components
  /profile/ProfileForm.tsx, ProjectCard.tsx, ProjectForm.tsx, SkillsManager.tsx
  /generate/JobInput.tsx, ClassificationBadge.tsx, OutputTypeSelector.tsx, BudgetInput.tsx
  /output/ProposalViewer.tsx, MilestoneTable.tsx, ContextPanel.tsx, EditableOutput.tsx
  /history/OutputCard.tsx, OutputList.tsx
  /dashboard/RecentOutputs.tsx, UsageChart.tsx
  /ui/ (shadcn components)
```

### API Routes

| Method | Route | Purpose |
|---|---|---|
| GET/PATCH | `/api/profile` | Fetch or update profile |
| GET/POST | `/api/projects` | List or create projects |
| PATCH/DELETE | `/api/projects/[id]` | Edit or delete a project |
| GET/POST/DELETE | `/api/skills` | Manage skills |
| POST | `/api/jobs` | Save job posting |
| POST | `/api/generate/classify` | Call 1 — classify + extract requirements/budget |
| POST | `/api/generate/proposal` | Call 2 — assemble context + generate output |
| POST | `/api/generate/[id]/regenerate` | Regenerate with fresh variation |
| GET | `/api/outputs` | All generated outputs |
| GET/PATCH/DELETE | `/api/outputs/[id]` | View, edit, or delete one output |
| GET | `/api/usage` | Token usage for cost chart |
| GET | `/api/settings/export` | Full data export |

### Data Flow — "User generates a proposal"

1. User pastes job posting text and selects platform (PPH, LinkedIn, email) and output type.
2. Frontend POSTs to `/api/generate/classify` → Call 1 extracts job_type, key_requirements, and budget (if any) → saves to `job_postings`, returns classification to UI.
3. UI shows the classification badge and extracted requirements — user can override job_type if wrong.
4. User confirms and hits Generate → POST to `/api/generate/proposal`.
5. `assembleContext(userId, jobType)` runs — pure Supabase queries: profile + `projects WHERE project_type IN (jobType, 'hybrid') ORDER BY display_order` + `skills WHERE category IN (relevant_categories)`. No LLM call.
6. `buildMilestones(budget)` runs if budget was extracted and output type is PPH.
7. `bidStrategy(budget, jobComplexity)` determines whether to bid full, lower, or ask questions first.
8. System prompt assembled from profile + context + output type rules → Call 2 → prose output generated.
9. Output saved to `generated_outputs` with the context snapshot → token usage logged.
10. `ContextPanel` shows which projects and skills fed into the output — same transparency pattern as the Memory Engine's context sidebar.

### Data Flow — "User regenerates"

1. POST to `/api/generate/[outputId]/regenerate`.
2. Handler fetches the original `job_postings` row (same job text) and re-runs `assembleContext` + generation with a slightly varied temperature/seed instruction to get a meaningfully different version.
3. New row inserted into `generated_outputs` with `version = previous + 1` — old versions are never overwritten, always accessible from history.

---

## 7. Frontend UI / UX Design

### Design System
- **Tone:** professional, tool-like — this is a productivity app, not a journaling app. Slightly more structured than the Memory Engine, but still clean.
- **Palette:** white or light gray background (`#F8F9FA`), deep navy accent (`#1E3A5F`) for primary actions, slate text (`#334155`).
- **Typography:** clean sans-serif throughout ("Inter" for everything) — no serif, this isn't personal.
- **Components:** shadcn/ui (Button, Card, Dialog, Tabs, Badge, Textarea, Select, Separator), same restyling approach as Memory Engine.
- **State management:** React state/Context — only reach for Zustand if you hit real prop-drilling issues.

### Pages

**`/dashboard`** — quick stats row (total outputs, this week, tokens used) · "Generate New" CTA card (big, primary) · recent outputs list (last 5, each showing job title, output type, date, and a copy button).

**`/profile`** — three tab sections on one page:

*Personal Info:* name, email, phone, LinkedIn, GitHub, location, PPH title, PPH about section, experience years (dev + AI separately), tone preference selector.

*Projects:* grid of project cards — name, type badge (color-coded by type), tech stack tags, live/GitHub links, edit/delete. "Add Project" opens a form dialog: name, description, tech stack (tag input), type selector, highlights (one per line), links, display order.

*Skills:* grouped by category (Frontend, Backend, Database, AI, Mobile, Tools) — add/remove chips within each group. Proficiency selector per skill (Familiar / Proficient / Expert).

**`/generate`** — the main screen, single flow:

Step 1: paste job posting into a large textarea, select platform (PPH / LinkedIn / Email / Other), hit "Analyse." Classification badge appears — job type + extracted requirements list + detected budget. Override button if wrong.

Step 2: select output type (PPH Proposal / Application Email / Cover Letter). If PPH Proposal + budget detected, show a budget confirmation field. Hit "Generate."

Step 3: output appears in an editable panel on the right (or below on mobile). Left panel shows the context that was used: profile snippet, the specific projects selected, the skills categories included. If PPH, milestone table and bid strategy appear below the main prose.

Copy button copies the proposal text. Save button saves any manual edits. Regenerate button fires a new version.

**`/history`** — filterable list of all generated outputs. Filter by output type, platform, date range. Each card: job title (or first 60 chars of posting), output type badge, date, version number, preview of first two lines. Click to open full output — view, edit, copy, regenerate, or delete.

**`/settings`** — account (email, sign out) · export all data (JSON download) · delete account (confirmation dialog).

### Key UX Detail — the context panel on `/generate`

This is the same transparency feature as the Memory Engine's ContextPanel, and it's equally important here. When a user sees "you used CivicEye and not Urban Footwear for this AI job," they understand the tool is actually thinking about what's relevant rather than dumping everything. It also helps them spot when a project should be retagged or a highlight updated. Show it collapsed by default on mobile, visible by default on desktop.

### Mobile
Single-column stacking below 768px. The generate flow becomes linear (analysis → confirm → output) rather than split-panel. Bottom tab nav: Dashboard / Generate / History / Profile / Settings.

---

## 8. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14+ (App Router), TypeScript | Same stack as Memory Engine — consistent, efficient |
| Styling | TailwindCSS + shadcn/ui | Reuse your component knowledge from Memory Engine |
| Charts | Recharts | Token usage/cost chart on dashboard |
| Backend | Next.js API Route Handlers only | Single runtime, single Vercel deploy |
| Database + Auth | Supabase (Postgres + Auth + RLS) | Consistent with your stack; free tier covers a portfolio project |
| AI | OpenAI API — `gpt-4o-mini` for both calls | Classification is a small structured task; generation at this length doesn't need the larger model |
| Deployment | Vercel + Supabase Cloud | Same deploy setup as Memory Engine, zero hosting cost |

No LangChain, no queue infra, no analytics service for v1. Raw OpenAI API calls with JSON mode — same reasoning as Memory Engine.

---

## 9. Prompts

**Classification (Call 1) — system prompt:**
> Analyse this job posting or freelance brief. Return JSON only, no markdown, matching this schema exactly:
> `{ "job_type": "fullstack" | "ai" | "mobile" | "hybrid", "output_suggestion": "pph_proposal" | "email" | "cover_letter", "key_requirements": string[], "budget": number | null, "platform_detected": "peopleperhour" | "linkedin" | "email" | "other" | null }`
> job_type must reflect the primary technical domain. If the role combines web development and AI features, use "hybrid". budget should be extracted as a number if mentioned, otherwise null. key_requirements should be the 4–6 most specific technical or functional requirements, not generic ones.

**Generation (Call 2) — system prompt template (PPH Proposal):**
> You are writing a PeoplePerHour proposal for a freelance developer. The proposal must sound like it was written by a real, experienced developer speaking directly to the client — not like an AI tool.
>
> Rules for tone and style:
> Write in short natural paragraphs, not bullet points. Never use checkmarks, bullet inventories of skills, or ✔ symbols. Do not restate the client's requirements back at them line by line. Mention relevant experience in the flow of explaining your approach, not as a separate credentials list. Be specific about how you would approach their problem. Sound confident but not salesy.
>
> About the developer:
> {profile.summary}
> Experience: {profile.experience_years_dev} years development, {profile.experience_years_ai} years AI.
>
> Relevant projects to reference naturally where appropriate:
> {relevant_projects formatted as: name — description — key highlights}
>
> Relevant skills: {skills by category}
>
> Job requirements extracted: {key_requirements}
>
> Write a proposal of 200–280 words. Do not include a greeting like "Hi" — PPH proposals typically begin directly with the substance. End with a short, confident closing line expressing availability to discuss further.

**Generation (Call 2) — system prompt template (Application Email):**
> You are writing a professional job application email. It should sound like a real developer wrote it — direct, specific, human.
>
> Rules: Short paragraphs. No bulleted skill lists. Mention relevant technologies only where they connect to why you're a good fit for this specific role. Don't pad. Include a professional signature block at the end.
>
> {same profile + projects + skills block}
>
> Generate a subject line, then the email body (180–250 words). End with:
> {profile.full_name} | {profile.email} | {profile.phone} | {profile.linkedin_url} | {profile.github_url}

**Milestone builder (`/lib/generator/buildMilestones.ts`) — not a prompt, pure logic:**
Total budget is split across phases derived from the classified job type and key requirements. Each title must be under 40 characters (PPH limit). Amounts must sum exactly to the provided budget. This is deterministic code, not an LLM call — more reliable and zero cost.

---

## 10. Bid Strategy Logic

The bid strategy is also deterministic code in `bidStrategy.ts`, not an LLM call. Simple rules:

- Budget is null (no budget stated) → `ask_questions` — don't commit to a number before you know scope.
- Budget is present but the key requirements list has more than 8 items or includes terms like "from scratch," "full app," "custom" → `ask_questions` — scope is likely underpriced.
- Budget ≥ expected market rate for the scope → `full_budget` — no reason to leave money on the table.
- Budget is clearly below market but not insultingly so → `bid_lower` only if you want the client, flag it as a risk.

Output shown to the user: a short plain-English sentence explaining the recommendation, not just the label.

---

## 11. Build Phases

| Phase | Scope | Est. time |
|---|---|---|
| 1 | Auth, profile setup (personal info + projects + skills), Supabase RLS | 3–4 days |
| 2 | Job input, classification (Call 1), job_postings table | 2–3 days |
| 3 | Context assembly + generation (Call 2) + output saved to DB | 4–5 days |
| 4 | Proposal viewer, context panel, milestone table, bid strategy | 3–4 days |
| 5 | Generation history, regenerate, edit + save | 3–4 days |
| 6 | Token logging, usage chart, settings (export/delete), deploy | 2–3 days |

~3–4 weeks part-time. Phases 1–4 alone are a fully working generator — ship those first, add history and polish in Phase 5–6.

---

## 12. Future Work (real ideas, deliberately not v1)

- **Browser extension** that reads the job posting directly from the page and pre-fills the generator — the most natural UX upgrade after v1 ships.
- **Direct PeoplePerHour API integration** — submit the proposal without leaving the app (if PPH exposes an API).
- **Output scoring** — after you win or lose a project, record the outcome and use it to tune which project highlights and approaches get weighted higher over time. A lightweight feedback loop.
- **Team / multi-profile support** — let other freelancers maintain their own profile inside your tool; turn it into a SaaS product to sell on PPH itself.
- **Semantic project matching** via `pgvector` — instead of a simple type tag filter, embed project descriptions and retrieve by cosine similarity to the job posting. Same extension pattern as the Memory Engine's Phase 2.
- **Template versioning** — A/B test two generation strategies across applications and track win rate.
- **Voice input** for quickly adding new projects or skills.
- **Flutter mobile version** reusing the same Supabase backend — consistent with CivicEye and Task Pros.
- **Application tracker** — record which jobs you applied for, with what output, and what the outcome was. Closes the feedback loop from proposal to result.

---

## 13. CV Bullet & Interview Talking Points

**CV bullet:**
> Built an AI-powered proposal generator that classifies job postings, assembles a targeted context from a structured portfolio (relevant projects + skills filtered by job type), and generates tailored proposals and application emails in natural prose — with full transparency into what context drove each output.

**Be ready to answer:**
1. Why classify before generating? *(Classification shapes context assembly — which projects get selected, what skills categories are included, whether PPH milestone logic runs. One cheap call that makes every subsequent step more specific.)*
2. Why is context assembly a DB query and not part of the generation prompt? *(Deterministic, auditable, and free. Asking the LLM to figure out what's relevant from a blob of unstructured text is slower, less reliable, and more expensive.)*
3. Why save a context snapshot per output? *(You can always explain why the output said what it said, without re-running queries. Also lets you spot when a project needs retagging.)*
4. Why is milestone pricing and bid strategy code, not another LLM call? *(They follow clear rules — more reliable, instant, and zero cost. Only use an LLM call where the task actually requires language understanding.)*

---

## 14. How to Use This With Copilot

Save this as `SPEC.md` at your repo root. In Copilot Chat, start with:

> Using SPEC.md as the reference, scaffold a Next.js 14 App Router project with TypeScript, TailwindCSS, and Supabase auth. Start with Phase 1: auth, onboarding, and the profile setup page covering personal info, the projects portfolio, and skills management. Set up the Supabase schema from section 5 first.

Reference sections explicitly in each session — "per SPEC.md section 6, the context assembly in assembleContext.ts should be a pure DB query, no LLM call" — to keep Copilot consistent rather than drifting toward simpler but architecturally wrong approaches. The two things Copilot will most likely try to shortcut are: (1) skipping the classification step and doing everything in one prompt, and (2) making the context assembly an LLM call rather than a DB query. Both are worth pushing back on explicitly.
