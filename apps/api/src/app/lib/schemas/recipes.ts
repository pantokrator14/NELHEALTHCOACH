// apps/api/src/app/lib/schemas/recipes.ts
// Zod schemas para validación de recetas

import { z } from 'zod';

const difficultyEnum = z.enum(['easy', 'medium', 'hard']);

const nutritionSchema = z.object({
  protein: z.number().min(0).default(0),
  carbs: z.number().min(0).default(0),
  fat: z.number().min(0).default(0),
  calories: z.number().min(0).default(0),
});

export const recipeSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(500),
  description: z.string().min(1, 'La descripción es requerida').max(5000),
  category: z.array(z.string().max(200)).default([]),
  ingredients: z.array(z.string().max(2000)).min(1, 'Al menos un ingrediente es requerido'),
  instructions: z.array(z.string().max(5000)).min(1, 'Al menos una instrucción es requerida'),
  nutrition: nutritionSchema.optional().default({ protein: 0, carbs: 0, fat: 0, calories: 0 }),
  cookTime: z.number().int().min(0).max(9999).default(0),
  difficulty: difficultyEnum.optional().default('easy'),
  image: z
    .object({
      url: z.string().max(2000),
      key: z.string().max(500),
      name: z.string().max(500),
      type: z.string().max(100),
      size: z.number().int().min(0),
      uploadedAt: z.string().max(100),
    })
    .nullable()
    .optional(),
  tags: z.array(z.string().max(200)).default([]),
  author: z.string().max(200).optional(),
  isPublished: z.boolean().default(true),
});

export type RecipeInput = z.infer<typeof recipeSchema>;
