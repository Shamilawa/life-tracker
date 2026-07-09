"use client";

import { useTransition } from "react";
import { Trash01 } from "@untitledui/icons";
import { TermButton } from "@/components/app/term-button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { deleteTask, toggleTask } from "@/lib/actions";
import { formatHuman, isValidDateStr } from "@/lib/dates";
import type { Task } from "@/lib/db/schema";
import { cx } from "@/utils/cx";

export function TaskRow({ task, isOverdue = false, showDue = false }: { task: Task; isOverdue?: boolean; showDue?: boolean }) {
    const [isPending, startTransition] = useTransition();

    return (
        <div className={cx("group flex items-center gap-3 px-6 py-3", isPending && "opacity-60")}>
            <Checkbox isSelected={task.done} onChange={(done) => startTransition(() => toggleTask(task.id, done))} aria-label={task.title} />
            <p className={cx("min-w-0 flex-1 truncate text-sm font-medium text-primary", task.done && "text-tertiary line-through")}>{task.title}</p>
            {isOverdue && <span className="text-[10px] tracking-widest text-error-primary uppercase">[Overdue]</span>}
            {showDue && isValidDateStr(task.dueDate) && !isOverdue && <span className="text-[11px] text-tertiary tabular-nums">{formatHuman(task.dueDate)}</span>}
            <span className="opacity-0 transition duration-100 group-hover:opacity-100">
                <TermButton variant="ghost-icon" iconLeading={Trash01} aria-label="Delete task" title="Delete task" onClick={() => startTransition(() => deleteTask(task.id))} />
            </span>
        </div>
    );
}
