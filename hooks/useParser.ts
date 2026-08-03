'use client'

import { useState } from 'react'
import { parseJobDescription } from '@/lib/parser'
import { matchCustomTags, normalizeTag } from '@/lib/skills'
import { EXTRACT_ERROR_MESSAGES } from '@/lib/extract/errors'
import type { ParsedJob } from '@/types'

export type ParsedJobWithUrl = ParsedJob & { url?: string }

interface FetchUrlResponse {
  jobPosting: ParsedJob | null
  text: string | null
}

export function useParser() {
  const [result, setResult] = useState<ParsedJob | null>(null)
  const [loading, setLoading] = useState(false)

  function parse(text: string, customTags: string[] = []) {
    if (!text.trim()) {
      setResult(null)
      return null
    }
    const parsed = parseJobDescription(text, customTags)
    setResult(parsed)
    return parsed
  }

  // Throws Error with a user-facing message on failure; caller shows the toast.
  async function parseFromUrl(url: string, customTags: string[] = []): Promise<ParsedJob | null> {
    setLoading(true)
    try {
      let json: { data?: FetchUrlResponse; error?: string }
      try {
        const res = await fetch('/api/jobs/fetch-url', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url }),
        })
        json = await res.json()
        if (!res.ok) throw new Error(json?.error ?? EXTRACT_ERROR_MESSAGES.network)
      } catch (error) {
        if (error instanceof Error && error.message) throw error
        throw new Error(EXTRACT_ERROR_MESSAGES.network)
      }

      const data = json.data
      if (!data) throw new Error(EXTRACT_ERROR_MESSAGES.network)

      if (data.jobPosting) {
        // The server cannot see this user's learned tags, so merge them here.
        const custom = matchCustomTags(data.jobPosting.description, customTags).map(normalizeTag)
        const merged: ParsedJob = {
          ...data.jobPosting,
          tags: [...new Set([...data.jobPosting.tags, ...custom])],
        }
        setResult(merged)
        return merged
      }

      return parse(data.text ?? '', customTags)
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setResult(null)
  }

  return { result, loading, parse, parseFromUrl, reset }
}
