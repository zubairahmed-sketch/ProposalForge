import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [profileRes, projectsRes, skillsRes, outputsRes, usageRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('projects').select('*').eq('user_id', user.id),
    supabase.from('skills').select('*').eq('user_id', user.id),
    supabase.from('generated_outputs').select('*, job_postings(*)').eq('user_id', user.id),
    supabase.from('token_usage_logs').select('*').eq('user_id', user.id),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    profile: profileRes.data,
    projects: projectsRes.data ?? [],
    skills: skillsRes.data ?? [],
    generated_outputs: outputsRes.data ?? [],
    token_usage_logs: usageRes.data ?? [],
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="proposalforge_export.json"',
    },
  });
}
