# 05 — Frontend Design System

Source: [frontend/src/app/globals.css](../frontend/src/app/globals.css),
[frontend/tailwind.config.ts](../frontend/tailwind.config.ts),
[frontend/src/components/ui/](../frontend/src/components/ui).

## Brand

| Token | Hex | HSL (as used in CSS variables) | Role |
|---|---|---|---|
| Primary | `#062D89` | `222 92% 28%` | Headings, primary CTAs (light mode) |
| Secondary | `#0C6EFF` | `216 100% 52%` | Links, active nav state, primary CTA in dark mode |
| Accent | `#11D5E8` | `185 86% 49%` | Highlights, badges, Jojo's chat bubble accent |

Dark mode doesn't literally invert these — `#062D89` disappears against a
dark ground, so dark mode promotes the brighter secondary blue to the
primary role instead (`globals.css`'s `.dark` block). Same brand, adjusted
for the surface it sits on.

## Typography

System font stack via `next/font/google` — Inter, loaded as `--font-sans`.
No custom display face; this is a functional product UI, not a marketing
site, so a single well-hinted sans face across all weights was the
deliberate choice over a two-typeface pairing.

## Component inventory (`components/ui/`)

Hand-written in the shadcn/ui pattern (source copied into the project, not
installed as an opaque package) — `button`, `card`, `input`, `label`,
`badge`, `avatar`, `progress`, `skeleton`, `separator`, `tabs`,
`dropdown-menu`, `table`, `sonner` (toast). Each uses `class-variance-authority`
for variants and reads color exclusively from the CSS-variable tokens below
— never a hardcoded hex — so a redesign only ever touches `globals.css`.

## Design tokens (CSS variables, `globals.css`)

```css
--background / --foreground
--card / --card-foreground
--primary / --primary-foreground
--secondary / --secondary-foreground
--accent / --accent-foreground
--muted / --muted-foreground
--destructive / --destructive-foreground
--border / --input / --ring
--radius: 0.75rem
```

Every one of these is defined once in `:root` (light) and redefined in
`.dark` — no component ever hardcodes a color that only works in one theme.

## Layout conventions

- **Sidebar shell** (`components/nav/app-shell.tsx`) — 240px fixed sidebar,
  role-aware nav items (`components/nav/nav-items.ts`), used by every
  authenticated route via the `(app)` route group's layout.
- **Cards, not tables, for scannable summaries** — dashboards favor a card
  grid (Principal's stat cards, Parent's per-child cards); `Table` is
  reserved for genuinely tabular data (a class roster, a grading queue).
- **Semantic color is separate from the accent** — `Badge`'s `success` /
  `warning` variants use emerald/amber, not the brand accent, so status
  (caught up vs. pending) never gets confused with brand identity.

## Motion

Framer Motion used deliberately in exactly two places: the landing page's
hero reveal (`components/landing/landing-reveal.tsx`, one fade-up on load)
and Jojo's chat bubbles (`app/(app)/student/jojo/page.tsx`, a small
slide-in per message). No motion library usage anywhere else — animation is
spent where it earns its place, not sprinkled across every card.

## Accessibility notes (current state, not a completed audit)

- Every interactive shadcn/ui primitive is built on Radix UI, which
  provides keyboard navigation and ARIA roles out of the box.
- Form inputs pair with `Label` via `htmlFor`/`id` (see the login page).
- Not yet done: a full contrast audit against WCAG AA for every token
  combination, and screen-reader testing of the quiz-taking flow.

## What a new page should reuse, in order

1. `AppShell` for the authenticated chrome (never build a new sidebar).
2. `useApiData` (`hooks/use-api-data.ts`) for a fetch-on-mount read.
3. Existing `lib/api/*.ts` module for the backend call, or add one file
   there following the existing pattern (one file per backend module).
4. `components/ui/*` primitives before reaching for a new dependency.
