# Untitled UI — Theming & Tokens

All styling flows from CSS variables in `src/styles/theme.css`, exposed as Tailwind
utilities. The discipline that keeps a UI coherent: **components consume semantic
tokens; only theme.css knows actual colors.** If you type a raw palette class
(`text-gray-500`, `bg-purple-600`) in app code, you're doing it wrong.

## Semantic utilities (the ones you'll actually use)

Text:
- `text-primary` — headings, values (near-black)
- `text-secondary` — emphasized body, nav labels
- `text-tertiary` — supporting text, descriptions
- `text-quaternary` — metadata, axis labels, timestamps
- `text-brand-secondary` — brand-colored links/accents
- `text-disabled`, `text-placeholder`

Backgrounds:
- `bg-primary` — cards, sidebar, top bar (white)
- `bg-primary_hover` — hover rows
- `bg-secondary_subtle` — the page canvas behind cards
- `bg-secondary` — subtle fills
- `bg-active` — selected nav item
- `bg-brand-solid` — primary buttons, logo marks
- `bg-quaternary` — muted blocks (e.g. empty grid cells)

Borders/rings: `border-secondary` / `ring-secondary` (default hairline),
`border-primary` (slightly stronger), `ring-brand` (focus/selection).

Icons (`fg-*` = foreground for non-text): `fg-quaternary` (default icon gray),
`fg-brand-primary`, `fg-success-primary/secondary`, `fg-warning-primary/secondary`,
`fg-error-primary/secondary`, `fg-disabled`.

Badge tints: `bg-utility-{color}-50` + `text-utility-{color}-700` +
`ring-utility-{color}-200` — but use the Badge component instead of hand-rolling.

In SVG/inline styles use the vars directly: `var(--color-fg-brand-primary)`,
`var(--color-border-secondary)`, `var(--color-text-quaternary)`, etc.

## Type scale (typography.css)

`text-xs` 12 · `text-sm` 14 · `text-md` 16 · `text-lg` 18 · `text-xl` 20 ·
`text-display-xs` 24 · `text-display-sm` 30 · `text-display-md` 36 (and up).

Working hierarchy for app screens: page title `text-lg font-semibold` · card title
`text-md font-semibold` · body/labels `text-sm` · metadata `text-xs text-tertiary` ·
KPI numbers `text-display-xs font-semibold` (or `-sm` for hero stats). Weights:
400/500/600 only — never 700+ in app UI. Sentence case everywhere, including buttons.

## Rebranding (changing the brand color)

Default brand is Untitled UI purple (`brand-600 = #7F56D9`). To rebrand, redefine
only the `--color-brand-25 … --color-brand-950` scale near the top of `theme.css` —
every semantic token (`bg-brand-solid`, `text-brand-secondary`, focus rings, badge
tints) derives from it. Generate a 25–950 scale from the target color (keep similar
lightness steps to the original). Touch nothing else.

## Dark mode

`globals.css` registers `@custom-variant dark (&:where(.dark-mode, .dark-mode *))` —
dark mode is a `.dark-mode` class on `<html>`, not the media query. `theme.css`
already contains the dark values for every semantic token, so components flip
automatically. The starter kit's `providers/theme-provider.tsx` handles the class +
localStorage persistence; copy it if you need a toggle. Because app code only uses
semantic tokens, you get dark mode for free — this is the payoff for the "no raw
palette classes" rule.

## Spacing & shape

- Tailwind's 4px grid; common rhythm: `gap-4` between cards, `p-5`/`p-6` card
  padding, `px-8 py-6` page padding, `gap-2`/`gap-3` inside rows
- Radii: `rounded-md` inputs/buttons/nav items · `rounded-lg` small cards,
  dropdowns · `rounded-xl` cards/modals · `rounded-full` pills/avatars
- Elevation: `shadow-xs` on cards (barely-there), `shadow-lg` on floating panels
  (dropdowns), `shadow-xl` on modals. On the light theme, separation comes from
  `ring-1 ring-secondary` + background contrast, not shadow strength.
