import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "nelhealthcoach",
  name: "NelHealthCoach",
  retryFunction: (attempt: number) => ({
    delay: Math.pow(2, attempt) * 1000,
    maxAttempts: 3,
  }),
});
