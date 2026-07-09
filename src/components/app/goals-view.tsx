"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Pencil01, Plus } from "@untitledui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LevelBadge } from "@/components/app/goal-gamification";
import { GoalModal } from "@/components/app/goal-modal";
import { Page } from "@/components/app/page";
import { TermButton } from "@/components/app/term-button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { toggleMilestone } from "@/lib/actions";
import { formatHuman, isValidDateStr } from "@/lib/dates";
import type { Goal } from "@/lib/db/schema";
import type { GoalWithProgress } from "@/lib/queries";
import { cx } from "@/utils/cx";

const STATUS_TONE: Record<Goal["status"], string> = {
    active: "text-brand-secondary",
    completed: "text-success-primary",
    paused: "text-quaternary",
};

const PREVIEW_COUNT = 2;

/** ASCII block meter, e.g. [■■■■■■□□□□] 60% — replaces the circular donut for a terminal look. */
function Meter({ value, width = 8 }: { value: number; width?: number }) {
    const filled = Math.round((value / 100) * width);
    const tone = value === 100 ? "text-success-primary" : value > 0 ? "text-brand-secondary" : "text-quaternary";
    return (
        <span className={cx("flex items-center gap-1.5 text-[11px] tabular-nums", tone)}>
            <span>
                [{"■".repeat(filled)}
                {"□".repeat(width - filled)}]
            </span>
            <span>{String(value).padStart(3, " ")}%</span>
        </span>
    );
}

function MilestonePreview({ milestones }: { milestones: GoalWithProgress["milestones"] }) {
    const [isPending, startTransition] = useTransition();

    const sorted = [...milestones].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (a.dueDate && b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
    });
    const shown = sorted.slice(0, PREVIEW_COUNT);
    const remaining = milestones.length - shown.length;

    return (
        <div className={cx("mt-4 border-t border-secondary pt-3", isPending && "opacity-60")}>
            <p className="text-[11px] tracking-widest text-quaternary uppercase">
                <span className="text-brand-secondary/60">──</span> Milestones
            </p>
            {milestones.length === 0 ? (
                <p className="mt-2 text-[13px] text-tertiary">No milestones yet</p>
            ) : (
                <>
                    <ul className="mt-2 flex flex-col gap-2">
                        {shown.map((m) => (
                            <li key={m.id} className="flex items-center gap-2.5">
                                <Checkbox
                                    isSelected={m.done}
                                    onChange={(done) => startTransition(() => toggleMilestone(m.id, done))}
                                    aria-label={m.title}
                                />
                                <span className={cx("min-w-0 flex-1 truncate text-[13px] text-primary", m.done && "text-quaternary line-through")}>
                                    {m.title}
                                </span>
                                {isValidDateStr(m.dueDate) && (
                                    <span className="shrink-0 text-[11px] text-tertiary tabular-nums">{formatHuman(m.dueDate)}</span>
                                )}
                            </li>
                        ))}
                    </ul>
                    <p className="mt-2 text-[11px] text-tertiary">{remaining > 0 ? `+${remaining} more` : " "}</p>
                </>
            )}
        </div>
    );
}

export function GoalsView({ goals }: { goals: GoalWithProgress[] }) {
    const [modal, setModal] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });
    const router = useRouter();

    return (
        <Page
            title="Goals"
            description="Where you are heading — and whether today moved you closer."
            actions={
                <TermButton variant="solid" iconLeading={Plus} onClick={() => setModal({ open: true, goal: null })}>
                    Add goal
                </TermButton>
            }
        >
            {goals.length === 0 ? (
                <div className="mx-auto flex max-w-sm flex-col items-center border border-secondary py-16 text-center">
                    <span className="flex size-12 items-center justify-center border border-brand text-xl text-brand-secondary">◈</span>
                    <h3 className="mt-4 text-sm font-bold tracking-wide text-primary uppercase">Set your first goal</h3>
                    <p className="mt-1 text-sm text-tertiary">A goal gives your habits a direction to pull toward.</p>
                    <TermButton className="mt-6" variant="solid" onClick={() => setModal({ open: true, goal: null })}>
                        Add goal
                    </TermButton>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
                    {goals.map(({ goal, milestones, progress, habitConsistency30, linkedHabits, openTasks, gamification }) => (
                        <div
                            key={goal.id}
                            className="flex min-h-[19rem] flex-col border border-secondary bg-secondary_subtle p-5 transition duration-100 hover:border-brand_alt"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2.5">
                                        <Link
                                            href={`/goals/${goal.id}`}
                                            className="truncate text-[15px] font-semibold text-primary hover:text-brand-secondary"
                                        >
                                            {goal.title}
                                        </Link>
                                        <span className={cx("shrink-0 text-[10px] tracking-widest uppercase", STATUS_TONE[goal.status])}>
                                            [{goal.status}]
                                        </span>
                                    </div>
                                    <p className="mt-1 line-clamp-2 min-h-10 text-sm text-tertiary">{goal.why}</p>
                                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tracking-wide text-tertiary uppercase">
                                        <span>{isValidDateStr(goal.targetDate) ? `Target ${formatHuman(goal.targetDate)}` : "No target date"}</span>
                                        {linkedHabits.length > 0 && (
                                            <span>
                                                {linkedHabits.length} habit{linkedHabits.length === 1 ? "" : "s"}
                                                {habitConsistency30 !== null ? ` · ${habitConsistency30}% consistent (30d)` : ""}
                                            </span>
                                        )}
                                        {openTasks.length > 0 && (
                                            <span>
                                                {openTasks.length} open task{openTasks.length === 1 ? "" : "s"}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-2">
                                    <LevelBadge gamification={gamification} maxed={progress === 100 && linkedHabits.length === 0} />
                                    <div className="flex items-center gap-2">
                                        <Meter value={progress} width={10} />
                                        <TermButton
                                            variant="ghost-icon"
                                            iconLeading={Pencil01}
                                            aria-label="Edit goal"
                                            title="Edit goal"
                                            onClick={() => setModal({ open: true, goal })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <MilestonePreview milestones={milestones} />

                            <div className="mt-auto flex items-end justify-end border-t border-secondary pt-3">
                                <TermButton href={`/goals/${goal.id}`} size="sm" iconTrailing={ArrowRight}>
                                    View goal
                                </TermButton>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modal.open && (
                <GoalModal
                    goal={modal.goal}
                    onClose={() => setModal({ open: false, goal: null })}
                    onCreated={(id) => router.push(`/goals/${id}`)}
                />
            )}
        </Page>
    );
}
