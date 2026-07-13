# design.md — JobTrackr

> Visual identity, UX flows, component design, animation spec, and CSS directives.
> Claude Code must follow this file for all UI decisions. Do not deviate from the token system below.

---

## Design Direction

**Mood:** Calm confidence. This is a tool for people in a stressful life moment (job hunting). The UI should feel like a well-lit co-working space — not a dark terminal, not a corporate dashboard. Refreshing, airy, focused.

**Not this:** Dark mode-first, neon accents, glassmorphism blobs, card shadows everywhere, gradient hero banners.

**This:** Light-first with a soft warm-white base. One deliberate accent color (indigo-violet). Clean type hierarchy. Whitespace does the heavy lifting. Motion is purposeful, never decorative.

**Signature element:** A soft **aurora gradient** — a very subtle, slow-moving gradient wash in the page background (`indigo → violet → sky`) at low opacity (~6%). It gives the app a living, breathing quality without being distracting. Think Notion meets Linear, but warmer.

---

## Color System

```css
:root {
  /* Base */
  --color-bg:           #F8F7FF;   /* warm white with a breath of violet */
  --color-surface:      #FFFFFF;   /* cards, panels */
  --color-surface-muted:#F3F2FA;   /* subtle backgrounds, sidebar */

  /* Accent — Indigo Violet */
  --color-accent:       #5B4EE8;   /* primary buttons, active states, links */
  --color-accent-light: #EEECfd;   /* accent tint backgrounds */
  --color-accent-hover: #4A3ED4;   /* hover state */

  /* Text */
  --color-text-primary: #1A1835;   /* near-black with violet undertone */
  --color-text-secondary:#6B6893;  /* muted labels, metadata */
  --color-text-muted:   #A8A6C4;   /* placeholders, disabled */

  /* Status Colors */
  --color-saved:        #6B7280;   /* gray — neutral, not started */
  --color-applied:      #3B82F6;   /* blue — in motion */
  --color-interview:    #8B5CF6;   /* violet — exciting, close */
  --color-offer:        #10B981;   /* emerald — success */
  --color-rejected:     #F43F5E;   /* rose — clear, not harsh */

  /* UI Chrome */
  --color-border:       #E8E6F5;   /* subtle borders */
  --color-border-focus: #5B4EE8;   /* focus rings */
  --color-shadow:       rgba(91, 78, 232, 0.08); /* violet-tinted shadows */

  /* Aurora gradient layers */
  --aurora-1: rgba(91, 78, 232, 0.04);
  --aurora-2: rgba(139, 92, 246, 0.03);
  --aurora-3: rgba(56, 189, 248, 0.03);
}
```

---

## Typography

### Font Stack

```css
/* globals.css */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --font-sans: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

**Why Plus Jakarta Sans:** It's geometric and modern but has warmth in the letterforms — less clinical than Inter, more professional than Poppins. Great for both headings and UI labels.

**Why JetBrains Mono:** Used sparingly for tags, code, and technical metadata (salary range, location). Signals "built by a developer, for developers."

### Type Scale

```css
:root {
  --text-xs:   0.75rem;    /* 12px — tags, timestamps */
  --text-sm:   0.875rem;   /* 14px — secondary labels, metadata */
  --text-base: 1rem;       /* 16px — body, card content */
  --text-lg:   1.125rem;   /* 18px — card titles */
  --text-xl:   1.25rem;    /* 20px — section headings */
  --text-2xl:  1.5rem;     /* 24px — page headings */
  --text-3xl:  1.875rem;   /* 30px — hero/onboarding headline */

  --weight-normal:  400;
  --weight-medium:  500;
  --weight-semibold:600;
  --weight-bold:    700;

  --leading-tight:  1.2;
  --leading-normal: 1.5;
  --leading-relaxed:1.7;
}
```

---

## Spacing & Layout

```css
:root {
  --radius-sm:  6px;
  --radius-md:  10px;
  --radius-lg:  14px;
  --radius-xl:  20px;
  --radius-full:9999px;

  --sidebar-width: 240px;
  --topbar-height: 60px;
  --content-max:   1200px;
}
```

### Grid / Layout Shell

```
┌─────────────────────────────────────────────────────┐
│  TOPBAR  (60px height, sticky)                      │
├──────────────┬──────────────────────────────────────┤
│              │                                       │
│  SIDEBAR     │  MAIN CONTENT AREA                   │
│  (240px)     │  (flex-1, overflow-y-auto)           │
│              │                                       │
│  - Logo      │  Page-specific content renders here  │
│  - Nav       │                                       │
│  - Reminder  │                                       │
│    badge     │                                       │
│              │                                       │
└──────────────┴──────────────────────────────────────┘

