/*
	File:	eslint.config.mjs - configuration for automatic code-problem-detection tool "eslint"
	Author:	(begrudgingly) Ben Mullan 2024
*/

import typescriptParser			from "@typescript-eslint/parser";
import eslintPluginPromise		from "eslint-plugin-promise";
import typescriptEslintPlugin	from "@typescript-eslint/eslint-plugin";

import path	from "path"; import url	from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: typescriptParser,
			sourceType: "module",
			parserOptions: {
				project: "./tsconfig.json",
				tsconfigRootDir: __dirname,
				ecmaVersion: 2023,
			}
		},
		plugins: {
			"@typescript-eslint": typescriptEslintPlugin,
			"promise": eslintPluginPromise
		},
		rules: {
			"semi": ["error", "always"],
			"require-await": "warn",
			"no-return-await": "warn",
			"@typescript-eslint/require-await": "warn",
			"@typescript-eslint/no-floating-promises": "error"
		}
	}
];