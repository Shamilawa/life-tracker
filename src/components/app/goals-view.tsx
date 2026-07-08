"use client";

import { useState, useTransition } from "react";
import { Pencil01, Plus, Target01, Trash01 } from "@untitledui/icons";
import { GoalModal } from "@/components/app/goal-modal";
import { Page } from "@/components/app/page";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { ProgressBarCircle } from "@/components/base/progress-indicators/progress-circles";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { addMilestone, deleteMilestone, toggleMilestone } from "@/lib/actions";
import { formatHuman } from "@/lib/dates";
import type { Goal } from "@/lib/db/schema";
import type { GoalWithProgress } from "@/lib/queries";
import { cx } from "@/utils/cx";

const STATUS_BADGE: Record<Goal["status"], { color: "success" | "gray" | "brand"; label: string }> = {
    active: { color: "brand", label: "Active" },
    completed: { color: "success", label: "Completed" },
    paused: { color: "gray", label: "Paused" },
};

function MilestoneList({ goal, milestones }: { goal: Goal; milestones: GoalWithProgress["milestones"] }) {
    const [newTitle, setNewTitle] = useState("");
    const [isPending, startTransition] = useTransition();

    const add = () => {
        const title = newTitle.trim();
        if (!title) return;
        startTransition(async () => {
            await addMilestone(goal.id, title, null);
            setNewTitle("");
        });
    };

    return (
        <div className={cx("mt-4", isPending && "opacity-60")}>
            <p className="text-xs font-semibold tracking-wide text-quaternary uppercase">Milestones</p>
            <ul className="mt-2 flex flex-col gap-2">
                {milestones.map((m) => (
                    <li key={m.id} className="group flex items-center gap-2.5">
                        <Checkbox isSelected={m.done} onChange={(done) => startTransition(() => toggleMilestone(m.id, done))} aria-label={m.title} />
                        <span className={cx("min-w-0 flex-1 truncate text-sm text-primary", m.done && "text-tertiary line-through")}>{m.title}</span>
                        {m.dueDate && <span className="shrink-0 text-xs text-tertiary">{formatHuman(m.dueDate)}</span>}
                        <span className="opacity-0 transition duration-100 group-hover:opacity-100">
                            <ButtonUtility
                                size="xs"
                                color="tertiary"
                                icon={Trash01}
                                tooltip="Delete milestone"
                                onClick={() => startTransition(() => deleteMilestone(m.id))}
                            />
                        </span>
                    </li>
                ))}
            </ul>
            <div className="mt-3 flex gap-2">
                <Input
                    size="sm"
                    placeholder="Add a milestone"
                    value={newTitle}
                    onChange={setNewTitle}
                    onKeyDown={(e) => e.key === "Enter" && add()}
                    aria-label="New milestone"
                />
                <Button color="secondary" size="md" onClick={add} isDisabled={!newTitle.trim()}>
                    Add
                </Button>
            </div>
        </div>
    );
}

export function GoalsView({ goals }: { goals: GoalWithProgress[] }) {
    const [modal, setModal] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });

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
                        <div key={goal.id} className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2.5">
                                        <h2 className="truncate text-md font-semibold text-primary">{goal.title}</h2>
                                        <BadgeWithDot type="pill-color" color={STATUS_BADGE[goal.status].color} size="sm">
                                            {STATUS_BADGE[goal.status].label}
                                        </BadgeWithDot>
                                    </div>
                                    {goal.why && <p className="mt-1 text-sm text-tertiary">{goal.why}</p>}
                                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tertiary">
                                        <span>{goal.targetDate ? `Target ${formatHuman(goal.targetDate)}` : "No target date"}</span>
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
                                <div className="flex shrink-0 items-center gap-2">
                                    <ProgressBarCircle size="xs" value={progress} />
                                    <ButtonUtility
                                        size="xs"
                                        color="tertiary"
                                        icon={Pencil01}
                                        tooltip="Edit goal"
                                        onClick={() => setModal({ open: true, goal })}
                                    />
                                </div>
                            </div>

                            <MilestoneList goal={goal} milestones={milestones} />
                        </div>
                    ))}
                </div>
            )}

            {modal.open && <GoalModal goal={modal.goal} onClose={() => setModal({ open: false, goal: null })} />}
        </Page>
    );
}
