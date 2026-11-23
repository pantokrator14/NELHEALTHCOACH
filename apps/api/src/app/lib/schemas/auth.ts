// apps/api/src/app/lib/schemas/auth.ts
// Zod schemas para validación de autenticación (login, register, change-password, client OTP)

import { z } from 'zod';

const strongPasswordSchema = z
  .string()
  .min(12, 'La contraseña debe tener al menos 12 caracteres')
  .max(128)
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=[\]{}|;':",.<>/?`~])/,
    'La contraseña debe contener mayúscula, minúscula, número y carácter especial',
  );

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
  password: strongPasswordSchema,
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
  newPassword: strongPasswordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ─── Client Self-Registration & 6-Digit OTP Verification ───

export const clientRegisterSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .max(200),
  password: strongPasswordSchema,
  planId: z
    .enum(['consult_1on1', 'reto_tres_nel', 'plan_1_reinicio', 'plan_2_transformacion', 'plan_3_maestria'])
    .optional(),
});

export type ClientRegisterInput = z.infer<typeof clientRegisterSchema>;

export const clientVerifyCodeSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .max(200),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'El código debe tener exactamente 6 dígitos numéricos'),
});

export type ClientVerifyCodeInput = z.infer<typeof clientVerifyCodeSchema>;

export const clientResendCodeSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .max(200),
});

export type ClientResendCodeInput = z.infer<typeof clientResendCodeSchema>;
