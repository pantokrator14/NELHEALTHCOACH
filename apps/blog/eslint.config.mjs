// Flat config de ESLint para Next 16 (next lint se eliminó en Next 16;
// se ejecuta con `eslint .`). eslint-config-next exporta configs nativas.
import next from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = [
  ...next,
  ...nextTs,
  {
    // Override de ignores por defecto de eslint-config-next
    ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts'],
  },
];

export default eslintConfig;
