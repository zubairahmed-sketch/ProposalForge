// Force dynamic rendering — prevents static prerendering that fails
// because Supabase env vars aren't available at build time
export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
