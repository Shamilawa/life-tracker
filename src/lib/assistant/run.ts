import "server-only";
import OpenAI from "openai";
import { appendAssistantMessage, appendUserMessage, loadModelMessages } from "@/lib/assistant/history";
import { assistantSystemPrompt } from "@/lib/assistant/prompt";
import { executeTool, tools } from "@/lib/assistant/tools";

const MODEL = "gpt-4o";
const MAX_ITERATIONS = 6;

/** Non-streaming counterpart to /api/chat's loop, for callers that just need the final text (e.g. Telegram). Shares the same chat_messages history, so both surfaces are one continuous conversation. */
export async function runAssistantTurn(userText: string): Promise<{ text: string; toolsUsed: string[] }> {
    const client = new OpenAI();
    const history = await loadModelMessages();
    await appendUserMessage(userText);

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: await assistantSystemPrompt() },
        ...history.map((h): OpenAI.Chat.Completions.ChatCompletionMessageParam =>
            h.role === "user" ? { role: "user", content: h.content } : { role: "assistant", content: h.content },
        ),
        { role: "user", content: userText },
    ];

    let fullText = "";
    const toolsUsed: string[] = [];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const completion = await client.chat.completions.create({
            model: MODEL,
            temperature: 0.5,
            max_tokens: 2000,
            messages,
            tools,
        });

        const msg = completion.choices[0]?.message;
        if (!msg) break;
        if (msg.content) fullText += msg.content;
        const calls = msg.tool_calls?.filter((c) => c.type === "function") ?? [];
        if (!calls.length) break;

        messages.push({ role: "assistant", content: msg.content, tool_calls: calls });

        for (const call of calls) {
            toolsUsed.push(call.function.name);
            let input: Record<string, unknown> = {};
            try {
                input = call.function.arguments ? JSON.parse(call.function.arguments) : {};
            } catch {
                /* malformed args — pass empty object, the tool reports what it needs */
            }
            let result: string;
            try {
                result = await executeTool(call.function.name, input);
            } catch (err) {
                result = `Error running ${call.function.name}: ${err instanceof Error ? err.message : "unknown error"}`;
            }
            messages.push({ role: "tool", tool_call_id: call.id, content: result });
        }
    }

    const text = fullText.trim() || "(no response)";
    const uniqueTools = [...new Set(toolsUsed)];
    await appendAssistantMessage(text, uniqueTools);
    return { text, toolsUsed: uniqueTools };
}
