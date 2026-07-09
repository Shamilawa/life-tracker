---
name: terminal-ui
description: Build or reskin React UIs into a retro CRT / Bloomberg-terminal design system — true-black background, monospace type, zero border-radius, bracket-notation status tags, ASCII block meters, and a selectable "phosphor" color palette (amber/green/blue/cyan/red/mono). Use this skill whenever the user asks for a "terminal", "Bloomberg terminal", "CRT", "hacker", "retro terminal", "command-line style", "green screen" / "amber screen", "phosphor", or "monospace dashboard" look; wants an existing (typically Untitled-UI-style) app "converted"/"reskinned" into that look; or wants a brand-new app scaffolded in this style. Covers the CSS token-remap technique, the multi-color phosphor system, the app-shell/layout pattern (command bar, F-key sidebar, status line), and the full component vocabulary (bracket tags, ASCII meters, bordered cards, terminal buttons).
---

# Terminal UI

A design system that reskins a normal, semantic-token-driven React app into a
Bloomberg-terminal / CRT aesthetic: true black background, monospace type
everywhere, zero rounded corners, bracket-notation status (`[ACTIVE]`), ASCII
block meters instead of progress rings, and a switchable "phosphor" accent
color (amber, green, blue, cyan, red, or monochrome white) instead of a
light/dark toggle.

It is **not a component library** — it's a technique plus a vocabulary. It
works on top of any app that already exposes its colors as semantic CSS custom
properties (this codebase uses Untitled UI's token system: `bg-primary`,
`text-tertiary`, `border-secondary`, `brand-*`, `fg-*`, …). If the target app
hard-codes raw palette classes instead (`text-gray-900`, `bg-purple-600`), do
a components pass to semantic tokens first — see [the untitled-ui skill](../untitled-ui/SKILL.md)
if the project uses that library, or read [references/tokens.md](references/tokens.md)
for what "semantic token" means here.

## The core trick (read this first)

One small CSS file, imported **last** in the global stylesheet, overrides the
app's semantic color tokens. Because it's plain unlayered CSS and the
underlying design system's tokens usually live inside `@layer theme` (Tailwind
v4's `@theme` blocks compile into a layer), **unlayered CSS wins over layered
CSS unconditionally** — regardless of selector order or specificity. A bare
`:root { --color-brand-50: #17110a; }` in your terminal file silently beats
the framework's own `:root { --color-brand-50: #f9f5ff; }` every time. This is
what lets one file reskin an entire multi-page app without touching component
code. Full mechanics, the exact property list to override, and the cascade
gotcha in detail: [references/tokens.md](references/tokens.md).

## Quick recipe

1. **Confirm the foundation**: app must consume semantic tokens (see above).
2. **Add the token-remap file** (`terminal.css` or similar) — monospace font
   override, global `border-radius: 0 !important`, shared semantic
   success/warning/error tokens defined once, then one CSS block per phosphor
   color overriding only the "chrome" tokens (brand ramp, text/border/fg/bg).
   Full token list + a 6-color reference palette: [references/tokens.md](references/tokens.md).
3. **Wire a multi-color theme provider** (not a light/dark binary) — `next-themes`
   with a custom `themes` array mapped to `phosphor-<id>` classes — plus a
   bracket-style picker dropdown. Details: [references/tokens.md](references/tokens.md).
4. **Build the shell**: top command bar (brand mark, clock, phosphor picker,
   status pill) + F-key-mapped sidebar nav + bottom status line, and route
   every screen through one shared `Page` header. Full structure + ASCII
   diagram: [references/layout.md](references/layout.md).
5. **Swap the component vocabulary**: pill badges → bracket tags, circular
   progress → ASCII meters, shadowed rounded cards → flat bordered boxes,
   soft buttons → the 3-variant bracket button. Full "don't use X, use Y"
   table + CRT flourishes (scanlines, glow, blinking cursor):
   [references/components.md](references/components.md).
6. **Reskinning an existing app vs. scaffolding new**: both follow the same
   steps above; the only difference is step 0 (new apps need the semantic-token
   foundation set up first). Step-by-step checklist, build/verify commands,
   and common traps (modals left unswept, stale-cache false alarms):
   [references/reskin-checklist.md](references/reskin-checklist.md).

## Non-negotiables

- **True black (`#000000`) background in every color variant** — only the
  accent/text/border/fg chrome changes between phosphors, never the fact that
  it's black. This is what makes it read as one system with six skins, not six
  different apps.
- **Zero border-radius everywhere**, forced globally with `!important`
  (`important` always beats non-`important`, which is what makes this one
  rule override every vendored/library component without editing them).
- **Monospace type everywhere** — remap the font tokens once at the top of
  the CSS file; never add `font-mono` per-component.
- **Status/semantic colors (success/warning/error) stay fixed across every
  phosphor variant** — only chrome (brand/text/border/fg/bg) is re-themed per
  color. A red error and a green "done" state must read the same whether the
  user is in amber or blue mode.
- **No pill badges, no drop shadows, no circular progress rings, no rounded
  buttons** — see [references/components.md](references/components.md) for
  the exact replacements and why each exists.
