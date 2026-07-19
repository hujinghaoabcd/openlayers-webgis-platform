import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {join, resolve} from 'node:path';

const root = resolve(import.meta.dirname, '..');
const required = [
  'README.md',
  'pnpm-workspace.yaml',
  'apps/portal/package.json',
  'apps/examples/package.json',
  'apps/docs/package.json',
  'packages/core/src/index.ts',
  'packages/config/src/index.ts',
  'packages/controls/src/index.ts',
  'packages/interactions/src/index.ts',
  'packages/vue/src/OMap.vue',
  'docs/FEATURES.md',
  '.github/workflows/ci.yml',
];

for (const path of required) {
  if (!existsSync(join(root, path))) throw new Error(`Missing required path: ${path}`);
}

const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage', '.vite', '.vitepress']);

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    if (ignoredDirectories.has(name)) return [];
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

for (const file of walk(root).filter(file => file.endsWith('package.json'))) {
  JSON.parse(readFileSync(file, 'utf8'));
}

console.log(`Workspace validation passed (${walk(root).length} files).`);
