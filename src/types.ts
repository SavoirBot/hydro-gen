// eslint-disable-next-line @typescript-eslint/ban-types
export type Data = {};

export interface Page {
  url: string;
  content: string | ((page: Page) => string);
  [s: string]: unknown;
}

export interface LoadedFile {
  path: string;
  filename: string;
  extension: string;
  content: string;
}

export interface Asset {
  path: string;
  filename: string;
  content: string | ((asset: Asset) => string);
  [s: string]: unknown;
}

export type PageIdentification<T = Data> = string | string[] | ((data: T) => string | string[]);

export type AssetIdentification<T = Data> = string | string[] | ((data: T) => string | string[]);
