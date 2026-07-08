---
name: untitled-ui
description: Build professional React UIs with the Untitled UI component library (Tailwind CSS v4 + React Aria Components). Use this skill whenever the user mentions Untitled UI / untitledui in any form, wants a "professional", "clean", "modern SaaS" look for a React app, asks to set up or use the untitledui CLI or its MCP server, wants to add Untitled UI to an existing Vite/Next.js project, or complains that a UI looks amateurish or "AI-generated" and wants a component-library-grade redesign. Covers MCP setup, CLI commands, Tailwind v4 foundation install, theme tokens, component APIs, and dashboard/app-shell layout patterns.
---

# Untitled UI React

Untitled UI React is a copy-into-your-repo component library (like shadcn, not like MUI):
components are TypeScript source files installed into `src/components/`, built on
**Tailwind CSS v4** and **React Aria Components**, styled by a CSS-variable theme.
You own the code after install. Free tier covers all base components; application
components and page templates beyond the basics are PRO (license required).

Three ways to get components, in order of preference:

1. **MCP server** (if connected) — semantic search + install from the assistant
2. **CLI** — `npx untitledui@latest …` — works everywhere, no auth for free tier
3. **Manual copy** from a scaffolded starter kit (fallback, also how you get theme files)

## MCP server

Check the available tools list for `untitledui` MCP tools (e.g. `search_components`,
`get_page_templates`). If present, prefer them: semantic search understands intent
("a stat card with a trend arrow") better than guessing CLI component names.

If not connected, it cannot be enabled mid-session. Tell the user to run, in a terminal:

```
claude mcp add untitledui --transport http https://www.untitledui.com/react/api/mcp
```

(OAuth flow on first use; alternatively `--header "Authorization: Bearer <API_KEY>"`.)
Then continue with the CLI — it installs the same components, so never block on the MCP.

## CLI essentials

Always pass `-y` (non-interactive mode, made for AI agents). Without it the CLI
prompts and hangs a non-interactive shell.

```bash
npx untitledui@latest init my-app --vite -y     # scaffold new project (--nextjs for Next)
npx untitledui@latest add button badges input select modal -y   # add to existing project
npx untitledui@latest search "kanban board"     # semantic component search
npx untitledui@latest example dashboard-01 -y   # full sample page (PRO for most)
npx untitledui@latest login                     # only needed for PRO components
```

Component names are their directory names and are often **plural**: `badges` (not
`badge`), `buttons` is `button`, `tags`, `progress-indicators`. If the CLI reports
"Skipped N unresolved component(s)", the name was wrong — run `search` to find the
real one, or scaffold the starter and copy the file (see below).

## The critical gotcha: `add` does not set up Tailwind

`add` copies component sources and installs their npm deps (`react-aria-components`,
`@untitledui/icons`, `tailwind-merge`) and adds the `@/*` tsconfig path alias — but in
an existing project it does **not** install Tailwind v4 or the theme. Components will
render unstyled until you complete the foundation setup. Follow
[references/setup.md](references/setup.md) — it has the exact packages, CSS files,
and Vite/Next config, plus the starter-kit copy trick for getting `theme.css`.

Quick checklist for an existing Vite project (details in setup.md):

1. `npm i tailwindcss @tailwindcss/vite tailwindcss-react-aria-components tailwindcss-animate @tailwindcss/typography`
2. Scaffold a throwaway starter (`npx untitledui@latest init ref --vite -y` in a temp dir)
   and copy `src/styles/{theme.css,globals.css,typography.css}` into your project
3. Vite config: add `tailwindcss()` plugin and the `@` → `./src` alias
4. Import `styles/globals.css` in your entry file; load the Inter font in `index.html`
5. tsconfig: `"paths": { "@/*": ["./src/*"] }`, and turn **off** `noUnusedLocals` /
   `noUnusedParameters` (vendor components fail those; the starter lints via ESLint instead)

## Core rules when building with it

- **Never hand-edit files under `src/components/base|application|foundations`** —
  they're vendored library code; re-running `add` overwrites them. Wrap or compose
  in your own components instead.
- **React Aria conventions, not DOM conventions**: `isDisabled` not `disabled`,
  `Input`'s `onChange` receives the **string value** (not an event), Modal open
  state is `isOpen` + `onOpenChange`. Getting these wrong fails silently.
  Component-by-component APIs: [references/components.md](references/components.md).
- **Use semantic theme utilities, never raw palette classes**: `text-primary`,
  `text-tertiary`, `bg-primary`, `bg-secondary_subtle`, `border-secondary`,
  `bg-brand-solid`, `fg-quaternary` — not `text-gray-900` or `bg-purple-600`. This is
  what keeps the design coherent and makes dark mode / rebranding a one-file change.
  Full token map and customization: [references/theming.md](references/theming.md).
- **Icons**: `@untitledui/icons` is installed with any component and matches the
  design language. `lucide-react` also blends fine (similar stroke style) if the
  project already uses it. Never mix icon sets within one view.
- **Charts**: the library's chart components need `recharts`. For custom SVG charts,
  color with theme CSS vars (`var(--color-fg-brand-primary)` etc.) and render at
  1:1 pixel scale (measure the container; don't stretch a fixed viewBox — it scales
  the axis text and breaks typography consistency).

## Building screens that look professional

For app shells, page headers, stat cards, tables, and the composition recipes that
make a dashboard read as "designed" rather than assembled, read
[references/layout-patterns.md](references/layout-patterns.md). The short version:

- One `AppShell`-style frame (sidebar + top bar) rendered once; every screen renders
  through one shared `Page` component (title, description, actions) — uniformity is
  most of what "professional" means
- Cards are `rounded-xl bg-primary shadow-xs ring-1 ring-secondary` on a
  `bg-secondary_subtle` canvas — elevation by contrast, not heavy shadows
- Type scale: page titles `text-lg font-semibold`, card titles `text-md font-semibold`,
  body `text-sm`, metadata `text-xs text-tertiary`; big numbers `text-display-xs`+
- One primary button per view; secondary/tertiary/link for everything else
- Status = `BadgeWithDot` with semantic colors; sentence case everywhere; no emoji
