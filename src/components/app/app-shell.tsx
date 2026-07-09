"use client";

import { type ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AssistantDrawer } from "@/components/app/assistant-drawer";
import { ThemeToggle } from "@/components/app/theme-toggle";
import type { UiMessage } from "@/lib/assistant/history";
import { cx } from "@/utils/cx";

type NavEntry = { label: string; href: string; fkey: string; code: string; opensDrawer?: boolean };
type NavSection = { label: string; items: NavEntry[] };

// Function-key mapped modules, terminal-menu style.
const NAV_SECTIONS: NavSection[] = [
    {
        label: "General",
        items: [
            { label: "Today", href: "/", fkey: "F1", code: "TDY" },
            { label: "Insights", href: "/insights", fkey: "F2", code: "INS" },
        ],
    },
    {
        label: "Plan",
        items: [
            { label: "Goals", href: "/goals", fkey: "F3", code: "GOL" },
            { label: "Habits", href: "/habits", fkey: "F4", code: "HBT" },
            { label: "Routines", href: "/routines", fkey: "F5", code: "RTN" },
        ],
    },
    {
        label: "Assistant",
        // Opens as a slide-over from wherever you are instead of navigating away —
        // /assistant still exists as a direct link for a full-page conversation.
        items: [{ label: "Assistant", href: "/assistant", fkey: "F6", code: "AI", opensDrawer: true }],
    },
];

const FLAT_NAV = NAV_SECTIONS.flatMap((s) => s.items);

