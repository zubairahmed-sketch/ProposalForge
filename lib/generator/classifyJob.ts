import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ClassificationResult {
  job_type: 'fullstack' | 'ai' | 'mobile' | 'hybrid';
  output_suggestion: 'pph_proposal' | 'email' | 'cover_letter';
  key_requirements: string[];
  budget: number | null;
  platform_detected: 'peopleperhour' | 'linkedin' | 'email' | 'other' | null;
}

const CLASSIFICATION_SYSTEM_PROMPT = `Analyse this job posting or freelance brief. Return JSON only, no markdown, matching this schema exactly:
{ "job_type": "fullstack" | "ai" | "mobile" | "hybrid", "output_suggestion": "pph_proposal" | "email" | "cover_letter", "key_requirements": string[], "budget": number | null, "platform_detected": "peopleperhour" | "linkedin" | "email" | "other" | null }
job_type must reflect the primary technical domain. If the role combines web development and AI features, use "hybrid". budget should be extracted as a number if mentioned, otherwise null. key_requirements should be the 4-6 most specific technical or functional requirements, not generic ones.`;

export async function classifyJob(
  rawText: string,
  userId: string,
): Promise<{ result: ClassificationResult; tokensUsed: number }> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
      { role: 'user', content: rawText },
    ],
    temperature: 0,
  });

  const tokensUsed = response.usage?.total_tokens ?? 0;
  const content = response.choices[0]?.message?.content ?? '{}';
  const result = JSON.parse(content) as ClassificationResult;

  // Log token usage (Rule 8: log after every LLM call)
  const supabase = await createClient();
  await supabase.from('token_usage_logs').insert({
    user_id: userId,
    call_type: 'classification',
    output_id: null,
    tokens_used: tokensUsed,
  });

  return { result, tokensUsed };
}
