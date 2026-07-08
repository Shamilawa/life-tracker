import { ChevronLeft, ChevronRight } from "@untitledui/icons";
import { addDays, format, subDays } from "date-fns";
import Link from "next/link";
import { JournalEditor } from "@/components/app/journal-editor";
import { RoutineSummary } from "@/components/app/routine-summary";
import { Badge } from "@/components/base/badges/badges";
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

    const pctColor = view.pct === 100 ? "success" : view.pct > 0 ? "brand" : "gray";

    return (
        <div className="flex h-full flex-col bg-primary">
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-secondary px-6">
                <div className="flex items-center gap-3">
                    <span className="h-6 w-1 rounded-full bg-brand-solid" />
                    <h1 className="text-xl font-semibold text-primary">{format(parsed, "EEEE, MMMM d")}</h1>
                    <Badge type="pill-color" color={pctColor} size="sm">
                        {view.pct}% DONE
                    </Badge>
                </div>

                <nav className="flex items-center gap-1">
                    <Link href={hrefFor(prev)} aria-label="Previous day" className="flex size-9 items-center justify-center rounded-lg text-fg-quaternary transition duration-100 hover:bg-primary_hover hover:text-fg-secondary">
                        <ChevronLeft className="size-5" />
                    </Link>
                    <Link
                        href="/"
                        className={cx(
                            "rounded-lg px-3 py-1.5 text-sm font-semibold tracking-wide uppercase transition duration-100 hover:bg-primary_hover",
                            view.isToday ? "text-brand-secondary" : "text-tertiary",
                        )}
                    >
                        Today
                    </Link>
                    <Link href={hrefFor(next)} aria-label="Next day" className="flex size-9 items-center justify-center rounded-lg text-fg-quaternary transition duration-100 hover:bg-primary_hover hover:text-fg-secondary">
                        <ChevronRight className="size-5" />
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
