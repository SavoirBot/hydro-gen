import fs from 'fs/promises';

import { PipelineExecutable, Pipeline } from './pipeline';
import { Data, Page as PageType, PageIdentification } from './types';
import { DataSource } from './data-sources';
import { collectData, collectIdentifiers } from './helpers';

export type IdentificationFunction<T = Data> = (
  data: T
) => Promise<PageIdentification | null | undefined> | PageIdentification | null | undefined;
export type ProcessFunction<T = Data> = (
  path: string,
  data: T
) => Promise<PageType | null | undefined> | PageType | null | undefined;

export class Page implements PipelineExecutable {
  private dataAccessors: string[] = [];
  private identifierFunctions: IdentificationFunction[] = [];
  private paths: (string | RegExp)[] = [];
  private processFunctions: ProcessFunction[] = [];

  public inject(dataKey: string | DataSource): Page {
    this.dataAccessors.push(dataKey instanceof DataSource ? dataKey.getName() : dataKey);
    return this;
  }

  public identify<T extends Data = Data>(identifierFunction: IdentificationFunction<T>): Page {
    this.identifierFunctions.push(identifierFunction as IdentificationFunction);
    return this;
  }

  public select(path: string | RegExp): Page {
    this.paths.push(path);
    return this;
  }

  public generate<T extends Data = Data>(processFunction: ProcessFunction<T>): Page {
    this.processFunctions.push(processFunction as ProcessFunction);
    return this;
  }

  public async execute(pipeline: Pipeline): Promise<void> {
    // Start by collecting the data from the pipeline
    const collectedData = collectData(this.dataAccessors, pipeline);

    // Then, collect all the pages to generate based on the data
    const identifiers = await collectIdentifiers<
      Promise<PageIdentification | null | undefined> | PageIdentification | null | undefined
    >(this.identifierFunctions, collectedData);

    // Then get all the url identifiers that we will generate
    const selectedIdentifiers: string[] = this.paths.length
      ? identifiers.filter(path =>
          this.paths.some(value => (typeof value === 'string' ? path === value : value.test(path)))
        )
      : identifiers;

    // For the selected URLs, run all processors in order
    const processedPages = await Promise.all(
      selectedIdentifiers.map(async identifier => {
        const localPages = [];

        for (const fn of this.processFunctions) {
          const result = await fn(identifier, collectedData);
          if (!result) {
            continue;
          }
          localPages.push(result);
        }

        return localPages;
      })
    );

    // Finally, create the html file for the page given the processed info
    await Promise.all(
      processedPages.flat(1).map(async page => {
        try {
          const urlParts = page.url.split('/');
          const filename = page.url.endsWith('/') ? 'index.html' : `${urlParts.pop()}.html`;

          await fs.mkdir(`${pipeline.getRoot()}${urlParts.join('/')}`, { recursive: true });
          await fs.writeFile(
            `${pipeline.getRoot()}${urlParts.join('/')}/${filename}`,
            typeof page.content === 'string' ? page.content : page.content(page)
          );
        } catch (e) {
          console.error(`Could not create page ${page.path}`, e);
        }
      })
    );
  }
}

export const newPagePipe = (): Page => new Page();
