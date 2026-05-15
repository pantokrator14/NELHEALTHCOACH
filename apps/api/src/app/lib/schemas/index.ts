// apps/api/src/app/lib/schemas/index.ts
// Barrel export de todos los schemas Zod

export {
  clientFormSchema,
} from './clients';
export type {
  ClientFormInput,
  PersonalDataInput,
  MedicalDataInput,
} from './clients';

export {
  leadSchema,
} from './leads';
export type {
  LeadInput,
} from './leads';

export {
  loginSchema,
  registerSchema,
  changePasswordSchema,
} from './auth';
export type {
  LoginInput,
  RegisterInput,
  ChangePasswordInput,
} from './auth';

export {
  exerciseSchema,
  exerciseUpdateSchema,
} from './exercises';
export type {
  ExerciseInput,
  ExerciseUpdateInput,
} from './exercises';

export {
  recipeSchema,
} from './recipes';
export type {
  RecipeInput,
} from './recipes';
