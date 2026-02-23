import { Linter } from 'eslint';

const bestPractices: Partial<Linter.RulesRecord> = {
    'unicorn/filename-case': ['error', { 'case': 'kebabCase' }],
    'eqeqeq': ['error', 'always'],
    'no-unreachable-loop': 'error',
    'no-useless-return': 'error',
    'no-useless-call': 'error',
    'no-unneeded-ternary': ['error', { 'defaultAssignment': false }],
    'array-callback-return': ['error', { 'allowImplicit': false, 'checkForEach': false }],
    'no-extend-native': 'error',
    'no-extra-bind': 'error',
    'no-extra-boolean-cast': 'error',
    'no-lone-blocks': 'error',
    'no-loss-of-precision': 'error',
    'no-misleading-character-class': 'error',
    'no-prototype-builtins': 'error',
    'no-useless-catch': 'error',
    'no-new-func': 'error',
    'no-new-native-nonconstructor': 'error',
    'no-new-wrappers': 'error',
    'no-return-assign': ['error', 'except-parens'],
    'no-self-assign': ['error', { 'props': true }],
    'no-shadow-restricted-names': 'error',
    'no-sparse-arrays': 'error',
    'no-template-curly-in-string': 'error',
    'no-this-before-super': 'error'
};

export default bestPractices;
