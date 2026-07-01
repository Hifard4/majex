// Force the entire /dashboard route to be dynamic (server-rendered per request)
// so it never tries to prerender without env vars at build time.
export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
