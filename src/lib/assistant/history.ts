import "server-only";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatMessages } from "@/lib/db/schema";

export type ChatTurn = { role: "user" | "assistant"; content: string };

// Stored `content` shapes. We persist only the conversational text (plus which
// tools ran, for UI chips) — tool calls are re-run against live data each turn,
// so replaying past tool I/O to the model would be stale and noisy.
type StoredContent = { text: string; tools?: string[] };

export type UiMessage = { id: string; role: "user" | "assistant"; text: string; tools: string[] };

export async function loadUiMessages(): Promise<UiMessage[]> {
    const rows = await db.select().from(chatMessages).orderBy(asc(chatMessages.createdAt));
    return rows.map((r) => {
        const c = r.content as StoredContent;
        return { id: r.id, role: r.role, text: c.text ?? "", tools: c.tools ?? [] };
    });
}

export async function loadModelMessages(): Promise<ChatTurn[]> {
    const rows = await db.select().from(chatMessages).orderBy(asc(chatMessages.createdAt));
    return rows.map((r) => ({ role: r.role, content: (r.content as StoredContent).text ?? "" }));
}

export async function appendUserMessage(text: string): Promise<void> {
    await db.insert(chatMessages).values({ role: "user", content: { text } });
}

export async function appendAssistantMessage(text: string, tools: string[]): Promise<void> {
    await db.insert(chatMessages).values({ role: "assistant", content: { text, tools } });
}
