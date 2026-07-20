import {describe, expect, it, vi} from 'vitest';
import {Registry} from './Registry.js';

describe('Registry', () => {
  it('registers, retrieves, lists and unregisters values', () => {
    const registry = new Registry();
    const factory = () => 'layer';

    expect(registry.register('layer', 'geojson', factory)).toBe(factory);
    expect(registry.has('layer', 'geojson')).toBe(true);
    expect(registry.get('layer', 'geojson')).toBe(factory);
    expect(registry.require('layer', 'geojson')).toBe(factory);
    expect(registry.list('layer')).toEqual([{kind: 'layer', id: 'geojson', value: factory}]);
    expect(registry.unregister('layer', 'geojson')).toBe(factory);
    expect(registry.kinds()).toEqual([]);
  });

  it('rejects duplicates unless replacement is explicit', () => {
    const registry = new Registry();
    registry.register('control', 'zoom', 1);

    expect(() => registry.register('control', 'zoom', 2)).toThrow(
      'Registry entry already exists: control:zoom',
    );
    registry.register('control', 'zoom', 2, {replace: true});
    expect(registry.get('control', 'zoom')).toBe(2);
  });

  it('emits registry changes', () => {
    const registry = new Registry();
    const register = vi.fn();
    const unregister = vi.fn();

    registry.on('register', register).on('unregister', unregister);
    registry.register('service', 'features', {url: '/features'});
    registry.unregister('service', 'features');

    expect(register).toHaveBeenCalledWith({
      kind: 'service',
      id: 'features',
      value: {url: '/features'},
      replaced: false,
    });
    expect(unregister).toHaveBeenCalledOnce();
  });
});
