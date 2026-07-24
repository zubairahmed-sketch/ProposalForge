import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assembleContext } from '@/lib/generator/assembleContext';
import { generateOutput } from '@/lib/generator/generateOutput';
import { buildMilestones } from '@/lib/generator/buildMilestones';
import { bidStrategy } from '@/lib/generator/bidStrategy';

const proposalSchema = z.object({
  job_posting_id: z.string().uuid(),
  output_type: z.enum(['pph_proposal', 'email', 'cover_letter']),
  // Allow override of job_type if user corrected the classification
  job_type_override: z.enum(['fullstack', 'ai', 'mobile', 'hybrid']).optional(),
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

  const parsed = proposalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { job_posting_id, output_type, job_type_override } = parsed.data;

  // Fetch the job posting
  const { data: jobPosting, error: jobError } = await supabase
    .from('job_postings')
    .select('*')
    .eq('id', job_posting_id)
    .eq('user_id', user.id)
    .single();

  if (jobError || !jobPosting) {
    return NextResponse.json({ error: 'Job posting not found' }, { status: 404 });
  }

  // Apply override if user corrected the classification
  const jobType = job_type_override ?? jobPosting.classified_type ?? 'fullstack';
  const isOverridden = !!job_type_override && job_type_override !== jobPosting.classified_type;

  if (isOverridden) {
    await supabase
      .from('job_postings')
      .update({ classified_type: jobType, type_overridden: true })
      .eq('id', job_posting_id);
  }

  try {
    // Context assembly — pure DB query, NO LLM call (Rule 2)
    const context = await assembleContext(user.id, jobType as 'fullstack' | 'ai' | 'mobile' | 'hybrid');

    // Milestone pricing — deterministic code (Rule 3)
    const milestone_table =
      output_type === 'pph_proposal' && jobPosting.budget
        ? buildMilestones(jobPosting.budget, jobType as 'fullstack' | 'ai' | 'mobile' | 'hybrid', jobPosting.key_requirements ?? [])
        : null;

    // Bid strategy — deterministic code (Rule 3)
    const bid = output_type === 'pph_proposal'
      ? bidStrategy(jobPosting.budget, jobPosting.key_requirements ?? [])
      : null;

    // Call 2: generate output
    const { proposal_body, tokensUsed } = await generateOutput(
      context,
      output_type,
      jobPosting.key_requirements ?? [],
      user.id,
    );

    // Save generated output — Rule 7: never overwrite, always insert new rows
    const { data: outputRow, error: outputError } = await supabase
      .from('generated_outputs')
      .insert({
        user_id: user.id,
        job_posting_id,
        output_type,
        proposal_body,
        milestone_table,
        bid_strategy: bid?.strategy ?? null,
        bid_strategy_reason: bid?.reason ?? null,
        context_snapshot: context.snapshot,
        version: 1,
        is_edited: false,
        edited_body: null,
      })
      .select()
      .single();

    if (outputError) {
      return NextResponse.json({ error: outputError.message }, { status: 500 });
    }

    // Update token log with the output_id now that we have it
    await supabase
      .from('token_usage_logs')
      .update({ output_id: outputRow.id })
      .eq('user_id', user.id)
      .eq('call_type', 'generation')
      .is('output_id', null)
      .order('created_at', { ascending: false })
      .limit(1);

    return NextResponse.json({
      output: outputRow,
      context_used: context.snapshot,
      tokens_used: tokensUsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
