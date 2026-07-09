import type { GoalGamification } from "@/lib/queries";
import { cx } from "@/utils/cx";

/**
 * ASCII block meter tuned for XP-into-level rather than an overall 0-100
 * percentage. When `maxed` (goal complete with no habit still feeding it
 * more XP), the level-relative fraction is replaced with a full bar — a
 * partial-looking bar on a finished goal reads as broken, not "in progress".
 */
export function XpMeter({ xpIntoLevel, xpPerLevel, maxed, width = 10 }: { xpIntoLevel: number; xpPerLevel: number; maxed?: boolean; width?: number }) {
    const filled = maxed ? width : Math.round((xpIntoLevel / xpPerLevel) * width);
    return (
        <span className="flex items-center gap-1.5 text-[11px] tabular-nums">
            <span className={maxed ? "text-success-primary" : "text-brand-secondary"}>
                [{"■".repeat(filled)}
                {"□".repeat(width - filled)}]
            </span>
            <span className={maxed ? "text-success-primary" : "text-tertiary"}>{maxed ? "MAXED" : `${xpIntoLevel}/${xpPerLevel} XP`}</span>
        </span>
    );
}

/** Compact LVL/rank + XP readout for a goal card. */
export function LevelBadge({ gamification, maxed }: { gamification: GoalGamification; maxed?: boolean }) {
    return (
        <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] font-semibold tracking-widest text-primary uppercase">
                LVL {gamification.level} <span className={maxed ? "text-success-primary" : "text-brand-secondary"}>· {gamification.rank}</span>
            </span>
            <XpMeter xpIntoLevel={gamification.xpIntoLevel} xpPerLevel={gamification.xpPerLevel} maxed={maxed} width={8} />
        </div>
    );
}

/** Larger hero readout for the goal detail page's details rail. */
export function LevelHero({ gamification, maxed }: { gamification: GoalGamification; maxed?: boolean }) {
    return (
        <div className="border border-secondary bg-secondary_subtle p-4">
            <div className="flex items-center justify-between">
                <span className="text-[11px] tracking-wide text-tertiary uppercase">Goal level</span>
                <span className="term-glow text-lg font-semibold text-primary tabular-nums">LVL {gamification.level}</span>
            </div>
            <p className={cx("mt-1 text-[11px] tracking-widest uppercase", maxed ? "text-success-primary" : "text-brand-secondary")}>
                {gamification.rank}
            </p>
            <div className="mt-3">
                <XpMeter xpIntoLevel={gamification.xpIntoLevel} xpPerLevel={gamification.xpPerLevel} maxed={maxed} width={16} />
            </div>
            <p className="mt-2 text-[11px] text-tertiary tabular-nums">
                {gamification.xp.toLocaleString()} XP earned all-time{maxed ? " · goal complete, no further XP to earn" : ""}
            </p>
        </div>
    );
}

export type QuestNode = { id: string; title: string; done: boolean };

/** Milestones rendered as a connected node trail — a game-level-select-style progress map, not a checklist. */
export function QuestPath({ nodes, goalDone }: { nodes: QuestNode[]; goalDone: boolean }) {
    if (nodes.length === 0) return null;

    const currentIndex = nodes.findIndex((n) => !n.done);
    const trail = [
        ...nodes.map((n) => ({ ...n, kind: "milestone" as const })),
        { id: "__goal__", title: "Goal", done: goalDone, kind: "goal" as const },
    ];

    return (
        <div className="overflow-x-auto border-b border-secondary px-5 py-4">
            <div className="flex min-w-max items-start">
                {trail.map((node, i) => {
                    const isCurrent = node.kind === "milestone" && i === currentIndex;
                    const isLast = i === trail.length - 1;
                    return (
                        <div key={node.id} className="flex items-start">
                            <div className={cx("flex shrink-0 flex-col items-center gap-1.5 text-center", node.kind === "goal" ? "w-16" : "w-24")}>
                                <span
                                    className={cx(
                                        "flex size-7 items-center justify-center border text-sm",
                                        node.done && "border-success-primary text-success-primary",
                                        isCurrent && "border-brand text-brand-secondary term-glow",
                                        !node.done && !isCurrent && "border-secondary text-quaternary",
                                    )}
                                >
                                    {node.kind === "goal" ? (node.done ? "◆" : "○") : node.done ? "●" : isCurrent ? "◉" : "○"}
                                </span>
                                <span
                                    className={cx(
                                        "line-clamp-2 text-[11px] leading-tight",
                                        node.done ? "text-tertiary" : isCurrent ? "font-medium text-primary" : "text-quaternary",
                                    )}
                                >
                                    {node.title}
                                </span>
                                {isCurrent && <span className="text-[9px] tracking-widest text-brand-secondary uppercase">↑ here</span>}
                            </div>
                            {!isLast && <div className={cx("mt-3.5 h-px w-8 shrink-0", node.done ? "bg-success-primary" : "bg-secondary")} />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
