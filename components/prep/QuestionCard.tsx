import { motion } from 'framer-motion'
import type { InterviewQuestion } from '@/types'
import { fadeUp } from '@/lib/animations'

interface Props {
  question: InterviewQuestion
}

export function QuestionCard({ question }: Props) {
  return (
    <motion.div variants={fadeUp} className="border border-[var(--color-border)] rounded-md p-4 mb-3">
      <p className="text-sm font-medium">{question.question}</p>
      {question.tip && <p className="text-xs text-brand-muted mt-2">💡 {question.tip}</p>}
    </motion.div>
  )
}
