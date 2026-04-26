import { execSync } from 'node:child_process';

const run = (command) => {
  console.log(`\n▶ ${command}`);
  execSync(command, { stdio: 'inherit' });
};

run('npm run build');
run('npm run sync:manifest');
run('npm run lint:check');
run('npm run test:unit');
run('npm run smoke:ci');
run('npm run generate-mcpb');
