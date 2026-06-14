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
    .min(12, 'La contraseña debe tener al menos 12 caracteres')
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=[\]{}|;':",.<>/?`~])/,
      'La contraseña debe contener mayúscula, minúscula, número y carácter especial',
    ),
  professionalTitle: z
    .string()
    .max(200)
    .optional()
    .default(''),
  specialties: z
    .array(z.string().max(100))
    .max(20)
    .optional()
    .default([]),
  yearsOfExperience: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .default(0),
  bio: z
    .string()
    .max(500)
    .optional()
    .default(''),
  timezone: z
    .string()
    .max(50)
    .optional()
    .default(''),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'La contraseña actual es requerida')
    .max(128),
  newPassword: z
    .string()
    .min(12, 'La nueva contraseña debe tener al menos 12 caracteres')
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=[\]{}|;':",.<>/?`~])/,
      'La nueva contraseña debe contener mayúscula, minúscula, número y carácter especial',
    ),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
