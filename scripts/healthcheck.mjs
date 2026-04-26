import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = path.resolve(import.meta.dirname, '..');

const importFromBuild = async (relativePath) => {
  const absolutePath = path.join(repoRoot, 'build', relativePath);
  return import(pathToFileURL(absolutePath).href);
};

try {
  const { setupAuthConfig } = await importFromBuild(path.join('helpers', 'auth-config.helper.js'));
  const { isAnalyticsDisabled } = await importFromBuild(path.join('helpers', 'analytic-request.helper.js'));
  const authConfig = await setupAuthConfig();

  console.log('Healthcheck passed');
  console.log(`Environment: ${authConfig.keepitEnv}`);
  console.log(`User GUID resolved: ${Boolean(authConfig.keepitGuid)}`);
  console.log(`User role resolved: ${Boolean(authConfig.userRole)}`);
  console.log(`Analytics enabled: ${isAnalyticsDisabled() ? 'no' : 'yes'}`);
} catch (error) {
  console.error('Healthcheck failed');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
