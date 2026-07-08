"use client";

import { type FC, type HTMLAttributes, type ReactNode, useEffect, useState } from "react";
import { BarChart01, Clock, Menu01, MessageChatCircle, Repeat01, Sun, Target01, XClose } from "@untitledui/icons";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Avatar } from "@/components/base/avatar/avatar";
import { NavItemBase } from "@/components/application/app-navigation/base-components/nav-item";
import { UntitledLogoMinimal } from "@/components/foundations/logo/untitledui-logo-minimal";

type NavEntry = {
    label: string;
    href: string;
    icon: FC<HTMLAttributes<HTMLOrSVGElement>>;
    badge?: ReactNode;
};

const NAV_SECTIONS: Array<{ label: string; items: NavEntry[] }> = [
    {
        label: "General",
        items: [
            { label: "Today", href: "/", icon: Sun },
            { label: "Insights", href: "/insights", icon: BarChart01 },
        ],
    },
    {
        label: "Plan",
        items: [
            { label: "Goals", href: "/goals", icon: Target01 },
            { label: "Habits", href: "/habits", icon: Repeat01 },
            { label: "Routines", href: "/routines", icon: Clock },
        ],
    },
    {
        label: "Assistant",
        items: [{ label: "Assistant", href: "/assistant", icon: MessageChatCircle }],
    },
];

function BrandRow() {
    return (
        <div className="flex items-center gap-3">
            <UntitledLogoMinimal className="size-8" />
            <div>
                <p className="text-sm font-semibold text-primary">Lifestyle OS</p>
                <p className="text-xs text-tertiary">Personal tracker</p>
            </div>
        </div>
    );
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
    return (
        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-5">
            {NAV_SECTIONS.map((section) => (
                <div key={section.label}>
                    <p className="px-3 pb-2 text-xs font-semibold tracking-wide text-quaternary uppercase">{section.label}</p>
                    <ul className="flex flex-col gap-0.5">
                        {section.items.map((item) => (
                            <li key={item.href} onClick={onNavigate}>
                                <NavItemBase type="link" href={item.href} icon={item.icon} current={pathname === item.href} badge={item.badge}>
                                    {item.label}
                                </NavItemBase>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </nav>
    );
}

function SidebarFooter() {
    return (
        <div className="px-4 pb-5">
            <div className="rounded-lg p-4 ring-1 ring-secondary">
                <p className="text-sm font-semibold text-primary">All systems ready</p>
                <p className="mt-0.5 text-xs text-tertiary">Track your day, then ask the assistant what to focus on next.</p>
            </div>
            <p className="mt-3 px-1 text-xs text-quaternary">Built for one user. You.</p>
        </div>
    );
}

export function AppShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    // Close the mobile drawer whenever the route changes.
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    return (
        <div className="flex h-dvh bg-primary">
            {/* Desktop sidebar */}
            <aside className="flex w-66 shrink-0 flex-col border-r border-secondary bg-primary max-lg:hidden">
                <div className="flex h-16 shrink-0 items-center border-b border-secondary px-5">
                    <BrandRow />
                </div>
                <SidebarNav pathname={pathname} />
                <SidebarFooter />
            </aside>

            {/* Mobile slide-over drawer */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button
                        type="button"
                        aria-label="Close menu"
                        onClick={() => setMobileOpen(false)}
                        className="absolute inset-0 bg-overlay animate-in fade-in duration-200"
                    />
                    <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-secondary bg-primary animate-in slide-in-from-left duration-200">
                        <div className="flex h-16 shrink-0 items-center justify-between border-b border-secondary pr-3 pl-5">
                            <BrandRow />
                            <button
                                type="button"
                                aria-label="Close menu"
                                onClick={() => setMobileOpen(false)}
                                className="flex size-9 items-center justify-center rounded-lg text-fg-quaternary transition duration-100 hover:bg-primary_hover hover:text-fg-secondary"
                            >
                                <XClose className="size-5" />
                            </button>
                        </div>
                        <SidebarNav pathname={pathname} onNavigate={() => setMobileOpen(false)} />
                        <SidebarFooter />
                    </aside>
                </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-16 shrink-0 items-center justify-between border-b border-secondary bg-primary px-4 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            type="button"
                            aria-label="Open menu"
                            onClick={() => setMobileOpen(true)}
                            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-fg-quaternary transition duration-100 hover:bg-primary_hover hover:text-fg-secondary lg:hidden"
                        >
                            <Menu01 className="size-5" />
                        </button>
                        {/* The Today page renders its own date + day nav, so avoid a duplicate here. */}
                        <p className="truncate text-sm text-tertiary max-sm:hidden">
                            {pathname === "/" ? "" : new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <div className="mx-1 h-6 border-l border-secondary max-sm:hidden" />
                        <div className="text-right max-sm:hidden">
                            <p className="text-sm font-semibold text-primary">Shamila</p>
                            <p className="text-xs text-tertiary">shamilawasalagedara16@gmail.com</p>
                        </div>
                        <Avatar size="md" alt="Shamila" initials="SW" />
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto bg-secondary_subtle">{children}</main>
            </div>
        </div>
    );
}
