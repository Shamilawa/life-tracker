import { addDays, format, subDays } from "date-fns";
import Link from "next/link";
import { JournalEditor } from "@/components/app/journal-editor";
import { RoutineSummary } from "@/components/app/routine-summary";
import { dateStr, todayStr } from "@/lib/dates";
import { getDayView } from "@/lib/queries";
import { cx } from "@/utils/cx";

export const dynamic = "force-dynamic";

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
    const today = todayStr();
    const raw = (await searchParams).date;
    const date = typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : today;

    const view = await getDayView(date);
    const parsed = new Date(`${date}T00:00:00`);
    const prev = dateStr(subDays(parsed, 1));
    const next = dateStr(addDays(parsed, 1));
    const hrefFor = (d: string) => (d === today ? "/" : `/?date=${d}`);

    const pctColor = view.pct === 100 ? "text-success-primary" : view.pct > 0 ? "text-brand-secondary" : "text-quaternary";
    // ASCII progress meter, e.g. [■■■■□□□□□□]
    const filled = Math.round(view.pct / 10);
    const meter = "■".repeat(filled) + "□".repeat(10 - filled);

    return (
        <div className="flex h-full flex-col bg-primary">
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-primary px-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="text-brand-secondary">&gt;</span>
                    <h1 className="truncate text-sm font-bold tracking-widest text-primary uppercase term-glow">{format(parsed, "EEE dd.MMM.yyyy")}</h1>
                    <span className={cx("hidden items-center gap-2 border border-secondary px-2 py-1 text-[11px] tracking-wider tabular-nums sm:flex", pctColor)}>
                        <span>{meter}</span>
                        <span>{String(view.pct).padStart(3, " ")}%</span>
                    </span>
                </div>

                <nav className="flex items-center gap-1 text-xs tracking-widest uppercase">
                    <Link href={hrefFor(prev)} aria-label="Previous day" className="border border-secondary px-2 py-1.5 text-fg-quaternary transition duration-100 hover:border-brand hover:text-brand-secondary">
                        ◂ PREV
                    </Link>
                    <Link
                        href="/"
                        className={cx(
                            "border px-3 py-1.5 font-semibold transition duration-100",
                            view.isToday ? "border-brand bg-brand-solid text-primary_on-brand" : "border-secondary text-tertiary hover:border-brand hover:text-brand-secondary",
                        )}
                    >
                        TODAY
                    </Link>
                    <Link href={hrefFor(next)} aria-label="Next day" className="border border-secondary px-2 py-1.5 text-fg-quaternary transition duration-100 hover:border-brand hover:text-brand-secondary">
                        NEXT ▸
                    </Link>
                </nav>
            </header>

            <div className="flex min-h-0 flex-1">
                <div className="w-[360px] shrink-0 max-lg:w-[320px]">
                    <RoutineSummary key={date} categories={view.categories} tasks={view.tasks} date={date} interactive={view.isToday} />
                </div>
                <div className="min-w-0 flex-1 bg-primary">
                    <JournalEditor key={date} date={date} initialContent={view.note} editable={!view.isFuture} />
                </div>
            </div>
        </div>
    );
}
