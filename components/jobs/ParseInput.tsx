'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Sparkles, ChevronRight, FileText } from 'lucide-react'
import { useParser } from '@/hooks/useParser'
import { useTags } from '@/contexts/TagsProvider'
import { stagger, fadeUp } from '@/lib/animations'
import type { ParsedJob } from '@/types'

interface Props {
  onParsed: (parsed: ParsedJob) => void
  onManual: () => void
}

export function ParseInput({ onParsed, onManual }: Props) {
  const [text, setText] = useState('')
  const { result, parse } = useParser()
  const { customTags } = useTags()

  function handleExtract() {
    const parsed = parse(text, customTags)
    if (!parsed) return
    const fieldsFound = [
      parsed.company !== 'Unknown Company',
      Boolean(parsed.role),
      Boolean(parsed.salary_range),
      Boolean(parsed.location),
      parsed.tags.length > 0,
    ].filter(Boolean).length
    if (fieldsFound >= 4) {
      toast.success('Details extracted — review and confirm')
    } else if (fieldsFound > 0) {
      toast.warning("Some fields couldn't be detected — fill them in below")
    } else {
      toast.error("Couldn't extract details. Fill in the fields manually.", { duration: Infinity })
    }
    onParsed(parsed)
  }

  const fields = result
    ? [
        result.company,
        result.role,
        [result.salary_range, result.location].filter(Boolean).join(' · '),
        result.tags.join(', '),
      ].filter(Boolean)
    : []

  return (
    <div className="bg-surface border border-[var(--color-border)] rounded-2xl p-6 md:p-8 space-y-6 shadow-card transition-all duration-300 hover:shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="font-semibold text-brand-text flex items-center gap-2 text-sm md:text-base" htmlFor="jd-input">
          <FileText className="size-4 text-accent" />
          Job Description
        </label>
        <span className="text-[10px] text-brand-muted px-2 py-1 bg-surface-muted rounded-md uppercase tracking-wider font-semibold">
          Supports LinkedIn, Indeed, Glassdoor
        </span>
      </div>

      <div className="relative group">
        <textarea
          id="jd-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste the job description text or link here... More text means better automatic extraction."
          className="w-full min-h-[320px] p-6 bg-surface border border-[var(--color-border)] rounded-xl focus:ring-4 focus:ring-accent/5 focus:border-accent focus:outline-none transition-all duration-300 resize-none font-sans text-sm leading-relaxed text-brand-text placeholder:text-text-muted"
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={onManual}
          className="text-accent font-semibold text-sm hover:underline flex items-center gap-1 group w-full sm:w-auto"
        >
          Fill details manually
          <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          type="button"
          onClick={handleExtract}
          disabled={!text.trim()}
          className="w-full sm:w-auto px-6 py-3.5 bg-accent text-white font-semibold text-sm rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-2"
        >
          <Sparkles className="size-4" />
          Extract Job Details
        </button>
      </div>

      {result && (
        <motion.div initial="hidden" animate="visible" variants={stagger()} className="mt-6 border-t border-[var(--color-border)] pt-4 space-y-1">
          {fields.length === 0 && (
            <p className="text-sm text-[var(--color-saved)]">
              Couldn&apos;t extract details. Fill in the fields manually below.
            </p>
          )}
          {fields.map((field, i) => (
            <motion.p key={i} variants={fadeUp} className="text-sm">
              ✓ {field}
            </motion.p>
          ))}
        </motion.div>
      )}
    </div>
  )
}