function isCurrent(pathname: string, href: string) {
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Live HH:MM:SS · YYYY-MM-DD clock. Empty until mounted to avoid hydration skew. */
function Clock() {
    const [now, setNow] = useState<Date | null>(null);
    useEffect(() => {
        setNow(new Date());
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const time = now
        ? now.toLocaleTimeString("en-GB", { hour12: false })
        : "--:--:--";
    const date = now ? now.toISOString().slice(0, 10) : "----------";

    return (
        <span className="tabular-nums text-secondary">
            <span className="text-brand-secondary">{date}</span> <span className="text-quaternary">·</span> {time}
        </span>
    );
}

function BrandMark() {
    return (
        <Link href="/" className="group flex items-baseline gap-2">
            <span className="text-sm font-bold tracking-[0.2em] text-brand-secondary term-glow uppercase">LIFESTYLE//OS</span>
            <span className="text-[10px] tracking-widest text-quaternary uppercase max-md:hidden">v1.0</span>
        </Link>
    );
}

function NavMenu({
    pathname,
    onNavigate,
    assistantOpen,
    onOpenAssistant,
}: {
    pathname: string;
    onNavigate?: () => void;
    assistantOpen: boolean;
    onOpenAssistant: () => void;
}) {
    return (
        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
            {NAV_SECTIONS.map((section) => (
                <div key={section.label}>
                    <p className="flex items-center gap-2 px-2 pb-2 text-[10px] tracking-[0.25em] text-quaternary uppercase">
                        <span className="text-brand-secondary/60">──</span>
                        {section.label}
                    </p>
                    <ul className="flex flex-col">
                        {section.items.map((item) => {
                            const current = item.opensDrawer ? assistantOpen : isCurrent(pathname, item.href);
                            const itemClasses = cx(
                                "group flex items-center gap-2 px-2 py-1.5 text-[13px] tracking-wide uppercase transition duration-100",
                                current
                                    ? "bg-brand-solid text-primary_on-brand"
                                    : "text-tertiary hover:bg-secondary_hover hover:text-primary",
                            );
                            const inner = (
                                <>
                                    <span className={cx("w-3 shrink-0", current ? "text-primary_on-brand" : "text-brand-secondary")}>
                                        {current ? ">" : " "}
                                    </span>
                                    <span
                                        className={cx(
                                            "w-6 shrink-0 text-[10px] tabular-nums",
                                            current ? "text-primary_on-brand/70" : "text-quaternary",
                                        )}
                                    >
                                        {item.fkey}
                                    </span>
                                    <span className="flex-1 truncate">{item.label}</span>
                                    <span className={cx("text-[10px]", current ? "text-primary_on-brand/70" : "text-quaternary/60")}>
                                        {item.code}
                                    </span>
                                </>
                            );
                            return (
                                <li key={item.href}>
                                    {item.opensDrawer ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onOpenAssistant();
                                                onNavigate?.();
                                            }}
                                            className={cx(itemClasses, "w-full text-left")}
                                        >
                                            {inner}
                                        </button>
                                    ) : (
                                        <Link href={item.href} onClick={onNavigate} className={itemClasses}>
                                            {inner}
                                        </Link>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </nav>
    );
}

function SidebarStatus() {
    return (
        <div className="border-t border-secondary px-3 py-3">
            <div className="border border-secondary bg-secondary_subtle p-2.5 text-[11px] leading-relaxed">
                <p className="flex items-center justify-between text-quaternary uppercase">
                    <span>SYSTEM</span>
                    <span className="flex items-center gap-1.5 text-success-primary">
                        <span className="inline-block size-1.5 animate-pulse bg-fg-success-primary" />
                        NOMINAL
                    </span>
                </p>
                <p className="mt-1.5 text-tertiary">
                    <span className="text-quaternary">$</span> track today, then query the <span className="text-brand-secondary">AI</span> module.
                </p>
            </div>
            <p className="mt-2 px-1 text-[10px] tracking-widest text-quaternary uppercase">single-user · local-first</p>
        </div>
    );
}

export function AppShell({
    children,
    assistantInitialMessages,
    assistantHasApiKey,
}: {
    children: ReactNode;
    assistantInitialMessages: UiMessage[];
    assistantHasApiKey: boolean;
}) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [assistantOpen, setAssistantOpen] = useState(false);

    // Close the mobile nav drawer whenever the route changes.
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    const activeCode = FLAT_NAV.find((i) => isCurrent(pathname, i.href))?.code ?? "---";

    return (
        <div className="flex h-dvh flex-col bg-primary text-primary">
            {/* ── Top command bar ─────────────────────────────────────────── */}
            <header className="flex h-11 shrink-0 items-center justify-between border-b border-primary bg-secondary px-3 sm:px-4">
                <div className="flex min-w-0 items-center gap-3">
                    <button
                        type="button"
                        aria-label="Open menu"
                        onClick={() => setMobileOpen(true)}
                        className="flex size-7 shrink-0 items-center justify-center border border-secondary text-fg-quaternary transition duration-100 hover:border-brand hover:text-brand-secondary lg:hidden"
                    >
                        ≡
                    </button>
                    <BrandMark />
                    <span className="text-quaternary max-sm:hidden">│</span>
                    <span className="text-xs tracking-widest text-quaternary uppercase max-sm:hidden">
                        <span className="text-brand-secondary">◂</span> {activeCode}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs max-sm:hidden">
                        <Clock />
                    </span>
                    <ThemeToggle />
                    <span className="hidden items-center gap-2 border border-secondary px-2 py-1 text-[11px] tracking-widest text-secondary uppercase sm:flex">
                        <span className="inline-block size-1.5 bg-fg-success-primary" />
                        SW
                    </span>
                </div>
            </header>

            <div className="flex min-h-0 flex-1">
                {/* ── Desktop sidebar ─────────────────────────────────────── */}
                <aside className="flex w-64 shrink-0 flex-col border-r border-primary bg-secondary max-lg:hidden">
                    <NavMenu pathname={pathname} assistantOpen={assistantOpen} onOpenAssistant={() => setAssistantOpen(true)} />
                    <SidebarStatus />
                </aside>

                {/* ── Mobile drawer ───────────────────────────────────────── */}
                {mobileOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <button
                            type="button"
                            aria-label="Close menu"
                            onClick={() => setMobileOpen(false)}
                            className="absolute inset-0 bg-overlay animate-in fade-in duration-200"
                        />
                        <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-primary bg-secondary animate-in slide-in-from-left duration-200">
                            <div className="flex h-11 shrink-0 items-center justify-between border-b border-primary px-3">
                                <BrandMark />
                                <button
                                    type="button"
                                    aria-label="Close menu"
                                    onClick={() => setMobileOpen(false)}
                                    className="flex size-7 items-center justify-center border border-secondary text-fg-quaternary transition duration-100 hover:border-brand hover:text-brand-secondary"
                                >
                                    ✕
                                </button>
                            </div>
                            <NavMenu
                                pathname={pathname}
                                onNavigate={() => setMobileOpen(false)}
                                assistantOpen={assistantOpen}
                                onOpenAssistant={() => setAssistantOpen(true)}
                            />
                            <SidebarStatus />
                        </aside>
                    </div>
                )}

                <main className="min-w-0 flex-1 overflow-y-auto bg-primary">{children}</main>
            </div>

            {/* ── Bottom status line ──────────────────────────────────────── */}
            <footer className="flex h-6 shrink-0 items-center gap-4 border-t border-primary bg-secondary px-3 text-[10px] tracking-widest text-quaternary uppercase">
                <span className="text-brand-secondary">READY</span>
                <span className="max-sm:hidden">[F1-F6] NAV</span>
                <span className="max-sm:hidden">[◈] PHOSPHOR</span>
                <span className="ml-auto flex items-center gap-1.5">
                    <span className="inline-block size-1.5 animate-pulse bg-fg-success-primary" />
                    CONNECTED
                </span>
            </footer>

            <AssistantDrawer
                open={assistantOpen}
                onClose={() => setAssistantOpen(false)}
                initialMessages={assistantInitialMessages}
                hasApiKey={assistantHasApiKey}
            />
        </div>
    );
}
