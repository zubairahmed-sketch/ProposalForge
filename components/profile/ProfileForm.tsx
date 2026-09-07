'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { Profile } from '@/lib/types';
import { TONE_OPTIONS } from '@/lib/types';

export default function ProfileForm() {
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      if (data) setProfile(data);
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (res.ok) {
      toast.success('Profile saved');
    } else {
      const err = await res.json();
      toast.error(err.error ?? 'Failed to save profile');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name</Label>
          <Input id="full_name" value={profile.full_name ?? ''} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder="John Doe" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={profile.email ?? ''} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="john@example.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={profile.phone ?? ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+44 7700 900000" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" value={profile.location ?? ''} onChange={(e) => setProfile({ ...profile, location: e.target.value })} placeholder="London, UK" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="linkedin_url">LinkedIn URL</Label>
          <Input id="linkedin_url" value={profile.linkedin_url ?? ''} onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="github_url">GitHub URL</Label>
          <Input id="github_url" value={profile.github_url ?? ''} onChange={(e) => setProfile({ ...profile, github_url: e.target.value })} placeholder="https://github.com/..." />
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="summary">Professional Summary</Label>
        <Textarea id="summary" rows={4} value={profile.summary ?? ''} onChange={(e) => setProfile({ ...profile, summary: e.target.value })} placeholder="A brief professional summary describing your experience and what you do..." className="resize-none" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-2">
          <Label htmlFor="experience_years_dev">Dev Experience (years)</Label>
          <Input id="experience_years_dev" type="number" min={0} value={profile.experience_years_dev ?? ''} onChange={(e) => setProfile({ ...profile, experience_years_dev: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="experience_years_ai">AI/ML Experience (years)</Label>
          <Input id="experience_years_ai" type="number" min={0} value={profile.experience_years_ai ?? ''} onChange={(e) => setProfile({ ...profile, experience_years_ai: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tone_preference">Tone Preference</Label>
          <Select value={profile.tone_preference ?? 'professional_friendly'} onValueChange={(v) => setProfile({ ...profile, tone_preference: v as Profile['tone_preference'] })}>
            <SelectTrigger id="tone_preference"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TONE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">PeoplePerHour Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label htmlFor="pph_title">PPH Headline</Label>
            <Input id="pph_title" value={profile.pph_title ?? ''} onChange={(e) => setProfile({ ...profile, pph_title: e.target.value })} placeholder="Full Stack Developer | AI Specialist" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pph_about">PPH About Section</Label>
          <Textarea id="pph_about" rows={3} value={profile.pph_about ?? ''} onChange={(e) => setProfile({ ...profile, pph_about: e.target.value })} placeholder="Your PeoplePerHour profile about section..." className="resize-none" />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={saving} className="bg-navy hover:bg-navy-light text-white px-8">
          {saving ? 'Saving…' : 'Save Profile'}
        </Button>
      </div>
    </form>
  );
}
