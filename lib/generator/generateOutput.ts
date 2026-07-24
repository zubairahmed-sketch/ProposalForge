import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import type { AssembledContext } from './assembleContext';
import type { MilestoneItem } from '@/lib/types';
import type { BidStrategy } from './bidStrategy';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type OutputType = 'pph_proposal' | 'email' | 'cover_letter';

export interface GenerateOutputResult {
  proposal_body: string;
  tokensUsed: number;
}

function formatProjectsForPrompt(projects: AssembledContext['relevant_projects']): string {
  if (!projects.length) return 'No specific projects listed.';
  return projects
    .map((p) => {
      const highlights = p.highlights?.length ? `\n  Key highlights: ${p.highlights.join('; ')}` : '';
      const stack = p.tech_stack?.length ? `\n  Stack: ${p.tech_stack.join(', ')}` : '';
      return `- ${p.name}: ${p.description}${stack}${highlights}`;
    })
    .join('\n');
}

function formatSkillsForPrompt(skills: AssembledContext['relevant_skills']): string {
  if (!skills.length) return 'No skills listed.';
  const grouped: Record<string, string[]> = {};
  for (const s of skills) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(`${s.name} (${s.proficiency})`);
  }
  return Object.entries(grouped)
    .map(([cat, items]) => `${cat}: ${items.join(', ')}`)
    .join('\n');
}

function buildSystemPrompt(
  context: AssembledContext,
  outputType: OutputType,
  keyRequirements: string[],
): string {
  const { profile, relevant_projects, relevant_skills } = context;
  const projectsText = formatProjectsForPrompt(relevant_projects);
  const skillsText = formatSkillsForPrompt(relevant_skills);
  const requirementsText = keyRequirements.join('\n- ');
  const toneMap: Record<string, string> = {
    professional_friendly: 'professional but warm and approachable',
    direct: 'direct and concise — minimal preamble',
    formal: 'formal and structured',
  };
  const tone = toneMap[profile.tone_preference ?? 'professional_friendly'];

  if (outputType === 'pph_proposal') {
    return `You are writing a PeoplePerHour proposal for a freelance developer. The proposal must sound like it was written by a real, experienced developer speaking directly to the client — not like an AI tool.

Rules for tone and style:
Write in short natural paragraphs, not bullet points. Never use checkmarks, bullet inventories of skills, or ✔ symbols. Do not restate the client's requirements back at them line by line. Mention relevant experience in the flow of explaining your approach, not as a separate credentials list. Be specific about how you would approach their problem. Sound confident but not salesy. Tone: ${tone}.

About the developer:
${profile.summary ?? 'Experienced full-stack and AI developer.'}
Experience: ${profile.experience_years_dev ?? 0} years development, ${profile.experience_years_ai ?? 0} years AI/ML.

Relevant projects to reference naturally where appropriate:
${projectsText}

Relevant skills:
${skillsText}

Job requirements extracted:
- ${requirementsText}

Write a proposal of 200-280 words. Do not include a greeting like "Hi" — PPH proposals typically begin directly with the substance. End with a short, confident closing line expressing availability to discuss further.`;
  }

  if (outputType === 'email') {
    return `You are writing a professional job application email. It should sound like a real developer wrote it — direct, specific, human.

Rules: Short paragraphs. No bulleted skill lists. Mention relevant technologies only where they connect to why you're a good fit for this specific role. Don't pad. Include a professional signature block at the end. Tone: ${tone}.

About the developer:
${profile.summary ?? 'Experienced full-stack and AI developer.'}
Experience: ${profile.experience_years_dev ?? 0} years development, ${profile.experience_years_ai ?? 0} years AI/ML.

Relevant projects to reference:
${projectsText}

Relevant skills:
${skillsText}

Job requirements extracted:
- ${requirementsText}

Generate a subject line on the first line (format: "Subject: ..."), then a blank line, then the email body (180-250 words). End with this signature:
${profile.full_name ?? 'Your Name'} | ${profile.email ?? ''} | ${profile.phone ?? ''} | ${profile.linkedin_url ?? ''} | ${profile.github_url ?? ''}`;
  }

  // cover_letter
  return `You are writing a professional cover letter. It should be formal yet personal — showing genuine interest in the role while demonstrating relevant experience. Tone: ${tone}.

Rules: Three to four concise paragraphs. No bullet points. Reference specific projects only if they directly relate to the role's core needs. Don't copy paste skills as a list. End with a professional closing paragraph.

About the developer:
${profile.summary ?? 'Experienced full-stack and AI developer.'}
Experience: ${profile.experience_years_dev ?? 0} years development, ${profile.experience_years_ai ?? 0} years AI/ML.

Relevant projects to reference:
${projectsText}

Relevant skills:
${skillsText}

Job requirements extracted:
- ${requirementsText}

Write a cover letter of 250-350 words. Include a professional closing with:
${profile.full_name ?? 'Your Name'} | ${profile.email ?? ''} | ${profile.phone ?? ''} | ${profile.linkedin_url ?? ''}`;
}

export async function generateOutput(
  context: AssembledContext,
  outputType: OutputType,
  keyRequirements: string[],
  userId: string,
): Promise<GenerateOutputResult> {
  const systemPrompt = buildSystemPrompt(context, outputType, keyRequirements);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Generate the output now.' },
    ],
    temperature: 0.7,
    max_tokens: 800,
  });

  const tokensUsed = response.usage?.total_tokens ?? 0;
  const proposal_body = response.choices[0]?.message?.content ?? '';

  // Log token usage — Rule 8: log after every LLM call
  const supabase = await createClient();
  await supabase.from('token_usage_logs').insert({
    user_id: userId,
    call_type: 'generation',
    output_id: null, // Will be updated after output row is saved
    tokens_used: tokensUsed,
  });

  return { proposal_body, tokensUsed };
}
