import {readFileSync, writeFileSync} from 'node:fs';

const path = 'packages/widgets/src/overlays.ts';
let source = readFileSync(path, 'utf8');
const oldText = `  if (geometry instanceof Polygon) return cloneCoordinate(geometry.getInteriorPoint().getCoordinates());
  if (geometry instanceof MultiPolygon) {
    return cloneCoordinate(geometry.getInteriorPoints().getFirstCoordinate());
  }
`;
const newText = `  if (geometry instanceof Polygon) return toXY(geometry.getInteriorPoint().getCoordinates());
  if (geometry instanceof MultiPolygon) {
    return toXY(geometry.getInteriorPoints().getFirstCoordinate());
  }
`;
const helperTarget = `function cloneCoordinate(coordinate: Coordinate | undefined): Coordinate | undefined {
  return coordinate ? [...coordinate] : undefined;
}
`;
const helperReplacement = `${helperTarget}
function toXY(coordinate: Coordinate | undefined): Coordinate | undefined {
  return coordinate ? [coordinate[0]!, coordinate[1]!] : undefined;
}
`;

if (source.includes('function toXY(')) process.exit(0);
if (!source.includes(oldText) || !source.includes(helperTarget)) {
  throw new Error('Polygon overlay-anchor patch target was not found.');
}
source = source.replace(oldText, newText).replace(helperTarget, helperReplacement);
writeFileSync(path, source);
