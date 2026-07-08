import { format, subDays } from "date-fns";

/** Local calendar date as YYYY-MM-DD. All habit logs key off this. */
export function todayStr(): string {
    return format(new Date(), "yyyy-MM-dd");
}

export function dateStr(d: Date): string {
    return format(d, "yyyy-MM-dd");
}

/** Last `n` local dates ending today, oldest first. */
export function lastNDates(n: number): string[] {
    const today = new Date();
    return Array.from({ length: n }, (_, i) => dateStr(subDays(today, n - 1 - i)));
}

/** 0 = Sunday … 6 = Saturday, local time. */
export function dayOfWeek(date: string): number {
    return new Date(`${date}T00:00:00`).getDay();
}

export function formatHuman(date: string): string {
    return format(new Date(`${date}T00:00:00`), "MMM d, yyyy");
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function daysLabel(days: number[]): string {
    if (days.length === 7) return "Every day";
    const sorted = [...days].sort((a, b) => a - b);
    if (sorted.join(",") === "1,2,3,4,5") return "Weekdays";
    if (sorted.join(",") === "0,6") return "Weekends";
    return sorted.map((d) => WEEKDAY_LABELS[d]).join(", ");
}
