'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/components/ui/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { GeneratedOutput, TokenUsageLog } from '@/lib/types';

const OUTPUT_TYPE_LABELS: Record<string, string> = {
  pph_proposal: 'PPH Proposal',
  email: 'Email',
  cover_letter: 'Cover Letter',
};

const OUTPUT_TYPE_COLORS: Record<string, string> = {
  pph_proposal: 'bg-blue-100 text-blue-800',
  email: 'bg-emerald-100 text-emerald-800',
  cover_letter: 'bg-purple-100 text-purple-800',
};

function groupTokensByDay(logs: TokenUsageLog[]) {
  const map: Record<string, number> = {};
  for (const log of logs) {
    const day = log.created_at.slice(0, 10);
    map[day] = (map[day] ?? 0) + log.tokens_used;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14) // last 14 days
    .map(([date, tokens]) => ({ date: date.slice(5), tokens }));
}

export default function DashboardPage() {
  const [outputs, setOutputs] = useState<GeneratedOutput[]>([]);
  const [usageLogs, setUsageLogs] = useState<TokenUsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [outputsRes, usageRes, profileRes] = await Promise.all([
        supabase.from('generated_outputs').select('*, job_postings(job_title, platform, raw_text)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('token_usage_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('full_name').eq('user_id', user.id).single(),
      ]);

      setOutputs((outputsRes.data ?? []) as GeneratedOutput[]);
      setUsageLogs((usageRes.data ?? []) as TokenUsageLog[]);
      setUserName(profileRes.data?.full_name ?? '');
      setLoading(false);
    }
    load();
  }, [supabase]);

  const totalTokens = usageLogs.reduce((sum, l) => sum + l.tokens_used, 0);
  const thisWeekOutputs = outputs.filter((o) => {
    const d = new Date(o.created_at);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });
  const chartData = groupTokensByDay(usageLogs);
  // GPT-4o-mini: ~$0.15 per 1M input tokens, $0.60 per 1M output tokens. Rough avg $0.30/1M
  const estimatedCost = (totalTokens / 1_000_000) * 0.30;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8 pb-24 md:pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-navy">
              {userName ? `Welcome back, ${userName.split(' ')[0]}` : 'Dashboard'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Ready to generate your next proposal?</p>
          </div>
          <Link href="/generate">
            <Button className="bg-navy hover:bg-navy-light text-white gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
              </svg>
              Generate New
            </Button>
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Outputs', value: loading ? '—' : outputs.length.toString(), sub: 'all time' },
            { label: 'This Week', value: loading ? '—' : thisWeekOutputs.length.toString(), sub: 'generated' },
            { label: 'Est. Cost', value: loading ? '—' : `$${estimatedCost.toFixed(3)}`, sub: `${totalTokens.toLocaleString()} tokens` },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/60">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold text-navy mt-1">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Outputs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Recent Outputs</h2>
              <Link href="/history" className="text-xs text-navy hover:underline">View all →</Link>
            </div>
            {loading ? (
              <div className="flex justify-center py-8"><div className="h-5 w-5 border-2 border-navy border-t-transparent rounded-full animate-spin" /></div>
            ) : outputs.length === 0 ? (
              <Card className="border-dashed border-border">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-muted-foreground text-sm">No outputs yet.</p>
                  <Link href="/generate"><Button variant="link" className="text-navy text-sm mt-1">Generate your first proposal →</Button></Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {outputs.map((o) => {
                  const jp = (o as any).job_postings;
                  const title = jp?.job_title ?? (jp?.raw_text ?? '').slice(0, 55) + '…';
                  return (
                    <Link href={`/history?id=${o.id}`} key={o.id}>
                      <Card className="border-border/60 hover:border-navy/30 hover:shadow-sm transition-all cursor-pointer">
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{new Date(o.created_at).toLocaleDateString()}</p>
                          </div>
                          <Badge className={`text-xs shrink-0 ${OUTPUT_TYPE_COLORS[o.output_type] ?? ''}`}>
                            {OUTPUT_TYPE_LABELS[o.output_type]}
                          </Badge>
                          <button
                            onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(o.edited_body ?? o.proposal_body); }}
                            className="shrink-0 p-1.5 rounded text-muted-foreground hover:text-navy hover:bg-accent transition-colors"
                            title="Copy"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                            </svg>
                          </button>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Token Usage Chart */}
          <div className="space-y-3">
            <h2 className="font-semibold text-foreground">Token Usage (last 14 days)</h2>
            <Card className="border-border/60">
              <CardContent className="p-5">
                {chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">No usage data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1E3A5F" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#1E3A5F" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Area type="monotone" dataKey="tokens" stroke="#1E3A5F" strokeWidth={2} fill="url(#tokenGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
