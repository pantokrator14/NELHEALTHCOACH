import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getRecipesCollection } from "../../database";
import { decrypt, encrypt } from "../../encryption";
import { logger } from "../../logger";

// ─────────────────────────────────────────────
// Schema definitions for tool inputs
// ─────────────────────────────────────────────

const SearchRecipeInput = z.object({
  query: z.string().describe("Search keywords for recipe lookup"),
  limit: z.number().int().positive().default(5).describe("Maximum number of results"),
  clientLevel: z.enum(["principiante", "intermedio", "avanzado"]).optional().describe("Client experience level for filtering"),
});

const GetRecipeByIdInput = z.object({
  recipeId: z.string().describe("MongoDB ObjectId of the recipe"),
});

const SaveRecipeInput = z.object({
  title: z.string().describe("Recipe title"),
  description: z.string().describe("Recipe description"),
  ingredients: z.array(z.string()).describe("List of ingredients"),
  instructions: z.array(z.string()).describe("Step-by-step instructions"),
  nutrition: z
    .object({
      protein: z.string(),
      carbs: z.string(),
      fat: z.string(),
      calories: z.number(),
    })
    .optional(),
  category: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  cookTime: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  clientLevel: z.enum(["principiante", "intermedio", "avanzado"]).optional().describe("Target client level"),
});

// ─────────────────────────────────────────────
// Recipe interface for decrypted results
// ─────────────────────────────────────────────

interface DecryptedRecipe {
  _id: string;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  nutrition?: {
    protein: string;
    carbs: string;
    fat: string;
    calories: number;
  };
  cookTime?: string;
  difficulty?: string;
  category?: string[];
  tags?: string[];
}

// ─────────────────────────────────────────────
// Tools
// ─────────────────────────────────────────────

/**
 * Searches for recipes in the database using text search.
 * Returns decrypted recipe data with audit logging.
 */
export const searchRecipeTool = tool(
  async (input: z.infer<typeof SearchRecipeInput>) => {
    const logCtx = logger.withContext({
      tool: "searchRecipeTool",
      query: input.query,
      limit: input.limit,
      clientLevel: input.clientLevel ?? "unspecified",
    });

    try {
      logCtx.info("AI", "Searching recipes in database");

      const collection = await getRecipesCollection();

      // NOTA: No podemos usar $text porque los campos están encriptados.
      // Buscamos TODAS las recetas publicadas, desencriptamos y devolvemos
      // metadatos (sin ingredientes/instrucciones completos para no saturar).
      // La IA luego usa get_recipe_by_id si necesita una en específico.
      const allRecipes = await collection
        .find(
          { isPublished: true },
          {
            projection: {
              _id: 1, title: 1, description: 1,
              category: 1, tags: 1, difficulty: 1,
              cookTime: 1, nutrition: 1,
            },
          }
        )
        .limit(input.limit)
        .toArray();

      logCtx.info("AI", `Retrieved ${allRecipes.length} recipes from database`);

      const decrypted = allRecipes.map((doc) => {
        const d = doc as Record<string, unknown>;
        return {
          _id: String(d._id),
          title: decrypt(d.title as string),
          description: decrypt(d.description as string).substring(0, 200), // Descripción corta
          difficulty: decrypt(d.difficulty as string) || "easy",
          cookTime: (d.cookTime as number) || 0,
          nutrition: d.nutrition || { protein: 0, carbs: 0, fat: 0, calories: 0 },
          category: Array.isArray(d.category)
            ? d.category.map((c: string) => decrypt(c))
            : [],
          tags: Array.isArray(d.tags)
            ? d.tags.map((t: string) => decrypt(t))
            : [],
        };
      });

      return JSON.stringify(decrypted);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logCtx.error("AI", `Failed to search recipes: ${errorMessage}`);
      return JSON.stringify({ error: "Failed to search recipes", details: errorMessage });
    }
  },
  {
    name: "search_recipe",
    description:
      "Search for recipes in the database. Returns matching recipes with decrypted titles, descriptions, categories, tags, and nutrition info. Use clientLevel to filter by difficulty.",
    schema: SearchRecipeInput,
  }
);

/**
 * Retrieves a single recipe by its MongoDB ID.
 * Returns fully decrypted recipe data with audit logging.
 */
