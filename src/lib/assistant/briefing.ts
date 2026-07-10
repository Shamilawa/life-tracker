import "server-only";
import { format } from "date-fns";
import OpenAI from "openai";
import { executeTool } from "@/lib/assistant/tools";
import { db } from "@/lib/db";
import { assistantSignals } from "@/lib/db/schema";
import type { AssistantSignal, SignalKind } from "@/lib/db/schema";

const MODEL = "gpt-4o";

type BriefingKind = "morning" | "evening";

async function buildBriefingContext(): Promise<string> {
    const [today, habits, goals, insights] = await Promise.all([
        executeTool("get_today", {}),
        executeTool("get_habits", {}),
        executeTool("get_goals", {}),
        executeTool("get_insights", {}),
    ]);
    return [`TODAY:\n${today}`, `HABITS:\n${habits}`, `GOALS:\n${goals}`, `INSIGHTS:\n${insights}`].join("\n\n");
}

function systemPrompt(kind: BriefingKind): string {
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
        "Write 3-6 short sentences, plain text, no headers, no markdown, no emoji. Warm but direct, second person. This is read as a short push-style note, not a chat reply — do not offer to help or ask questions.",
    ].join("\n");
}

export async function generateBriefing(kind: BriefingKind): Promise<{ title: string; body: string }> {
    const client = new OpenAI();
    const context = await buildBriefingContext();
    const completion = await client.chat.completions.create({
        model: MODEL,
        temperature: 0.5,
        max_tokens: 400,
        messages: [
            { role: "system", content: systemPrompt(kind) },
            { role: "user", content: context },
        ],
    });
    const body = completion.choices[0]?.message?.content?.trim() || "(no response)";
    const title = kind === "morning" ? "Morning briefing" : "Evening review";
    return { title, body };
}

export async function recordBriefing(kind: BriefingKind): Promise<AssistantSignal> {
    const { title, body } = await generateBriefing(kind);
    const signalKind: SignalKind = kind === "morning" ? "briefing_morning" : "briefing_evening";
    const [row] = await db.insert(assistantSignals).values({ kind: signalKind, title, body }).returning();
    return row;
}
