'use client'

import { useState } from 'react'
import { parseJobDescription } from '@/lib/parser'
import type { ParsedJob } from '@/types'

export function useParser() {
  const [result, setResult] = useState<ParsedJob | null>(null)

  function parse(text: string, customTags: string[] = []) {
    if (!text.trim()) {
      setResult(null)
      return null
    }
    const parsed = parseJobDescription(text, customTags)
    setResult(parsed)
    return parsed
  }

  function reset() {
    setResult(null)
  }

  return { result, parse, reset }
}
