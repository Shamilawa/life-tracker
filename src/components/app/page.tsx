import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Shared page skeleton — every screen renders through this so titles,
 * descriptions, and actions sit in the same place on every route.
 */
export function Page({
    title,
    titleTrailing,
    description,
    actions,
    back,
    children,
}: {
    title: string;
    titleTrailing?: ReactNode;
    description?: string;
    actions?: ReactNode;
    back?: { label: string; href: string };
    children: ReactNode;
}) {
    return (
        <div className="mx-auto max-w-7xl px-8 py-6">
            {back && (
                <Link href={back.href} className="mb-3 inline-flex items-center gap-1.5 text-xs tracking-widest text-tertiary uppercase hover:text-brand-secondary">
                    <span aria-hidden="true">◂</span>
                    {back.label}
                </Link>
            )}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-secondary pb-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="text-brand-secondary" aria-hidden="true">
                            &gt;
                        </span>
                        <h1 className="text-lg font-bold tracking-wide text-primary uppercase term-glow">{title}</h1>
                        {titleTrailing}
                    </div>
                    {description && <p className="mt-1 text-sm text-tertiary">{description}</p>}
                </div>
                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
            <div className="mt-6">{children}</div>
        </div>
    );
}
