import { PipelineExecutable, Pipeline } from './pipeline';
import { Data } from './types';
import { DataSource } from './data-sources';
import { collectData } from './helpers';

export type ExecutionFunction<T = Data> = (data: T) => Promise<void> | void;

export class Custom implements PipelineExecutable {
  private dataAccessors: string[] = [];
  private executionFunctions: ExecutionFunction[] = [];

  public inject(dataKey: string | DataSource): Custom {
    this.dataAccessors.push(dataKey instanceof DataSource ? dataKey.getName() : dataKey);
    return this;
  }

  public command<T extends Data = Data>(executionFunction: ExecutionFunction<T>): Custom {
    this.executionFunctions.push(executionFunction as ExecutionFunction);
    return this;
  }

  public async execute(pipeline: Pipeline): Promise<void> {
    // Start by collecting the data from the pipeline
    const collectedData = collectData(this.dataAccessors, pipeline);

    // Then, generate each command one by one
    return this.executionFunctions.reduce(
      (promise, item) => promise.then(() => item(collectedData)),
      Promise.resolve()
    );
  }
}

export const newCustomPipe = (): Custom => new Custom();
