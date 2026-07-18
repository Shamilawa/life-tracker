import "server-only";
import { format } from "date-fns";
import OpenAI from "openai";
import { getTopFlags, suggestedAction, syncFlags } from "@/lib/assistant/flags";
import type { ScoredFlag, SuggestedAction } from "@/lib/assistant/flags";
import { preferenceInstructions } from "@/lib/assistant/prompt";
import { sendTelegramMessage } from "@/lib/assistant/telegram";
import { executeTool } from "@/lib/assistant/tools";
import { db } from "@/lib/db";
import { assistantSignals } from "@/lib/db/schema";
import type { AssistantSignal, SignalKind } from "@/lib/db/schema";
import { getAssistantPreferences } from "@/lib/queries";
import type { AssistantPreferences } from "@/lib/queries";

const MODEL = "gpt-4o";
const KIND_PREFIX: Record<SuggestedAction["kind"], string> = {
    reschedule_task: "resched",
    archive_habit: "archive",
    extend_goal_deadline: "extend",
};

type BriefingKind = "morning" | "evening";

async function buildBriefingContext(flags: ScoredFlag[]): Promise<string> {
    const [today, habits, goals, insights] = await Promise.all([
        executeTool("get_today", {}),
        executeTool("get_habits", {}),
        executeTool("get_goals", {}),
        executeTool("get_insights", {}),
    ]);
    const flaggedBlock = flags.length
        ? `FLAGGED (ranked, address these first):\n${JSON.stringify(flags.map((f) => ({ type: f.type, title: f.refTitle, daysFlagged: f.daysFlagged })))}`
        : null;
    return [flaggedBlock, `TODAY:\n${today}`, `HABITS:\n${habits}`, `GOALS:\n${goals}`, `INSIGHTS:\n${insights}`].filter(Boolean).join("\n\n");
}

function systemPrompt(kind: BriefingKind, prefs: AssistantPreferences, hasFlags: boolean): string {
    const today = format(new Date(), "EEEE, MMMM d, yyyy");
    const stance =
        kind === "morning"
            ? "This is the MORNING briefing, sent at the start of the day. Set the day up: call out what's due today, anything overdue that needs attention first, and one thing worth focusing on. Forward-looking."
            : "This is the EVENING review, sent at the end of the day. Look back: what got done today, what slipped, and how it fits the recent trend. Backward-looking, closing the loop.";
    return [
        "You are the proactive briefing generator for Lifestyle OS, a personal habit/goal/routine tracker.",
        `Today is ${today}.`,
        stance,
        "You will be given the user's current data as labeled JSON blocks. Ground every statement in that data — cite specific numbers (streaks, percentages, counts), never generic advice.",
        "Write 3-6 short sentences, but break them into 2-3 short paragraphs grouped by topic (e.g. flagged/urgent items first, then today's picture, then a closing note) — separate paragraphs with a blank line. This is read on a phone as a Telegram message, so a wall of one dense paragraph is hard to scan; short paragraphs are not.",
        "When you list 2 or more habits together (e.g. a routine), use a short line-per-item list instead of naming them in a comma-separated sentence — one line per habit starting with '- ', including its time if known (e.g. '- Strength workout (06:00-06:30)'; if only a time-of-day is known, just say '- Meditate (morning)'; if no time at all, just '- Journal'). Keep everything else — the framing sentence before the list, the closing note — as plain prose.",
        "Plain text, no headers, no markdown formatting (no **bold**, no #), no emoji. Warm but direct, second person. This is read as a short push-style note, not a chat reply — do not offer to help or ask questions.",
        ...(hasFlags
            ? ["A FLAGGED block lists items already identified as needing attention, ranked by priority. Lead with these over other data. If something's been flagged multiple days, say so naturally (e.g. 'third day now') rather than restating raw numbers."]
            : []),
        ...preferenceInstructions(prefs),
    ].join("\n");
}

export async function generateBriefing(
    kind: BriefingKind,
    prefs: AssistantPreferences,
    topFlags: ScoredFlag[],
): Promise<{ title: string; body: string }> {
    const client = new OpenAI();
    const context = await buildBriefingContext(topFlags);
    const completion = await client.chat.completions.create({
        model: MODEL,
        temperature: 0.5,
        max_tokens: 400,
        messages: [
            { role: "system", content: systemPrompt(kind, prefs, topFlags.length > 0) },
            { role: "user", content: context },
        ],
    });
    const body = completion.choices[0]?.message?.content?.trim() || "(no response)";
    const title = kind === "morning" ? "Morning briefing" : "Evening review";
    return { title, body };
}

export async function recordBriefing(kind: BriefingKind): Promise<AssistantSignal> {
    const prefs = await getAssistantPreferences();
    await syncFlags();
    const topFlags = await getTopFlags(prefs, 3);
    const { title, body } = await generateBriefing(kind, prefs, topFlags);
    const signalKind: SignalKind = kind === "morning" ? "briefing_morning" : "briefing_evening";
    const [row] = await db.insert(assistantSignals).values({ kind: signalKind, title, body }).returning();

    try {
        const text = `${title}\n\n${body}`;
        await sendTelegramMessage(text);

        if (kind === "morning") {
            let suggestion: { flag: ScoredFlag; action: SuggestedAction } | null = null;
            for (const f of topFlags) {
                const action = suggestedAction(f);
                if (action) {
                    suggestion = { flag: f, action };
                    break;
                }
            }
            if (suggestion) {
                const prefix = KIND_PREFIX[suggestion.action.kind];
                await sendTelegramMessage(`Suggestion: ${suggestion.action.label} for "${suggestion.flag.refTitle}"?`, {
                    buttons: [
                        [{ label: "Do it", data: `${prefix}:${suggestion.action.refId}` }],
                        [{ label: "Not now", data: `skip:${suggestion.flag.id}` }],
                    ],
                });
            }
        }
    } catch (err) {
        console.error("briefing: telegram delivery failed", err);
    }

    return row;
}
