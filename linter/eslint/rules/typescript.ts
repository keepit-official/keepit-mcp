import { Linter } from 'eslint';

const typescript: Partial<Linter.RulesRecord> = {
    '@typescript-eslint/no-unused-vars': [
        'error',
        {
            'varsIgnorePattern': '[iI]gnored',
            'argsIgnorePattern': '[iI]gnored',
            'caughtErrorsIgnorePattern': '[iI]gnored',
            'ignoreRestSiblings': true
        }
    ],
    '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports'
    }],
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/ban-ts-comment': 'error',
    '@typescript-eslint/no-empty-function': 'off'
};

export default typescript;
