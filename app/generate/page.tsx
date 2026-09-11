'use client';

import { useState } from 'react';
import Navbar from '@/components/ui/Navbar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

type JobType = 'fullstack' | 'ai' | 'mobile' | 'hybrid';
type OutputType = 'pph_proposal' | 'email' | 'cover_letter';
type BidStrategy = 'full_budget' | 'bid_lower' | 'ask_questions';

interface Classification {
  job_type: JobType;
  output_suggestion: OutputType;
  key_requirements: string[];
  budget: number | null;
  platform_detected: string | null;
}

interface JobPosting {
  id: string;
  classified_type: JobType;
  key_requirements: string[];
  budget: number | null;
}

interface MilestoneItem { title: string; amount: number }

interface GeneratedResult {
  id: string;
  proposal_body: string;
  milestone_table: MilestoneItem[] | null;
  bid_strategy: BidStrategy | null;
  bid_strategy_reason: string | null;
  context_snapshot: {
    projects_used: { name: string; description: string }[];
    skills_used: { name: string; category: string }[];
  };
}

const TYPE_LABELS: Record<string, string> = { fullstack: 'Full Stack', ai: 'AI / ML', mobile: 'Mobile', hybrid: 'Hybrid' };
const TYPE_COLORS: Record<string, string> = { fullstack: 'bg-blue-100 text-blue-800', ai: 'bg-purple-100 text-purple-800', mobile: 'bg-green-100 text-green-800', hybrid: 'bg-amber-100 text-amber-800' };
const BID_COLORS: Record<string, string> = { full_budget: 'text-emerald-700 bg-emerald-50 border-emerald-200', bid_lower: 'text-amber-700 bg-amber-50 border-amber-200', ask_questions: 'text-blue-700 bg-blue-50 border-blue-200' };
const BID_LABELS: Record<string, string> = { full_budget: '✓ Bid Full Budget', bid_lower: '↓ Bid Lower', ask_questions: '? Ask First' };

