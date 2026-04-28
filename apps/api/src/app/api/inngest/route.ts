import { serve } from "inngest/next";
import { inngest } from "../../inngest/client";
import { generateRecommendationsFn } from "../../inngest/functions/generate-recommendations";
import { transcribeSessionFn } from "../../inngest/functions/transcribe-session";
import { processTranscriptionFn } from "../../inngest/functions/process-transcription";

// Inngest API route handler for Vercel
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateRecommendationsFn,
    transcribeSessionFn,
    processTranscriptionFn,
  ] as unknown as Parameters<typeof serve>["0"]["functions"],
});
