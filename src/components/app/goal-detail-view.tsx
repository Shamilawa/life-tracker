"use client";

import { type ReactNode, useState, useTransition } from "react";
import { ChevronRight, Pencil01, Plus, Trash01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { LevelHero, QuestPath } from "@/components/app/goal-gamification";
import { GoalModal } from "@/components/app/goal-modal";
import { Page } from "@/components/app/page";
import { TaskRow } from "@/components/app/task-row";
import { TermButton } from "@/components/app/term-button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { addMilestone, createTask, deleteMilestone, toggleMilestone, updateMilestoneDueDate } from "@/lib/actions";
import { formatHuman, isValidDateStr } from "@/lib/dates";
import type { Goal } from "@/lib/db/schema";
import type { GoalDetail, MilestoneWithSubtasks } from "@/lib/queries";
import { cx } from "@/utils/cx";

const STATUS_TONE: Record<Goal["status"], string> = {
    active: "text-brand-secondary",
    completed: "text-success-primary",
    paused: "text-quaternary",
};

function StatusTag({ status }: { status: Goal["status"] }) {
    return <span className={cx("text-[10px] tracking-widest uppercase", STATUS_TONE[status])}>[{status}]</span>;
}

const isMilestoneDone = (m: MilestoneWithSubtasks) => (m.tasks.length > 0 ? m.tasks.every((t) => t.done) : m.done);

/** Milestone completion, rolled up from sub-tasks when present, else its own checkbox. */
function milestoneProgress(m: MilestoneWithSubtasks): number {
    if (m.tasks.length === 0) return m.done ? 100 : 0;
    return Math.round((m.tasks.filter((t) => t.done).length / m.tasks.length) * 100);
}

/** Jira-style workflow state derived from progress. */
function milestoneState(m: MilestoneWithSubtasks): { tone: string; label: string } {
    const pct = milestoneProgress(m);
    if (pct === 100) return { tone: "text-success-primary", label: "Done" };
    if (pct > 0) return { tone: "text-brand-secondary", label: "In progress" };
    return { tone: "text-quaternary", label: "To do" };
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
                    className="flex size-6 shrink-0 items-center justify-center border border-transparent text-fg-quaternary transition duration-100 hover:border-secondary hover:text-fg-secondary"
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
                            !hasSubtasks && milestone.done && "text-quaternary line-through",
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

                <span className={cx("shrink-0 text-[10px] tracking-widest uppercase", state.tone)}>[{state.label}]</span>

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
                    <TermButton
                        variant="ghost-icon"
                        iconLeading={Trash01}
                        aria-label="Delete milestone"
                        title="Delete milestone"
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
                        <TermButton variant="solid" onClick={addSubtask} isDisabled={!newTitle.trim()}>
                            Add
                        </TermButton>
                    </div>
                </div>
            )}
        </div>
    );
}

function InlineAddForm({
    placeholder,
    dateLabel,
    withTime = false,
    onAdd,
}: {
    placeholder: string;
    dateLabel: string;
    withTime?: boolean;
    onAdd: (title: string, due: string | null, time: string | null) => Promise<void>;
}) {
    const [title, setTitle] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [dueTime, setDueTime] = useState("");
    const [isPending, startTransition] = useTransition();

    const add = () => {
        const t = title.trim();
        if (!t) return;
        startTransition(async () => {
            await onAdd(t, dueDate || null, dueTime || null);
            setTitle("");
            setDueDate("");
            setDueTime("");
        });
    };

    return (
        <div className={cx("flex gap-2", isPending && "opacity-60")}>
            <Input size="sm" placeholder={placeholder} value={title} onChange={setTitle} onKeyDown={(e) => e.key === "Enter" && add()} aria-label={placeholder} />
            <div className="w-36 shrink-0 max-sm:hidden">
                <Input size="sm" type="date" value={dueDate} onChange={setDueDate} aria-label={dateLabel} />
            </div>
            {withTime && (
                <div className="w-28 shrink-0 max-sm:hidden">
                    <Input size="sm" type="time" value={dueTime} onChange={setDueTime} aria-label={`${dateLabel} time (for reminders)`} />
                </div>
            )}
            <TermButton variant="solid" iconLeading={Plus} onClick={add} isDisabled={!title.trim()}>
                Add
            </TermButton>
        </div>
    );
}

