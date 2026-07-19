export type AnalysisExecution = 'client' | 'worker' | 'remote';

export interface AnalysisTask<TInput, TOutput> {
  readonly id: string;
  readonly execution: AnalysisExecution;
  run(input: TInput, signal?: AbortSignal): Promise<TOutput>;
}

export function defineAnalysis<TInput, TOutput>(
  task: AnalysisTask<TInput, TOutput>,
): AnalysisTask<TInput, TOutput> {
  return task;
}
