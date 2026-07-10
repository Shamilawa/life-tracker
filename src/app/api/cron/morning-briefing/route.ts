import { recordBriefing } from "@/lib/assistant/briefing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request): Promise<Response> {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.get("authorization") !== `Bearer ${expected}`) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!process.env.OPENAI_API_KEY) {
        return Response.json({ error: "missing_api_key" }, { status: 503 });
    }
    try {
        const signal = await recordBriefing("morning");
        return Response.json({ ok: true, id: signal.id });
    } catch (err) {
        return Response.json({ error: "briefing_failed", message: err instanceof Error ? err.message : "unknown" }, { status: 500 });
    }
}