Mobile (< 768px): Sidebar collapses to bottom nav bar
```

---

## Aurora Background Animation

This is the signature element. Implement it in `globals.css` and apply to `<body>`.

```css
/* globals.css */

body {
  background-color: var(--color-bg);
  position: relative;
  overflow-x: hidden;
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(ellipse 80% 60% at 20% 10%, var(--aurora-1), transparent),
    radial-gradient(ellipse 60% 80% at 80% 90%, var(--aurora-2), transparent),
    radial-gradient(ellipse 70% 50% at 50% 50%, var(--aurora-3), transparent);
  animation: aurora-drift 18s ease-in-out infinite alternate;
  pointer-events: none;
}

@keyframes aurora-drift {
  0%   { transform: scale(1)    translateX(0px)   translateY(0px); }
  33%  { transform: scale(1.04) translateX(20px)  translateY(-10px); }
  66%  { transform: scale(0.98) translateX(-15px) translateY(15px); }
  100% { transform: scale(1.02) translateX(10px)  translateY(-5px); }
}

/* All content must sit above the aurora */
#__next, main, aside, header {
  position: relative;
  z-index: 1;
}
```

---

## Component Design Specs

### Sidebar (Collapsible)

```
Expanded (w-[var(--sidebar-width)]):           Collapsed (w-16):
┌─────────────────────┐                       ┌────┐
│  ◈ JobTrackr     [<]│  ← Collapse button    │ ◈  │
├─────────────────────┤                       ├────┤
│  ▦  Dashboard       │                       │ ▦  │
│  ☰  All Jobs        │                       │ ☰  │
│  ✦  Add Job         │                       │ ✦  │
│  🔔 Reminders  (3)  │  ← Rose badge         │ 🔔• │ ← Status dot indicator
└─────────────────────┘                       └────┘
```

The sidebar is collapsible to maximize screen space. Transition is smoothed with `transition-[width] duration-200 ease-out`. Collapsed state is persisted locally in `localStorage` under `jobtrackr:sidebar-collapsed`.

```css
.sidebar {
  width: var(--sidebar-width); /* transitions to w-16 when collapsed */
  height: 100vh;
  background: var(--color-surface-muted);
  border-right: 1px solid var(--color-border);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  transition: background 150ms ease, color 150ms ease;
  cursor: pointer;
}

.sidebar-nav-item:hover {
  background: var(--color-accent-light);
  color: var(--color-accent);
}

.sidebar-nav-item.active {
  background: var(--color-accent-light);
  color: var(--color-accent);
  font-weight: var(--weight-semibold);
}
```

---

### Kanban Board

**Column design:**

```
┌────────────────────────┐
│ ● APPLIED         (4)  │  ← Column header: status dot + label + count
├────────────────────────┤
│ ┌──────────────────┐   │
│ │ Stripe           │   │  ← Job Card
│ │ Frontend Eng.    │   │
│ │ Remote · $120k   │   │
│ │ React  Next.js   │   │
│ │ ─────────────── │   │
│ │ Applied 3d ago   │   │  ← Shows applied date (last updated fallback)
│ └──────────────────┘   │
│                        │
│ + Add job              │
└────────────────────────┘
```

```css
.kanban-board {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  overflow-x: auto;
  align-items: flex-start;
  min-height: calc(100vh - var(--topbar-height));
}

.kanban-column {
  min-width: 280px;
  max-width: 300px;
  background: var(--color-surface-muted);
  border-radius: var(--radius-lg);
  padding: 1rem;
  border: 1px solid var(--color-border);
}

