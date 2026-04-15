import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getExerciseCollection } from "../../database";
import { decrypt, encrypt } from "../../encryption";
import { logger } from "../../logger";

// ─────────────────────────────────────────────
// Schema definitions for tool inputs
// ─────────────────────────────────────────────

const SearchExerciseInput = z.object({
  query: z.string().describe("Search keywords (e.g., 'piernas sentadilla', 'push chest')"),
  limit: z.number().int().positive().default(5).describe("Maximum number of results"),
  clientLevel: z.enum(["principiante", "intermedio", "avanzado"]).optional().describe("Filter by client experience level"),
  equipment: z.array(z.string()).optional().describe("Filter by available equipment"),
});

const GetExerciseByIdInput = z.object({
  exerciseId: z.string().describe("MongoDB ObjectId of the exercise"),
});

const SaveExerciseInput = z.object({
  name: z.string().describe("Exercise name"),
  description: z.string().describe("Brief description of the exercise"),
  instructions: z.array(z.string()).describe("Step-by-step instructions"),
  category: z.array(z.string()).describe("Categories (e.g., 'piernas', 'fuerza')"),
  equipment: z.array(z.string()).describe("Required equipment"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  clientLevel: z.enum(["principiante", "intermedio", "avanzado"]),
  muscleGroups: z.array(z.string()).describe("Target muscle groups"),
  contraindications: z.array(z.string()).optional().describe("Contraindications (e.g., 'knee pain')"),
  sets: z.number().int().positive().default(3),
  repetitions: z.string().describe("e.g., '12' or '10-15'"),
  timeUnderTension: z.string().default("3-1-1"),
  restBetweenSets: z.string().default("45-60 segundos"),
  progression: z.string().describe("How to progress (increase weight, reps, etc.)"),
  tags: z.array(z.string()).describe("Search tags"),
});

// ─────────────────────────────────────────────
// Exercise interface for decrypted results
// ─────────────────────────────────────────────

interface DecryptedExercise {
  id: string;
  name: string;
  description: string;
  category: string[];
  instructions: string[];
  equipment: string[];
  difficulty: string;
  clientLevel: string;
  muscleGroups: string[];
  contraindications: string[];
  sets: number;
  repetitions: string;
  timeUnderTension: string;
  restBetweenSets: string;
  progression: string;
  tags: string[];
}

// ─────────────────────────────────────────────
// Tools
// ─────────────────────────────────────────────

/**
 * Searches for exercises in the database using text search.
 * Returns decrypted exercise data with audit logging.
 */
export const searchExerciseTool = tool(
  async (input: z.infer<typeof SearchExerciseInput>) => {
    const logCtx = logger.withContext({
      tool: "searchExerciseTool",
      query: input.query,
      limit: input.limit,
    });

    try {
      logCtx.info("AI", "Searching exercises in database");

      const collection = await getExerciseCollection();
      const allExercises = await collection.find({}).toArray();

      const decrypted: DecryptedExercise[] = allExercises.map((doc) => {
        const docRecord = doc as Record<string, unknown>;
        return {
          id: String(docRecord._id),
          name: decrypt(docRecord.name as string),
          description: decrypt(docRecord.description as string),
          category: (docRecord.category as string[]).map((c: string) => decrypt(c)),
          instructions: (docRecord.instructions as string[]).map((i: string) => decrypt(i)),
          equipment: (docRecord.equipment as string[]).map((e: string) => decrypt(e)),
          difficulty: decrypt(docRecord.difficulty as string),
          clientLevel: decrypt(docRecord.clientLevel as string),
          muscleGroups: (docRecord.muscleGroups as string[]).map((m: string) => decrypt(m)),
          contraindications: ((docRecord.contraindications as string[]) || []).map((c: string) => decrypt(c)),
          sets: (docRecord.sets as number) ?? 3,
          repetitions: decrypt(docRecord.repetitions as string),
          timeUnderTension: decrypt(docRecord.timeUnderTension as string),
          restBetweenSets: decrypt(docRecord.restBetweenSets as string),
          progression: decrypt(docRecord.progression as string),
          tags: (docRecord.tags as string[]).map((t: string) => decrypt(t)),
        };
      });

      // Filter by query
      const searchLower = input.query.toLowerCase();
      let results = decrypted.filter((ex) =>
        ex.name.toLowerCase().includes(searchLower) ||
        ex.description.toLowerCase().includes(searchLower) ||
        ex.category.some((c) => c.toLowerCase().includes(searchLower)) ||
        ex.tags.some((t) => t.toLowerCase().includes(searchLower)) ||
        ex.muscleGroups.some((m) => m.toLowerCase().includes(searchLower))
      );

      // Filter by client level
      if (input.clientLevel) {
        results = results.filter((ex) => ex.clientLevel === input.clientLevel);
      }

      // Filter by equipment
      if (input.equipment && input.equipment.length > 0) {
        results = results.filter((ex) =>
          input.equipment!.some((eq) => ex.equipment.includes(eq))
        );
      }

      results = results.slice(0, input.limit);

      logCtx.info("AI", `Found ${results.length} exercises matching query`);

      return JSON.stringify(results);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logCtx.error("AI", `Failed to search exercises: ${errorMessage}`);
      return JSON.stringify({ error: "Failed to search exercises", details: errorMessage });
    }
  },
  {
    name: "search_exercise",
    description:
      "Search for exercises in the database by keywords. Returns matching exercises with decrypted details. Use clientLevel to filter by difficulty.",
    schema: SearchExerciseInput,
  }
);

/**
 * Saves a new AI-generated exercise to the database.
 * Automatically encrypts all text fields before storage with audit logging.
 */
export const saveExerciseTool = tool(
  async (input: z.infer<typeof SaveExerciseInput>) => {
    const logCtx = logger.withContext({
      tool: "saveExerciseTool",
      name: input.name,
      difficulty: input.difficulty,
      clientLevel: input.clientLevel,
    });

    try {
      logCtx.info("AI", "Saving AI-generated exercise to database");

      const collection = await getExerciseCollection();

      const exerciseDoc = {
        name: encrypt(input.name),
        description: encrypt(input.description),
        instructions: input.instructions.map((i: string) => encrypt(i)),
        category: input.category.map((c: string) => encrypt(c)),
        equipment: input.equipment.map((e: string) => encrypt(e)),
        difficulty: encrypt(input.difficulty),
        clientLevel: encrypt(input.clientLevel),
        muscleGroups: input.muscleGroups.map((m: string) => encrypt(m)),
        contraindications: (input.contraindications || []).map((c: string) => encrypt(c)),
        sets: input.sets,
        repetitions: encrypt(input.repetitions),
        timeUnderTension: encrypt(input.timeUnderTension),
        restBetweenSets: encrypt(input.restBetweenSets),
        progression: encrypt(input.progression),
        demo: {
          url: encrypt(""),
          key: encrypt(""),
          type: encrypt("placeholder"),
          name: encrypt(input.name),
          size: 0,
          uploadedAt: encrypt(""),
          videoSearchUrl: encrypt(`https://www.youtube.com/results?search_query=${encodeURIComponent(input.name)}+tutorial`),
        },
        progressionOf: null,
        progressesTo: [],
        isPublished: false,
        tags: input.tags.map((t: string) => encrypt(t)),
      };

      const result = await collection.insertOne(exerciseDoc);

      logCtx.info("AI", "AI-generated exercise saved successfully", {
        exerciseId: String(result.insertedId),
      });

      return JSON.stringify({
        success: true,
        exerciseId: String(result.insertedId),
        name: input.name,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logCtx.error("AI", `Failed to save exercise: ${errorMessage}`);
      return JSON.stringify({ error: "Failed to save exercise", details: errorMessage });
    }
  },
  {
    name: "save_exercise",
    description:
      "Save a new AI-generated exercise to the database. All text fields are automatically encrypted. Use when no suitable exercise exists in DB.",
    schema: SaveExerciseInput,
  }
);
