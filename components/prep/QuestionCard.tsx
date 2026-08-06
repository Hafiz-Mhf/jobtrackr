import { motion } from 'framer-motion'
import type { InterviewQuestion } from '@/types'
import { fadeUp } from '@/lib/animations'

interface Props {
  question: InterviewQuestion
}

export function QuestionCard({ question }: Props) {
  return (
    // A row, not a card: this always renders inside PrepPanel's card, and the
    // border made every question a second card nested in the first.
    <motion.li variants={fadeUp} className="py-3 border-b border-[var(--color-border)] last:border-b-0">
      <p className="text-sm font-medium text-brand-text">{question.question}</p>
      {question.tip && <p className="text-xs text-brand-muted mt-1.5 leading-relaxed">{question.tip}</p>}
    </motion.li>
  )
}
