import tseslint from 'typescript-eslint';

// Layer boundaries (see docs/ARCHITECTURE.md). The simulation core must stay
// engine- and DOM-free so it can run headless in tests.
const noEngineOrUi = {
  patterns: [
    { group: ['phaser'], message: 'core/content/data must not depend on the engine.' },
    { group: ['**/render/**', '**/ui/**', '**/app/**', '**/platform/**'], message: 'Lower layers must not import higher layers.' },
  ],
};

export default tseslint.config(
  { ignores: ['dist', 'dist-single', 'node_modules'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/core/**/*.ts', 'src/content/**/*.ts', 'src/data/**/*.ts', 'src/art/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', noEngineOrUi] },
  },
  {
    files: ['src/ui/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['phaser', '**/render/**'], message: 'DOM UI must not depend on the renderer.' }] }],
    },
  },
);
