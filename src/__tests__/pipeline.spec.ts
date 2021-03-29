import rimraf from 'rimraf';
import fs from 'fs';
import fsPromise from 'fs/promises';
import sass from 'node-sass';
import glob from 'glob';
import remark from 'remark';
import frontmatter from 'remark-frontmatter';
import parseFrontmatter from 'remark-parse-frontmatter';
import html from 'remark-html';

import { newPipeline } from '../pipeline';
import { newPagePipe } from '../pages';
import { newDataSourcePipe, newParallelDataSourcePipe } from '../data-sources';
import { newAssetPipe } from '../assets';

describe('newPipeline', () => {
  afterEach(async () => {
    await new Promise(resolve => rimraf('./temp', resolve));
  });

  it('Will execute a static pipeline', async () => {
    const content = '<html><body><h1>Hello, World!</h1></body></html>';

    const pipeline = newPipeline({ root: './temp/static' }).pipe(
      newPagePipe()
        .identify(() => ['/'])
        .generate(path => ({
          url: path,
          content,
        }))
    );

    await pipeline.execute();

    expect(fs.existsSync(`${pipeline.getRoot()}/index.html`)).toBeTruthy();
    expect(fs.readFileSync(`${pipeline.getRoot()}/index.html`).toString()).toBe(content);
  });

  it('Will execute a pipeline from an api', async () => {
    const APIData = [
      {
        configuration: {
          path: '/some/test',
        },
        title: 'Some test',
        content: 'Some test',
      },
      {
        configuration: {
          path: '/some/other/test',
        },
        title: 'Some other test',
        content: 'Some other test',
      },
    ];

    interface PipelineData {
      apiData: typeof APIData;
    }

    const pipeline = newPipeline({ root: './temp/from-api' })
      .pipe(
        newDataSourcePipe('api')
          .fetch(() => ({ apiData: APIData }))
          .process(data => data)
      )
      .pipe(
        newPagePipe()
          .inject('api')
          .identify<PipelineData>(data => data.apiData.map(data => data.configuration.path))
          .select(/.*/)
          .generate<PipelineData>(async (path, data) => {
            const page = data.apiData.find(el => el.configuration.path === path);

            if (!page) {
              return null;
            }

            return {
              url: path,
              content: `${page.title}\n\n${page.content}`,
            };
          })
      );

    await pipeline.execute();

    expect(fs.existsSync(`${pipeline.getRoot()}${APIData[0].configuration.path}.html`)).toBeTruthy();
    expect(fs.readFileSync(`${pipeline.getRoot()}${APIData[0].configuration.path}.html`).toString()).toBe(
      `${APIData[0].title}\n\n${APIData[0].content}`
    );

    expect(fs.existsSync(`${pipeline.getRoot()}${APIData[1].configuration.path}.html`)).toBeTruthy();
    expect(fs.readFileSync(`${pipeline.getRoot()}${APIData[1].configuration.path}.html`).toString()).toBe(
      `${APIData[1].title}\n\n${APIData[1].content}`
    );
  });

  it('Will execute a pipeline with a parallel data source', async () => {
    const APIData = [
      {
        configuration: {
          path: '/some/test',
        },
        title: 'Some test',
        content: 'Some test',
      },
      {
        configuration: {
          path: '/some/other/test',
        },
        title: 'Some other test',
        content: 'Some other test',
      },
    ];

    interface PipelineData {
      api1Data: typeof APIData[0][];
      api2Data: typeof APIData[1][];
    }

    const pipeline = newPipeline({ root: './temp/parallel-fetching' })
      .pipe(
        newParallelDataSourcePipe()
          .pipeSource(
            newDataSourcePipe('api-1')
              .fetch(() => ({ api1Data: [APIData[0]] }))
              .process(data => data)
          )
          .pipeSource(
            newDataSourcePipe('api-2')
              .fetch(() => ({ api2Data: [APIData[1]] }))
              .process(data => data)
          )
      )
      .pipe(
        newPagePipe()
          .inject('api-1')
          .inject('api-2')
          .identify<PipelineData>(data => [...data.api1Data, ...data.api2Data].map(data => data.configuration.path))
          .select(/.*/)
          .generate<PipelineData>(async (path, data) => {
            const page = [...data.api1Data, ...data.api2Data].find(el => el.configuration.path === path);

            if (!page) {
              return null;
            }

            return {
              url: path,
              content: `${page.title}\n\n${page.content}`,
            };
          })
      );

    await pipeline.execute();

    expect(fs.existsSync(`${pipeline.getRoot()}${APIData[0].configuration.path}.html`)).toBeTruthy();
    expect(fs.readFileSync(`${pipeline.getRoot()}${APIData[0].configuration.path}.html`).toString()).toBe(
      `${APIData[0].title}\n\n${APIData[0].content}`
    );

    expect(fs.existsSync(`${pipeline.getRoot()}${APIData[1].configuration.path}.html`)).toBeTruthy();
    expect(fs.readFileSync(`${pipeline.getRoot()}${APIData[1].configuration.path}.html`).toString()).toBe(
      `${APIData[1].title}\n\n${APIData[1].content}`
    );
  });

  it('Will execute a pipeline with JS templates', async () => {
    const APIData = [
      {
        configuration: {
          path: '/some/test',
        },
        title: 'Some test',
        content: 'Some test',
      },
      {
        configuration: {
          path: '/some/other/test',
        },
        title: 'Some other test',
        content: 'Some other test',
      },
    ];

    interface PipelineData {
      apiData: typeof APIData;
    }

    const baseTemplate = (title: string, content: string) => `
<html>
  <head>
    <title>Base page</title>
  </head>
  <body>
    <h1>${title}</h1>
    <p>${content}</p>
  </body>
</html>
`;

    const otherTemplate = (title: string, content: string) => `
<html>
  <head>
    <title>Subdirectory page</title>
  </head>
  <body>
    <h1>${title}</h1>
    <p>${content}</p>
  </body>
</html>
`;

    const pipeline = newPipeline({ root: './temp/templates' })
      .pipe(
        newDataSourcePipe('api')
          .fetch(() => ({ apiData: APIData }))
          .process(data => data)
      )
      .pipe(
        newPagePipe()
          .inject('api')
          .identify<PipelineData>(data => data.apiData.map(data => data.configuration.path))
          .select(/some\/other/)
          .generate<PipelineData>(async (path, data) => {
            const page = data.apiData.find(el => el.configuration.path === path);

            if (!page) {
              return null;
            }

            return {
              url: path,
              content: otherTemplate(page.title, page.content),
            };
          })
      )
      .pipe(
        newPagePipe()
          .inject('api')
          .identify<PipelineData>(data => data.apiData.map(data => data.configuration.path))
          .select(/some\/test/)
          .generate<PipelineData>(async (path, data) => {
            const page = data.apiData.find(el => el.configuration.path === path);

            if (!page) {
              return null;
            }

            return {
              url: path,
              content: baseTemplate(page.title, page.content),
            };
          })
      );

    await pipeline.execute();

    expect(fs.existsSync(`${pipeline.getRoot()}${APIData[0].configuration.path}.html`)).toBeTruthy();
    expect(fs.readFileSync(`${pipeline.getRoot()}${APIData[0].configuration.path}.html`).toString()).toBe(
      baseTemplate(APIData[0].title, APIData[0].content)
    );

    expect(fs.existsSync(`${pipeline.getRoot()}${APIData[1].configuration.path}.html`)).toBeTruthy();
    expect(fs.readFileSync(`${pipeline.getRoot()}${APIData[1].configuration.path}.html`).toString()).toBe(
      otherTemplate(APIData[1].title, APIData[1].content)
    );
  });

  it('Will execute a pipeline with sass processing', async () => {
    const pipeline = newPipeline({ root: './temp/scss' })
      .pipe(
        newPagePipe()
          .identify(() => ['/'])
          .generate(path => ({
            url: path,
            content:
              '<html><head><link rel="stylesheet" href="./index.css" /></head><body><h1>Hello, World!</h1></body></html>',
          }))
      )
      .pipe(
        newAssetPipe()
          .collect(() => './examples/scss/**.scss')
          .processEach(file => {
            const content = sass.renderSync({
              data: file.content,
            });

            return {
              path: '/',
              filename: `${file.filename}.css`,
              content: content.css.toString(),
            };
          })
      );

    await pipeline.execute();

    expect(fs.existsSync(`${pipeline.getRoot()}/index.css`)).toBeTruthy();
    expect(fs.readFileSync(`${pipeline.getRoot()}/index.css`).toString()).toBe(
      `body {
  color: red; }
`
    );
  });

  it('Will execute a pipeline with sass merging', async () => {
    const pipeline = newPipeline({ root: './temp/scss-merge' })
      .pipe(
        newPagePipe()
          .identify(() => ['/'])
          .generate(path => ({
            url: path,
            content:
              '<html><head><link rel="stylesheet" href="./index.css" /></head><body><h1>Hello, World!</h1></body></html>',
          }))
      )
      .pipe(
        newAssetPipe()
          .collect(() => './examples/scss-merge/**.scss')
          .processAll(files => {
            const content = sass.renderSync({
              data: files.map(file => file.content).join('\n'),
            });

            return {
              path: '/',
              filename: 'index.css',
              content: content.css.toString(),
            };
          })
      );

    await pipeline.execute();

    expect(fs.existsSync(`${pipeline.getRoot()}/index.css`)).toBeTruthy();
    expect(fs.readFileSync(`${pipeline.getRoot()}/index.css`).toString()).toBe(
      `.test1 {
  color: yellow; }

.test2 {
  color: red; }
`
    );
  });

  it('Will execute a pipeline with markdown processing', async () => {
    interface MarkdownPages {
      path: string;
      content: string;
    }

    interface PageData {
      pages: MarkdownPages[];
    }

    const pipeline = newPipeline({ root: './temp/markdown' })
      .pipe(
        newDataSourcePipe('data')
          .fetch(async () => {
            const pages = await new Promise<MarkdownPages[] | null>(resolve => {
              glob('./examples/markdown/data/**.md', (err, matches) => {
                if (err) {
                  resolve(null);
                  return;
                }

                Promise.all(
                  matches.map(async match => {
                    const content = await fsPromise.readFile(match).then(file => file.toString());

                    return new Promise<MarkdownPages>(resolve => {
                      remark()
                        .use(frontmatter)
                        .use(parseFrontmatter)
                        .use(html)
                        .process(content, (err, file) => {
                          if (err) {
                            return;
                          }

                          resolve({
                            path: (file.data as { frontmatter: { path: string } }).frontmatter.path,
                            content: String(file.contents),
                          });
                        });
                    });
                  })
                ).then(value => resolve(value));
              });
            });

            return {
              pages,
            };
          })
          .process(data => data)
      )
      .pipe(
        newPagePipe()
          .inject('data')
          .identify<PageData>(data => {
            return data.pages.map(data => data.path);
          })
          .select(/.*/)
          .generate<PageData>(async (path, data) => {
            const page = data.pages.find(el => el.path === path);

            if (!page) {
              return null;
            }

            return {
              url: path,
              content: page.content,
            };
          })
      );

    await pipeline.execute();

    expect(fs.existsSync(`${pipeline.getRoot()}/some/other/test.html`)).toBeTruthy();
    expect(fs.existsSync(`${pipeline.getRoot()}/some/test.html`)).toBeTruthy();
  });
});
