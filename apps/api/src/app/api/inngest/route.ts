import { serve } from "inngest/next";
import { inngest } from "../../inngest/client";
import { generateRecommendationsFn } from "../../inngest/functions/generate-recommendations";
import { sendSessionRemindersFn } from "../../inngest/functions/session-reminders";
import { monthlyRemindersFn } from "../../inngest/functions/monthly-reminders";
import { trialRemindersFn } from "../../inngest/functions/trial-reminders";

// Aumentar timeout para funciones largas (LangGraph)
export const maxDuration = 120;

// Inngest API route handler for Vercel
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateRecommendationsFn,
    sendSessionRemindersFn,
    monthlyRemindersFn,
    trialRemindersFn,
  ] as unknown as Parameters<typeof serve>["0"]["functions"],
});
