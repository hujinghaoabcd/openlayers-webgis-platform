import {readFileSync, writeFileSync, readdirSync, statSync} from 'node:fs';
import {join, resolve} from 'node:path';

const root = resolve(import.meta.dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map((value, index, all) => {
  if (!value.startsWith('--')) return [];
  return [value.slice(2), all[index + 1]];
}).filter(entry => entry.length === 2));

if (!args.name || !args.scope || !args.chinese) {
  throw new Error('Usage: node scripts/rename-project.mjs --name NewName --scope new-scope --chinese 中文名');
}

const ignored = new Set(['.git', 'node_modules', 'dist', '.vitepress']);
const textExtensions = new Set(['.ts', '.mts', '.vue', '.json', '.md', '.yaml', '.yml', '.mjs', '.html']);

function walk(directory) {
  return readdirSync(directory).flatMap(name => {
    if (ignored.has(name)) return [];
    const full = join(directory, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

for (const file of walk(root)) {
  const extension = file.slice(file.lastIndexOf('.'));
  if (!textExtensions.has(extension)) continue;
  let text = readFileSync(file, 'utf8');
  const next = text
    .replaceAll('@orbilayer/', `@${args.scope}/`)
    .replaceAll('orbilayer-workspace', `${args.scope}-workspace`)
    .replaceAll('OrbiLayer', args.name)
    .replaceAll('寰图', args.chinese);
  if (next !== text) writeFileSync(file, next);
}

console.log(`Renamed development codename to ${args.name} (@${args.scope}, ${args.chinese}).`);
