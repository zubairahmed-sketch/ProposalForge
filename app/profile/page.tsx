'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfileForm from '@/components/profile/ProfileForm';
import ProjectCard from '@/components/profile/ProjectCard';
import ProjectForm from '@/components/profile/ProjectForm';
import SkillsManager from '@/components/profile/SkillsManager';
import Navbar from '@/components/ui/Navbar';
import { toast } from 'sonner';
import type { Project } from '@/lib/types';

export default function ProfilePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const supabase = createClient();

  const loadProjects = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order')
      .order('created_at', { ascending: false });
    setProjects(data ?? []);
    setLoadingProjects(false);
  }, [supabase]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  function handleEdit(project: Project) {
    setEditingProject(project);
    setDialogOpen(true);
  }

  function handleAddNew() {
    setEditingProject(null);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this project?')) return;
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Project deleted');
      loadProjects();
    } else {
      toast.error('Failed to delete project');
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy">Your Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your CV, projects, and skills — the generator draws from this.</p>
        </div>

        <Tabs defaultValue="personal">
          <TabsList className="mb-6">
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <div className="bg-card border border-border/60 rounded-xl p-6">
              <ProfileForm />
            </div>
          </TabsContent>

          <TabsContent value="projects">
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={handleAddNew} className="bg-navy hover:bg-navy-light text-white">
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add Project
                </Button>
              </div>
              {loadingProjects ? (
                <div className="flex justify-center py-12">
                  <div className="h-6 w-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
                  <svg className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006-3.75 3.75M3.75 14.15V9.706c0-1.08.768-2.014 1.837-2.174a48.083 48.083 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
                  </svg>
                  <p className="text-muted-foreground font-medium">No projects yet</p>
                  <p className="text-muted-foreground/60 text-sm mt-1">Add your first project to start generating tailored proposals.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((p) => (
                    <ProjectCard key={p.id} project={p} onEdit={handleEdit} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </div>
            <ProjectForm
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              editingProject={editingProject}
              onSaved={loadProjects}
            />
          </TabsContent>

          <TabsContent value="skills">
            <div className="bg-card border border-border/60 rounded-xl p-6">
              <SkillsManager />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
