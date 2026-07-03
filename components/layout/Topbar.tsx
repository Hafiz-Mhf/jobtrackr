import Link from 'next/link'

export function Topbar() {
  return (
    <header className="h-[var(--topbar-height)] border-b border-[var(--color-border)] flex items-center justify-between px-6 bg-surface">
      <input
        type="search"
        placeholder="Search jobs..."
        className="text-sm border border-[var(--color-border)] rounded-md px-3 py-1.5 w-64"
      />
      <Link
        href="/jobs/new"
        className="bg-accent text-white text-sm font-semibold px-4 py-1.5 rounded-md"
      >
        Add Job
      </Link>
    </header>
  )
}