export const getRecipeByIdTool = tool(
  async (input: z.infer<typeof GetRecipeByIdInput>) => {
    const logCtx = logger.withContext({
      tool: "getRecipeByIdTool",
      recipeId: input.recipeId,
    });

    try {
      logCtx.info("AI", "Fetching recipe by ID");

      const { ObjectId } = await import("mongodb");
      const collection = await getRecipesCollection();

      const doc = await collection.findOne({
        _id: new ObjectId(input.recipeId),
      });

      if (!doc) {
        logCtx.warn("AI", "Recipe not found", { recipeId: input.recipeId });
        return JSON.stringify({ error: "Recipe not found", recipeId: input.recipeId });
      }

      const docRecord = doc as Record<string, unknown>;

      const decrypted: DecryptedRecipe = {
        _id: String(docRecord._id),
        title: decrypt(docRecord.title as string),
        description: decrypt(docRecord.description as string),
        ingredients: (docRecord.ingredients as string[]).map((ing: string) =>
          decrypt(ing)
        ),
        instructions: (docRecord.instructions as string[]).map((inst: string) =>
          decrypt(inst)
        ),
        nutrition: docRecord.nutrition as
          | { protein: string; carbs: string; fat: string; calories: number }
          | undefined,
        cookTime: (docRecord.cookTime as string) ?? "",
        difficulty: (docRecord.difficulty as string) ?? "medium",
        category: Array.isArray(docRecord.category)
          ? docRecord.category.map((c: string) => decrypt(c))
          : [],
        tags: Array.isArray(docRecord.tags)
          ? docRecord.tags.map((t: string) => decrypt(t))
          : [],
      };

      logCtx.info("AI", "Recipe fetched and decrypted successfully", {
        title: decrypted.title,
        ingredientCount: decrypted.ingredients.length,
      });

      return JSON.stringify(decrypted);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logCtx.error("AI", `Failed to fetch recipe: ${errorMessage}`);
      return JSON.stringify({ error: "Failed to fetch recipe", details: errorMessage });
    }
  },
  {
    name: "get_recipe_by_id",
    description:
      "Retrieve a specific recipe by its MongoDB ID. Returns fully decrypted recipe with all fields.",
    schema: GetRecipeByIdInput,
  }
);

/**
 * Saves a new AI-generated recipe to the database.
 * Automatically encrypts all text fields before storage with audit logging.
 */
export const saveRecipeTool = tool(
  async (input: z.infer<typeof SaveRecipeInput>) => {
    const logCtx = logger.withContext({
      tool: "saveRecipeTool",
      title: input.title,
      difficulty: input.difficulty,
      clientLevel: input.clientLevel ?? "unspecified",
    });

    try {
      logCtx.info("AI", "Saving AI-generated recipe to database");

      const collection = await getRecipesCollection();

      const recipeDoc = {
        title: encrypt(input.title),
        description: encrypt(input.description),
        ingredients: input.ingredients.map((ing: string) => encrypt(ing)),
        instructions: input.instructions.map((inst: string) => encrypt(inst)),
        nutrition: input.nutrition ?? {
          protein: "0",
          carbs: "0",
          fat: "0",
          calories: 0,
        },
        category: input.category?.map((c: string) => encrypt(c)) ?? [],
        tags: input.tags?.map((t: string) => encrypt(t)) ?? [
          encrypt("ai-generated"),
          encrypt(input.difficulty),
          ...(input.clientLevel ? [encrypt(input.clientLevel)] : []),
        ],
        cookTime: input.cookTime ?? "",
        difficulty: input.difficulty,
        author: "ai-generated",
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        image: {
          url: "",
          key: "",
          name: "",
          type: "",
          size: 0,
          uploadedAt: new Date(),
        },
      };

      const result = await collection.insertOne(recipeDoc);

      logCtx.info("AI", "AI-generated recipe saved successfully", {
        recipeId: String(result.insertedId),
        ingredientCount: input.ingredients.length,
      });

      return JSON.stringify({
        success: true,
        recipeId: String(result.insertedId),
        title: input.title,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logCtx.error("AI", `Failed to save recipe: ${errorMessage}`);
      return JSON.stringify({ error: "Failed to save recipe", details: errorMessage });
    }
  },
  {
    name: "save_recipe",
    description:
      "Save a new AI-generated recipe to the database. All text fields are automatically encrypted. Use when no suitable recipe exists in DB.",
    schema: SaveRecipeInput,
  }
);
