import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/app/app-shell";
import { loadUiMessages } from "@/lib/assistant/history";
import { getAssistantSignals, getLifeProgress } from "@/lib/queries";
import { RouteProvider } from "@/providers/router-provider";
import { Theme } from "@/providers/theme";
import "@/styles/globals.css";
import { cx } from "@/utils/cx";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: "Lifestyle OS",
    description: "Personal habits, goals, and routines — with an AI assistant.",
};

export const viewport: Viewport = {
    themeColor: "#7f56d9",
    colorScheme: "light dark",
};

// Reads live DB (life progress + chat history), so never statically cache the shell.
export const dynamic = "force-dynamic";

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const assistantInitialMessages = await loadUiMessages();
    const assistantHasApiKey = Boolean(process.env.OPENAI_API_KEY);
    const lifeProgress = await getLifeProgress();
    const signals = await getAssistantSignals();

    return (
        <html lang="en" suppressHydrationWarning>
            <body className={cx(inter.variable, "bg-primary antialiased")}>
                <RouteProvider>
                    <Theme>
                        <AppShell
                            assistantInitialMessages={assistantInitialMessages}
                            assistantHasApiKey={assistantHasApiKey}
                            lifeProgress={lifeProgress}
                            signals={signals}
                        >
                            {children}
                        </AppShell>
                    </Theme>
                </RouteProvider>
            </body>
        </html>
    );
}
