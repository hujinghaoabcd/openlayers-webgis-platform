export interface ExampleDefinition {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly sourcePath: string;
  readonly capabilities: readonly string[];
  readonly serviceDependencies?: readonly string[];
}

export function defineExample(example: ExampleDefinition): ExampleDefinition {
  return example;
}
