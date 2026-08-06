import { Board } from '@/components/kanban/Board'
import { StatsBar } from '@/components/dashboard/StatsBar'

export default function DashboardPage() {
  return (
    <>
      {/* The page's real h1. The sidebar wordmark is branding, not page content,
          so the heading chain starts here: h1 → column h2 → card h3. */}
      <h1 className="sr-only">Job pipeline</h1>
      <StatsBar />
      <Board />
    </>
  )
}
