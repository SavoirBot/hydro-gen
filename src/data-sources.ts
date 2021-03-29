import { PipelineExecutable, Pipeline } from './pipeline';
import { Data } from './types';

export type FetchFunction<O = Data> = () => Promise<O> | O | null | undefined;
export type ProcessFunction<T = Data, O = Data> = (data: T) => Promise<O> | O | null | undefined;

export class DataSource implements PipelineExecutable {
  private readonly name: string;
  private fetchFunctions: FetchFunction[] = [];
  private processFunctions: ProcessFunction[] = [];

  constructor(name: string) {
    this.name = name;
  }

  public fetch<T extends Data = Data>(fetchFunction: FetchFunction<T>): DataSource {
    this.fetchFunctions.push(fetchFunction);
    return this;
  }

  public process<T extends Data = Data, O extends Data = Data>(processFunction: ProcessFunction<T, O>): DataSource {
    this.processFunctions.push((processFunction as unknown) as ProcessFunction);
    return this;
  }

  public async execute(pipeline: Pipeline): Promise<void> {
    const fetchedData = await Promise.all(this.fetchFunctions.map(async fn => fn()));

    let result = {};
    fetchedData.forEach(data => {
      result = {
        ...result,
        ...data,
      };
    });

    await this.processFunctions.reduce(
      (promise, item) =>
        promise.then(() => {
          result = item(result) || result;
        }),
      Promise.resolve()
    );

    pipeline.addData(this.name, result);
  }

  public getName(): string {
    return this.name;
  }
}

export const newDataSourcePipe = (name: string): DataSource => new DataSource(name);

export class ParallelDataSource implements PipelineExecutable {
  private dataSources: DataSource[] = [];

  public pipeSource(source: DataSource): ParallelDataSource {
    this.dataSources.push(source);
    return this;
  }

  public async execute(pipeline: Pipeline): Promise<void> {
    await Promise.all(this.dataSources.map(async source => source.execute(pipeline)));
  }
}

export const newParallelDataSourcePipe = (): ParallelDataSource => new ParallelDataSource();
