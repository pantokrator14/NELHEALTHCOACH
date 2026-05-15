// apps/api/src/app/lib/schemas/exercises.ts
// Zod schemas para validación de ejercicios

import { z } from 'zod';

const difficultyEnum = z.enum(['easy', 'medium', 'hard']);
const clientLevelEnum = z.enum(['principiante', 'intermedio', 'avanzado']);

export const exerciseSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(500),
  description: z.string().min(1, 'La descripción es requerida').max(5000),
  category: z.array(z.string().max(200)).min(1, 'Al menos una categoría es requerida'),
  instructions: z.array(z.string().max(5000)).min(1, 'Al menos una instrucción es requerida'),
  equipment: z.array(z.string().max(200)).default([]),
  difficulty: difficultyEnum,
  clientLevel: clientLevelEnum,
  muscleGroups: z.array(z.string().max(200)).min(1, 'Al menos un grupo muscular es requerido'),
  contraindications: z.array(z.string().max(2000)).default([]),
  sets: z.number().int().min(0).max(100).default(0),
  repetitions: z.string().max(100).default(''),
  timeUnderTension: z.string().max(100).default(''),
  restBetweenSets: z.string().max(100).default(''),
  progression: z.string().max(5000).default(''),
  demo: z
    .object({
      url: z.string().max(2000),
      key: z.string().max(500),
      type: z.string().max(100),
      name: z.string().max(500),
      size: z.number().int().min(0),
      uploadedAt: z.string().max(100),
      videoSearchUrl: z.string().max(2000).optional().default(''),
    })
    .nullable()
    .optional(),
  progressionOf: z.string().max(100).optional().nullable(),
  progressesTo: z.array(z.string().max(100)).default([]),
  author: z.string().max(200).optional(),
  isPublished: z.boolean().default(true),
  tags: z.array(z.string().max(200)).default([]),
});

export type ExerciseInput = z.infer<typeof exerciseSchema>;

// Schema para actualización: todos los campos son opcionales
export const exerciseUpdateSchema = exerciseSchema.partial();

export type ExerciseUpdateInput = z.infer<typeof exerciseUpdateSchema>;
