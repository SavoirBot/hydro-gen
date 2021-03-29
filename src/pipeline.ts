export interface PipelineExecutable {
  // eslint-disable-next-line no-use-before-define
  execute: (pipeline: Pipeline) => Promise<void>;
}

export interface PipelineConfig {
  root?: string;
}

export class Pipeline {
  private readonly root: string;

  private pipes: PipelineExecutable[] = [];
  private data: Map<string, Record<string, unknown>> = new Map<string, Record<string, unknown>>();

  constructor(config: PipelineConfig) {
    this.root = config.root || './';
  }

  public pipe(pipe: PipelineExecutable): Pipeline {
    this.pipes.push(pipe);
    return this;
  }

  public async execute(): Promise<void> {
    return this.pipes.reduce((promise, item) => promise.then(() => item.execute(this)), Promise.resolve());
  }

  public addData(key: string, data: Record<string, unknown>): void {
    this.data.set(key, data);
  }

  public getData(key: string): Record<string, unknown> | undefined {
    return this.data.get(key);
  }

  public getRoot(): string {
    return this.root;
  }
}

export const newPipeline = (config: PipelineConfig): Pipeline => new Pipeline(config);
