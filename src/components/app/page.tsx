import type { ReactNode } from "react";

/**
 * Shared page skeleton — every screen renders through this so titles,
 * descriptions, and actions sit in the same place on every route.
 */
export function Page({
    title,
    titleTrailing,
    description,
    actions,
    children,
}: {
    title: string;
    titleTrailing?: ReactNode;
    description?: string;
    actions?: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="mx-auto max-w-7xl px-8 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-lg font-semibold text-primary">{title}</h1>
                        {titleTrailing}
                    </div>
                    {description && <p className="mt-0.5 text-sm text-tertiary">{description}</p>}
                </div>
                {actions && <div className="flex items-center gap-3">{actions}</div>}
            </div>
            <div className="mt-6">{children}</div>
        </div>
    );
}
