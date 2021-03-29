import rimraf from 'rimraf';
import fs from 'fs';
import promiseFs from 'fs/promises';

import { Pipeline } from '../pipeline';
import { newAssetPipe } from '../assets';
import { Asset as AssetType } from '../types';
import { newDataSourcePipe } from '../data-sources';

describe('newAssetPipe', () => {
  const mockData = {
    styles: {
      original: './temp/test/*.css',
      path: '/',
      filename: 'processed.css',
      content: 'test',
    },
  };

  let mockPipeline: Pipeline;

  beforeEach(async () => {
    mockPipeline = new Pipeline({ root: './temp/test' });

    mockPipeline.getData = jest.fn(() => mockData);

    await promiseFs.mkdir('./temp/test', { recursive: true });
    await promiseFs.writeFile('./temp/test/test.css', 'test');
  });

  afterEach(async () => {
    await new Promise(resolve => rimraf('./temp', resolve));
  });

  it('Will inject data when executed', async () => {
    const pipe = newAssetPipe().inject('test');

    await pipe.execute(mockPipeline);

    expect(mockPipeline.getData).toHaveBeenCalledWith('test');
  });

  it('Will inject data using the datasource rather than the name', async () => {
    const dataSource = newDataSourcePipe('test').fetch(() => mockData);

    const pipe = newAssetPipe().inject(dataSource);

    await pipe.execute(mockPipeline);

    expect(mockPipeline.getData).toHaveBeenCalledWith('test');
  });

  it('Will generate assets from data', async () => {
    const identifyFunction = jest.fn<string, [typeof mockData]>(data => data.styles.original);
    const processFunction = jest.fn<AssetType, [unknown, typeof mockData]>((_, data) => ({
      path: data.styles.path,
      filename: data.styles.filename,
      content: data.styles.content,
    }));

    const pipe = newAssetPipe().inject('test').collect(identifyFunction).processEach(processFunction);

    await pipe.execute(mockPipeline);

    expect(processFunction).toHaveBeenCalledWith(expect.anything(), mockData);
    expect(fs.existsSync(`${mockPipeline.getRoot()}${mockData.styles.path}${mockData.styles.filename}`)).toBeTruthy();
  });

  it('Will generate all assets with processAll', async () => {
    await promiseFs.writeFile('./temp/test/test1.css', 'test');
    await promiseFs.writeFile('./temp/test/test2.css', 'test');

    const identifyFunction = jest.fn<string[], [typeof mockData]>(() => [
      './temp/test/test1.css',
      './temp/test/test2.css',
    ]);
    const processFunction = jest.fn();

    const pipe = newAssetPipe().inject('test').collect(identifyFunction).processAll(processFunction);

    await pipe.execute(mockPipeline);

    expect(processFunction).toHaveBeenCalledTimes(1);
  });

  it('Will create the asset content with a function is given one', async () => {
    const identifyFunction = jest.fn<string, [typeof mockData]>(data => data.styles.original);

    const pipe = newAssetPipe()
      .inject('test')
      .collect(identifyFunction)
      .processEach<typeof mockData>((_, data) => ({
        path: data.styles.path,
        filename: data.styles.filename,
        content: () => data.styles.content,
      }));

    await pipe.execute(mockPipeline);

    expect(fs.existsSync(`${mockPipeline.getRoot()}${mockData.styles.path}${mockData.styles.filename}`)).toBeTruthy();
    expect(
      fs.readFileSync(`${mockPipeline.getRoot()}${mockData.styles.path}${mockData.styles.filename}`).toString()
    ).toBe(mockData.styles.content);
  });

  it('Will select assets using a string', async () => {
    const identifyFunction = jest.fn<string, [typeof mockData]>(data => data.styles.original);
    const processFunction = jest.fn();

    const pipe = newAssetPipe().inject('test').collect(identifyFunction).select('invalid').processEach(processFunction);

    await pipe.execute(mockPipeline);

    expect(processFunction).not.toHaveBeenCalled();
  });

  it('Will select pages using a regex', async () => {
    const identifyFunction = jest.fn<string, [typeof mockData]>(data => data.styles.original);
    const processFunction = jest.fn();

    const pipe = newAssetPipe()
      .inject('test')
      .collect(identifyFunction)
      .select(/invalid/)
      .processEach(processFunction);

    await pipe.execute(mockPipeline);

    expect(processFunction).not.toHaveBeenCalled();
  });

  it('Will do nothing when processing nothing', async () => {
    const identifyFunction = jest.fn<string, [typeof mockData]>(() => mockData.styles.original);
    const processFunction = jest.fn<null, []>(() => null);

    const pipe = newAssetPipe().collect(identifyFunction).select(/test/).processEach(processFunction);

    await pipe.execute(mockPipeline);

    expect(fs.existsSync(`${mockPipeline.getRoot()}${mockData.styles.path}${mockData.styles.filename}`)).toBeFalsy();
  });
});
