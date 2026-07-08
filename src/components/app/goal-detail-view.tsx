"use client";

import { type ReactNode, useState, useTransition } from "react";
import { CheckSquare, ChevronRight, Pencil01, Target01, Trash01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { GoalModal } from "@/components/app/goal-modal";
import { Page } from "@/components/app/page";
import { TaskRow } from "@/components/app/task-row";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { addMilestone, createTask, deleteMilestone, toggleMilestone, updateMilestoneDueDate } from "@/lib/actions";
import { formatHuman, isValidDateStr } from "@/lib/dates";
import type { Goal } from "@/lib/db/schema";
import type { GoalDetail, MilestoneWithSubtasks } from "@/lib/queries";
import { cx } from "@/utils/cx";

const STATUS_BADGE: Record<Goal["status"], { color: "success" | "gray" | "brand"; label: string }> = {
    active: { color: "brand", label: "Active" },
    completed: { color: "success", label: "Completed" },
    paused: { color: "gray", label: "Paused" },
};

const isMilestoneDone = (m: MilestoneWithSubtasks) => (m.tasks.length > 0 ? m.tasks.every((t) => t.done) : m.done);

/** Milestone completion, rolled up from sub-tasks when present, else its own checkbox. */
function milestoneProgress(m: MilestoneWithSubtasks): number {
    if (m.tasks.length === 0) return m.done ? 100 : 0;
    return Math.round((m.tasks.filter((t) => t.done).length / m.tasks.length) * 100);
}

/** Jira-style workflow state derived from progress. */
function milestoneState(m: MilestoneWithSubtasks): { color: "success" | "brand" | "gray"; label: string } {
    const pct = milestoneProgress(m);
    if (pct === 100) return { color: "success", label: "Done" };
    if (pct > 0) return { color: "brand", label: "In progress" };
    return { color: "gray", label: "To do" };
}

function MilestoneRow({ goal, milestone }: { goal: Goal; milestone: MilestoneWithSubtasks }) {
    const [open, setOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDue, setNewDue] = useState("");
    const [isPending, startTransition] = useTransition();

    const total = milestone.tasks.length;
    const doneCount = milestone.tasks.filter((t) => t.done).length;
    const hasSubtasks = total > 0;
    const pct = milestoneProgress(milestone);
    const state = milestoneState(milestone);

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
        <div className={cx(isPending && "opacity-60")}>
            <div className="group flex items-center gap-3 px-4 py-3 transition duration-100 hover:bg-primary_hover">
                <button
                    type="button"
                    aria-label={open ? "Collapse" : "Expand sub-tasks"}
                    onClick={() => setOpen((o) => !o)}
                    className="flex size-6 shrink-0 items-center justify-center rounded-md text-fg-quaternary transition duration-100 hover:bg-secondary hover:text-fg-secondary"
                >
                    <ChevronRight className={cx("size-4 transition duration-100", open && "rotate-90")} />
                </button>

                {hasSubtasks ? (
                    <span className="w-9 shrink-0 text-center text-xs font-semibold text-tertiary tabular-nums">
                        {doneCount}/{total}
                    </span>
                ) : (
                    <Checkbox
                        isSelected={milestone.done}
                        onChange={(done) => startTransition(() => toggleMilestone(milestone.id, done))}
                        aria-label={milestone.title}
                    />
                )}

                <button type="button" onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
                    <span
                        className={cx(
                            "truncate text-sm font-medium text-primary",
                            !hasSubtasks && milestone.done && "text-tertiary line-through",
                        )}
                    >
                        {milestone.title}
                    </span>
                </button>

                {hasSubtasks && (
                    <div className="hidden w-28 shrink-0 items-center gap-2 md:flex">
                        <ProgressBarBase value={pct} className="h-1.5" />
                        <span className="w-8 shrink-0 text-right text-xs font-medium text-tertiary tabular-nums">{pct}%</span>
                    </div>
                )}

                <span className="shrink-0">
                    <BadgeWithDot type="pill-color" color={state.color} size="sm">
                        {state.label}
                    </BadgeWithDot>
                </span>

                <div className="w-32 shrink-0 max-sm:hidden">
                    <Input
                        size="sm"
                        type="date"
                        aria-label={`Due date for ${milestone.title}`}
                        value={isValidDateStr(milestone.dueDate) ? milestone.dueDate : ""}
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
                <div className="border-t border-secondary bg-secondary_subtle py-1 pr-4 pl-13">
                    {milestone.tasks.map((task) => (
                        <TaskRow key={task.id} task={task} showDue />
                    ))}
                    <div className="flex gap-2 py-2.5">
                        <Input
                            size="sm"
                            placeholder="Add a sub-task"
                            value={newTitle}
                            onChange={setNewTitle}
                            onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                            aria-label="New sub-task"
                        />
                        <div className="w-36 shrink-0 max-sm:hidden">
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

function InlineAddForm({ placeholder, dateLabel, onAdd }: { placeholder: string; dateLabel: string; onAdd: (title: string, due: string | null) => Promise<void> }) {
    const [title, setTitle] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [isPending, startTransition] = useTransition();

    const add = () => {
        const t = title.trim();
        if (!t) return;
        startTransition(async () => {
            await onAdd(t, dueDate || null);
            setTitle("");
            setDueDate("");
        });
    };

    return (
        <div className={cx("flex gap-2", isPending && "opacity-60")}>
            <Input size="sm" placeholder={placeholder} value={title} onChange={setTitle} onKeyDown={(e) => e.key === "Enter" && add()} aria-label={placeholder} />
            <div className="w-36 shrink-0 max-sm:hidden">
                <Input size="sm" type="date" value={dueDate} onChange={setDueDate} aria-label={dateLabel} />
            </div>
            <Button color="secondary" size="md" onClick={add} isDisabled={!title.trim()}>
                Add
            </Button>
        </div>
    );
}

/** A card that frames a titled list of work items (milestones / tasks). */
function WorkCard({ title, count, meta, children, footer }: { title: string; count: number; meta?: ReactNode; children: ReactNode; footer: ReactNode }) {
    return (
        <section className="overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary">
            <div className="flex items-center justify-between gap-3 border-b border-secondary px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                    <h2 className="text-sm font-semibold text-primary">{title}</h2>
                    <Badge type="pill-color" color="gray" size="sm">
                        {count}
                    </Badge>
                </div>
                {meta}
            </div>
            {children}
            <div className="border-t border-secondary bg-secondary_subtle px-4 py-3">{footer}</div>
        </section>
    );
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 py-3">
            <span className="shrink-0 text-sm text-tertiary">{label}</span>
            <span className="min-w-0 truncate text-right text-sm font-medium text-primary tabular-nums">{children}</span>
        </div>
    );
}

export function GoalDetailView({ detail }: { detail: GoalDetail }) {
    const { goal, milestones, goalTasks, linkedHabits, progress, habitConsistency30 } = detail;
    const [editing, setEditing] = useState(false);
    const router = useRouter();

    const milestonesDone = milestones.filter(isMilestoneDone).length;
    const tasksDone = goalTasks.filter((t) => t.done).length;
    const createdLabel = new Date(goal.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

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
            actions={<Button size="md" color="secondary" iconLeading={Pencil01} onClick={() => setEditing(true)}>Edit goal</Button>}
        >
            <div className="grid grid-cols-[1fr_320px] items-start gap-6 max-lg:grid-cols-1">
                {/* Main work column */}
                <div className="flex min-w-0 flex-col gap-6">
                    <WorkCard
                        title="Milestones"
                        count={milestones.length}
                        meta={milestones.length > 0 && <span className="text-xs text-tertiary tabular-nums">{milestonesDone} of {milestones.length} done</span>}
                        footer={<InlineAddForm placeholder="Add a milestone" dateLabel="Milestone due date" onAdd={(t, due) => addMilestone(goal.id, t, due)} />}
                    >
                        {milestones.length === 0 ? (
                            <div className="flex flex-col items-center px-6 py-10 text-center">
                                <FeaturedIcon color="brand" theme="modern" size="md" icon={Target01} />
                                <p className="mt-3 text-sm text-tertiary">Break this goal into milestones to track progress.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-secondary">
                                {milestones.map((m) => (
                                    <MilestoneRow key={m.id} goal={goal} milestone={m} />
                                ))}
                            </div>
                        )}
                    </WorkCard>

                    <WorkCard
                        title="Tasks"
                        count={goalTasks.length}
                        meta={goalTasks.length > 0 && <span className="text-xs text-tertiary tabular-nums">{tasksDone} of {goalTasks.length} done</span>}
                        footer={<InlineAddForm placeholder="Add a task" dateLabel="Task due date" onAdd={(t, due) => createTask(t, goal.id, due)} />}
                    >
                        {goalTasks.length === 0 ? (
                            <div className="flex flex-col items-center px-6 py-10 text-center">
                                <FeaturedIcon color="gray" theme="modern" size="md" icon={CheckSquare} />
                                <p className="mt-3 text-sm text-tertiary">No standalone tasks yet — add one to get moving.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-secondary">
                                {goalTasks.map((task) => (
                                    <TaskRow key={task.id} task={task} showDue />
                                ))}
                            </div>
                        )}
                    </WorkCard>
                </div>

                {/* Details rail */}
                <aside className="flex flex-col gap-4 max-lg:order-first">
                    <div className="rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-tertiary">Overall progress</span>
                            <span className="text-lg font-semibold text-primary tabular-nums">{progress}%</span>
                        </div>
                        <ProgressBarBase className="mt-3" value={progress} />
                        {milestones.length > 0 && (
                            <p className="mt-2.5 text-xs text-tertiary tabular-nums">
                                {milestonesDone} of {milestones.length} milestone{milestones.length === 1 ? "" : "s"} complete
                            </p>
                        )}
                    </div>

                    <div className="overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary">
                        <div className="border-b border-secondary px-5 py-3.5">
                            <h2 className="text-sm font-semibold text-primary">Details</h2>
                        </div>
                        <div className="divide-y divide-secondary px-5">
                            <DetailField label="Status">
                                <BadgeWithDot type="pill-color" color={STATUS_BADGE[goal.status].color} size="sm">
                                    {STATUS_BADGE[goal.status].label}
                                </BadgeWithDot>
                            </DetailField>
                            <DetailField label="Target date">{isValidDateStr(goal.targetDate) ? formatHuman(goal.targetDate) : "—"}</DetailField>
                            <DetailField label="Milestones">{milestones.length > 0 ? `${milestonesDone} of ${milestones.length}` : "—"}</DetailField>
                            <DetailField label="Tasks">{goalTasks.length > 0 ? `${tasksDone} of ${goalTasks.length}` : "—"}</DetailField>
                            <DetailField label="Habits">
                                {linkedHabits.length > 0 ? `${linkedHabits.length}${habitConsistency30 !== null ? ` · ${habitConsistency30}%` : ""}` : "—"}
                            </DetailField>
                            <DetailField label="Created">{createdLabel}</DetailField>
                        </div>
                    </div>
                </aside>
            </div>

            {editing && <GoalModal goal={goal} onClose={() => setEditing(false)} onDeleted={() => router.push("/goals")} />}
        </Page>
    );
}
