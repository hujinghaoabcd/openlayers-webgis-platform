from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding='utf-8')
    if old not in text:
        raise RuntimeError(f'Expected text not found in {path}: {old[:120]!r}')
    file_path.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once(
    'packages/core/src/Map.ts',
    "import {Events, type EventListener} from './events.js';\nimport {Interactions, type InteractionOptions} from './Interactions.js';",
    "import {Events, type EventListener} from './events.js';\nimport {History, type Command} from './History.js';\nimport {Interactions, type InteractionOptions} from './Interactions.js';",
)

replace_once(
    'packages/core/src/Map.ts',
    ' * OMap adds a concise lifecycle, events, managed layers, sources, controls and\n * interactions, scopes, registry and plugins while keeping the underlying OpenLayers map',
    ' * OMap adds a concise lifecycle, events, managed layers, sources, controls,\n * interactions and history, scopes, registry and plugins while keeping the underlying OpenLayers map',
)

replace_once(
    'packages/core/src/Map.ts',
    "  /** Managed interaction collection backed by the native OpenLayers collection. */\n  public readonly interactions: Interactions;\n\n  /** Shared registry for named factories and runtime capabilities. */",
    "  /** Managed interaction collection backed by the native OpenLayers collection. */\n  public readonly interactions: Interactions;\n\n  /** Reversible command history for editing and application actions. */\n  public readonly history: History;\n\n  /** Shared registry for named factories and runtime capabilities. */",
)

replace_once(
    'packages/core/src/Map.ts',
    "    this.controls = new Controls(this.native);\n    this.interactions = new Interactions(this.native);\n    this.bindLayerEvents();",
    "    this.controls = new Controls(this.native);\n    this.interactions = new Interactions(this.native);\n    this.history = new History(options.history);\n    this.bindLayerEvents();",
)

replace_once(
    'packages/core/src/Map.ts',
    "    this.bindControlEvents();\n    this.bindInteractionEvents();\n  }",
    "    this.bindControlEvents();\n    this.bindInteractionEvents();\n    this.bindHistoryEvents();\n  }",
)

replace_once(
    'packages/core/src/Map.ts',
    "  /** Deactivate a managed interaction without removing it. */\n  public deactivateInteraction(interactionOrId: Interaction | string): this {\n    this.interactions.deactivate(interactionOrId);\n    return this;\n  }\n\n  /** Add an overlay to the map. */",
    "  /** Deactivate a managed interaction without removing it. */\n  public deactivateInteraction(interactionOrId: Interaction | string): this {\n    this.interactions.deactivate(interactionOrId);\n    return this;\n  }\n\n  /** Execute and record one reversible command. */\n  public execute<TResult>(command: Command<TResult>): Promise<TResult> {\n    this.assertActive();\n    return this.history.execute(command);\n  }\n\n  /** Undo the most recent reversible command. */\n  public undo(): Promise<boolean> {\n    this.assertActive();\n    return this.history.undo();\n  }\n\n  /** Redo the most recently undone command. */\n  public redo(): Promise<boolean> {\n    this.assertActive();\n    return this.history.redo();\n  }\n\n  /** Add an overlay to the map. */",
)

replace_once(
    'packages/core/src/Map.ts',
    "    for (const scope of [...this.scopes].reverse()) {\n      try {\n        await scope.dispose();\n      } catch (error) {\n        errors.push(error);\n      }\n    }\n\n    this.registry.clear();",
    "    for (const scope of [...this.scopes].reverse()) {\n      try {\n        await scope.dispose();\n      } catch (error) {\n        errors.push(error);\n      }\n    }\n\n    try {\n      await this.history.destroy();\n    } catch (error) {\n      errors.push(error);\n    }\n\n    this.registry.clear();",
)

replace_once(
    'packages/core/src/Map.ts',
    "  private bindInteractionEvents(): void {\n    this.interactions.on('add', event => this.events.emit('interaction:add', event));\n    this.interactions.on('remove', event => this.events.emit('interaction:remove', event));\n    this.interactions.on('active', event => this.events.emit('interaction:active', event));\n    this.interactions.on('order', event => this.events.emit('interaction:order', event));\n    this.interactions.on('metadata', event => this.events.emit('interaction:metadata', event));\n  }\n\n  private createPluginContext",
    "  private bindInteractionEvents(): void {\n    this.interactions.on('add', event => this.events.emit('interaction:add', event));\n    this.interactions.on('remove', event => this.events.emit('interaction:remove', event));\n    this.interactions.on('active', event => this.events.emit('interaction:active', event));\n    this.interactions.on('order', event => this.events.emit('interaction:order', event));\n    this.interactions.on('metadata', event => this.events.emit('interaction:metadata', event));\n  }\n\n  private bindHistoryEvents(): void {\n    this.history.on('execute', event => this.events.emit('history:execute', event));\n    this.history.on('record', event => this.events.emit('history:record', event));\n    this.history.on('undo', event => this.events.emit('history:undo', event));\n    this.history.on('redo', event => this.events.emit('history:redo', event));\n    this.history.on('clear', event => this.events.emit('history:clear', event));\n    this.history.on('change', event => this.events.emit('history:change', event));\n    this.history.on('error', event => this.events.emit('history:error', event));\n  }\n\n  private createPluginContext",
)

replace_once(
    'packages/core/src/types.ts',
    "import type {ControlsEventMap} from './Controls.js';\nimport type {InteractionsEventMap} from './Interactions.js';",
    "import type {ControlsEventMap} from './Controls.js';\nimport type {HistoryEventMap, HistoryOptions} from './History.js';\nimport type {InteractionsEventMap} from './Interactions.js';",
)

replace_once(
    'packages/core/src/types.ts',
    "  interactions?: Interaction[];\n  overlays?: Overlay[];",
    "  interactions?: Interaction[];\n  overlays?: Overlay[];\n  history?: HistoryOptions;",
)

replace_once(
    'packages/core/src/types.ts',
    "  'interaction:metadata': InteractionsEventMap['metadata'];\n  'overlay:add': {readonly overlay: Overlay};",
    "  'interaction:metadata': InteractionsEventMap['metadata'];\n  'history:execute': HistoryEventMap['execute'];\n  'history:record': HistoryEventMap['record'];\n  'history:undo': HistoryEventMap['undo'];\n  'history:redo': HistoryEventMap['redo'];\n  'history:clear': HistoryEventMap['clear'];\n  'history:change': HistoryEventMap['change'];\n  'history:error': HistoryEventMap['error'];\n  'overlay:add': {readonly overlay: Overlay};",
)

replace_once(
    'packages/core/src/index.ts',
    "export {Events} from './events.js';\nexport {Map} from './Map.js';",
    "export {Events} from './events.js';\nexport {History} from './History.js';\nexport {Map} from './Map.js';",
)

replace_once(
    'packages/core/src/index.ts',
    "export type {EventListener, EventName} from './events.js';\nexport type {",
    "export type {EventListener, EventName} from './events.js';\nexport type {\n  Command,\n  HistoryAction,\n  HistoryEntry,\n  HistoryEventMap,\n  HistoryOptions,\n  HistoryState,\n} from './History.js';\nexport type {",
)
