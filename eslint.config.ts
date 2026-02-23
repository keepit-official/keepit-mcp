import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';
import unicorn from 'eslint-plugin-unicorn';
import stylistic from '@stylistic/eslint-plugin';
import rules from './linter/eslint/rules';

export default defineConfig([
    {
        files: ['src/**/*.{js,ts}'],
        plugins: {
            js,
            unicorn,
            '@stylistic': stylistic
        },
        extends: ['js/recommended'],
        languageOptions: {
            globals: {
                ...globals.node, // delete after removing the proxy server (proxy-mcp.js)
                ...globals.browser,
            },
            sourceType: 'module'
        },
        rules
    },
    tseslint.configs.recommended,
]);
