import { newPipeline, newDataSourcePipe, newPagePipe } from '@savoirbot/hydro-gen';

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

const pipeline = newPipeline({ root: './temp' })
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

pipeline.execute();
