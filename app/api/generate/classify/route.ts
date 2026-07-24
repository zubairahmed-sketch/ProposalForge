import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { classifyJob } from '@/lib/generator/classifyJob';

const classifySchema = z.object({
  raw_text: z.string().min(10, 'Job posting text is too short'),
  platform: z.enum(['peopleperhour', 'linkedin', 'email', 'other']).optional().nullable(),
  job_title: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = classifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  try {
    // Call 1: classify the job posting
    const { result } = await classifyJob(parsed.data.raw_text, user.id);

    // Save job posting to DB
    const { data: jobPosting, error: insertError } = await supabase
      .from('job_postings')
      .insert({
        user_id: user.id,
        raw_text: parsed.data.raw_text,
        job_title: parsed.data.job_title ?? null,
        platform: parsed.data.platform ?? result.platform_detected ?? 'other',
        classified_type: result.job_type,
        type_overridden: false,
        key_requirements: result.key_requirements,
        budget: result.budget,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      job_posting: jobPosting,
      classification: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Classification failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
