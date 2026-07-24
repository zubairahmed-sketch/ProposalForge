// Per SPEC.md Rule 2: context assembly is a pure DB query, NEVER an LLM call.
// This function queries Supabase directly and returns a plain object.

import { createClient } from '@/lib/supabase/server';
import type { Profile, Project, Skill, ContextSnapshot } from '@/lib/types';

// Map job_type to relevant skill categories
const JOB_TYPE_SKILL_CATEGORIES: Record<string, string[]> = {
  fullstack: ['frontend', 'backend', 'database', 'tools'],
  ai: ['ai', 'backend', 'database', 'tools'],
  mobile: ['mobile', 'backend', 'database', 'tools'],
  hybrid: ['frontend', 'backend', 'database', 'ai', 'mobile', 'tools'],
};

export interface AssembledContext {
  profile: Profile;
  relevant_projects: Project[];
  relevant_skills: Skill[];
  snapshot: ContextSnapshot;
}

export async function assembleContext(
  userId: string,
  jobType: 'fullstack' | 'ai' | 'mobile' | 'hybrid',
): Promise<AssembledContext> {
  const supabase = await createClient();

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (profileError || !profile) {
    throw new Error(`Failed to load profile: ${profileError?.message}`);
  }

  // Fetch relevant projects: type matches jobType OR is 'hybrid'
  const typesToInclude =
    jobType === 'hybrid'
      ? ['fullstack', 'ai', 'mobile', 'hybrid']
      : [jobType, 'hybrid'];

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('project_type', typesToInclude)
    .order('display_order', { ascending: true })
    .limit(6); // Cap to keep prompt size reasonable

  if (projectsError) {
    throw new Error(`Failed to load projects: ${projectsError.message}`);
  }

  // Fetch relevant skills by category
  const skillCategories = JOB_TYPE_SKILL_CATEGORIES[jobType] ?? ['frontend', 'backend', 'database', 'tools'];

  const { data: skills, error: skillsError } = await supabase
    .from('skills')
    .select('*')
    .eq('user_id', userId)
    .in('category', skillCategories)
    .order('proficiency', { ascending: false })
    .order('name');

  if (skillsError) {
    throw new Error(`Failed to load skills: ${skillsError.message}`);
  }

  const relevantProjects = projects ?? [];
  const relevantSkills = skills ?? [];

  // Build context snapshot — what was used (for transparency panel & DB storage)
  const snapshot: ContextSnapshot = {
    projects_used: relevantProjects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      tech_stack: p.tech_stack,
      highlights: p.highlights,
    })),
    skills_used: relevantSkills.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      proficiency: s.proficiency,
    })),
  };

  return {
    profile: profile as Profile,
    relevant_projects: relevantProjects as Project[],
    relevant_skills: relevantSkills as Skill[],
    snapshot,
  };
}
