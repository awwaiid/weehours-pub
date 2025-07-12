module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  extends: [
    'eslint:recommended',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'off',
    'semi': ['error', 'always'],
    'max-len': ['error', { 
      code: 150, 
      ignoreUrls: true, 
      ignoreStrings: true, 
      ignoreTemplateLiterals: true,
      ignoreComments: true 
    }],
    'quotes': ['error', 'single'],
    'comma-dangle': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'no-unused-vars': 'off', // Use TypeScript version instead
    'no-undef': 'off', // TypeScript handles this
  },
};