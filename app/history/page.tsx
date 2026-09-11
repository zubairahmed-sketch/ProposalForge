'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/ui/Navbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const OUTPUT_TYPE_LABELS: Record<string, string> = { pph_proposal: 'PPH Proposal', email: 'Email', cover_letter: 'Cover Letter' };
const OUTPUT_TYPE_COLORS: Record<string, string> = { pph_proposal: 'bg-blue-100 text-blue-800', email: 'bg-emerald-100 text-emerald-800', cover_letter: 'bg-purple-100 text-purple-800' };
const BID_COLORS: Record<string, string> = { full_budget: 'text-emerald-700 bg-emerald-50 border-emerald-200', bid_lower: 'text-amber-700 bg-amber-50 border-amber-200', ask_questions: 'text-blue-700 bg-blue-50 border-blue-200' };
const BID_LABELS: Record<string, string> = { full_budget: '✓ Bid Full Budget', bid_lower: '↓ Bid Lower', ask_questions: '? Ask First' };

interface MilestoneItem { title: string; amount: number }
interface Output {
  id: string;
  output_type: string;
  proposal_body: string;
  edited_body: string | null;
  is_edited: boolean;
  version: number;
  created_at: string;
  bid_strategy: string | null;
  bid_strategy_reason: string | null;
  milestone_table: MilestoneItem[] | null;
  context_snapshot: { projects_used: { name: string }[]; skills_used: { name: string }[] };
  job_postings: { id: string; job_title: string | null; raw_text: string; platform: string | null; classified_type: string | null; budget: number | null } | null;
}

