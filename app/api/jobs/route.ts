import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const jobPostingSchema = z.object({
  raw_text: z.string().min(1),
  job_title: z.string().optional().nullable(),
  platform: z.enum(['peopleperhour', 'linkedin', 'email', 'other']).optional().nullable(),
  classified_type: z.enum(['fullstack', 'ai', 'mobile', 'hybrid']).optional().nullable(),
  type_overridden: z.boolean().default(false),
  key_requirements: z.array(z.string()).default([]),
  budget: z.number().optional().nullable(),
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

  const parsed = jobPostingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { data, error } = await supabase
    .from('job_postings')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
