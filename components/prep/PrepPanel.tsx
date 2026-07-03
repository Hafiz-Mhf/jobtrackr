'use client'

import { motion } from 'framer-motion'
import { getQuestionsForJob } from '@/lib/interview-questions'
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
  const questions = getQuestionsForJob(tags)
  const grouped = questions.reduce<Record<string, InterviewQuestion[]>>((acc, q) => {
    (acc[q.category] ??= []).push(q)
    return acc
  }, {})

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger()} className="bg-surface border border-[var(--color-border)] rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-1">Interview Prep</h2>
      {tags.length > 0 && (
        <p className="text-xs text-brand-muted font-mono mb-4">Matched to: {tags.join(' · ')}</p>
      )}
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
  )
}
