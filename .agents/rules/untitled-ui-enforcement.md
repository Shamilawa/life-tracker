# Untitled UI Enforcement

**Always On**

You MUST always adhere to the `untitled-ui` skill when working on this project. 
This project strictly follows the Untitled UI React component library conventions (Tailwind CSS v4 + React Aria Components).

**Critical Constraints:**
- Never use raw Tailwind color palettes (e.g., `text-gray-900`, `bg-blue-600`); always use semantic theme utilities (e.g., `text-primary`, `bg-brand-solid`, `border-secondary`).
- Never hand-edit vendored component files in `src/components/base`, `src/components/application`, or `src/components/foundations`.
- Use React Aria properties (e.g., `isDisabled`, `isInvalid`, `isOpen`) instead of standard DOM attributes.
- Ensure all layouts strictly follow the guidelines in the Untitled UI skill's `layout-patterns.md`, preserving the page skeleton width, card grammar, and empty state conventions.
- Consult the `untitled-ui` skill instructions for component API usage, MCP setup, or CLI commands before adding new components.
