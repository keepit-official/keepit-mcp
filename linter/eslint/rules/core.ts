import { Linter } from 'eslint';

const core: Partial<Linter.RulesRecord> = {
    'prefer-spread': 'off',
    'no-empty-function': 'off',
    'no-var': 'error',
    'no-debugger': 'error',
    'no-eval': 'error',
    'no-delete-var': 'error',
    'no-dupe-args': 'error',
    'no-dupe-class-members': 'error',
    'no-dupe-keys': 'error',
    'no-compare-neg-zero': 'error',
    'no-cond-assign': 'error',
    'no-const-assign': 'error',
    'no-constant-condition': ['error', { 'checkLoops': false }],
    'no-fallthrough': 'error',
    'no-func-assign': 'error',
    'no-global-assign': 'error',
    'no-implied-eval': 'error',
    'no-import-assign': 'error',
    'no-invalid-regexp': 'error',
    'no-object-constructor': 'error',
    'no-irregular-whitespace': 'error',
    'no-regex-spaces': 'off',
    'object-shorthand': ['warn', 'properties'],
    'curly': ['error', 'multi-line'],
    'dot-notation': ['error', { 'allowKeywords': true }]
};

export default core;
