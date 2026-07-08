import { format } from "date-fns";
import OpenAI from "openai";
import { appendAssistantMessage, appendUserMessage, loadModelMessages } from "@/lib/assistant/history";
import { executeTool, tools } from "@/lib/assistant/tools";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "gpt-4o";
const MAX_ITERATIONS = 6;

function systemPrompt(): string {
    const today = format(new Date(), "EEEE, MMMM d, yyyy");
    return [
        "You are the assistant inside Lifestyle OS, a personal tracker for one user's habits, goals, and routines.",
        `Today is ${today}.`,
        "",
        "You have tools to read and modify the user's real data. Ground every answer in their actual data — call the read tools instead of guessing or giving generic advice. When the user reports that they did, finished, skipped, or missed something, log it with the write tools rather than just acknowledging it.",
        "",
        "Reversible logging (marking habits done/skipped, creating tasks, completing tasks) should be done directly without asking permission — then confirm in plain language what you changed. Match habit, goal, and task names loosely against what exists; if nothing matches, say so and offer the closest options.",
        "",
        "Be warm, concise, and direct. Lead with the answer. Reference the user's specific numbers (streaks, percentages, what's due) rather than platitudes. Use sentence case and no emoji.",
    ].join("\n");
}

type StreamEvent = { type: "text"; text: string } | { type: "tool"; name: string } | { type: "done" } | { type: "error"; message: string };

// Accumulates OpenAI streamed tool_call deltas (which arrive fragmented by index).
type PartialToolCall = { id: string; name: string; args: string };

export async function POST(req: Request): Promise<Response> {
    if (!process.env.OPENAI_API_KEY) {
        return Response.json({ error: "missing_api_key" }, { status: 503 });
    }

    let message: string;
    try {
        const body = (await req.json()) as { message?: unknown };
        message = typeof body.message === "string" ? body.message.trim() : "";
    } catch {
        return Response.json({ error: "invalid_body" }, { status: 400 });
    }
    if (!message) return Response.json({ error: "empty_message" }, { status: 400 });

    const client = new OpenAI();
    const history = await loadModelMessages();
    await appendUserMessage(message);

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt() },
        ...history.map((h): OpenAI.Chat.Completions.ChatCompletionMessageParam =>
            h.role === "user" ? { role: "user", content: h.content } : { role: "assistant", content: h.content },
        ),
        { role: "user", content: message },
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            const send = (event: StreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
            let fullText = "";
            const toolsUsed: string[] = [];

            try {
                for (let i = 0; i < MAX_ITERATIONS; i++) {
                    const turn = await client.chat.completions.create({
                        model: MODEL,
                        temperature: 0.5,
                        max_tokens: 2000,
                        stream: true,
                        tools,
                        messages,
                    });

                    let content = "";
                    const partials: Record<number, PartialToolCall> = {};

                    for await (const chunk of turn) {
                        const delta = chunk.choices[0]?.delta;
                        if (!delta) continue;
                        if (delta.content) {
                            content += delta.content;
                            fullText += delta.content;
                            send({ type: "text", text: delta.content });
                        }
                        for (const tc of delta.tool_calls ?? []) {
                            const p = (partials[tc.index] ??= { id: "", name: "", args: "" });
                            if (tc.id) p.id = tc.id;
                            if (tc.function?.name) p.name += tc.function.name;
                            if (tc.function?.arguments) p.args += tc.function.arguments;
                        }
                    }

                    const calls = Object.values(partials);
                    if (calls.length === 0) break;

                    messages.push({
                        role: "assistant",
                        content: content || null,
                        tool_calls: calls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.args } })),
                    });

                    for (const call of calls) {
                        send({ type: "tool", name: call.name });
                        toolsUsed.push(call.name);
                        let input: Record<string, unknown> = {};
                        try {
                            input = call.args ? JSON.parse(call.args) : {};
                        } catch {
                            /* malformed args — pass empty object, the tool reports what it needs */
                        }
                        let result: string;
                        try {
                            result = await executeTool(call.name, input);
                        } catch (err) {
                            result = `Error running ${call.name}: ${err instanceof Error ? err.message : "unknown error"}`;
                        }
                        messages.push({ role: "tool", tool_call_id: call.id, content: result });
                    }
                }

                await appendAssistantMessage(fullText.trim() || "(no response)", [...new Set(toolsUsed)]);
                send({ type: "done" });
            } catch (err) {
                const messageText = err instanceof Error ? err.message : "Something went wrong.";
                send({ type: "error", message: messageText });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
    });
}
