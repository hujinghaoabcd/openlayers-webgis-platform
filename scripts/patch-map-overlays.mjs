import {readFileSync, writeFileSync} from 'node:fs';

const path = 'packages/core/src/Map.ts';
let source = readFileSync(path, 'utf8');
if (source.includes('public readonly overlays: Overlays;')) process.exit(0);

function replace(oldText, newText) {
  if (!source.includes(oldText)) throw new Error(`Missing patch target: ${oldText.slice(0, 80)}`);
  source = source.replace(oldText, newText);
}

replace(
  "import {Layers, type LayerOptions} from './Layers.js';\n",
  "import {Layers, type LayerOptions} from './Layers.js';\nimport {Overlays, type ManagedOverlayOptions} from './Overlays.js';\n",
);
replace(
  "  /** Reversible command history for editing and application actions. */\n  public readonly history: History;\n",
  "  /** Managed overlay collection backed by the native OpenLayers collection. */\n  public readonly overlays: Overlays;\n\n  /** Reversible command history for editing and application actions. */\n  public readonly history: History;\n",
);
replace(
  "    this.interactions = new Interactions(this.native);\n    this.history = new History(options.history);\n",
  "    this.interactions = new Interactions(this.native);\n    this.overlays = new Overlays(this.native);\n    this.history = new History(options.history);\n",
);
replace(
  "    this.bindInteractionEvents();\n    this.bindHistoryEvents();\n",
  "    this.bindInteractionEvents();\n    this.bindOverlayEvents();\n    this.bindHistoryEvents();\n",
);
replace(
  `  /** Add an overlay to the map. */
  public addOverlay(overlay: Overlay): this {
    this.assertActive();
    this.native.addOverlay(overlay);
    this.events.emit('overlay:add', {overlay});
    return this;
  }

  /** Remove an overlay from the map. */
  public removeOverlay(overlay: Overlay): Overlay | undefined {
    this.assertActive();
    const removed = this.native.removeOverlay(overlay);
    if (removed) this.events.emit('overlay:remove', {overlay: removed});
    return removed;
  }
`,
  `  /** Add an overlay through the managed overlay collection. */
  public addOverlay(overlay: Overlay, options: ManagedOverlayOptions = {}): this {
    this.assertActive();
    this.overlays.add(overlay, options);
    return this;
  }

  /** Remove an overlay by object or stable id. */
  public removeOverlay(overlayOrId: Overlay | string): Overlay | undefined {
    this.assertActive();
    return this.overlays.remove(overlayOrId);
  }

  /** Return a managed overlay by stable id. */
  public getOverlay<TOverlay extends Overlay = Overlay>(id: string): TOverlay | undefined {
    return this.overlays.get<TOverlay>(id);
  }

  /** Return whether a managed overlay id or object exists. */
  public hasOverlay(overlayOrId: Overlay | string): boolean {
    return this.overlays.has(overlayOrId);
  }

  /** Show a managed overlay without changing its coordinate. */
  public showOverlay(overlayOrId: Overlay | string): this {
    this.overlays.show(overlayOrId);
    return this;
  }

  /** Hide a managed overlay without changing its coordinate. */
  public hideOverlay(overlayOrId: Overlay | string): this {
    this.overlays.hide(overlayOrId);
    return this;
  }

  /** Set or clear the coordinate of a managed overlay. */
  public setOverlayPosition(
    overlayOrId: Overlay | string,
    position?: import('ol/coordinate.js').Coordinate,
  ): this {
    this.overlays.setPosition(overlayOrId, position);
    return this;
  }

  /** Pan the map so a managed overlay is visible in the viewport. */
  public panToOverlay(
    overlayOrId: Overlay | string,
    options?: Parameters<Overlay['panIntoView']>[0],
  ): this {
    this.overlays.panIntoView(overlayOrId, options);
    return this;
  }
`,
);
replace(
  "    this.interactions.destroy();\n    this.controls.destroy();\n    this.sources.destroy();\n",
  "    this.interactions.destroy();\n    this.controls.destroy();\n    this.overlays.destroy();\n    this.sources.destroy();\n",
);
replace(
  "  private bindHistoryEvents(): void {\n",
  `  private bindOverlayEvents(): void {
    this.overlays.on('add', event => this.events.emit('overlay:add', event));
    this.overlays.on('remove', event => this.events.emit('overlay:remove', event));
    this.overlays.on('visible', event => this.events.emit('overlay:visible', event));
    this.overlays.on('position', event => this.events.emit('overlay:position', event));
    this.overlays.on('offset', event => this.events.emit('overlay:offset', event));
    this.overlays.on('positioning', event => this.events.emit('overlay:positioning', event));
    this.overlays.on('element', event => this.events.emit('overlay:element', event));
    this.overlays.on('order', event => this.events.emit('overlay:order', event));
    this.overlays.on('metadata', event => this.events.emit('overlay:metadata', event));
  }

  private bindHistoryEvents(): void {
`,
);

writeFileSync(path, source);
