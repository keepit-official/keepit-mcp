/**
 * Manifest synchronization step used by packaging and release checks.
 *
 * The script rewrites selected manifest metadata from `package.json` and
 * refreshes the manifest tool list from the compiled runtime registry.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = path.resolve(import.meta.dirname, '..');
const manifestPath = path.join(repoRoot, 'manifest.json');
const packagePath = path.join(repoRoot, 'package.json');
const buildToolsIndexPath = path.join(repoRoot, 'build', 'tools', 'index.js');

const main = async () => {
  const [manifestRaw, packageRaw, toolsModule] = await Promise.all([
    fs.readFile(manifestPath, 'utf8'),
    fs.readFile(packagePath, 'utf8'),
    import(pathToFileURL(buildToolsIndexPath).href)
  ]);

  const manifest = JSON.parse(manifestRaw);
  const packageJson = JSON.parse(packageRaw);
  const entryPoint = String(packageJson.main || 'build/main.js').replace(/^\.\//, '');

  manifest.version = packageJson.version;
  manifest.name = packageJson.name;
  manifest.description = packageJson.description;
  manifest.homepage = packageJson.homepage;
  manifest.license = packageJson.license;
  manifest.keywords = packageJson.keywords;
  manifest.repository = packageJson.repository ?? manifest.repository;
  if (packageJson.author) {
    manifest.author = typeof packageJson.author === 'string'
      ? { ...manifest.author, name: packageJson.author }
      : packageJson.author;
  }
  manifest.server = {
    ...manifest.server,
    entry_point: entryPoint,
    mcp_config: {
      ...manifest.server?.mcp_config,
      args: [`\${__dirname}/${entryPoint}`]
    }
  };
  manifest.tools = toolsModule.toolsDefinitions.map((tool) => ({
    name: tool.name,
    description: tool.description
  }));

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`Synced manifest tools (${manifest.tools.length}) and version ${manifest.version}`);
};

await main();
