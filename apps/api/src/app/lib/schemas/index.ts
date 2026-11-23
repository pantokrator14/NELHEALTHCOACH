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
  consultCheckoutSchema,
} from './leads';
export type {
  LeadInput,
  ConsultCheckoutInput,
} from './leads';

export {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  clientRegisterSchema,
  clientVerifyCodeSchema,
  clientResendCodeSchema,
} from './auth';
export type {
  LoginInput,
  RegisterInput,
  ChangePasswordInput,
  ClientRegisterInput,
  ClientVerifyCodeInput,
  ClientResendCodeInput,
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

export {
  blogPostSchema,
  blogPostUpdateSchema,
  authorProfileSchema,
  blogViewSchema,
  blogCommentSchema,
  blogCommentModerationSchema,
  imageFileSchema,
  SLUG_REGEX,
} from './blog';
export type {
  BlogPostInput,
  BlogPostUpdateInput,
  AuthorProfileInput,
  BlogViewInput,
  BlogCommentInput,
  BlogCommentModerationInput,
} from './blog';

export { waitlistSchema, freeSessionsSchema, WAITLIST_SOURCES } from './waitlist';
export type { WaitlistInput, FreeSessionsInput } from './waitlist';

export { PLAN_IDS, planQuotaUpdateSchema } from './plans';
export type { PlanQuotaUpdateInput } from './plans';
