import { Board } from '@/components/kanban/Board'
import { StatsBar } from '@/components/dashboard/StatsBar'

export default function DashboardPage() {
  return (
    <>
      <StatsBar />
      <Board />
    </>
  )
}
