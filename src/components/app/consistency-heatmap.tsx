import { WEEKDAY_LABELS, dayOfWeek, formatHuman } from "@/lib/dates";
import { cx } from "@/utils/cx";

type Cell = { date: string; due: number; done: number };

/**
 * GitHub-style heatmap: columns are weeks, rows are weekdays (Sunday first).
 * Intensity reflects the share of due habits completed that day.
 */
export function ConsistencyHeatmap({ cells }: { cells: Cell[] }) {
    if (cells.length === 0) return null;

    // Pad the start so the first column begins on Sunday.
    const offset = dayOfWeek(cells[0].date);
    const padded: Array<Cell | null> = [...Array.from({ length: offset }, () => null), ...cells];
    const weeks: Array<Array<Cell | null>> = [];
    for (let i = 0; i < padded.length; i += 7) {
        weeks.push(padded.slice(i, i + 7));
    }

    return (
        <div className="flex gap-2">
            <div className="grid grid-rows-7 gap-1">
                {WEEKDAY_LABELS.map((label, i) => (
                    <span key={label} className="flex h-3.5 items-center text-xs text-quaternary">
                        {i % 2 === 1 ? label : ""}
                    </span>
                ))}
            </div>
            <div className="flex flex-1 gap-1">
                {weeks.map((week, wi) => (
                    <div key={wi} className="grid flex-1 grid-rows-7 gap-1">
                        {Array.from({ length: 7 }, (_, di) => {
                            const cell = week[di] ?? null;
                            if (!cell) return <div key={di} className="h-3.5 rounded-xs" />;
                            const ratio = cell.due ? cell.done / cell.due : null;
                            return (
                                <div
                                    key={di}
                                    title={`${formatHuman(cell.date)} — ${cell.due ? `${cell.done} of ${cell.due} done` : "nothing due"}`}
                                    className={cx(
                                        "h-3.5 rounded-xs",
                                        ratio === null && "bg-quaternary opacity-20",
                                        ratio !== null && ratio === 0 && "bg-secondary ring-1 ring-secondary ring-inset",
                                        ratio !== null && ratio > 0 && "bg-brand-solid",
                                    )}
                                    style={ratio ? { opacity: 0.25 + ratio * 0.75 } : undefined}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
