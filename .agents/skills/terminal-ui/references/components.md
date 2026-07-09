# Terminal UI — Component Vocabulary

The replacement table first, then each pattern in detail. Every replacement
still consumes the same semantic tokens the framework already provides
(`text-tertiary`, `bg-secondary_subtle`, `fg-success-primary`, …) — nothing
here introduces new raw colors.

| Instead of… | Use… | Why |
|---|---|---|
| Rounded pill badge (`BadgeWithDot`) | Bracket text tag `[ACTIVE]` | Terminals render status as text, not colored chips; also sidesteps badge components' own rounded/tinted-background styling, which is hard to fully override cleanly |
| Circular/donut progress ring | ASCII block meter `[■■■■■■□□□□] 60%` | A donut is the single most "SaaS dashboard" shape there is — nothing reads as terminal-inconsistent faster than one sitting on a black bordered card |
| Thin horizontal progress bar (list rows) | Keep it — just flat, 2px, square ends | Already terminal-compatible once radius is killed; no need to replace, only to not add a shadow/gradient to it |
| `rounded-xl shadow-xs ring-1 ring-secondary` card | `border border-secondary bg-secondary_subtle`, `hover:border-brand_alt` | Elevation comes from border-brightening on hover, never shadow — CRTs don't have ambient light to cast one |
| Primary/secondary/link `Button`, icon-only `ButtonUtility` | One shared 3-variant bracket button (below) | Consolidates every clickable control to the same shape; also avoids fighting a vendored button's own rounded/shadowed classes |
| Rounded-full numbered/avatar circle | Square bracket box with zero-padded index (`01`, `02`) | Circles read as "friendly app," squares read as "terminal" |
| Colorful `FeaturedIcon` tile in empty states | A single glyph character in a bordered square (`◈`, `⟳`, `◷`, `▣`) | Removes dependency on a themed icon-tile component; a single character is unambiguously "terminal" |
| Section/group heading, plain | `── SECTION` — em-dash pair (60% opacity accent) + `text-[10px] tracking-[0.25em] uppercase text-quaternary` | One consistent divider glyph reused everywhere (sidebar, cards, lists) |

## Bracket status tag

Replaces every pill/dot badge. Plain colored text, no background fill, no
border — the color alone carries meaning, exactly like a real terminal
printing a colored status word:

```tsx
function StatusTag({ status }: { status: "active" | "completed" | "paused" }) {
  const tone = {
    active: "text-brand-secondary",
    completed: "text-success-primary",
    paused: "text-quaternary",
  }[status];
  return <span className={cx("text-[10px] tracking-widest uppercase", tone)}>[{status}]</span>;
}
```

Status → tone convention used throughout: **in-progress/active** states use
the phosphor accent (`text-brand-secondary`) so they shift color with the
theme; **done/success** states are always `text-success-primary` (fixed
green regardless of phosphor — see tokens.md's "shared semantic tokens"
rule); **idle/todo/paused** states are `text-quaternary`; **error/overdue**
states are always `text-error-primary` (fixed red).

## ASCII block meter

Replaces circular/donut progress everywhere a single percentage needs a
visual. Pure text — no SVG, no canvas:

```tsx
function Meter({ value, width = 8 }: { value: number; width?: number }) {
  const filled = Math.round((value / 100) * width);
  const tone = value === 100 ? "text-success-primary" : value > 0 ? "text-brand-secondary" : "text-quaternary";
  return (
    <span className={cx("flex items-center gap-1.5 text-[11px] tabular-nums", tone)}>
      <span>[{"■".repeat(filled)}{"□".repeat(width - filled)}]</span>
      <span>{String(value).padStart(3, " ")}%</span>
    </span>
  );
}
```

Use `width` 8–10 for an inline/card-level meter, larger (10–12) for a
page-header hero meter. Pad the percentage to 3 characters
(`padStart(3, " ")`) so meters in a list don't jitter horizontally as the
number's digit count changes.

## Bracket button (3 variants, replaces every Button)

One shared control instead of a library's primary/secondary/link/icon-only
button set. All three variants share a border-box shape; they differ only in
fill and which state they signal:

```tsx
const VARIANT_CLASSES = {
  solid: "border border-brand bg-brand-solid text-primary_on-brand hover:bg-brand-solid_hover",
  outline: "border border-secondary text-tertiary hover:border-brand hover:text-brand-secondary",
  "ghost-icon": "border border-secondary text-fg-quaternary hover:border-brand hover:text-brand-secondary",
} as const;
```