.kanban-column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.job-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1rem;
  margin-bottom: 0.75rem;
  cursor: grab;
  box-shadow: 0 1px 4px var(--color-shadow);
  transition: box-shadow 200ms ease, transform 200ms ease;
}

.job-card:hover {
  box-shadow: 0 4px 16px var(--color-shadow);
  transform: translateY(-1px);
}

.job-card:active {
  cursor: grabbing;
}

/* Dragging state — injected by dnd-kit */
.job-card[data-dragging="true"] {
  box-shadow: 0 12px 40px rgba(91, 78, 232, 0.18);
  transform: rotate(1.5deg) scale(1.02);
  border-color: var(--color-accent);
}

.job-card-company {
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
}

.job-card-role {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.job-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.75rem;
}

.tag {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--color-accent-light);
  color: var(--color-accent);
  font-weight: var(--weight-medium);
}

.job-card-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}
```

### Drag-to-Reject Reason Modal
Dragging a card to the "Rejected" column intercepts the update and triggers a clean, centered modal option dialog:
- Backdrop: `bg-black/40` overlay.
- Window: `w-full max-w-sm bg-surface p-5 border border-[var(--color-border)] rounded-lg shadow-card-hover`.
- Options: 4 preset reason buttons: `No response`, `Not qualified`, `Withdrew`, `Offer declined`. Hover highlights the border and text with accent colors.
- Actions: "Cancel" (bottom-left, aborts drag update) and "Skip" (bottom-right, proceeds with no rejection reason).

### Dashboard Weekly Stats Bar
A 4-tile summary widget rendered directly below the top header dashboard view:
- Layout: Grid-based row (`grid grid-cols-2 md:grid-cols-4 gap-4 px-6 pt-6`).
- Card layout: `bg-surface border border-[var(--color-border)] rounded-lg p-4 shadow-card`.
- Tiles:
  1. **Applied this week**: count of applications with `applied_at` in the last 7 days.
  2. **Active interviews**: current count of items in `Interview` status.
  3. **Offers**: current count of items in `Offer` status.
  4. **Rejected this week**: count of applications with `rejected_at` in the last 7 days.
```

---

### JD Parse Input