export default function HistoryPage() {
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Output | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/outputs');
      if (res.ok) { const data = await res.json(); setOutputs(data); }
      setLoading(false);
    }
    load();
  }, []);

  function selectOutput(o: Output) { setSelected(o); setEditedBody(o.edited_body ?? o.proposal_body); setContextOpen(false); }

  const filtered = outputs.filter((o) => {
    if (filterType !== 'all' && o.output_type !== filterType) return false;
    if (search) {
      const jp = o.job_postings;
      const title = jp?.job_title ?? jp?.raw_text ?? '';
      if (!title.toLowerCase().includes(search.toLowerCase())) return false;
    }
    return true;
  });

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(`/api/outputs/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ edited_body: editedBody }) });
    if (res.ok) { toast.success('Saved'); setSelected((s) => s ? { ...s, edited_body: editedBody, is_edited: true } : s); }
    else toast.error('Failed to save');
    setSaving(false);
  }

  async function handleRegenerate() {
    if (!selected) return;
    setRegenerating(true);
    const res = await fetch(`/api/generate/${selected.id}/regenerate`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      toast.success(`Generated version ${data.output.version}`);
      setOutputs((prev) => [data.output, ...prev]);
      selectOutput(data.output);
    } else toast.error(data.error ?? 'Regeneration failed');
    setRegenerating(false);
  }

  async function handleDelete() {
    if (!selected || !confirm('Delete this output? This cannot be undone.')) return;
    setDeleting(true);
    const res = await fetch(`/api/outputs/${selected.id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Deleted'); setOutputs((prev) => prev.filter((o) => o.id !== selected.id)); setSelected(null); }
    else toast.error('Failed to delete');
    setDeleting(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy">History</h1>
          <p className="text-muted-foreground text-sm mt-1">All your generated proposals, emails, and cover letters.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          {/* LEFT — List */}
          <div className="space-y-3">
            {/* Filters */}
            <div className="flex gap-2">
              <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
              <Select value={filterType} onValueChange={(v) => v && setFilterType(v)}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="pph_proposal">PPH Proposal</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="cover_letter">Cover Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><div className="h-5 w-5 border-2 border-navy border-t-transparent rounded-full animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-12">No outputs found.</p>
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
                {filtered.map((o) => {
                  const jp = o.job_postings;
                  const title = jp?.job_title ?? (jp?.raw_text ?? '').slice(0, 55);
                  const isActive = selected?.id === o.id;
                  return (
                    <button key={o.id} onClick={() => selectOutput(o)} className={`w-full text-left p-3.5 rounded-lg border transition-all ${isActive ? 'border-navy/40 bg-navy/5' : 'border-border/60 bg-card hover:border-navy/20 hover:shadow-sm'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium line-clamp-1">{title || 'Untitled'}</p>
                        <Badge className={`text-[10px] shrink-0 ${OUTPUT_TYPE_COLORS[o.output_type] ?? ''}`}>{OUTPUT_TYPE_LABELS[o.output_type]}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</span>
                        {o.version > 1 && <span className="text-xs text-muted-foreground">v{o.version}</span>}
                        {o.is_edited && <span className="text-xs text-amber-600">edited</span>}
                      </div>
                      <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{(o.edited_body ?? o.proposal_body).slice(0, 100)}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT — Detail */}
          <div>
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-border rounded-xl text-center px-6">
                <p className="text-muted-foreground font-medium">Select an output to view</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Toolbar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={OUTPUT_TYPE_COLORS[selected.output_type] ?? ''}>{OUTPUT_TYPE_LABELS[selected.output_type]}</Badge>
                  {selected.version > 1 && <Badge variant="outline">v{selected.version}</Badge>}
                  {selected.is_edited && <Badge variant="outline" className="text-amber-600 border-amber-200">edited</Badge>}
                  <div className="flex gap-2 ml-auto flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(editedBody); toast.success('Copied!'); }}>Copy</Button>
                    <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating}>
                      {regenerating ? <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" /> : null}
                      Regenerate
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="bg-navy hover:bg-navy-light text-white">{saving ? 'Saving…' : 'Save'}</Button>
                    <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</Button>
                  </div>
                </div>

                {/* Editable body */}
                <div className="bg-card border border-border/60 rounded-xl p-5">
                  <Textarea value={editedBody} onChange={(e) => setEditedBody(e.target.value)} rows={14} className="resize-none text-sm leading-relaxed border-none shadow-none p-0 focus-visible:ring-0" />
                </div>

                {/* Milestone table */}
                {selected.milestone_table && selected.milestone_table.length > 0 && (
                  <div className="bg-card border border-border/60 rounded-xl p-5 space-y-2">
                    <h3 className="font-semibold text-sm">Milestones</h3>
                    <div className="divide-y divide-border/50">
                      {selected.milestone_table.map((m, i) => (
                        <div key={i} className="flex justify-between py-2 text-sm"><span>{m.title}</span><span className="font-semibold text-navy">£{m.amount}</span></div>
                      ))}
                      <div className="flex justify-between py-2 text-sm font-bold">
                        <span>Total</span><span className="text-navy">£{selected.milestone_table.reduce((s, m) => s + m.amount, 0)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bid strategy */}
                {selected.bid_strategy && (
                  <div className={`rounded-xl border p-4 text-sm ${BID_COLORS[selected.bid_strategy] ?? ''}`}>
                    <span className="font-semibold">{BID_LABELS[selected.bid_strategy]}</span>
                    <p className="mt-1 opacity-80">{selected.bid_strategy_reason}</p>
                  </div>
                )}

                {/* Context panel */}
                <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
                  <button className="w-full flex items-center justify-between p-4 text-sm font-semibold" onClick={() => setContextOpen(!contextOpen)}>
                    <span>Context Used ({selected.context_snapshot.projects_used.length} projects, {selected.context_snapshot.skills_used.length} skills)</span>
                    <svg className={`h-4 w-4 transition-transform ${contextOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                  </button>
                  {contextOpen && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border/50">
                      <div className="space-y-1 pt-3">
                        <p className="text-xs font-medium text-muted-foreground">Projects referenced</p>
                        {selected.context_snapshot.projects_used.map((p) => <div key={p.name} className="text-xs text-foreground/70 pl-2 border-l-2 border-navy/20">{p.name}</div>)}
                      </div>
                      <Separator />
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Skills included</p>
                        <div className="flex flex-wrap gap-1">
                          {selected.context_snapshot.skills_used.map((s) => <span key={s.name} className="text-xs bg-secondary px-2 py-0.5 rounded">{s.name}</span>)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
