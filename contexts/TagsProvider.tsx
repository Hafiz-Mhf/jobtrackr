'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

interface TagsListResponse {
  data: string[]
  error?: string
}

export interface TagsContextValue {
  customTags: string[]
  loading: boolean
  refresh: () => Promise<void>
  addLocal: (tags: string[]) => void
}

const TagsContext = createContext<TagsContextValue | null>(null)

export function TagsProvider({ children }: { children: React.ReactNode }) {
  const [customTags, setCustomTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tags')
      const json = (await res.json()) as TagsListResponse
      setCustomTags(res.ok ? json.data : [])
    } catch {
      setCustomTags([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(refresh)
  }, [refresh])

  const addLocal = useCallback((tags: string[]) => {
    setCustomTags((prev) => {
      const lower = new Set(prev.map((t) => t.toLowerCase()))
      const additions = tags
        .map((t) => t.trim())
        .filter((t) => t && !lower.has(t.toLowerCase()))
      return additions.length ? [...prev, ...additions] : prev
    })
  }, [])

  const value: TagsContextValue = { customTags, loading, refresh, addLocal }

  return <TagsContext.Provider value={value}>{children}</TagsContext.Provider>
}

export function useTags() {
  const ctx = useContext(TagsContext)
  if (!ctx) {
    throw new Error('useTags must be used within a TagsProvider')
  }
  return ctx
}
