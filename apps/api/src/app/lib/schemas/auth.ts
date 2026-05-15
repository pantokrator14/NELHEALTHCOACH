// apps/api/src/app/lib/schemas/auth.ts
// Zod schemas para validación de autenticación (login, register, change-password)

import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .max(200),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  firstName: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100),
  lastName: z
    .string()
    .min(1, 'El apellido es requerido')
    .max(100),
  email: z
    .string()
    .email('Email inválido')
    .max(200),
  phone: z
    .string()
    .max(50)
    .optional()
    .default(''),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'La contraseña actual es requerida')
    .max(128),
  newPassword: z
    .string()
    .min(6, 'La nueva contraseña debe tener al menos 6 caracteres')
    .max(128),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