export default function GeneratePage() {
  const [rawText, setRawText] = useState('');
  const [platform, setPlatform] = useState<string>('other');
  const [jobTitle, setJobTitle] = useState('');
  const [classifying, setClassifying] = useState(false);
  const [classification, setClassification] = useState<Classification | null>(null);
  const [jobPosting, setJobPosting] = useState<JobPosting | null>(null);
  const [jobTypeOverride, setJobTypeOverride] = useState<JobType | null>(null);
  const [outputType, setOutputType] = useState<OutputType>('pph_proposal');
  const [budget, setBudget] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [editedBody, setEditedBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);

  async function handleAnalyse() {
    if (!rawText.trim()) { toast.error('Paste a job posting first'); return; }
    setClassifying(true);
    setClassification(null);
    setResult(null);
    try {
      const res = await fetch('/api/generate/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: rawText, platform: platform || null, job_title: jobTitle || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Classification failed');
      setClassification(data.classification);
      setJobPosting(data.job_posting);
      setOutputType(data.classification.output_suggestion);
      setJobTypeOverride(null);
      if (data.classification.budget) setBudget(String(data.classification.budget));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to classify');
    }
    setClassifying(false);
  }

  async function handleGenerate() {
    if (!jobPosting) return;
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch('/api/generate/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_posting_id: jobPosting.id,
          output_type: outputType,
          job_type_override: jobTypeOverride ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setResult(data.output);
      setEditedBody(data.output.proposal_body);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate');
    }
    setGenerating(false);
  }

  async function handleSaveEdit() {
    if (!result) return;
    setSaving(true);
    const res = await fetch(`/api/outputs/${result.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edited_body: editedBody }),
    });
    if (res.ok) toast.success('Edits saved');
    else toast.error('Failed to save edits');
    setSaving(false);
  }

  async function handleRegenerate() {
    if (!result) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/generate/${result.id}/regenerate`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Regeneration failed');
      setResult(data.output);
      setEditedBody(data.output.proposal_body);
      toast.success(`Generated version ${data.output.version}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to regenerate');
    }
    setRegenerating(false);
  }

  const activeJobType = jobTypeOverride ?? classification?.job_type;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy">Generate Proposal</h1>
          <p className="text-muted-foreground text-sm mt-1">Paste a job posting to get a tailored, human-sounding proposal in seconds.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT — Input & Controls */}
          <div className="space-y-4">
            {/* Step 1 */}
            <div className="bg-card border border-border/60 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-navy">
                <span className="h-5 w-5 rounded-full bg-navy text-white flex items-center justify-center text-xs">1</span>
                Paste Job Posting
              </div>
              <div className="space-y-2">
                <Label htmlFor="job_title">Job Title (optional)</Label>
                <Input id="job_title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Full Stack Developer" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger id="platform"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="peopleperhour">PeoplePerHour</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="email">Email / Direct</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="raw_text">Job Posting Text *</Label>
                <Textarea
                  id="raw_text"
                  rows={10}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste the full job posting or freelance brief here…"
                  className="resize-none font-mono text-xs"
                />
              </div>
              <Button onClick={handleAnalyse} disabled={classifying || !rawText.trim()} className="w-full bg-navy hover:bg-navy-light text-white">
                {classifying ? <><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Analysing…</> : 'Analyse Posting'}
              </Button>
            </div>

            {/* Step 2 — after classification */}
            {classification && (
              <div className="bg-card border border-border/60 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-navy">
                  <span className="h-5 w-5 rounded-full bg-navy text-white flex items-center justify-center text-xs">2</span>
                  Review &amp; Configure
                </div>

                {/* Classification badge */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-muted-foreground">Classified as:</span>
                  <Badge className={`${TYPE_COLORS[activeJobType ?? 'fullstack']}`}>
                    {TYPE_LABELS[activeJobType ?? 'fullstack']}
                  </Badge>
                  <Select value={jobTypeOverride ?? classification.job_type} onValueChange={(v) => setJobTypeOverride(v as JobType)}>
                    <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Key requirements */}
                {classification.key_requirements.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Extracted Requirements</p>
                    <ul className="text-sm space-y-0.5">
                      {classification.key_requirements.map((r, i) => (
                        <li key={i} className="flex gap-2"><span className="text-navy mt-0.5">•</span>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Output type */}
                <div className="space-y-2">
                  <Label htmlFor="output_type">Output Type</Label>
                  <Select value={outputType} onValueChange={(v) => setOutputType(v as OutputType)}>
                    <SelectTrigger id="output_type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pph_proposal">PPH Proposal</SelectItem>
                      <SelectItem value="email">Application Email</SelectItem>
                      <SelectItem value="cover_letter">Cover Letter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Budget — shown for PPH */}
                {outputType === 'pph_proposal' && (
                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget (£, optional)</Label>
                    <Input id="budget" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. 500" />
                  </div>
                )}

                <Button onClick={handleGenerate} disabled={generating} className="w-full bg-navy hover:bg-navy-light text-white">
                  {generating ? <><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Generating…</> : 'Generate'}
                </Button>
              </div>
            )}
          </div>

          {/* RIGHT — Output */}
          <div className="space-y-4">
            {!result && !generating && (
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-xl text-center px-6">
                <svg className="h-10 w-10 text-muted-foreground/30 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <p className="text-muted-foreground font-medium">Your proposal will appear here</p>
                <p className="text-muted-foreground/60 text-sm mt-1">Paste a job posting and click Analyse to get started.</p>
              </div>
            )}

            {generating && (
              <div className="flex flex-col items-center justify-center h-64 border border-border/60 rounded-xl bg-card">
                <div className="h-8 w-8 border-2 border-navy border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Generating your proposal…</p>
              </div>
            )}

            {result && (
              <>
                {/* Output toolbar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{result.id ? `v${(result as any).version ?? 1}` : ''}</Badge>
                  <div className="flex gap-2 ml-auto">
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(editedBody); toast.success('Copied!'); }}>
                      <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>
                      Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating}>
                      {regenerating ? <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" /> : <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>}
                      Regenerate
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={saving} className="bg-navy hover:bg-navy-light text-white">
                      {saving ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </div>

                {/* Editable proposal */}
                <div className="bg-card border border-border/60 rounded-xl p-5">
                  <Textarea
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    rows={16}
                    className="resize-none text-sm leading-relaxed font-mono border-none shadow-none p-0 focus-visible:ring-0"
                  />
                </div>

                {/* Milestone table */}
                {result.milestone_table && result.milestone_table.length > 0 && (
                  <div className="bg-card border border-border/60 rounded-xl p-5 space-y-3">
                    <h3 className="font-semibold text-sm">Milestone Breakdown</h3>
                    <div className="divide-y divide-border/50">
                      {result.milestone_table.map((m, i) => (
                        <div key={i} className="flex justify-between py-2 text-sm">
                          <span>{m.title}</span>
                          <span className="font-semibold text-navy">£{m.amount}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2 text-sm font-bold">
                        <span>Total</span>
                        <span className="text-navy">£{result.milestone_table.reduce((s, m) => s + m.amount, 0)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bid strategy */}
                {result.bid_strategy && (
                  <div className={`rounded-xl border p-4 text-sm ${BID_COLORS[result.bid_strategy]}`}>
                    <span className="font-semibold">{BID_LABELS[result.bid_strategy]}</span>
                    <p className="mt-1 opacity-80">{result.bid_strategy_reason}</p>
                  </div>
                )}

                {/* Context panel */}
                <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
                  <button className="w-full flex items-center justify-between p-4 text-sm font-semibold text-left" onClick={() => setContextOpen(!contextOpen)}>
                    <span>Context Used ({result.context_snapshot.projects_used.length} projects, {result.context_snapshot.skills_used.length} skills)</span>
                    <svg className={`h-4 w-4 transition-transform ${contextOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                  </button>
                  {contextOpen && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border/50">
                      <div className="space-y-1 pt-3">
                        <p className="text-xs font-medium text-muted-foreground">Projects referenced</p>
                        {result.context_snapshot.projects_used.map((p) => (
                          <div key={p.name} className="text-xs text-foreground/70 pl-2 border-l-2 border-navy/20">{p.name}</div>
                        ))}
                      </div>
                      <Separator />
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Skills included</p>
                        <div className="flex flex-wrap gap-1">
                          {result.context_snapshot.skills_used.map((s) => (
                            <span key={s.name} className="text-xs bg-secondary px-2 py-0.5 rounded">{s.name}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
