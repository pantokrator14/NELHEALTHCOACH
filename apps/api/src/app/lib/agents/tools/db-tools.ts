import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getHealthFormsCollection } from "../../database";
import { ObjectId } from "mongodb";
import { decrypt, encrypt } from "../../encryption";
import { logger } from "../../logger";

// ─────────────────────────────────────────────
// Schema definitions for tool inputs
// ─────────────────────────────────────────────

const GetClientDataInput = z.object({
  clientId: z.string().describe("MongoDB ObjectId of the client"),
});

const GetPreviousSessionsInput = z.object({
  clientId: z.string().describe("MongoDB ObjectId of the client"),
});

const SaveSessionInput = z.object({
  clientId: z.string().describe("MongoDB ObjectId of the client"),
  sessionId: z.string().describe("Session identifier"),
  summary: z.string().describe("Session summary"),
  vision: z.string().describe("Long-term vision"),
  weeks: z.array(z.object({}).passthrough()).describe("Weekly plans"),
  checklist: z.array(z.object({}).passthrough()).describe("Checklist items"),
});

// ─────────────────────────────────────────────
// Tools
// ─────────────────────────────────────────────

/**
 * Fetches a client's health form data by ID.
 * Returns decrypted personal and medical data with audit logging.
 */
export const getClientDataTool = tool(
  async (input: z.infer<typeof GetClientDataInput>) => {
    const logCtx = logger.withContext({
      tool: "getClientDataTool",
      clientId: input.clientId,
    });

    try {
      logCtx.info("AI", "Fetching client health form data");

      const collection = await getHealthFormsCollection();
      const doc = await collection.findOne({ _id: new ObjectId(input.clientId) });

      if (!doc) {
        logCtx.warn("AI", "Client not found", { clientId: input.clientId });
        return JSON.stringify({ error: "Client not found", clientId: input.clientId });
      }

      const personalDataRaw = doc.personalData as Record<string, unknown> | undefined;
      const medicalDataRaw = doc.medicalData as Record<string, unknown> | undefined;

      const personalData = personalDataRaw
        ? Object.fromEntries(
            Object.entries(personalDataRaw).map(([key, value]) => [
              key,
              typeof value === "string" ? decrypt(value) : value,
            ])
          )
        : {};

      const medicalData = medicalDataRaw
        ? Object.fromEntries(
            Object.entries(medicalDataRaw).map(([key, value]) => [
              key,
              typeof value === "string" ? decrypt(value) : value,
            ])
          )
        : {};

      logCtx.info("AI", "Client data fetched and decrypted", {
        hasPersonalData: Object.keys(personalData).length > 0,
        hasMedicalData: Object.keys(medicalData).length > 0,
      });

      return JSON.stringify({
        clientId: input.clientId,
        personalData,
        medicalData,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logCtx.error("AI", `Failed to fetch client data: ${errorMessage}`);
      return JSON.stringify({ error: "Failed to fetch client data", details: errorMessage });
    }
  },
  {
    name: "get_client_data",
    description:
      "Fetch a client's health form data including personal and medical information. All fields are automatically decrypted.",
    schema: GetClientDataInput,
  }
);

/**
 * Retrieves all previous AI recommendation sessions for a client.
 */
export const getPreviousSessionsTool = tool(
  async (input: z.infer<typeof GetPreviousSessionsInput>) => {
    const logCtx = logger.withContext({
      tool: "getPreviousSessionsTool",
      clientId: input.clientId,
    });

    try {
      logCtx.info("AI", "Fetching previous AI sessions");

      const collection = await getHealthFormsCollection();

      const doc = await collection.findOne(
        { _id: new ObjectId(input.clientId) },
        { projection: { "aiProgress.sessions": 1 } }
      );

      const sessionsRaw = (doc?.aiProgress?.sessions ?? []) as Array<Record<string, unknown>>;

      const decryptedSessions = sessionsRaw.map((session: Record<string, unknown>) => ({
        sessionId: typeof session.sessionId === "string" ? session.sessionId : "",
        monthNumber: typeof session.monthNumber === "number" ? session.monthNumber : 0,
        status: typeof session.status === "string" ? session.status : "unknown",
        summary: typeof session.summary === "string" ? decrypt(session.summary) : "",
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      }));

      logCtx.info("AI", "Previous sessions fetched", {
        sessionCount: decryptedSessions.length,
      });

      return JSON.stringify({
        clientId: input.clientId,
        sessionCount: sessionsRaw.length,
        sessions: decryptedSessions,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logCtx.error("AI", `Failed to fetch sessions: ${errorMessage}`);
      return JSON.stringify({ error: "Failed to fetch sessions", details: errorMessage });
    }
  },
  {
    name: "get_previous_sessions",
    description:
      "Retrieve all previous AI recommendation sessions for a client. Returns session metadata and decrypted summaries.",
    schema: GetPreviousSessionsInput,
  }
);

/**
 * Saves the final AI recommendation session to the client's health form.
 */
export const saveSessionTool = tool(
  async (input: z.infer<typeof SaveSessionInput>) => {
    const logCtx = logger.withContext({
      tool: "saveSessionTool",
      clientId: input.clientId,
      sessionId: input.sessionId,
    });

    try {
      logCtx.info("AI", "Saving AI recommendation session");

      const collection = await getHealthFormsCollection();

      const encryptedWeeks = input.weeks.map((week: Record<string, unknown>) => {
        const nutrition = week.nutrition as Record<string, unknown> | undefined;
        const exercise = week.exercise as Record<string, unknown> | undefined;
        const habits = week.habits as Record<string, unknown> | undefined;

        return {
          nutrition: nutrition ? {
            focus: nutrition.focus ? encrypt(nutrition.focus as string) : "",
            shoppingList: Array.isArray(nutrition.shoppingList)
              ? (nutrition.shoppingList as Array<Record<string, string>>).map((item) => ({
                  item: encrypt(item.item),
                  quantity: encrypt(item.quantity),
                  priority: item.priority,
                }))
              : [],
          } : undefined,
          exercise: exercise ? {
            focus: exercise.focus ? encrypt(exercise.focus as string) : "",
            equipment: Array.isArray(exercise.equipment)
              ? exercise.equipment.map((eq: string) => encrypt(eq))
              : [],
          } : undefined,
          habits: habits ? {
            trackingMethod: habits.trackingMethod ? encrypt(habits.trackingMethod as string) : undefined,
            motivationTip: habits.motivationTip ? encrypt(habits.motivationTip as string) : undefined,
          } : undefined,
        };
      });

      const sessionData = {
        sessionId: input.sessionId,
        summary: encrypt(input.summary),
        vision: encrypt(input.vision),
        weeks: encryptedWeeks,
        checklist: input.checklist.map((item: Record<string, unknown>) => {
          const details = item.details as Record<string, unknown> | undefined;
          return {
            ...item,
            description: encrypt(item.description as string),
            details: details ? {
              ...details,
              recipe: details.recipe ? {
                ...(details.recipe as Record<string, unknown>),
                ingredients: Array.isArray((details.recipe as Record<string, unknown>).ingredients)
                  ? ((details.recipe as Record<string, unknown>).ingredients as Array<Record<string, string>>).map((ing) => ({
                      name: encrypt(ing.name),
                      quantity: encrypt(ing.quantity),
                      notes: ing.notes ? encrypt(ing.notes) : undefined,
                    }))
                  : [],
                preparation: encrypt((details.recipe as Record<string, unknown>).preparation as string),
                tips: (details.recipe as Record<string, unknown>).tips
                  ? encrypt((details.recipe as Record<string, unknown>).tips as string)
                  : undefined,
              } : undefined,
              frequency: details.frequency ? encrypt(details.frequency as string) : undefined,
              duration: details.duration ? encrypt(details.duration as string) : undefined,
              equipment: Array.isArray(details.equipment)
                ? details.equipment.map((eq: string) => encrypt(eq))
                : undefined,
            } : undefined,
          };
        }),
      };

      const result = await collection.updateOne(
        { _id: new ObjectId(input.clientId) },
        {
          $set: {
            updatedAt: new Date(),
            "aiProgress.sessions": sessionData,
            "aiProgress.currentSessionId": input.sessionId,
          },
        }
      );

      logCtx.info("AI", "Session saved successfully", {
        modified: result.modifiedCount > 0,
      });

      return JSON.stringify({
        success: result.modifiedCount > 0,
        clientId: input.clientId,
        sessionId: input.sessionId,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logCtx.error("AI", `Failed to save session: ${errorMessage}`);
      return JSON.stringify({ error: "Failed to save session", details: errorMessage });
    }
  },
  {
    name: "save_session",
    description:
      "Save the final AI recommendation session to the client's health form. All text fields are automatically encrypted.",
    schema: SaveSessionInput,
  }
);
