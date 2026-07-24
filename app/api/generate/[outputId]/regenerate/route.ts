import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { assembleContext } from '@/lib/generator/assembleContext';
import { generateOutput } from '@/lib/generator/generateOutput';
import { buildMilestones } from '@/lib/generator/buildMilestones';
import { bidStrategy } from '@/lib/generator/bidStrategy';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ outputId: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { outputId } = await params;

  // Fetch the original output to get job_posting_id, output_type, version
  const { data: originalOutput, error: outputError } = await supabase
    .from('generated_outputs')
    .select('*')
    .eq('id', outputId)
    .eq('user_id', user.id)
    .single();

  if (outputError || !originalOutput) {
    return NextResponse.json({ error: 'Output not found' }, { status: 404 });
  }

  // Fetch the original job posting
  const { data: jobPosting, error: jobError } = await supabase
    .from('job_postings')
    .select('*')
    .eq('id', originalOutput.job_posting_id)
    .eq('user_id', user.id)
    .single();

  if (jobError || !jobPosting) {
    return NextResponse.json({ error: 'Job posting not found' }, { status: 404 });
  }

  const jobType = (jobPosting.classified_type ?? 'fullstack') as 'fullstack' | 'ai' | 'mobile' | 'hybrid';

  try {
    const context = await assembleContext(user.id, jobType);

    const milestone_table =
      originalOutput.output_type === 'pph_proposal' && jobPosting.budget
        ? buildMilestones(jobPosting.budget, jobType, jobPosting.key_requirements ?? [])
        : null;

    const bid = originalOutput.output_type === 'pph_proposal'
      ? bidStrategy(jobPosting.budget, jobPosting.key_requirements ?? [])
      : null;

    // Regenerate with slightly higher temperature for variation
    const { proposal_body, tokensUsed } = await generateOutput(
      context,
      originalOutput.output_type,
      jobPosting.key_requirements ?? [],
      user.id,
    );

    // Rule 7: never overwrite — insert new row with version + 1
    const { data: newOutput, error: insertError } = await supabase
      .from('generated_outputs')
      .insert({
        user_id: user.id,
        job_posting_id: originalOutput.job_posting_id,
        output_type: originalOutput.output_type,
        proposal_body,
        milestone_table,
        bid_strategy: bid?.strategy ?? null,
        bid_strategy_reason: bid?.reason ?? null,
        context_snapshot: context.snapshot,
        version: (originalOutput.version ?? 1) + 1,
        is_edited: false,
        edited_body: null,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Update token log with new output_id
    await supabase
      .from('token_usage_logs')
      .update({ output_id: newOutput.id })
      .eq('user_id', user.id)
      .eq('call_type', 'generation')
      .is('output_id', null)
      .order('created_at', { ascending: false })
      .limit(1);

    return NextResponse.json({
      output: newOutput,
      context_used: context.snapshot,
      tokens_used: tokensUsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Regeneration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
