'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/components/ui/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');
  const router = useRouter();
  const supabase = createClient();

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/settings/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'proposalforge_export.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch {
      toast.error('Export failed');
    }
    setExporting(false);
  }

  async function handleDeleteAccount() {
    if (confirmDelete !== 'DELETE') {
      toast.error('Type DELETE to confirm');
      return;
    }
    setDeleting(true);
    try {
      // Sign out first, then user can contact support to fully delete
      // (Supabase admin deletion requires service role — best done server-side)
      const res = await fetch('/api/settings/delete-account', { method: 'POST' });
      if (res.ok) {
        await supabase.auth.signOut();
        toast.success('Account deleted');
        router.push('/login');
      } else {
        // Fallback: just sign out and clear data
        await supabase.auth.signOut();
        toast.success('Signed out. Contact support to fully remove your data.');
        router.push('/login');
      }
    } catch {
      toast.error('Failed to delete account');
    }
    setDeleting(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your account and data.</p>
        </div>

        <div className="space-y-5">
          {/* Account */}
          <Card className="border-border/60">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-base">Account</h2>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Sign Out</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sign out of your account on this device.</p>
                </div>
                <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Export */}
          <Card className="border-border/60">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-base">Export Data</h2>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Download All Data</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Export your profile, projects, skills, and all generated outputs as a JSON file.</p>
                </div>
                <Button variant="outline" onClick={handleExport} disabled={exporting}>
                  {exporting ? (
                    <><span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />Exporting…</>
                  ) : (
                    <><svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>Export JSON</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/40">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-base text-destructive">Danger Zone</h2>
              <Separator className="bg-destructive/20" />
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Delete Account</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Permanently delete your account and all associated data. This action cannot be undone.</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm:</p>
                  <input
                    type="text"
                    value={confirmDelete}
                    onChange={(e) => setConfirmDelete(e.target.value)}
                    placeholder="DELETE"
                    className="w-full h-10 px-3 rounded-md border border-destructive/40 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30"
                  />
                  <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting || confirmDelete !== 'DELETE'} className="w-full">
                    {deleting ? 'Deleting…' : 'Delete My Account'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
