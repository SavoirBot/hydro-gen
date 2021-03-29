import rimraf from 'rimraf';
import fs from 'fs';

import { Pipeline } from '../pipeline';
import { newPagePipe } from '../pages';
import { Page as PageType } from '../types';
import { newDataSourcePipe } from '../data-sources';

describe('newPagePipe', () => {
  const mockData = {
    page: {
      path: '/test',
      content: 'Some other test',
    },
  };

  let mockPipeline: Pipeline;

  beforeEach(() => {
    mockPipeline = new Pipeline({ root: './temp/test' });

    mockPipeline.getData = jest.fn(() => mockData);
  });

  afterEach(async () => {
    await new Promise(resolve => rimraf('./temp', resolve));
  });

  it('Will inject data when executed', async () => {
    const pipe = newPagePipe().inject('test');

    await pipe.execute(mockPipeline);

    expect(mockPipeline.getData).toHaveBeenCalledWith('test');
  });

  it('Will inject data using the datasource rather than the name', async () => {
    const dataSource = newDataSourcePipe('test').fetch(() => mockData);

    const pipe = newPagePipe().inject(dataSource);

    await pipe.execute(mockPipeline);

    expect(mockPipeline.getData).toHaveBeenCalledWith('test');
  });

  it('Will generate pages from data', async () => {
    const identifyFunction = jest.fn<string, [typeof mockData]>(data => data.page.path);
    const processFunction = jest.fn<PageType, [string, typeof mockData]>((_, data) => ({
      url: data.page.path,
      content: data.page.content,
    }));

    const pipe = newPagePipe().inject('test').identify(identifyFunction).generate(processFunction);

    await pipe.execute(mockPipeline);

    expect(processFunction).toHaveBeenCalledWith(mockData.page.path, mockData);
    expect(fs.existsSync(`${mockPipeline.getRoot()}${mockData.page.path}.html`)).toBeTruthy();
  });

  it('Will create the page content with a function is given one', async () => {
    const identifyFunction = jest.fn<string, [typeof mockData]>(data => data.page.path);

    const pipe = newPagePipe()
      .inject('test')
      .identify(identifyFunction)
      .generate<typeof mockData>((_, data) => ({
        url: data.page.path,
        content: () => data.page.content,
      }));

    await pipe.execute(mockPipeline);

    expect(fs.existsSync(`${mockPipeline.getRoot()}${mockData.page.path}.html`)).toBeTruthy();
    expect(fs.readFileSync(`${mockPipeline.getRoot()}${mockData.page.path}.html`).toString()).toBe(
      mockData.page.content
    );
  });

  it('Will create an index page when given a trailing slash path', async () => {
    const identifyFunction = jest.fn<string, [typeof mockData]>(data => data.page.path);

    const pipe = newPagePipe()
      .inject('test')
      .identify(identifyFunction)
      .generate<typeof mockData>((_, data) => ({
        url: data.page.path + '/',
        content: data.page.content,
      }));

    await pipe.execute(mockPipeline);

    expect(fs.existsSync(`${mockPipeline.getRoot()}${mockData.page.path}.html`)).toBeFalsy();
    expect(fs.existsSync(`${mockPipeline.getRoot()}${mockData.page.path}/index.html`)).toBeTruthy();
  });

  it('Will select pages using a string', async () => {
    const identifyFunction = jest.fn<string[], [typeof mockData]>(data => ['/invalid', data.page.path]);
    const processFunction = jest.fn<PageType, [string, typeof mockData]>((_, data) => ({
      url: data.page.path,
      content: data.page.content,
    }));

    const pipe = newPagePipe()
      .inject('test')
      .identify(identifyFunction)
      .select(mockData.page.path)
      .generate(processFunction);

    await pipe.execute(mockPipeline);

    expect(processFunction).toHaveBeenCalledWith(mockData.page.path, mockData);
    expect(fs.existsSync(`${mockPipeline.getRoot()}${mockData.page.path}.html`)).toBeTruthy();
    expect(fs.existsSync(`${mockPipeline.getRoot()}/invalid.html`)).toBeFalsy();
  });

  it('Will select pages using a regex', async () => {
    const identifyFunction = jest.fn<string[], [typeof mockData]>(data => ['/invalid', data.page.path]);
    const processFunction = jest.fn<PageType, [string, typeof mockData]>((_, data) => ({
      url: data.page.path,
      content: data.page.content,
    }));

    const pipe = newPagePipe().inject('test').identify(identifyFunction).select(/test/).generate(processFunction);

    await pipe.execute(mockPipeline);

    expect(processFunction).toHaveBeenCalledWith(mockData.page.path, mockData);
    expect(fs.existsSync(`${mockPipeline.getRoot()}${mockData.page.path}.html`)).toBeTruthy();
    expect(fs.existsSync(`${mockPipeline.getRoot()}/invalid.html`)).toBeFalsy();
  });

  it('Will do nothing when processing nothing', async () => {
    const identifyFunction = jest.fn<string, [typeof mockData]>(() => mockData.page.path);
    const processFunction = jest.fn<null, []>(() => null);

    const pipe = newPagePipe().identify(identifyFunction).select(/test/).generate(processFunction);

    await pipe.execute(mockPipeline);

    expect(fs.existsSync(`${mockPipeline.getRoot()}${mockData.page.path}.html`)).toBeFalsy();
  });
});