- **`solid`** — the one primary action per view (page-level "Add X", a
  submit). Filled with the accent color; text flips to `text-primary_on-brand`
  for contrast (this token is defined per-phosphor, always readable against
  that phosphor's `bg-brand-solid`).
- **`outline`** — everything else clickable that isn't primary: secondary
  actions, "View more" links, per-row edit triggers with a label.
- **`ghost-icon`** — icon-only square buttons (`size-7`, no text) — row-level
  edit/delete triggers, the mobile menu button, the drawer close button.

All three: `font-semibold tracking-widest uppercase transition duration-100`,
disabled state `disabled:opacity-50`. Render as `<Link>` when an `href` is
given, `<button>` otherwise, so the same component covers both navigation and
actions.

## Card grammar

One flat style everywhere, no exceptions:

```
border border-secondary bg-secondary_subtle p-4|p-5
transition duration-100 hover:border-brand_alt
```

No `rounded-*`, no `shadow-*`, no `ring-*`. Nested sections inside a bigger
card (e.g. a milestones list inside a goal-detail work card) use
`border-t border-secondary` dividers, not their own card shell. Row hover
inside a list uses a background shift (`hover:bg-primary_hover`), not a
border change — border-hover is reserved for whole-card hover.

## Section labels & metadata typography

- Section/group headers: `── LABEL` per the table above.
- Field/metadata labels (a "Last 30 days" caption, a table column header): `text-[11px] tracking-wide text-tertiary uppercase`.
- All numbers, dates, times, percentages: `tabular-nums`, always — this is
  non-negotiable for anything in a list/table so digits don't shift columns
  as values change.
- Body copy and descriptions: normal case, normal tracking — uppercase is for
  chrome/labels/tags, never for sentences a user has to actually read.

## Day-strip / heatmap cells

A row of flat colored squares (already compatible with this system once
radius is `0` — no special terminal treatment needed beyond that):

```tsx
<div className={cx("h-5 flex-1", /* zero radius via global rule */
  !due && "bg-quaternary opacity-30",
  due && status === "done" && "bg-brand-solid",
  due && status === "skipped" && "bg-quaternary",
  due && status === null && "bg-secondary ring-1 ring-secondary ring-inset",
)} />
```

## Empty states

```tsx
<div className="mx-auto flex max-w-sm flex-col items-center border border-secondary py-16 text-center">
  <span className="flex size-12 items-center justify-center border border-brand text-xl text-brand-secondary">◈</span>
  <h3 className="mt-4 text-sm font-bold tracking-wide text-primary uppercase">Set your first goal</h3>
  <p className="mt-1 text-sm text-tertiary">One sentence of direction, not apology.</p>
  <TermButton className="mt-6" variant="solid">Add goal</TermButton>
</div>
```

Pick one glyph per domain concept and reuse it consistently (goals `◈`,
habits `⟳`, routines `◷`, tasks `▣`) — treat it like an icon set, not a
random emoji choice.

## CRT flourishes

Defined once globally, applied automatically — no per-component classes
needed except `.term-glow` where called out:

- **Scanline + vignette overlay** — a `body::after`, `position: fixed; inset:
  0; z-index: 9999; pointer-events: none`, combining a `repeating-linear-gradient`
  (thin horizontal lines, ~2% white opacity) with a `radial-gradient` vignette,
  `mix-blend-mode: screen`.
- **`.term-glow`** — `text-shadow: 0 0 6px color-mix(in srgb, var(--terminal-accent) 55%, transparent);`
  apply to hero titles/brand marks only (page `<h1>`, the shell's brand mark)
  — not to every heading, or the glow stops reading as intentional.
- **`.term-cursor::after`** — a blinking full-block character (`\2588`) for
  prompt-style inputs, `animation: term-blink 1.1s step-end infinite`
  (opacity 1→0 at the 50% mark, not a smooth fade — real cursors snap).
- **`::selection`** — inverse highlight: `background: var(--terminal-accent);
  color: #000000;`.
- **Scrollbars** — thin, tinted with the "dim" accent variant:
  `scrollbar-color: var(--terminal-accent-dim) transparent;` plus the
  WebKit `::-webkit-scrollbar-thumb`/`-track` equivalents.

None of these are optional flourishes to skip for a "cleaner" look — together
they're what separates "black background with amber text" from something
that actually reads as a CRT terminal.
