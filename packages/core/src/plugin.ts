import type {Plugin} from './types.js';

/** Preserve plugin inference while validating the public plugin contract. */
export function definePlugin(plugin: Plugin): Plugin {
  return plugin;
}
