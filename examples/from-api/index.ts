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

pipeline.execute();
