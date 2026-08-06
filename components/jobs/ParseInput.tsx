'use client'

import { toast } from 'sonner'
import { Sparkles, ChevronRight, FileText, Loader2 } from 'lucide-react'
import { useParser, type ParsedJobWithUrl } from '@/hooks/useParser'
import { useTags } from '@/contexts/TagsProvider'
import { isSingleUrl } from '@/lib/url'
import { EXTRACT_ERROR_MESSAGES } from '@/lib/extract/errors'
import type { ParsedJob } from '@/types'

interface Props {
  /** Owned by the parent so switching to the review form can't discard it. */
  text: string
  onTextChange: (text: string) => void
  onParsed: (parsed: ParsedJobWithUrl) => void
  onManual: () => void
}

export function ParseInput({ text, onTextChange, onParsed, onManual }: Props) {
  const { loading, parse, parseFromUrl } = useParser()
  const { customTags } = useTags()

  function reportFieldsFound(parsed: ParsedJob) {
    const fieldsFound = [
      Boolean(parsed.company),
      Boolean(parsed.role),
      Boolean(parsed.salary_range),
      Boolean(parsed.location),
      parsed.tags.length > 0,
    ].filter(Boolean).length

    if (fieldsFound >= 4) {
      toast.success('Details extracted — review and confirm')
    } else if (fieldsFound > 0) {
      toast.warning("Some fields couldn't be detected — fill them in below")
    } else {
      toast.error("Couldn't extract details. Fill in the fields manually.", { duration: Infinity })
    }
  }

  // Opens the form with only the link filled in, so a failed fetch never loses it.
  function fallbackToForm(url: string) {
    onParsed({ company: '', role: '', tags: [], description: '', url })
  }

  async function handleExtract() {
    const url = isSingleUrl(text)

    if (!url) {
      const parsed = parse(text, customTags)
      if (!parsed) return
      reportFieldsFound(parsed)
      onParsed(parsed)
      return
    }

    try {
      const parsed = await parseFromUrl(url, customTags)
      if (!parsed) {
        toast.error("Couldn't read anything from that link. Paste the description text instead.", { duration: Infinity })
        fallbackToForm(url)
        return
      }
      reportFieldsFound(parsed)
      onParsed({ ...parsed, url })
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : EXTRACT_ERROR_MESSAGES.network
      toast.error(message, { duration: Infinity })
      fallbackToForm(url)
    }
  }

  return (
    <div className="bg-surface border border-[var(--color-border)] rounded-2xl p-6 md:p-8 space-y-6 shadow-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="font-semibold text-brand-text flex items-center gap-2 text-sm md:text-base" htmlFor="jd-input">
          <FileText className="size-4 text-accent" />
          Job Description
        </label>
        <span className="text-[10px] text-brand-muted px-2 py-1 bg-surface-muted rounded-md uppercase tracking-wider font-semibold">
          Paste text or a link
        </span>
      </div>

      <div className="relative group">
        <textarea
          id="jd-input"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Paste the job description text or link here... More text means better automatic extraction."
          className="w-full min-h-[320px] p-6 bg-surface border border-[var(--color-border)] rounded-xl focus:border-accent focus-ring transition-colors resize-none font-sans text-sm leading-relaxed text-brand-text placeholder:text-text-muted"
        />
      </div>

      {/* Primary action first, so the mobile column order matches priority. */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onManual}
          className="rounded-xl px-3 py-3 text-accent font-semibold text-sm hover:underline hover:bg-accent-light/50 transition-colors flex items-center justify-center sm:justify-start gap-1 group focus-ring cursor-pointer"
        >
          Fill details manually
          <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          type="button"
          onClick={handleExtract}
          disabled={!text.trim() || loading}
          className="w-full sm:w-auto px-6 py-3.5 bg-accent text-white font-semibold text-sm rounded-xl hover:bg-accent-hover disabled:bg-surface-muted disabled:text-brand-muted disabled:shadow-none transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-2 focus-ring cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {loading ? 'Reading link…' : 'Extract Job Details'}
        </button>
      </div>
    </div>
  )
}
