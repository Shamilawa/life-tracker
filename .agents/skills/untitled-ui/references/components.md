# Untitled UI — Component API Cheat Sheet

APIs verified against the installed sources (v8-era, 2026). Everything is React Aria
based: state props are `is*` (`isDisabled`, `isInvalid`, `isOpen`), and text inputs
give you values, not events. When unsure about a prop, read the component's source —
it's in your repo under `src/components/` and the prop types are explicit.

## Button — `@/components/base/buttons/button`

```tsx
<Button color="primary" size="md" iconLeading={Plus} onClick={...}>Add goal</Button>
```

- `color`: `primary` | `secondary` | `tertiary` | `link-gray` | `link-color` |
  `primary-destructive` | `secondary-destructive` | `tertiary-destructive` | `link-destructive`
- `size`: `xs` | `sm` | `md` | `lg` | `xl`
- `iconLeading` / `iconTrailing`: pass the icon **component**, not an element
- `isDisabled` (not `disabled`), `isLoading`
- Icon-only: pass `iconLeading` with no children + `aria-label`
- Discipline: one `primary` per view; `secondary` for parallel actions; `tertiary`
  and links for low-emphasis; destructive variants for irreversible actions

## Input — `@/components/base/input/input`

```tsx
<Input
  label="Deadline"
  hint="Helper text or error message"
  placeholder="50000"
  type="number"                 // or date, email, password (password gets an eye toggle)
  value={value}
  onChange={setValue}           // (value: string) => void — NOT an event
  isInvalid={!!error}           // turns border + hint red
  isRequired
  icon={SearchIcon}             // leading icon component
  shortcut="⌘K"                 // renders a keyboard-shortcut chip
  size="sm" | "md"
/>
```

Error pattern: keep one `error` state; render `hint={error ?? normalHint}` +
`isInvalid={!!error}`; clear the error inside `onChange`.

## Select

- `NativeSelect` — `@/components/base/select/select-native`. Plain `<select>` styled:
  `options: { label, value }[]`, standard DOM `onChange={(e) => e.target.value}`,
  plus `label` / `hint`. Prefer for forms — zero ceremony.
- `Select` — `@/components/base/select/select`. React Aria listbox: compose with
  `Select.Item`, props `selectedKey` / `onSelectionChange`. Use when you need rich
  option rendering (icons, descriptions).

## Modal — `@/components/application/modals/modal`

Composition, not a monolith (no built-in header/footer — build them):

```tsx
<ModalOverlay isOpen onOpenChange={(open) => !open && onClose()} isDismissable>
  <Modal className="w-full max-w-140">
    <Dialog>
      <div className="p-6">
        {/* header: title + close button; body; footer: right-aligned buttons */}
      </div>
    </Dialog>
  </Modal>
</ModalOverlay>
```

Width via `max-w-*` on `Modal`. Overlay handles backdrop blur, entry/exit animation,
Escape/click-outside (via `isDismissable`), focus trapping.

## Badges — `@/components/base/badges/badges` (plural!)

```tsx
<Badge type="pill-color" color="success" size="sm">Active</Badge>
<BadgeWithDot type="pill-color" color="warning" size="sm">At risk</BadgeWithDot>
<BadgeWithIcon iconLeading={ArrowUp} color="success">12%</BadgeWithIcon>
```

- `type`: `pill-color` (tinted pill — the usual choice) | `color` | `modern` (white + ring)
- `color`: `gray` | `brand` | `error` | `warning` | `success` | `blue` | `indigo` |
  `purple` | `pink` | `orange` | `sky` | `slate`
- Status convention: success=healthy, warning=at risk, error=blocked/behind,
  brand=info/current, gray=neutral/type labels

## Progress — `@/components/base/progress-indicators/`

- `ProgressBarCircle` (from `progress-circles`): `value` 0–100, `size` `xxs`–`lg`,
  percentage label inside. Don't repeat the % as text next to it.
- `ProgressBar` (from `progress-indicators`): linear bar, `value`, optional label.

## FeaturedIcon — `@/components/foundations/featured-icon/featured-icon`

The squircle icon container used in empty states, modals, option cards:

```tsx
<FeaturedIcon icon={Target} color="brand" theme="modern" size="lg" />
```

`color`: brand | gray | success | warning | error · `theme`: `modern` (ring) |
`light` (tint) | `gradient` | `dark` · `size`: sm–xl.

## Avatar — `@/components/base/avatar/avatar`

`<Avatar size="md" src={url} alt={name} initials="SW" />` — `initials` is the
fallback when no `src`. `AvatarLabelGroup` adds `title` + `subtitle` beside it
(user blocks in top bars).

## Tooltip — `@/components/base/tooltip/tooltip`

`<Tooltip title="Delete goal"><TooltipTrigger>…</TooltipTrigger></Tooltip>`.
Required on icon-only buttons.

## Composition patterns

**Selectable option cards** (wizards, pickers) — there's no dedicated component;
the idiom is a button styled as a card:

```tsx
<button
  onClick={select}
  className="flex cursor-pointer items-start gap-4 rounded-xl p-4 text-left
             ring-1 ring-secondary transition duration-100 hover:ring-2 hover:ring-brand"
>
  <FeaturedIcon color="brand" theme="modern" size="md" icon={Icon} />
  <div>
    <p className="text-sm font-semibold text-primary">{title}</p>
    <p className="mt-0.5 text-sm text-tertiary">{description}</p>
  </div>
</button>
```

**Search with dropdown results**: `Input` with `icon={Search}` + `shortcut="⌘K"`,
absolute-positioned results panel (`rounded-lg bg-primary shadow-lg ring-1
ring-secondary`), select on `onMouseDown` (preventDefault) so blur doesn't eat the click.

**Custom SVG charts**: color exclusively with theme vars —
`var(--color-fg-brand-primary)` (series), `var(--color-border-secondary)` (grid),
`var(--color-text-quaternary)` (axis text, `fontSize={12}`),
`var(--color-fg-error-primary|warning|success)` (status). Measure the container
with a `ResizeObserver` and render `width={px}` at fixed height — never stretch a
fixed `viewBox` to full width, it scales axis text out of step with the page type.
