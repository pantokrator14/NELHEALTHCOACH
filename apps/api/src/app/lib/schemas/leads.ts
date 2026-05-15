// apps/api/src/app/lib/schemas/leads.ts
// Zod schemas para validación de leads (formulario de contacto)

import { z } from 'zod';

export const leadSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  email: z.string().email('Email inválido').max(200),
  phone: z.string().max(50).optional().default(''),
  objective: z.string().min(1, 'El objetivo es requerido').max(500),
  otherObjective: z.string().max(500).optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;