The centerpiece UI moment. Paste a job description → instant client-side extraction. No loading spinner needed — it's synchronous and near-instant. Focus the UX on the *reveal* of extracted data, not the wait.

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   ✦ Paste a job description                          │
│                                                      │
│   ┌──────────────────────────────────────────────┐   │
│   │ Senior Frontend Engineer at Stripe           │   │
│   │ We're looking for a React developer...       │   │
│   │ $130k–$160k · Remote · TypeScript, Next.js   │   │
│   └──────────────────────────────────────────────┘   │
│                                                      │
│   [  ✦ Extract Details  ]   [ Fill manually ]        │
│                                                      │
│   ── Extracted ──────────────────────────────────    │
│   ✓ Stripe                                           │
│   ✓ Senior Frontend Engineer                         │
│   ✓ $130k–$160k · Remote                            │
│   ✓ React, TypeScript, Next.js, GraphQL              │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Interaction flow:**
1. User pastes JD text into textarea
2. User clicks "Extract Details"
3. `parseJobDescription()` runs synchronously in the browser — no network call
4. Results fade in staggered using Framer Motion (feels like magic even though it's instant)
5. User reviews pre-filled fields and saves

**Framer Motion — staggered reveal:**

```tsx
// ParseInput.tsx (animation spec)

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
}

// Brief textarea highlight on extract click (not a loading state — just feedback)
const textareaPop = {
  borderColor: ['var(--color-border)', 'var(--color-accent)', 'var(--color-border)'],
  transition: { duration: 0.5 }
}
```

---

### Status Badge

```css
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-saved     { color: var(--color-saved);     background: #F3F4F6; }
.status-applied   { color: var(--color-applied);   background: #EFF6FF; }
.status-interview { color: var(--color-interview); background: #F5F3FF; }
.status-offer     { color: var(--color-offer);     background: #ECFDF5; }
.status-rejected  { color: var(--color-rejected);  background: #FFF1F2; }
```

---

### Reminder Flag

```css
/* Stale application warning on job card */
.reminder-flag {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: var(--text-xs);
  color: #F59E0B;           /* amber — warning, not panic */
  font-weight: var(--weight-medium);
  margin-top: 0.5rem;
}

/* Sidebar badge */
.reminder-badge {
  background: var(--color-rejected);
  color: white;
  font-size: 10px;
  font-weight: var(--weight-bold);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  min-width: 18px;
  text-align: center;
}
```

---

### Interview Prep Panel

Slides in from the right on the job detail page. Questions are pulled instantly from `lib/interview-questions.ts` based on the job's detected tags — no async call, no spinner.

```
┌──────────────────────────────────────────────────────┐
│  Interview Prep                           [Reshuffle] │
│  Matched to: React · TypeScript · Next.js            │
├──────────────────────────────────────────────────────┤
│  🧠 Technical                                         │
│  ┌────────────────────────────────────────────────┐  │
│  │ How would you architect a real-time dashboard  │  │
│  │ with React that handles 10k+ live updates/min? │  │
│  │                                                │  │
│  │ 💡 Tip: Mention WebSockets vs SSE trade-offs   │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  👥 Behavioral                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │ Tell me about a time you pushed back on a      │  │
│  │ product decision and what happened.            │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**Framer Motion — panel slide-in:**

```tsx
const panelVariants = {
  hidden: { x: '100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', damping: 28, stiffness: 300 }
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' }
  }
}
```

---

## Page-by-Page UX Flow

### 1. Login Page

- Split layout: left = aurora-wash illustration/tagline, right = sign-in form.
- Tagline: **"Your job search, actually organized."**
- Google OAuth button + email option.
- Signup option includes a mandatory checkbox: **"I agree to the Privacy Policy"** linked to `/privacy`. Google OAuth displays a corresponding terms consent notice.
- No clutter. Just the form and one confident headline.

### 2. Dashboard (Kanban Board)

- Weekly Stats Bar prominently displayed at the top.
- Full-width kanban with horizontal scroll on desktop.
- Topbar: User dropdown menu (displaying avatar/initials with Profile/Logout options) + "Add Job" CTA button (accent, prominent).
- Empty state per column: soft dashed border + icon + short copy (e.g. "Bookmark roles you're eyeing").
- Drag-and-drop between columns updates status in Supabase in real-time. Drag to Rejected prompts the rejection reason modal.

### 3. Add Job Page

- Two paths clearly visible: **Paste JD** (primary) and **Manual Entry** (secondary, text link).
- Paste path: large textarea → "Extract Details" button → instant staggered reveal → review prefilled fields (including Company, Role, Location, Salary, Tags) → save.
- Manual path: standard form, all fields optional except company + role. Now includes **Applied on** date-picker and **Source** dropdown selection.
- On save: toast notification slides in from bottom-right.

### 4. Job Detail Page

- Overhauled detailed layout.
- Header: company name (large) + role + status badge + edit/delete actions.
- Displays metadata cleanly: location, salary, source (JobStreet, LinkedIn, etc.), and applied date. If status is rejected, displays the rejection reason dropdown.
- Notes: inline editable textarea with automatic save.
- Two-column layout (desktop): left = job details + notes, right = interview prep panel.
- Interview prep: skeleton loading → staggered question reveal. Includes technical/behavioral prep matched to detected tags.

### 5. Reminders Page

- List of stale applications with days-since-last-update.
- Staleness is measured from `applied_at` (applied date) with a fallback to `last_updated`.
- Each item: job card variant with amber warning banner.
- Quick actions: "Update Status" button inline.

### 6. Profile Page

- Details page containing display name editor, file picker for avatar image (jpg/png/webp, ≤2MB).
- Avatar stored in public bucket `avatars` on Supabase Storage.
- Danger zone: Data export ("Download my data" JSON download) and account deletion ("Delete my account" confirm by typing `DELETE`).
- Triggers cascade removal of user data (profile, jobs, avatar image).

---

## Animation System

All animations use Framer Motion. Follow this system — don't freestyle.

```tsx
// lib/animations.ts — import from here everywhere

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
```

### When to animate what

| Interaction | Animation |
|---|---|
| Page load / route change | `fadeUp` on main content |
| Card list / question list | `stagger` + `fadeUp` per item |
| Job card hover | CSS only (`transform: translateY`) — no Framer |
| Dragging a card | dnd-kit handles this — add rotation via `transform` |
| Interview prep panel | `slideFromRight` |
| Toast notification | `slideFromBottom` |
| Parse results appearing | `stagger` + `fadeUp` per field |
| Modal / dialog | `scaleIn` + backdrop `fadeIn` |
| Button loading state | Spinner replaces icon, no layout shift |

### Respect reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Tailwind Config Additions

> Stack uses Tailwind v4 (see `CLAUDE.md`). Use `@config "./tailwind.config.ts"` compat mode in `globals.css` so this JS config still applies as-is — do not hand-port these tokens to CSS `@theme` syntax unless a later pass consolidates the whole token system.

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#5B4EE8',
          light:   '#EEECD',
          hover:   '#4A3ED4',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted:   '#F3F2FA',
        },
        brand: {
          bg:   '#F8F7FF',
          text: '#1A1835',
          muted:'#6B6893',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card:   '0 1px 4px rgba(91, 78, 232, 0.08)',
        'card-hover': '0 4px 16px rgba(91, 78, 232, 0.12)',
        'card-drag':  '0 12px 40px rgba(91, 78, 232, 0.18)',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      animation: {
        'aurora-drift': 'aurora-drift 18s ease-in-out infinite alternate',
      },
      keyframes: {
        'aurora-drift': {
          '0%':   { transform: 'scale(1) translateX(0px) translateY(0px)' },
          '33%':  { transform: 'scale(1.04) translateX(20px) translateY(-10px)' },
          '66%':  { transform: 'scale(0.98) translateX(-15px) translateY(15px)' },
          '100%': { transform: 'scale(1.02) translateX(10px) translateY(-5px)' },
        }
      }
    }
  },
  plugins: [],
}

export default config
```

