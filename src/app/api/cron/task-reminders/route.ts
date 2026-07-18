import { sendDueTaskReminders } from "@/lib/assistant/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request): Promise<Response> {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.get("authorization") !== `Bearer ${expected}`) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    try {
        const result = await sendDueTaskReminders();
        return Response.json({ ok: true, ...result });
    } catch (err) {
        return Response.json({ error: "reminder_failed", message: err instanceof Error ? err.message : "unknown" }, { status: 500 });
    }
}
