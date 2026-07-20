import {readFileSync, writeFileSync} from 'node:fs';

const path = 'packages/core/src/Overlays.ts';
let source = readFileSync(path, 'utf8');
const oldText = `function isMetadataKey(key: string): boolean {
  return [
    OVERLAY_PROPERTY.id,
    OVERLAY_PROPERTY.title,
    OVERLAY_PROPERTY.type,
    OVERLAY_PROPERTY.group,
  ].includes(key);
}
`;
const newText = `function isMetadataKey(key: string): boolean {
  return (
    key === OVERLAY_PROPERTY.id ||
    key === OVERLAY_PROPERTY.title ||
    key === OVERLAY_PROPERTY.type ||
    key === OVERLAY_PROPERTY.group
  );
}
`;

if (source.includes(newText)) process.exit(0);
if (!source.includes(oldText)) throw new Error('Overlay metadata-key patch target was not found.');
source = source.replace(oldText, newText);
writeFileSync(path, source);
