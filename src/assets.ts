import fs from 'fs/promises';
import path from 'path';
import glob from 'glob';

import { PipelineExecutable, Pipeline } from './pipeline';
import { Data, LoadedFile, Asset as AssetType, AssetIdentification } from './types';
import { DataSource } from './data-sources';
import { collectData, collectIdentifiers } from './helpers';

export type IdentificationFunction<T = Data> = (
  data: T
) => Promise<AssetIdentification | null | undefined> | AssetIdentification | null | undefined;
export type ProcessEachFunction<T = Data> = (
  file: LoadedFile,
  data: T
) => Promise<AssetType | null | undefined> | AssetType | null | undefined;
export type ProcessAllFunction<T = Data> = (
  files: LoadedFile[],
  data: T
) => Promise<AssetType | AssetType[] | null | undefined> | AssetType | AssetType[] | null | undefined;

export class Asset implements PipelineExecutable {
  private dataAccessors: string[] = [];
  private identifierFunctions: IdentificationFunction[] = [];
  private paths: (string | RegExp)[] = [];
  private processEachFunctions: ProcessEachFunction[] = [];
  private processAllFunctions: ProcessAllFunction[] = [];

  public inject(dataKey: string | DataSource): Asset {
    this.dataAccessors.push(dataKey instanceof DataSource ? dataKey.getName() : dataKey);
    return this;
  }

  public collect<T extends Data = Data>(identifierFunction: IdentificationFunction<T>): Asset {
    this.identifierFunctions.push(identifierFunction as IdentificationFunction);
    return this;
  }

  public select(path: string | RegExp): Asset {
    this.paths.push(path);
    return this;
  }

  public processEach<T extends Data = Data>(processFunction: ProcessEachFunction<T>): Asset {
    this.processEachFunctions.push(processFunction as ProcessEachFunction);
    return this;
  }

  public processAll<T extends Data = Data>(processFunction: ProcessAllFunction<T>): Asset {
    this.processAllFunctions.push(processFunction as ProcessAllFunction);
    return this;
  }

  public async execute(pipeline: Pipeline): Promise<void> {
    // Start by collecting the data from the pipeline
    const collectedData = collectData(this.dataAccessors, pipeline);

    // Then, collect all the wanted assets to generate based on the data
    const identifiers = await collectIdentifiers<
      Promise<AssetIdentification | null | undefined> | AssetIdentification | null | undefined
    >(this.identifierFunctions, collectedData);

    // Fetch all the files we identified
    const files = await Promise.all(
      identifiers.map(async identifier => {
        try {
          // Find files based on a glob
          return new Promise<string[]>((resolve, reject) =>
            glob(identifier, (err, matches) => {
              if (err) {
                reject(err);
              }

              resolve(matches);
            })
          );
        } catch (e) {
          console.error(`Could not find asset(s) with path ${identifier}`, e);
          return [];
        }
      })
    );

    // Then filter the files based on the selected URLS
    const selectedIdentifiers: string[] = this.paths.length
      ? files
          .flat(1)
          .filter(path => this.paths.some(value => (typeof value === 'string' ? path === value : value.test(path))))
      : files.flat(1);

    const fetchedFiles = await Promise.all(
      selectedIdentifiers.map(async identifier => {
        try {
          const extension = path.extname(identifier);
          const text = await fs.readFile(identifier, 'utf8').then(buffer => buffer.toString());
          return {
            path: path.dirname(identifier),
            filename: path.basename(identifier, extension),
            extension,
            content: text,
          };
        } catch (e) {
          console.error(`Could not collect asset ${identifier}`, e);
          return null;
        }
      })
    );

    // Make sure to remove any files that were not successfully fetched
    const nonNullFiles = fetchedFiles.flat(1).filter(file => file) as LoadedFile[];

    // Next, generate all the files we identified and selected individually
    const processedAssets = await Promise.all(
      nonNullFiles.map(async file => {
        const localAssets = [];

        for (const fn of this.processEachFunctions) {
          const result = await fn(file, collectedData);
          if (!result) {
            continue;
          }
          localAssets.push(result);
        }

        return localAssets;
      })
    );

    // Next, generate all the files in a single function
    processedAssets.push(
      ...(await Promise.all(
        this.processAllFunctions.map(async fn => {
          const result = await fn(nonNullFiles, collectedData);
          if (!result) {
            return [];
          }
          return Array.isArray(result) ? result : [result];
        })
      ))
    );

    // Then create the files associated with the processed files we collected
    await Promise.all(
      processedAssets.flat(1).map(async asset => {
        try {
          await fs.mkdir(`${pipeline.getRoot()}${asset.path}`, { recursive: true });
          await fs.writeFile(
            `${pipeline.getRoot()}${asset.path}/${asset.filename}`,
            typeof asset.content === 'string' ? asset.content : asset.content(asset)
          );
        } catch (e) {
          console.error(`Could not create asset ${asset.path}`, e);
        }
      })
    );
  }
}

export const newAssetPipe = (): Asset => new Asset();
