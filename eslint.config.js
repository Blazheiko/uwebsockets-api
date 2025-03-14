import js from "@eslint/js";
import ts from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import globals from 'globals';

export default [
    js.configs.recommended,
    ts.configs.recommended,
    prettier,
    {
        languageOptions: {
            globals: globals.es2021,
            ecmaVersion: "latest",
            sourceType: "module",
            parser: tsParser,
        },
        env: {
            browser: false,
            es2021: true,
        },
        plugins: {
            unicorn: eslintPluginUnicorn,
            prettier,
        },
        rules: {
            'unicorn/better-regex': 'error',
            'prettier/prettier': 'error',
        },
    },
];
