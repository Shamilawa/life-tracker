"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle, RefreshCcw01, Send01, Stars01, XClose } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/base/badges/badges";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { clearChatHistory } from "@/lib/actions";
import type { UiMessage } from "@/lib/assistant/history";
import { cx } from "@/utils/cx";

type ChatMessage = { id: string; role: "user" | "assistant"; text: string; tools: string[] };

const TOOL_LABELS: Record<string, string> = {
    get_today: "Checked today",
    get_habits: "Reviewed habits",
    get_goals: "Reviewed goals",
    get_routines: "Reviewed routines",
    get_insights: "Pulled insights",
    log_habit: "Logged a habit",
    create_habit: "Created a habit",
    create_task: "Created a task",
    complete_task: "Completed a task",
    create_goal: "Created a goal",
    add_milestone: "Added a milestone",
};

const SUGGESTIONS = [
    "What should I focus on today?",
    "How consistent have I been this month?",
    "I finished my workout and meditation",
    "Which habits am I slipping on?",
];

export function AssistantChat({
    initialMessages,
    hasApiKey,
    onClose,
}: {
    initialMessages: UiMessage[];
    hasApiKey: boolean;
    /** Present when rendered inside the global slide-over (as opposed to the dedicated /assistant page) — shows a close button and tightens spacing. */
    onClose?: () => void;
}) {
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [missingKey, setMissingKey] = useState(!hasApiKey);
    const [isClearing, startClear] = useTransition();
    const router = useRouter();

    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages]);

    async function send(text: string) {
        const trimmed = text.trim();
        if (!trimmed || isStreaming) return;

        setInput("");
        const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text: trimmed, tools: [] };
        const assistantId = crypto.randomUUID();
        setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", text: "", tools: [] }]);
        setIsStreaming(true);

        const update = (fn: (m: ChatMessage) => ChatMessage) =>
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? fn(m) : m)));

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ message: trimmed }),
            });

            if (res.status === 503) {
                setMissingKey(true);
                setMessages((prev) => prev.filter((m) => m.id !== assistantId));
                return;
            }
            if (!res.ok || !res.body) {
                update((m) => ({ ...m, text: "Sorry — I couldn't reach the assistant. Please try again." }));
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let usedTool = false;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                    if (!line.trim()) continue;
                    const event = JSON.parse(line) as { type: string; text?: string; name?: string; message?: string };
                    if (event.type === "text") update((m) => ({ ...m, text: m.text + (event.text ?? "") }));
                    else if (event.type === "tool") {
                        usedTool = true;
                        update((m) => ({ ...m, tools: [...m.tools, event.name!] }));
                    } else if (event.type === "error") update((m) => ({ ...m, text: m.text || `Error: ${event.message}` }));
                }
            }

            // A write tool (create_goal, log_habit, …) may have changed data another
            // page is currently showing behind this chat — pull it fresh.
            if (usedTool) router.refresh();
        } catch {
            update((m) => ({ ...m, text: m.text || "Sorry — the connection dropped. Please try again." }));
        } finally {
            setIsStreaming(false);
            textareaRef.current?.focus();
        }
    }

    function clearAll() {
        startClear(async () => {
            await clearChatHistory();
            setMessages([]);
        });
    }

    const compact = Boolean(onClose);

    return (
        <div className="flex h-full flex-col">
            <div className={cx("flex shrink-0 items-center justify-between border-b border-secondary bg-primary", compact ? "px-4 py-3" : "px-8 py-4")}>
                <div className="flex items-center gap-2.5">
                    <h1 className="text-lg font-semibold text-primary">Assistant</h1>
                    <Badge type="pill-color" color="brand" size="sm">
                        Phase 2
                    </Badge>
                </div>
                <div className="flex items-center gap-1">
                    {messages.length > 0 && (
                        <ButtonUtility
                            size="sm"
                            color="tertiary"
                            icon={RefreshCcw01}
                            tooltip="Clear conversation"
                            isDisabled={isClearing}
                            onClick={clearAll}
                        />
                    )}
                    {onClose && <ButtonUtility size="sm" color="tertiary" icon={XClose} tooltip="Close" onClick={onClose} />}
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto">
                <div className={cx("mx-auto", compact ? "px-4 py-4" : "max-w-3xl px-6 py-6")}>
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center pt-12 text-center">
                            <span className="flex size-12 items-center justify-center rounded-full bg-brand-solid text-white">
                                <Stars01 className="size-6" />
                            </span>
                            <h2 className="mt-4 text-lg font-semibold text-primary">Ask me about your day</h2>
                            <p className="mt-1 max-w-md text-sm text-tertiary">
                                I can read your habits, goals, and routines — and log what you&apos;ve done. Try one of these:
                            </p>
                            <div className={cx("mt-6 grid w-full max-w-lg gap-3", compact ? "grid-cols-1" : "grid-cols-2 max-sm:grid-cols-1")}>
                                {SUGGESTIONS.map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => send(s)}
                                        className="rounded-xl bg-primary p-4 text-left text-sm text-secondary ring-1 ring-secondary transition duration-100 hover:ring-2 hover:ring-brand"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-5">
                            {messages.map((m) => (
                                <MessageRow key={m.id} message={m} isStreaming={isStreaming} />
                            ))}
                        </div>
                    )}

                    {missingKey && (
                        <div className="mt-6 rounded-xl bg-warning-primary/40 p-4 text-sm text-primary ring-1 ring-warning">
                            The assistant needs an OpenAI API key. Set <code className="rounded bg-secondary px-1 py-0.5 text-xs">OPENAI_API_KEY</code> in your
                            environment and restart the dev server.
                        </div>
                    )}
                </div>
            </div>

            <div className={cx("shrink-0 border-t border-secondary bg-primary", compact ? "px-4 py-3" : "px-6 py-4")}>
                <div className={cx("mx-auto flex items-end gap-3", !compact && "max-w-3xl")}>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                send(input);
                            }
                        }}
                        rows={1}
                        placeholder="Ask, or tell me what you did…"
                        disabled={isStreaming}
                        className="max-h-40 min-h-11 flex-1 resize-none rounded-lg bg-primary px-3.5 py-2.5 text-sm text-primary shadow-xs ring-1 ring-primary outline-none transition duration-100 placeholder:text-placeholder focus:ring-2 focus:ring-brand disabled:opacity-50"
                    />
                    <button
                        type="button"
                        aria-label="Send message"
                        onClick={() => send(input)}
                        disabled={isStreaming || !input.trim()}
                        className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-solid text-white transition duration-100 hover:bg-brand-solid_hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Send01 className="size-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function MessageRow({ message, isStreaming }: { message: ChatMessage; isStreaming: boolean }) {
    if (message.role === "user") {
        return (
            <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand-solid px-4 py-2.5 text-sm whitespace-pre-wrap text-white">{message.text}</div>
            </div>
        );
    }

    const thinking = isStreaming && message.text === "";

    return (
        <div className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-secondary text-fg-brand-primary">
                <Stars01 className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
                {message.tools.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                        {message.tools.map((tool, i) => (
                            <span key={`${tool}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-tertiary">
                                <CheckCircle className="size-3 text-fg-success-secondary" />
                                {TOOL_LABELS[tool] ?? tool}
                            </span>
                        ))}
                    </div>
                )}
                {thinking ? (
                    <div className="flex items-center gap-1.5 py-1 text-sm text-tertiary">
                        <span className="size-1.5 animate-bounce rounded-full bg-fg-quaternary [animation-delay:-0.3s]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-fg-quaternary [animation-delay:-0.15s]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-fg-quaternary" />
                    </div>
                ) : (
                    <div className="text-sm whitespace-pre-wrap text-primary">{message.text}</div>
                )}
            </div>
        </div>
    );
}
