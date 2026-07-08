# Untitled UI Enforcement & UI Workflow

**Always On**

You MUST always adhere to the `untitled-ui` skill when working on this project. 
This project strictly follows the Untitled UI React component library conventions (Tailwind CSS v4 + React Aria Components).

## Mandatory UI Task Workflow
Whenever asked to create a UI feature, fix a UI bug, or build out new screens, you MUST follow this exact sequence:

1. **Analyze Current Implementation:** Read and understand the existing structure, components, and layout of the specific screen or feature you are editing.
2. **Consult Untitled UI Standards:** Compare the proposed changes or current implementation against the Untitled UI design patterns by reading the `untitled-ui` skill documentation (particularly `layout-patterns.md` and `components.md`).
3. **Verify Compliance:** Ensure your planned implementation relies on the correct semantic theme utilities, React Aria properties, and card/page skeleton grammar (e.g., verifying you aren't adding raw palettes or nested `max-w-*` tags that break the layout).
4. **Implement:** Only after confirming the design choices align with Untitled UI standards should you proceed to write code or run CLI commands.

## Critical Constraints
- **Color & Styling:** Never use raw Tailwind color palettes (e.g., `text-gray-900`, `bg-blue-600`); always use semantic theme utilities (e.g., `text-primary`, `bg-brand-solid`, `border-secondary`).
- **Vendored Components:** Never hand-edit vendored component files in `src/components/base`, `src/components/application`, or `src/components/foundations`. If a component seems broken, attempt to reinstall it via the Untitled UI CLI (`npx untitledui@latest add <component> -y`) rather than editing it.
- **Interactivity:** Use React Aria properties (e.g., `isDisabled`, `isInvalid`, `isOpen`) instead of standard DOM attributes.
- **Layout:** Ensure all layouts strictly follow the guidelines in the Untitled UI skill's `layout-patterns.md`, preserving the page skeleton width, card grammar, and empty state conventions.
- **Reference:** Consult the `untitled-ui` skill instructions for component API usage, MCP setup, or CLI commands before adding new components.
