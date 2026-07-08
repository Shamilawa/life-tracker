"use client";

import { useState, useTransition } from "react";
import { ChevronRight, Pencil01, Plus, Target01, Trash01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { GoalModal } from "@/components/app/goal-modal";
import { Page } from "@/components/app/page";
import { TaskRow } from "@/components/app/task-row";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { ProgressBarCircle } from "@/components/base/progress-indicators/progress-circles";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { addMilestone, createTask, deleteMilestone, toggleMilestone, updateMilestoneDueDate } from "@/lib/actions";
import { formatHuman } from "@/lib/dates";
import type { Goal } from "@/lib/db/schema";
import type { GoalDetail, MilestoneWithSubtasks } from "@/lib/queries";
import { cx } from "@/utils/cx";

const STATUS_BADGE: Record<Goal["status"], { color: "success" | "gray" | "brand"; label: string }> = {
    active: { color: "brand", label: "Active" },
    completed: { color: "success", label: "Completed" },
    paused: { color: "gray", label: "Paused" },
};

function MilestoneRow({ goal, milestone }: { goal: Goal; milestone: MilestoneWithSubtasks }) {
    const [open, setOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDue, setNewDue] = useState("");
    const [isPending, startTransition] = useTransition();

    const hasSubtasks = milestone.tasks.length > 0;
    const subtaskDone = milestone.tasks.filter((t) => t.done).length;

    const addSubtask = () => {
        const title = newTitle.trim();
        if (!title) return;
        startTransition(async () => {
            await createTask(title, goal.id, newDue || null, milestone.id);
            setNewTitle("");
            setNewDue("");
        });
    };

    return (
        <div className={cx("rounded-lg border border-secondary", isPending && "opacity-60")}>
            <div className="group flex items-center gap-2.5 px-4 py-3">
                <ButtonUtility
                    size="xs"
                    color="tertiary"
                    icon={ChevronRight}
                    tooltip={open ? "Collapse" : "Expand sub-tasks"}
                    onClick={() => setOpen((o) => !o)}
                    className={cx("transition duration-100", open && "rotate-90")}
                />
                {hasSubtasks ? (
                    <span className="w-8 shrink-0 text-xs font-medium text-tertiary tabular-nums">
                        {subtaskDone}/{milestone.tasks.length}
                    </span>
                ) : (
                    <Checkbox
                        isSelected={milestone.done}
                        onChange={(done) => startTransition(() => toggleMilestone(milestone.id, done))}
                        aria-label={milestone.title}
                    />
                )}
                <span
                    className={cx(
                        "min-w-0 flex-1 truncate text-sm font-medium text-primary",
                        !hasSubtasks && milestone.done && "text-tertiary line-through",
                    )}
                >
                    {milestone.title}
                </span>
                <div className="w-36 shrink-0">
                    <Input
                        size="sm"
                        type="date"
                        aria-label={`Due date for ${milestone.title}`}
                        value={milestone.dueDate ?? ""}
                        onChange={(v) => startTransition(() => updateMilestoneDueDate(milestone.id, v || null))}
                    />
                </div>
                <span className="opacity-0 transition duration-100 group-hover:opacity-100">
                    <ButtonUtility
                        size="xs"
                        color="tertiary"
                        icon={Trash01}
                        tooltip="Delete milestone"
                        onClick={() => startTransition(() => deleteMilestone(milestone.id))}
                    />
                </span>
            </div>

            {open && (
                <div className="border-t border-secondary pl-11">
                    {milestone.tasks.map((task) => (
                        <TaskRow key={task.id} task={task} showDue />
                    ))}
                    <div className="flex gap-2 py-3 pr-4">
                        <Input
                            size="sm"
                            placeholder="Add a sub-task"
                            value={newTitle}
                            onChange={setNewTitle}
                            onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                            aria-label="New sub-task"
                        />
                        <div className="w-36 shrink-0">
                            <Input size="sm" type="date" value={newDue} onChange={setNewDue} aria-label="Sub-task due date" />
                        </div>
                        <Button color="secondary" size="md" onClick={addSubtask} isDisabled={!newTitle.trim()}>
                            Add
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function AddMilestoneForm({ goalId }: { goalId: string }) {
    const [title, setTitle] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [isPending, startTransition] = useTransition();

    const add = () => {
        const t = title.trim();
        if (!t) return;
        startTransition(async () => {
            await addMilestone(goalId, t, dueDate || null);
            setTitle("");
            setDueDate("");
        });
    };

    return (
        <div className={cx("flex gap-2", isPending && "opacity-60")}>
            <Input size="sm" placeholder="Add a milestone" value={title} onChange={setTitle} onKeyDown={(e) => e.key === "Enter" && add()} aria-label="New milestone" />
            <div className="w-36 shrink-0">
                <Input size="sm" type="date" value={dueDate} onChange={setDueDate} aria-label="Milestone due date" />
            </div>
            <Button color="secondary" size="md" onClick={add} isDisabled={!title.trim()}>
                Add
            </Button>
        </div>
    );
}

function AddTaskForm({ goalId }: { goalId: string }) {
    const [title, setTitle] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [isPending, startTransition] = useTransition();

    const add = () => {
        const t = title.trim();
        if (!t) return;
        startTransition(async () => {
            await createTask(t, goalId, dueDate || null);
            setTitle("");
            setDueDate("");
        });
    };

    return (
        <div className={cx("flex gap-2", isPending && "opacity-60")}>
            <Input size="sm" placeholder="Add a task" value={title} onChange={setTitle} onKeyDown={(e) => e.key === "Enter" && add()} aria-label="New task" />
            <div className="w-36 shrink-0">
                <Input size="sm" type="date" value={dueDate} onChange={setDueDate} aria-label="Task due date" />
            </div>
            <Button color="secondary" size="md" onClick={add} isDisabled={!title.trim()}>
                Add
            </Button>
        </div>
    );
}

export function GoalDetailView({ detail }: { detail: GoalDetail }) {
    const { goal, milestones, goalTasks, linkedHabits, progress, habitConsistency30 } = detail;
    const [editing, setEditing] = useState(false);
    const router = useRouter();

    return (
        <Page
            title={goal.title}
            titleTrailing={
                <BadgeWithDot type="pill-color" color={STATUS_BADGE[goal.status].color} size="sm">
                    {STATUS_BADGE[goal.status].label}
                </BadgeWithDot>
            }
            description={goal.why ?? undefined}
            back={{ label: "All goals", href: "/goals" }}
            actions={<ButtonUtility size="sm" color="tertiary" icon={Pencil01} tooltip="Edit goal" onClick={() => setEditing(true)} />}
        >
            <div className="grid grid-cols-[220px_1fr] gap-6 max-lg:grid-cols-1">
                <div className="flex flex-col items-center gap-4 rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary max-lg:flex-row max-lg:justify-around">
                    <ProgressBarCircle size="sm" value={progress} label="Progress" />
                    <div className="flex flex-col gap-3 text-center text-xs text-tertiary max-lg:text-left">
                        <div>
                            <p className="font-semibold text-primary">{goal.targetDate ? formatHuman(goal.targetDate) : "No target date"}</p>
                            <p>Target date</p>
                        </div>
                        {linkedHabits.length > 0 && (
                            <div>
                                <p className="font-semibold text-primary">
                                    {linkedHabits.length} habit{linkedHabits.length === 1 ? "" : "s"}
                                    {habitConsistency30 !== null ? ` · ${habitConsistency30}%` : ""}
                                </p>
                                <p>Consistency (30d)</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-8">
                    <div>
                        <p className="text-xs font-semibold tracking-wide text-quaternary uppercase">Milestones</p>
                        {milestones.length === 0 ? (
                            <div className="mt-2 flex flex-col items-center rounded-xl border border-dashed border-secondary py-8 text-center">
                                <FeaturedIcon color="brand" theme="modern" size="md" icon={Target01} />
                                <p className="mt-3 text-sm text-tertiary">Break this goal into milestones to track progress.</p>
                            </div>
                        ) : (
                            <div className="mt-2 flex flex-col gap-2">
                                {milestones.map((m) => (
                                    <MilestoneRow key={m.id} goal={goal} milestone={m} />
                                ))}
                            </div>
                        )}
                        <div className="mt-3">
                            <AddMilestoneForm goalId={goal.id} />
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-semibold tracking-wide text-quaternary uppercase">Tasks</p>
                        {goalTasks.length > 0 && (
                            <div className="mt-2 rounded-xl bg-primary shadow-xs ring-1 ring-secondary">
                                {goalTasks.map((task) => (
                                    <TaskRow key={task.id} task={task} showDue />
                                ))}
                            </div>
                        )}
                        <div className="mt-3">
                            <AddTaskForm goalId={goal.id} />
                        </div>
                    </div>
                </div>
            </div>

            {editing && <GoalModal goal={goal} onClose={() => setEditing(false)} onDeleted={() => router.push("/goals")} />}
        </Page>
    );
}
