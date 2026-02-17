import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import { defineConfig } from 'eslint/config'
import jsPlugin from '@eslint/js'
import globals from 'globals'

export default defineConfig(

	// Base config
	{
		files: ['src/**/*.{json,jsonc,js,mjs,cjs,ts,mts,cts}'],
		ignores: ['node_modules', 'dist', '.history'],

		languageOptions: {
			globals: {
				...globals.node,
				...globals.browser,
			},
			ecmaVersion: 'latest',
			sourceType: 'module',
			parser: tsParser,
		},

		rules: {

			// Tabs indentation
			'indent': ['error', 'tab', {
				SwitchCase: 1,
				VariableDeclarator: 1,
				outerIIFEBody: 1,
				FunctionDeclaration: { parameters: 1, body: 1 },
				FunctionExpression: { parameters: 1, body: 1 },
				CallExpression: { arguments: 1 },
				ArrayExpression: 1,
				ObjectExpression: 1,
				ImportDeclaration: 1,
				flatTernaryExpressions: true,
				ignoreComments: false,

				// Ignore ternary expressions
				ignoredNodes: [
					'ConditionalExpression',
					'ConditionalExpression > *',
				],

			}],

			'no-trailing-spaces': ['error', {
				skipBlankLines: false,
				ignoreComments: false
			}],

			'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 0, maxBOF: 1 }],
			'no-mixed-spaces-and-tabs': ['error', 'smart-tabs'],
			// 'comma-dangle': ['error', 'always-multiline'],
			'array-bracket-spacing': ['error', 'never'],
			'object-curly-spacing': ['error', 'always'],
			'no-unused-vars': 'warn',
			'no-console': 'warn',
			'eol-last': 'error',

			// Optional style
			'quotes': ['warn', 'single'],
			'semi': ['error', 'never'],
		},
	},

	// Override for just one file
	{
		files: ['src/utils/tui.ts'],
		rules: {
			'no-console': 'off',
		},
	},

	// JSON override
	{
		files: ['src/**/*.{json,jsonc}'],

		rules: {
			'quotes': ['error', 'double'],
			'eol-last': 'off',
		}
	},

	// JS override
	{
		files: ['src/**/*.{js,mjs,cjs}'],
		...jsPlugin.configs.recommended,

		rules: {
			...jsPlugin.configs.recommended.rules,

			strict: ['error', 'never'],

			'no-unused-vars': ['warn', {
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
				ignoreRestSiblings: true,
			}],
		},
	},

	// TS override
	{
		files: ['src/**/*.{ts,mts,cts}'],
		plugins: { '@typescript-eslint': tsPlugin as any },

		rules: {
			...tsPlugin.configs.recommended.rules,

			// Tabs for TS
			'indent': ['error', 'tab', {
				SwitchCase: 1,
				FunctionDeclaration: { parameters: 1, body: 1 },
				FunctionExpression: { parameters: 1, body: 1 },
				CallExpression: { arguments: 1 },
				ObjectExpression: 1,
				ArrayExpression: 1,

			}],

			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-unused-expressions': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/ban-ts-comment': 'warn',

			'@typescript-eslint/no-unused-vars': ['warn', {
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
				ignoreRestSiblings: true,
			}],
		},
	}
)
