// apps/api/src/app/lib/schemas/waitlist.ts
// Lista de espera ÚNICA del proyecto (libro + sesiones gratuitas).
// Solo email (dato personal → cifrado en reposo) y el motivo.
import { z } from 'zod';

export const WAITLIST_SOURCES = ['book', 'sessions'] as const;

export const waitlistSchema = z.object({
  email: z.string().email('Email inválido').max(200),
  source: z.enum(WAITLIST_SOURCES, 'Origen inválido').default('book'),
  // Honeypot anti-spam: los bots lo rellenan, los humanos no lo ven
  website: z.string().max(200).default(''),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;

/** Configuración de sesiones gratuitas (editable por el admin). */
export const freeSessionsSchema = z
  .object({
    open: z.boolean().optional(),
    limit: z.number().int().min(0).max(1000).optional(),
    resetUsed: z.boolean().optional(),
  })
  .refine((d) => d.open !== undefined || d.limit !== undefined || d.resetUsed === true, {
    message: 'No hay cambios para guardar',
  });

export type FreeSessionsInput = z.infer<typeof freeSessionsSchema>;
