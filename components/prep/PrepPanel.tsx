'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shuffle } from 'lucide-react'
import { getPrepQuestions } from '@/lib/interview-questions'
import { stagger } from '@/lib/animations'
import { QuestionCard } from './QuestionCard'
import type { InterviewQuestion } from '@/types'

interface Props {
  tags: string[]
}

const CATEGORY_LABELS: Record<InterviewQuestion['category'], string> = {
  technical: 'Technical',
  behavioral: 'Behavioral',
  company: 'Company',
  rolefit: 'Role Fit',
}

export function PrepPanel({ tags }: Props) {
  const [shuffleKey, setShuffleKey] = useState(0)
  const questions = getPrepQuestions(tags, shuffleKey)
  const grouped = questions.reduce<Record<string, InterviewQuestion[]>>((acc, q) => {
    (acc[q.category] ??= []).push(q)
    return acc
  }, {})

  return (
    <div className="bg-surface border border-[var(--color-border)] border-t-4 border-t-[color:var(--color-accent)] rounded-xl p-6">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h2 className="text-lg font-semibold">Interview Prep</h2>
        <button
          type="button"
          onClick={() => setShuffleKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline shrink-0"
        >
          <Shuffle className="size-3.5" />
          Shuffle
        </button>
      </div>
      {tags.length > 0 && (
        <p className="text-xs text-brand-muted font-mono mb-4">Matched to: {tags.join(' · ')}</p>
      )}
      {/* re-key on shuffle so the stagger replays on each new subset */}
      <motion.div key={shuffleKey} initial="hidden" animate="visible" variants={stagger()}>
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-muted mb-2">
              {CATEGORY_LABELS[category as InterviewQuestion['category']]}
            </h3>
            {items.map((q, i) => (
              <QuestionCard key={i} question={q} />
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  )
}
