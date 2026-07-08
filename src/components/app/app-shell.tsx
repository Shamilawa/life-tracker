"use client";

import type { FC, HTMLAttributes, ReactNode } from "react";
import { BarChart01, Clock, MessageChatCircle, Repeat01, Sun, Target01 } from "@untitledui/icons";
import { usePathname } from "next/navigation";
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

export function AppShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex h-dvh bg-primary">
            <aside className="flex w-66 shrink-0 flex-col border-r border-secondary bg-primary max-lg:hidden">
                <div className="flex h-16 shrink-0 items-center gap-3 border-b border-secondary px-5">
                    <UntitledLogoMinimal className="size-8" />
                    <div>
                        <p className="text-sm font-semibold text-primary">Lifestyle OS</p>
                        <p className="text-xs text-tertiary">Personal tracker</p>
                    </div>
                </div>

                <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-5">
                    {NAV_SECTIONS.map((section) => (
                        <div key={section.label}>
                            <p className="px-3 pb-2 text-xs font-semibold tracking-wide text-quaternary uppercase">{section.label}</p>
                            <ul className="flex flex-col gap-0.5">
                                {section.items.map((item) => (
                                    <li key={item.href}>
                                        <NavItemBase type="link" href={item.href} icon={item.icon} current={pathname === item.href} badge={item.badge}>
                                            {item.label}
                                        </NavItemBase>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </nav>

                <div className="px-4 pb-5">
                    <div className="rounded-lg p-4 ring-1 ring-secondary">
                        <p className="text-sm font-semibold text-primary">Phase 1 — Foundation</p>
                        <p className="mt-0.5 text-xs text-tertiary">AI assistant arrives in Phase 2.</p>
                    </div>
                    <p className="mt-3 px-1 text-xs text-quaternary">Built for one user. You.</p>
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-16 shrink-0 items-center justify-between border-b border-secondary bg-primary px-6">
                    {/* The Today page renders its own date + day nav, so avoid a duplicate here. */}
                    <p className="text-sm text-tertiary">
                        {pathname === "/" ? "" : new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
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
