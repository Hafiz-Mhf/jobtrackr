import type { Variants } from 'framer-motion'

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } }
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as any } }
}

export const stagger = (delay = 0.06): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: delay } }
})

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: 'easeOut' as any } }
}

export const slideFromRight: Variants = {
  hidden:   { x: '100%', opacity: 0 },
  visible:  { x: 0, opacity: 1, transition: { type: 'spring', damping: 28, stiffness: 300 } },
  exit:     { x: '100%', opacity: 0, transition: { duration: 0.2 } }
}

export const slideFromBottom: Variants = {
  hidden:   { y: 24, opacity: 0 },
  visible:  { y: 0, opacity: 1, transition: { type: 'spring', damping: 20, stiffness: 260 } },
  exit:     { y: 24, opacity: 0, transition: { duration: 0.15 } }
}
