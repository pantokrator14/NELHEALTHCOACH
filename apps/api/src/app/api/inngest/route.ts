import { serve } from "inngest/next";
import { inngest } from "../../inngest/client";
import { generateRecommendationsFn } from "../../inngest/functions/generate-recommendations";
import { sendSessionRemindersFn } from "../../inngest/functions/session-reminders";

// Aumentar timeout para funciones largas (LangGraph)
export const maxDuration = 120;

// Inngest API route handler for Vercel
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateRecommendationsFn,
    sendSessionRemindersFn,
  ] as unknown as Parameters<typeof serve>["0"]["functions"],
});
