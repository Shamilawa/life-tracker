"use client";

import { useEffect, useState } from "react";
import { Moon01, Sun } from "@untitledui/icons";
import { useTheme } from "next-themes";
import { ButtonUtility } from "@/components/base/buttons/button-utility";

/**
 * Light/dark switch. The theme classes (`light-mode`/`dark-mode`) are wired
 * through next-themes in `src/providers/theme.tsx`; this just flips them.
 * Guarded by `mounted` so the server-rendered icon never mismatches the client.
 */
export function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const isDark = mounted && resolvedTheme === "dark";

    return (
        <ButtonUtility
            size="sm"
            color="tertiary"
            icon={isDark ? Sun : Moon01}
            tooltip={isDark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setTheme(isDark ? "light" : "dark")}
        />
    );
}