/** A card that frames a titled list of work items (milestones / tasks). */
function WorkCard({ title, count, meta, children, footer }: { title: string; count: number; meta?: ReactNode; children: ReactNode; footer: ReactNode }) {
    return (
        <section className="overflow-hidden border border-secondary bg-secondary_subtle">
            <div className="flex items-center justify-between gap-3 border-b border-secondary px-5 py-3">
                <div className="flex items-center gap-2.5">
                    <h2 className="text-xs font-semibold tracking-widest text-primary uppercase">{title}</h2>
                    <span className="text-[11px] text-quaternary tabular-nums">({count})</span>
                </div>
                {meta}
            </div>
            {children}
            <div className="border-t border-secondary px-4 py-3">{footer}</div>
        </section>
    );
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 py-2.5">
            <span className="shrink-0 text-[11px] tracking-wide text-tertiary uppercase">{label}</span>
            <span className="min-w-0 truncate text-right text-sm font-medium text-primary tabular-nums">{children}</span>
        </div>
    );
}

export function GoalDetailView({ detail }: { detail: GoalDetail }) {
    const { goal, milestones, goalTasks, linkedHabits, progress, habitConsistency30, gamification } = detail;
    const [editing, setEditing] = useState(false);
    const router = useRouter();

    const milestonesDone = milestones.filter(isMilestoneDone).length;
    const questNodes = milestones.map((m) => ({ id: m.id, title: m.title, done: isMilestoneDone(m) }));
    const maxedXp = progress === 100 && linkedHabits.length === 0;
    const tasksDone = goalTasks.filter((t) => t.done).length;
    const createdLabel = new Date(goal.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    return (
        <Page
            title={goal.title}
            titleTrailing={<StatusTag status={goal.status} />}
            description={goal.why ?? undefined}
            back={{ label: "All goals", href: "/goals" }}
            actions={
                <TermButton iconLeading={Pencil01} onClick={() => setEditing(true)}>
                    Edit goal
                </TermButton>
            }
        >
            <div className="grid grid-cols-[1fr_320px] items-start gap-6 max-lg:grid-cols-1">
                {/* Main work column */}
                <div className="flex min-w-0 flex-col gap-6">
                    <WorkCard
                        title="Milestones"
                        count={milestones.length}
                        meta={milestones.length > 0 && <span className="text-[11px] text-tertiary tabular-nums">{milestonesDone} of {milestones.length} done</span>}
                        footer={<InlineAddForm placeholder="Add a milestone" dateLabel="Milestone due date" onAdd={(t, due) => addMilestone(goal.id, t, due)} />}
                    >
                        {milestones.length > 0 && (
                            <QuestPath nodes={questNodes} goalDone={goal.status === "completed" || milestonesDone === milestones.length} />
                        )}
                        {milestones.length === 0 ? (
                            <div className="flex flex-col items-center px-6 py-10 text-center">
                                <span className="flex size-10 items-center justify-center border border-brand text-brand-secondary">◈</span>
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
                        meta={goalTasks.length > 0 && <span className="text-[11px] text-tertiary tabular-nums">{tasksDone} of {goalTasks.length} done</span>}
                        footer={
                            <InlineAddForm
                                placeholder="Add a task"
                                dateLabel="Task due date"
                                withTime
                                onAdd={(t, due, time) => createTask(t, goal.id, due, null, time)}
                            />
                        }
                    >
                        {goalTasks.length === 0 ? (
                            <div className="flex flex-col items-center px-6 py-10 text-center">
                                <span className="flex size-10 items-center justify-center border border-secondary text-fg-quaternary">▣</span>
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
                    <LevelHero gamification={gamification} maxed={maxedXp} />

                    <div className="border border-secondary bg-secondary_subtle p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] tracking-wide text-tertiary uppercase">Overall progress</span>
                            <span className="text-lg font-semibold text-primary tabular-nums">{progress}%</span>
                        </div>
                        <ProgressBarBase className="mt-3" value={progress} />
                        {milestones.length > 0 && (
                            <p className="mt-2.5 text-[11px] text-tertiary tabular-nums">
                                {milestonesDone} of {milestones.length} milestone{milestones.length === 1 ? "" : "s"} complete
                            </p>
                        )}
                    </div>

                    <div className="overflow-hidden border border-secondary bg-secondary_subtle">
                        <div className="border-b border-secondary px-4 py-3">
                            <h2 className="text-xs font-semibold tracking-widest text-primary uppercase">Details</h2>
                        </div>
                        <div className="divide-y divide-secondary px-4">
                            <DetailField label="Status">
                                <StatusTag status={goal.status} />
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
