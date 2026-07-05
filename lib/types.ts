// Database entity types — matching SPEC.md Section 5 schema exactly

export interface Profile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  summary: string | null;
  experience_years_dev: number | null;
  experience_years_ai: number | null;
  tone_preference: 'professional_friendly' | 'direct' | 'formal';
  pph_title: string | null;
  pph_about: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  tech_stack: string[];
  project_type: 'fullstack' | 'ai' | 'mobile' | 'hybrid';
  highlights: string[];
  live_url: string | null;
  github_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Skill {
  id: string;
  user_id: string;
  name: string;
  category: 'frontend' | 'backend' | 'database' | 'ai' | 'mobile' | 'tools';
  proficiency: 'familiar' | 'proficient' | 'expert';
}

export interface JobPosting {
  id: string;
  user_id: string;
  raw_text: string;
  job_title: string | null;
  platform: 'peopleperhour' | 'linkedin' | 'email' | 'other' | null;
  classified_type: 'fullstack' | 'ai' | 'mobile' | 'hybrid' | null;
  type_overridden: boolean;
  key_requirements: string[];
  budget: number | null;
  created_at: string;
}

export interface GeneratedOutput {
  id: string;
  user_id: string;
  job_posting_id: string;
  output_type: 'pph_proposal' | 'email' | 'cover_letter';
  proposal_body: string;
  milestone_table: MilestoneItem[] | null;
  bid_strategy: 'full_budget' | 'bid_lower' | 'ask_questions' | null;
  bid_strategy_reason: string | null;
  context_snapshot: ContextSnapshot;
  version: number;
  is_edited: boolean;
  edited_body: string | null;
  created_at: string;
}

export interface MilestoneItem {
  title: string;
  amount: number;
}

export interface ContextSnapshot {
  projects_used: Pick<Project, 'id' | 'name' | 'description' | 'tech_stack' | 'highlights'>[];
  skills_used: Pick<Skill, 'id' | 'name' | 'category' | 'proficiency'>[];
}

export interface TokenUsageLog {
  id: string;
  user_id: string;
  call_type: 'classification' | 'generation';
  output_id: string | null;
  tokens_used: number;
  created_at: string;
}

// Form/input types for creating or updating entities

export type ProfileUpdateInput = Partial<Omit<Profile, 'user_id' | 'created_at'>>;

export interface ProjectCreateInput {
  name: string;
  description: string;
  tech_stack: string[];
  project_type: 'fullstack' | 'ai' | 'mobile' | 'hybrid';
  highlights: string[];
  live_url?: string | null;
  github_url?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export type ProjectUpdateInput = Partial<ProjectCreateInput>;

export interface SkillCreateInput {
  name: string;
  category: 'frontend' | 'backend' | 'database' | 'ai' | 'mobile' | 'tools';
  proficiency: 'familiar' | 'proficient' | 'expert';
}

// Skill category labels for UI display
export const SKILL_CATEGORIES = [
  { value: 'frontend' as const, label: 'Frontend' },
  { value: 'backend' as const, label: 'Backend' },
  { value: 'database' as const, label: 'Database' },
  { value: 'ai' as const, label: 'AI / ML' },
  { value: 'mobile' as const, label: 'Mobile' },
  { value: 'tools' as const, label: 'Tools' },
] as const;

export const PROJECT_TYPES = [
  { value: 'fullstack' as const, label: 'Full Stack' },
  { value: 'ai' as const, label: 'AI / ML' },
  { value: 'mobile' as const, label: 'Mobile' },
  { value: 'hybrid' as const, label: 'Hybrid' },
] as const;

export const TONE_OPTIONS = [
  { value: 'professional_friendly' as const, label: 'Professional & Friendly' },
  { value: 'direct' as const, label: 'Direct' },
  { value: 'formal' as const, label: 'Formal' },
] as const;

export const PROFICIENCY_OPTIONS = [
  { value: 'familiar' as const, label: 'Familiar' },
  { value: 'proficient' as const, label: 'Proficient' },
  { value: 'expert' as const, label: 'Expert' },
] as const;
