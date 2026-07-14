'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-lg bg-surface-muted/80 skeleton-shimmer',
        className
      )}
      aria-hidden="true"
    />
  )
}

/* ── Board Skeleton ── */
function ColumnSkeleton() {
  return (
    <div className="flex-1 min-w-[240px] max-w-[285px] min-h-[500px] flex flex-col bg-surface-muted/50 border border-[var(--color-border)] rounded-2xl p-3">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-5 w-7 rounded-md" />
      </div>
      {/* Fake cards */}
      <div className="flex-1 flex flex-col gap-2.5">
        <div className="bg-surface border border-[var(--color-border)] rounded-2xl p-3 space-y-3">
          <div className="flex gap-2.5">
            <Skeleton className="w-8 h-8 rounded shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-4 w-10 rounded" />
          </div>
        </div>
        <div className="bg-surface border border-[var(--color-border)] rounded-2xl p-3 space-y-3 opacity-60">
          <div className="flex gap-2.5">
            <Skeleton className="w-8 h-8 rounded shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-2.5 w-2/5" />
            </div>
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-4 w-12 rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function BoardSkeleton() {
  return (
    <div className="flex gap-3 p-6 pt-4 items-start min-h-[calc(100vh-var(--topbar-height)-110px)] overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <ColumnSkeleton key={i} />
      ))}
    </div>
  )
}

/* ── StatsBar Skeleton ── */
export function StatsBarSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 pt-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-surface border border-[var(--color-border)] rounded-xl px-4 py-3 space-y-2"
        >
          <div className="flex items-center gap-1.5">
            <Skeleton className="size-1.5 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex items-baseline justify-between">
            <Skeleton className="h-6 w-8" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Job List Skeleton ── */
export function JobListSkeleton() {
  return (
    <div className="p-6 max-w-max-content-width mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="pb-4 border-b border-[var(--color-border)]">
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
      {/* Filter bar */}
      <div className="bg-surface border border-[var(--color-border)] rounded-2xl p-4 space-y-3">
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-xl" />
          ))}
        </div>
      </div>
      {/* List items */}
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface border border-[var(--color-border)] rounded-2xl p-5 flex items-start gap-4"
            style={{ opacity: 1 - i * 0.2 }}
          >
            <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3.5 w-1/3" />
              <div className="flex gap-1.5 pt-1">
                <Skeleton className="h-4 w-14 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
              </div>
            </div>
            <Skeleton className="h-3 w-24 self-center" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Job Detail Skeleton ── */
export function JobDetailSkeleton() {
  return (
    <div className="p-6 max-w-max-content-width mx-auto flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--color-border)]">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="h-3 w-32" />
      </div>
      {/* Header card */}
      <div className="bg-surface border border-[var(--color-border)] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>
      {/* Body grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-surface border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
            <Skeleton className="h-5 w-36" />
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
              <Skeleton className="h-3.5 w-4/6" />
            </div>
          </div>
        </div>
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-surface border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
            <Skeleton className="h-4 w-28" />
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
