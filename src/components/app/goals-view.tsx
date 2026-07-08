"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Pencil01, Plus, Target01 } from "@untitledui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoalModal } from "@/components/app/goal-modal";
import { Page } from "@/components/app/page";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { ProgressBarCircle } from "@/components/base/progress-indicators/progress-circles";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { toggleMilestone } from "@/lib/actions";
import { formatHuman, isValidDateStr } from "@/lib/dates";
import type { Goal } from "@/lib/db/schema";
import type { GoalWithProgress } from "@/lib/queries";
import { cx } from "@/utils/cx";

const STATUS_BADGE: Record<Goal["status"], { color: "success" | "gray" | "brand"; label: string }> = {
    active: { color: "brand", label: "Active" },
    completed: { color: "success", label: "Completed" },
    paused: { color: "gray", label: "Paused" },
};

const PREVIEW_COUNT = 2;

function MilestonePreview({ milestones }: { milestones: GoalWithProgress["milestones"] }) {
    const [isPending, startTransition] = useTransition();
    if (milestones.length === 0) return null;

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
        <div className={cx("mt-4", isPending && "opacity-60")}>
            <p className="text-xs font-semibold tracking-wide text-quaternary uppercase">Milestones</p>
            <ul className="mt-2 flex flex-col gap-2">
                {shown.map((m) => (
                    <li key={m.id} className="flex items-center gap-2.5">
                        <Checkbox
                            isSelected={m.done}
                            onChange={(done) => startTransition(() => toggleMilestone(m.id, done))}
                            aria-label={m.title}
                        />
                        <span className={cx("min-w-0 flex-1 truncate text-sm text-primary", m.done && "text-tertiary line-through")}>{m.title}</span>
                        {isValidDateStr(m.dueDate) && <span className="shrink-0 text-xs text-tertiary">{formatHuman(m.dueDate)}</span>}
                    </li>
                ))}
            </ul>
            {remaining > 0 && <p className="mt-2 text-xs text-tertiary">+{remaining} more</p>}
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
                <Button size="md" iconLeading={Plus} onClick={() => setModal({ open: true, goal: null })}>
                    Add goal
                </Button>
            }
        >
            {goals.length === 0 ? (
                <div className="mx-auto flex max-w-sm flex-col items-center pt-16 text-center">
                    <FeaturedIcon color="brand" theme="modern" size="lg" icon={Target01} />
                    <h3 className="mt-4 text-lg font-semibold text-primary">Set your first goal</h3>
                    <p className="mt-1 text-sm text-tertiary">A goal gives your habits a direction to pull toward.</p>
                    <Button className="mt-6" size="md" onClick={() => setModal({ open: true, goal: null })}>
                        Add goal
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
                    {goals.map(({ goal, milestones, progress, habitConsistency30, linkedHabits, openTasks }) => (
                        <div key={goal.id} className="flex flex-col rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary transition duration-100 hover:shadow-md">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2.5">
                                        <Link href={`/goals/${goal.id}`} className="truncate text-md font-semibold text-primary hover:underline">
                                            {goal.title}
                                        </Link>
                                        <BadgeWithDot type="pill-color" color={STATUS_BADGE[goal.status].color} size="sm">
                                            {STATUS_BADGE[goal.status].label}
                                        </BadgeWithDot>
                                    </div>
                                    {goal.why && <p className="mt-1 text-sm text-tertiary">{goal.why}</p>}
                                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tertiary">
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
                                <div className="flex shrink-0 items-center gap-3">
                                    <ProgressBarCircle size="xxs" value={progress} />
                                    <ButtonUtility
                                        size="xs"
                                        color="tertiary"
                                        icon={Pencil01}
                                        tooltip="Edit goal"
                                        onClick={() => setModal({ open: true, goal })}
                                    />
                                </div>
                            </div>

                            <MilestonePreview milestones={milestones} />

                            <div className="mt-4 flex flex-1 items-end justify-end border-t border-secondary pt-3">
                                <Button href={`/goals/${goal.id}`} color="link-color" size="sm" iconTrailing={ArrowRight}>
                                    View goal
                                </Button>
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
