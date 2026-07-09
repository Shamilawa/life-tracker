# Terminal UI — Layout: App Shell & Page Header

## App shell

Three horizontal bands wrapping a sidebar + main area — render once at the
root, everything else is children:

```
<div class="flex h-dvh flex-col bg-primary text-primary">

  <!-- TOP COMMAND BAR (h-11) -->
  <header class="flex h-11 items-center justify-between border-b border-primary bg-secondary px-3 sm:px-4">
    mobile menu button (lg:hidden) · BRAND//MARK + active module code (left)
    live clock (YYYY-MM-DD · HH:MM:SS) · phosphor picker · status pill (right)
  </header>

  <div class="flex min-h-0 flex-1">
    <!-- SIDEBAR (w-64, desktop only) -->
    <aside class="flex w-64 shrink-0 flex-col border-r border-primary bg-secondary max-lg:hidden">
      F-key nav sections · system-status block
    </aside>

    <!-- mobile: same content in a slide-in drawer, absolute inset-y-0 left-0 -->

    <main class="min-w-0 flex-1 overflow-y-auto bg-primary">{children}</main>
  </div>

  <!-- BOTTOM STATUS LINE (h-6) -->
  <footer class="flex h-6 items-center gap-4 border-t border-primary bg-secondary px-3 text-[10px] tracking-widest text-quaternary uppercase">
    READY · hotkey hints (left) · pulsing CONNECTED dot (right, ml-auto)
  </footer>
</div>
```

### Top command bar details

- **Brand mark**: `APPNAME//OS` — bold, `tracking-[0.2em]`, uppercase,
  `text-brand-secondary`, with `.term-glow` (see components.md) for a subtle
  phosphor bloom. A version tag (`v1.0`) in `text-quaternary` next to it,
  hidden on small screens.
- **Active module indicator**: the 3-letter code of the current route (see
  nav config below), shown next to the brand mark on desktop only —
  `◂ TDY` style, `text-quaternary uppercase`.
- **Live clock**: a client component ticking every second
  (`setInterval(1000)`), rendering `YYYY-MM-DD · HH:MM:SS` with `tabular-nums`.
  Render a placeholder (`--:--:--`) until mounted to avoid hydration
  mismatch — the clock's first paint must match the server's (no `Date.now()`
  during SSR).
- **Phosphor picker**: see [tokens.md](tokens.md) for the component; lives
  here in the bar.
- **Status pill**: a small bordered box with a `size-1.5` dot
  (`bg-fg-success-primary`, optionally `animate-pulse`) + a short label (e.g.
  user initials or "OK") — purely decorative chrome that sells the "system is
  live" feeling.

### Sidebar: F-key nav

Map each top-level route to a sequential function key and a 3-letter code —
this is the single most recognizable "terminal" nav idiom:

```ts
type NavEntry = { label: string; href: string; fkey: string; code: string };
const NAV_SECTIONS: Array<{ label: string; items: NavEntry[] }> = [
  { label: "General", items: [
    { label: "Today", href: "/", fkey: "F1", code: "TDY" },
    { label: "Insights", href: "/insights", fkey: "F2", code: "INS" },
  ]},
  { label: "Plan", items: [
    { label: "Goals", href: "/goals", fkey: "F3", code: "GOL" },
    { label: "Habits", href: "/habits", fkey: "F4", code: "HBT" },
    { label: "Routines", href: "/routines", fkey: "F5", code: "RTN" },
  ]},
];
```

Row layout: `> ` caret (only on the active row) · `F1` code (`text-[10px]
tabular-nums`) · label (flex-1, uppercase, `tracking-wide`) · 3-letter code
right-aligned (`text-[10px]`, muted). **Active row is inverse-filled**:
`bg-brand-solid text-primary_on-brand` — not a subtle tint, a full block, like
a terminal menu's selection bar. Idle rows: `text-tertiary
hover:bg-secondary_hover hover:text-primary`.

Section labels above each group: `── SECTION` — an em-dash pair in
`text-brand-secondary/60` followed by the label in `text-[10px]
tracking-[0.25em] text-quaternary uppercase`. This `── LABEL` prefix is used
for *every* section/group header across the whole app (sidebar sections,
card internal groupings, list dividers) — one consistent divider glyph.

Bottom of the sidebar: a small bordered "system status" block (`border
border-secondary bg-secondary_subtle p-2.5`) with a pulsing dot + "NOMINAL"/
similar, plus a one-line tip in a `$ ` prompt style (`<span class="text-quaternary">$</span> do the thing`).

### Mobile

Sidebar content duplicates into a slide-in drawer (`fixed inset-0 z-50`, a
`bg-overlay` backdrop button covering the screen + an `absolute inset-y-0
left-0` panel with `animate-in slide-in-from-left`). Close the drawer on route
change (`useEffect` keyed on `pathname`) and provide a close button in the
drawer's own header row.

### Bottom status line

A single always-visible strip: `READY` in the accent color, then a couple of
hotkey/feature hints (`[F1-F6] NAV`, `[◈] PHOSPHOR`) hidden below `sm`, then
`ml-auto` a pulsing-dot `CONNECTED` indicator. This is pure chrome — it has
no interactive elements — but it's what makes the frame read as a dashboard
rather than a webpage.

## Shared `Page` header

Every route renders through one `Page` component so headers are pixel-uniform
across the app (title, description, actions) — same discipline as any design
system, just with terminal-specific styling on top:

```tsx
<Page
  title="Goals"                                // "> " caret + glow + uppercase bold
  titleTrailing={<StatusTag status="active" />} // bracket tag inline after title
  description="Supporting one-liner"            // text-sm text-tertiary, normal case
  actions={<TermButton variant="solid">Add goal</TermButton>}
  back={{ label: "All goals", href: "/goals" }} // optional "◂ label" above title
>
  {content}
</Page>
```

Rendering rules:
- Back-link (if present): `◂ label`, `text-xs tracking-widest uppercase
  text-tertiary hover:text-brand-secondary`, sits above everything else.
- Title row sits inside a `border-b border-secondary pb-4` rule — this
  underline is what visually separates "page chrome" from "page content"
  now that there's no card-shadow elevation to do that job.
- Title itself: a `text-brand-secondary` `>` caret, then `text-lg font-bold
  tracking-wide uppercase term-glow`. Description underneath stays **normal
  case** — aggressive uppercase is for labels/chrome, not for reading
  paragraphs of copy.
- Container: `mx-auto max-w-7xl px-8 py-6`, content starts `mt-6` — identical
  box model to a standard design-system Page skeleton; only the visual
  treatment of the header itself changed.
