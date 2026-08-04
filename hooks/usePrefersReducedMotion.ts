'use client'

import { useCallback, useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Tracks the user's reduced-motion preference.
 *
 * The global rule in `globals.css` only overrides `animation-duration` and
 * `transition-duration`, so it cannot reach animations driven by the Web
 * Animations API — dnd-kit's drop animation, for one. Those have to opt out in
 * JavaScript, which is what this hook is for.
 *
 * `useSyncExternalStore` rather than `useEffect` + `useState`: it gives a
 * server snapshot for SSR and avoids a setState-in-effect cascade.
 */
export function usePrefersReducedMotion(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const query = window.matchMedia(QUERY)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    // The server cannot know the preference; assume motion is fine and let the
    // client correct it on hydration.
    () => false
  )
}
