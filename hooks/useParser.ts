'use client'

import { useState } from 'react'
import { parseJobDescription } from '@/lib/parser'
import { matchCustomTags, normalizeTag } from '@/lib/skills'
import { EXTRACT_ERROR_MESSAGES } from '@/lib/extract/errors'
import type { MetaJobFields } from '@/lib/extract/metadata'
import type { ParsedJob } from '@/types'

export type ParsedJobWithUrl = ParsedJob & { url?: string }

interface FetchUrlResponse {
  jobPosting: ParsedJob | null
  text: string | null
  meta?: MetaJobFields | null
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

      const parsed = parse(data.text ?? '', customTags)
      if (!parsed) return null

      // Page metadata is a declared field, so it outranks anything scraped out
      // of the visible text. Only fields the page actually declared override.
      const meta = data.meta
      if (!meta) return parsed

      const merged: ParsedJob = {
        ...parsed,
        company: meta.company ?? parsed.company,
        role: meta.role ?? parsed.role,
        location: meta.location ?? parsed.location,
      }
      setResult(merged)
      return merged
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setResult(null)
  }

  return { result, loading, parse, parseFromUrl, reset }
}
