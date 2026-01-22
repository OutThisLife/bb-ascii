import js from '@eslint/js'
import nextPlugin from '@next/eslint-plugin-next'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import sortDestructureKeysPlugin from 'eslint-plugin-sort-destructure-keys'
import sortKeysFixPlugin from 'eslint-plugin-sort-keys-fix'
import unusedImports from 'eslint-plugin-unused-imports'
import globals from 'globals'

const config = [
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'public/**']
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        JSX: 'readonly',
        Nous: 'readonly',
        React: 'readonly'
      },
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: {
      '@next/next': nextPlugin,
      '@typescript-eslint': typescriptEslint,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'simple-import-sort': simpleImportSort,
      'sort-destructure-keys': sortDestructureKeysPlugin,
      'sort-keys-fix': sortKeysFixPlugin,
      'unused-imports': unusedImports
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' }
      ],
      '@typescript-eslint/no-unused-vars': 'off',
      curly: 'error',
      'no-case-declarations': 'off',
      'no-empty': 'off',
      'no-irregular-whitespace': 'off',
      'no-useless-escape': 'off',
      'no-unused-vars': 'off',
      'padding-line-between-statements': [
        1,
        {
          blankLine: 'always',
          next: [
            'block-like',
            'block',
            'return',
            'if',
            'class',
            'continue',
            'debugger',
            'break',
            'multiline-const',
            'multiline-let'
          ],
          prev: '*'
        },
        {
          blankLine: 'always',
          next: '*',
          prev: [
            'case',
            'default',
            'multiline-const',
            'multiline-let',
            'multiline-block-like'
          ]
        },
        {
          blankLine: 'never',
          next: ['block', 'block-like'],
          prev: ['case', 'default']
        },
        {
          blankLine: 'always',
          next: ['block', 'block-like'],
          prev: ['block', 'block-like']
        },
        {
          blankLine: 'always',
          next: ['empty'],
          prev: 'export'
        },
        {
          blankLine: 'never',
          next: 'iife',
          prev: ['block', 'block-like', 'empty']
        }
      ],
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'],
            ['^node:'],
            ['^@?\\w'],
            ['^@/'],
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
            ['^.+\\.s?css$']
          ]
        }
      ],
      'sort-destructure-keys/sort-destructure-keys': 2,
      'sort-keys-fix/sort-keys-fix': 2,
      'unused-imports/no-unused-imports': 'error'
    },
    settings: {
      next: { rootDir: '.' },
      react: { version: 'detect' }
    }
  }
]

export default config