---

## shadcn/ui Setup Notes

```bash
# Initialize shadcn with these settings
npx shadcn@latest init

# When prompted:
# Style: Default
# Base color: Slate (we override with CSS variables anyway)
# CSS variables: Yes

# Install these components
npx shadcn@latest add button input textarea dialog toast badge avatar
npx shadcn@latest add dropdown-menu separator skeleton tooltip
```

Override shadcn's default radius and color in `globals.css` to match the token system above. Don't use their default blue — replace with `var(--color-accent)` throughout.

---

## Empty States

Every empty state needs:
1. A simple, line-art icon (Lucide)
2. A headline (what's missing)
3. One sentence of context
4. One CTA button

```
Example — Empty Kanban Column:

     [briefcase icon]
   No applications yet

  Jobs you track will appear here.

     [ + Add a job ]
```

Tone: direct, not cute. Don't write "Oops! Nothing here yet 😅"

---

## Toast / Notification System

Use shadcn's `<Toaster />` component. Position: bottom-right.

| Event | Toast |
|---|---|
| Job saved | ✓ "Job saved — Stripe · Frontend Eng." |
| Status updated | ✓ "Moved to Interview" |
| Parse success | ✓ "Details extracted — review and confirm" |
| Parse partial | ⚠ "Some fields couldn't be detected — fill them in below" |
| Parse failed | ✗ "Couldn't extract details. Fill in the fields manually." |
| Reminder triggered | 🔔 "3 applications haven't moved in 7+ days" |

Duration: 4 seconds. No auto-dismiss on errors.

---

## Do Not List (Design Rules)

- ❌ No gradient buttons — solid accent color only
- ❌ No card carousels or sliders
- ❌ No hero sections with stock photo backgrounds
- ❌ No more than 2 font families used in the same view
- ❌ No purple-on-purple — always ensure 4.5:1 contrast ratio minimum
- ❌ No modals for destructive actions — use inline confirmation or toast undo
- ❌ No emoji in UI labels or buttons (only allowed in empty states sparingly)
- ❌ No loading spinners that block the full page — use skeleton loaders
