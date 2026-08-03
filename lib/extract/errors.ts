export type ExtractErrorCode =
  | 'invalid_url'
  | 'timeout'
  | 'blocked'
  | 'not_html'
  | 'too_large'
  | 'network'
  | 'rate_limited'

// The only source of user-facing extraction copy. Every message names the
// workaround, because a blocked site is the expected case, not an edge case.
export const EXTRACT_ERROR_MESSAGES: Record<ExtractErrorCode, string> = {
  invalid_url: "That doesn't look like a job posting link.",
  timeout: 'That site took too long. Paste the description text instead.',
  blocked: 'That site blocks automatic reading. Paste the description text instead.',
  not_html: "That link isn't a web page we can read.",
  too_large: 'That page is too large to read. Paste the description text instead.',
  network: "Couldn't reach that link. Check it and try again.",
  rate_limited: 'Too many links fetched. Wait a minute and try again.',
}

export class ExtractError extends Error {
  readonly code: ExtractErrorCode

  constructor(code: ExtractErrorCode) {
    super(code)
    this.name = 'ExtractError'
    this.code = code
  }
}
