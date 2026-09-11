'use client';

import { useState, useEffect, useCallback, type KeyboardEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { Project, ProjectCreateInput } from '@/lib/types';
import { PROJECT_TYPES } from '@/lib/types';

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProject: Project | null;
  onSaved: () => void;
}

const EMPTY: ProjectCreateInput = {
  name: '',
  description: '',
  tech_stack: [],
  project_type: 'fullstack',
  highlights: [],
  live_url: '',
  github_url: '',
  display_order: 0,
  is_active: true,
};

export default function ProjectForm({ open, onOpenChange, editingProject, onSaved }: ProjectFormProps) {
  const [form, setForm] = useState<ProjectCreateInput>(EMPTY);
  const [tagInput, setTagInput] = useState('');
  const [highlightsText, setHighlightsText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingProject) {
      setForm({
        name: editingProject.name,
        description: editingProject.description,
        tech_stack: editingProject.tech_stack ?? [],
        project_type: editingProject.project_type,
        highlights: editingProject.highlights ?? [],
        live_url: editingProject.live_url ?? '',
        github_url: editingProject.github_url ?? '',
        display_order: editingProject.display_order ?? 0,
        is_active: editingProject.is_active ?? true,
      });
      setHighlightsText((editingProject.highlights ?? []).join('\n'));
    } else {
      setForm(EMPTY);
      setHighlightsText('');
    }
    setTagInput('');
  }, [editingProject, open]);

  const addTag = useCallback(() => {
    const tag = tagInput.trim();
    if (tag && !form.tech_stack.includes(tag)) {
      setForm((f) => ({ ...f, tech_stack: [...f.tech_stack, tag] }));
    }
    setTagInput('');
  }, [tagInput, form.tech_stack]);

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  }

  function removeTag(tag: string) {
    setForm((f) => ({ ...f, tech_stack: f.tech_stack.filter((t) => t !== tag) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...form,
      highlights: highlightsText.split('\n').map((h) => h.trim()).filter(Boolean),
      live_url: form.live_url || null,
      github_url: form.github_url || null,
    };

    const url = editingProject ? `/api/projects/${editingProject.id}` : '/api/projects';
    const method = editingProject ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success(editingProject ? 'Project updated' : 'Project added');
      onOpenChange(false);
      onSaved();
    } else {
      const err = await res.json();
      toast.error(err.error ?? 'Failed to save project');
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingProject ? 'Edit Project' : 'Add Project'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="proj-name">Project Name *</Label>
            <Input id="proj-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proj-desc">Description *</Label>
            <Textarea id="proj-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="resize-none" />
          </div>
          <div className="space-y-2">
            <Label>Tech Stack</Label>
            <div className="flex gap-2">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="Type and press Enter" className="flex-1" />
              <Button type="button" variant="secondary" onClick={addTag} className="shrink-0">Add</Button>
            </div>
            {form.tech_stack.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.tech_stack.map((tag) => (
                  <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-md flex items-center gap-1">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="text-muted-foreground hover:text-destructive">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="proj-type">Project Type *</Label>
            <Select value={form.project_type} onValueChange={(v) => v && setForm({ ...form, project_type: v as ProjectCreateInput['project_type'] })}>
              <SelectTrigger id="proj-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="proj-highlights">Highlights (one per line)</Label>
            <Textarea id="proj-highlights" rows={3} value={highlightsText} onChange={(e) => setHighlightsText(e.target.value)} placeholder="Key achievement 1&#10;Key achievement 2" className="resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="proj-live">Live URL</Label>
              <Input id="proj-live" value={form.live_url ?? ''} onChange={(e) => setForm({ ...form, live_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proj-gh">GitHub URL</Label>
              <Input id="proj-gh" value={form.github_url ?? ''} onChange={(e) => setForm({ ...form, github_url: e.target.value })} placeholder="https://github.com/..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="proj-order">Display Order</Label>
              <Input id="proj-order" type="number" value={form.display_order ?? 0} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch id="proj-active" checked={form.is_active ?? true} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
              <Label htmlFor="proj-active">Active</Label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-navy hover:bg-navy-light text-white">
              {saving ? 'Saving…' : editingProject ? 'Update' : 'Add Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
