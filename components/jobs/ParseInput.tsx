'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useParser } from '@/hooks/useParser'
import { stagger, fadeUp } from '@/lib/animations'
import type { ParsedJob } from '@/types'

interface Props {
  onParsed: (parsed: ParsedJob) => void
  onManual: () => void
}

export function ParseInput({ onParsed, onManual }: Props) {
  const [text, setText] = useState('')
  const { result, parse } = useParser()

  function handleExtract() {
    const parsed = parse(text)
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
    <div className="bg-surface border border-[var(--color-border)] rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-3">Paste a job description</h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder={'Senior Frontend Engineer at Stripe...\n\nPaste the full job description for best results — more text means better extraction.'}
        className="w-full border border-[var(--color-border)] rounded-md p-3 text-sm font-mono"
      />
      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={handleExtract}
          disabled={!text.trim()}
          className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50"
        >
          Extract Details
        </button>
        <button type="button" onClick={onManual} className="text-sm text-brand-muted underline">
          Fill manually
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
