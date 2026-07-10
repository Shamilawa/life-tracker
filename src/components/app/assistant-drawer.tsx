"use client";

import { useEffect } from "react";
import { AssistantChat } from "@/components/app/assistant-chat";
import type { UiMessage } from "@/lib/assistant/history";
import type { AssistantSignal } from "@/lib/db/schema";
import type { AssistantPreferences } from "@/lib/queries";
import { cx } from "@/utils/cx";

/**
 * Global slide-over so the assistant can be reached from any page without
 * losing the page underneath — e.g. adding a goal via chat while looking at /goals.
 */
export function AssistantDrawer({
    open,
    onClose,
    initialMessages,
    hasApiKey,
    signals,
    preferences,
}: {
    open: boolean;
    onClose: () => void;
    initialMessages: UiMessage[];
    hasApiKey: boolean;
    signals: AssistantSignal[];
    preferences: AssistantPreferences;
}) {
    useEffect(() => {
        if (!open) return;
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    // Always mounted (never unmount on close) so the in-progress conversation
    // survives repeated open/close toggles instead of resetting to the
    // server-loaded snapshot every time the panel reopens.
    return (
        <div className={cx("fixed inset-0 z-50", !open && "pointer-events-none")}>
            <button
                type="button"
                aria-label="Close assistant"
                aria-hidden={!open}
                tabIndex={open ? 0 : -1}
                onClick={onClose}
                className={cx("absolute inset-0 bg-overlay transition-opacity duration-200", open ? "opacity-100" : "opacity-0")}
            />
            <aside
                className={cx(
                    "absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-primary bg-primary transition-transform duration-200",
                    open ? "translate-x-0" : "translate-x-full",
                )}
            >
                <AssistantChat
                    initialMessages={initialMessages}
                    hasApiKey={hasApiKey}
                    signals={signals}
                    preferences={preferences}
                    onClose={onClose}
                />
            </aside>
        </div>
    );
}
