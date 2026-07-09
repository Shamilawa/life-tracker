"use client";

import { ThemeProvider } from "next-themes";

/** Available CRT phosphor colors. Each maps to a `phosphor-<id>` class applied to <html>. */
export const PHOSPHOR_THEMES = ["amber", "green", "blue", "cyan", "red", "white"] as const;
export type PhosphorTheme = (typeof PHOSPHOR_THEMES)[number];

const THEME_CLASS_MAP = Object.fromEntries(PHOSPHOR_THEMES.map((id) => [id, `phosphor-${id}`])) as Record<PhosphorTheme, string>;

export function Theme({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider attribute="class" themes={[...PHOSPHOR_THEMES]} defaultTheme="amber" value={THEME_CLASS_MAP}>
            {children}
        </ThemeProvider>
    );
}
