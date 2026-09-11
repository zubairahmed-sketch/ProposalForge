'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Skill } from '@/lib/types';
import { SKILL_CATEGORIES, PROFICIENCY_OPTIONS } from '@/lib/types';

const PROF_COLORS: Record<string, string> = {
  expert: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  proficient: 'bg-blue-100 text-blue-800 border-blue-200',
  familiar: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function SkillsManager() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSkill, setNewSkill] = useState('');
  const [newCategory, setNewCategory] = useState<Skill['category']>('frontend');
  const [newProficiency, setNewProficiency] = useState<Skill['proficiency']>('proficient');
  const [adding, setAdding] = useState(false);
  const supabase = createClient();

  async function loadSkills() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('skills').select('*').eq('user_id', user.id).order('category').order('name');
    setSkills(data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadSkills(); }, []);

  async function handleAdd() {
    if (!newSkill.trim()) return;
    setAdding(true);
    const res = await fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSkill.trim(), category: newCategory, proficiency: newProficiency }),
    });
    if (res.ok) {
      toast.success('Skill added');
      setNewSkill('');
      loadSkills();
    } else {
      const err = await res.json();
      toast.error(err.error ?? 'Failed to add skill');
    }
    setAdding(false);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/skills?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Skill removed');
      setSkills((s) => s.filter((sk) => sk.id !== id));
    } else {
      toast.error('Failed to remove skill');
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="h-6 w-6 border-2 border-navy border-t-transparent rounded-full animate-spin" /></div>;
  }

  const grouped = SKILL_CATEGORIES.map((cat) => ({
    ...cat,
    skills: skills.filter((s) => s.category === cat.value),
  }));

  return (
    <div className="space-y-6">
      {/* Add new skill */}
      <div className="flex flex-wrap gap-3 items-end p-4 bg-secondary/50 rounded-lg border border-border/50">
        <div className="flex-1 min-w-[160px] space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Skill Name</label>
          <Input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="e.g. React.js" onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
        </div>
        <div className="w-36 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Category</label>
          <Select value={newCategory} onValueChange={(v) => v && setNewCategory(v as Skill['category'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SKILL_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="w-32 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Proficiency</label>
          <Select value={newProficiency} onValueChange={(v) => v && setNewProficiency(v as Skill['proficiency'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PROFICIENCY_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button onClick={handleAdd} disabled={adding || !newSkill.trim()} className="bg-navy hover:bg-navy-light text-white">
          {adding ? 'Adding…' : 'Add Skill'}
        </Button>
      </div>

      {/* Skills by category */}
      <div className="space-y-5">
        {grouped.map((group) => (
          <div key={group.value} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</h3>
            {group.skills.length === 0 ? (
              <p className="text-sm text-muted-foreground/60 italic">No skills added yet</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {group.skills.map((skill) => (
                  <Badge key={skill.id} variant="outline" className={`${PROF_COLORS[skill.proficiency] ?? ''} pr-1 gap-1.5 text-sm py-1 px-3`}>
                    {skill.name}
                    <span className="text-[10px] opacity-70">({skill.proficiency})</span>
                    <button onClick={() => handleDelete(skill.id)} className="ml-1 opacity-40 hover:opacity-100 hover:text-destructive transition-opacity" aria-label={`Remove ${skill.name}`}>
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
