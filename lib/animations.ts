export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } }
}

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
}

export const stagger = (delay = 0.06) => ({
  hidden: {},
  visible: { transition: { staggerChildren: delay } }
})

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: 'easeOut' } }
}

export const slideFromRight = {
  hidden:   { x: '100%', opacity: 0 },
  visible:  { x: 0, opacity: 1, transition: { type: 'spring', damping: 28, stiffness: 300 } },
  exit:     { x: '100%', opacity: 0, transition: { duration: 0.2 } }
}

export const slideFromBottom = {
  hidden:   { y: 24, opacity: 0 },
  visible:  { y: 0, opacity: 1, transition: { type: 'spring', damping: 20, stiffness: 260 } },
  exit:     { y: 24, opacity: 0, transition: { duration: 0.15 } }
}
