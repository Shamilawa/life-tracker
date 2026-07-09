"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { cx } from "@/utils/cx";

const PHOSPHORS = [
    { id: "amber", label: "AMBER", swatch: "#ff9e2c" },
    { id: "green", label: "GREEN", swatch: "#33ff99" },
    { id: "blue", label: "BLUE", swatch: "#29b6ff" },
    { id: "cyan", label: "CYAN", swatch: "#22e0e0" },
    { id: "red", label: "RED", swatch: "#ff3b3b" },
    { id: "white", label: "MONO", swatch: "#f2f2f2" },
] as const;

/**
 * Phosphor color picker. The theme classes (`phosphor-<id>`) are wired
 * through next-themes in `src/providers/theme.tsx` and remapped to full
 * palettes in `terminal.css`. Guarded by `mounted` so the server render
 * never mismatches the client's persisted choice.
 */
export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!open) return;
        function onPointerDown(e: PointerEvent) {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        }
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false);
        }
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    const current = PHOSPHORS.find((p) => p.id === theme) ?? PHOSPHORS[0];

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
                title="Select phosphor color"
                className="flex items-center gap-1.5 border border-secondary px-2 py-1 text-[11px] tracking-widest text-tertiary uppercase transition duration-100 hover:border-brand hover:text-brand-secondary"
            >
                <span className="inline-block size-2 shrink-0" style={{ background: mounted ? current.swatch : "#666" }} />
                <span className="tabular-nums">{mounted ? current.label : "····"}</span>
            </button>

            {open && (
                <div role="listbox" className="absolute top-full right-0 z-50 mt-1 w-32 border border-secondary bg-secondary py-1 shadow-lg">
                    {PHOSPHORS.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            role="option"
                            aria-selected={p.id === current.id}
                            onClick={() => {
                                setTheme(p.id);
                                setOpen(false);
                            }}
                            className={cx(
                                "flex w-full items-center gap-2 px-2 py-1 text-left text-[11px] tracking-widest uppercase transition duration-100 hover:bg-secondary_hover",
                                p.id === current.id ? "text-brand-secondary" : "text-tertiary",
                            )}
                        >
                            <span className="inline-block size-2 shrink-0" style={{ background: p.swatch }} />
                            <span className="flex-1">{p.label}</span>
                            {p.id === current.id && <span>✓</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
