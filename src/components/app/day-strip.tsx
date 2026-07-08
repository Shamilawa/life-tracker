import { formatHuman } from "@/lib/dates";
import { cx } from "@/utils/cx";

export type DayCell = { date: string; due: boolean; status: "done" | "skipped" | null };

/** Compact strip of the last N days for one habit — done, skipped, missed, or not due. */
export function DayStrip({ cells }: { cells: DayCell[] }) {
    return (
        <div className="flex gap-1">
            {cells.map((cell) => (
                <div
                    key={cell.date}
                    title={`${formatHuman(cell.date)} — ${!cell.due ? "not due" : (cell.status ?? "missed")}`}
                    className={cx(
                        "h-5 flex-1 rounded-xs",
                        !cell.due && "bg-quaternary opacity-30",
                        cell.due && cell.status === "done" && "bg-brand-solid",
                        cell.due && cell.status === "skipped" && "bg-quaternary",
                        cell.due && cell.status === null && "bg-secondary ring-1 ring-secondary ring-inset",
                    )}
                />
            ))}
        </div>
    );
}
