import bestPractices from './best-practices';
import core from './core';
import stilistic from './stilistic';
import typescript from './typescript';

const rules = {
    ...core,
    ...typescript,
    ...bestPractices,
    ...stilistic
};

export default rules;
