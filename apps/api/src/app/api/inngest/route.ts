import { serve } from "inngest/next";
import { inngest } from "../../inngest/client";
import { generateRecommendationsFn } from "../../inngest/functions/generate-recommendations";

// Aumentar timeout para funciones largas (LangGraph)
export const maxDuration = 120;

// Inngest API route handler for Vercel
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateRecommendationsFn,
  ] as unknown as Parameters<typeof serve>["0"]["functions"],
});
