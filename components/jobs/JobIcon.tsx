import { Briefcase, Terminal, Palette, Layers, Code } from 'lucide-react'
import { getJobIconKind } from '@/lib/job-icon'

interface Props {
  role: string
  tags: string[]
  className?: string
}

/**
 * Renders the icon for a job. Returns JSX directly instead of handing back a
 * component reference for the caller to render, so no caller has to assign a
 * component to a local — the pattern React's `static-components` rule flags.
 */
export function JobIcon({ role, tags, className }: Props) {
  switch (getJobIconKind(role, tags)) {
    case 'design':
      return <Palette className={className} aria-hidden="true" />
    case 'frontend':
      return <Code className={className} aria-hidden="true" />
    case 'backend':
      return <Terminal className={className} aria-hidden="true" />
    case 'infra':
      return <Layers className={className} aria-hidden="true" />
    default:
      return <Briefcase className={className} aria-hidden="true" />
  }
}
