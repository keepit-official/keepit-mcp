import { Linter } from 'eslint';

const stylistic: Partial<Linter.RulesRecord> = {
    '@stylistic/semi': 'error',
    '@stylistic/indent': ['error', 4],
    '@stylistic/no-trailing-spaces': 'off',
    '@stylistic/no-floating-decimal': 'error',
    '@stylistic/arrow-spacing': ['error', { 'before': true, 'after': true }],
    '@stylistic/block-spacing': ['error', 'always'],
    '@stylistic/computed-property-spacing': ['error', 'never', { 'enforceForClassMembers': true }],
    '@stylistic/function-call-spacing': ['error', 'never'],
    '@stylistic/generator-star-spacing': ['error', { 'before': true, 'after': true }],
    '@stylistic/key-spacing': ['error', { 'beforeColon': false, 'afterColon': true }],
    '@stylistic/keyword-spacing': ['error', { 'before': true, 'after': true }],
    '@stylistic/no-mixed-spaces-and-tabs': 'error',
    '@stylistic/no-multi-spaces': 'error',
    '@stylistic/no-whitespace-before-property': 'error',
    '@stylistic/object-curly-spacing': ['error', 'always'],
    '@stylistic/rest-spread-spacing': ['error', 'never'],
    '@stylistic/space-before-blocks': ['error', 'always'],
    '@stylistic/space-in-parens': ['error', 'never'],
    '@stylistic/space-infix-ops': 'error',
    '@stylistic/space-unary-ops': ['error', { 'words': true, 'nonwords': false }],
    '@stylistic/template-curly-spacing': ['error', 'never'],
    '@stylistic/template-tag-spacing': ['error', 'never'],
    '@stylistic/yield-star-spacing': ['error', 'both'],
    '@stylistic/quotes': ['error', 'single', { 'avoidEscape': true }],
    '@stylistic/object-curly-newline': ['error', { 'multiline': true, 'consistent': true }],
    '@stylistic/multiline-ternary': ['error', 'always-multiline'],
    '@stylistic/brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
    '@stylistic/dot-location': ['error', 'property'],
    '@stylistic/eol-last': 'error',
    '@stylistic/no-extra-parens': 'error',
    '@stylistic/lines-between-class-members': ['error', 'always', { 'exceptAfterSingleLine': true }],
    '@stylistic/member-delimiter-style': [
        'error',
        {
            'multiline': {
                'delimiter': 'semi',
                'requireLast': true
            },
            'singleline': {
                'delimiter': 'semi',
                'requireLast': true
            },
            'multilineDetection': 'brackets'
        }
    ],
    '@stylistic/comma-dangle': [
        'error',
        {
            'arrays': 'never',
            'objects': 'never',
            'imports': 'never',
            'exports': 'never',
            'functions': 'never'
        }
    ],
    '@stylistic/spaced-comment': [
        'error',
        'always',
        {
            'line': {
                'markers': ['*package', '!', '/', ',', '=']
            },
            'block': {
                'balanced': true,
                'markers': ['*package', '!', ',', ':', '::', 'flow-include'],
                'exceptions': ['*']
            }
        }
    ],
};

export default stylistic;
